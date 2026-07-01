import axios from "axios";
import { WKApp, buildAcceptLanguage } from "@octo/base";
import type {
  Matter,
  MatterDetail,
  MatterChannel,
  TimelineEntry,
  PaginatedList,
  MatterListParams,
  CreateMatterReq,
  UpdateMatterReq,
  MatterStatus,
  LinkChannelReq,
  ExtractMatterReq,
  ExtractResult,
  TimelineReq,
  ListCommentsParams,
  MatterActivity,
  ListActivitiesParams,
  MatterOutput,
  ListOutputsParams,
  PreferenceCard,
  UpdatePreferenceCardReq,
  CreatePreferenceCardReq,
  Schedule,
  SaveScheduleReq,
} from "../bridge/types";

/**
 * Isolated axios instance for matters service API.
 * Must NOT inherit axios.defaults.baseURL (set to '/api/v1/' by WKApp.apiClient)
 * otherwise all paths get double-prefixed.
 */
const matterAxios = axios.create({ baseURL: "" });

// Inject auth headers via interceptor (consistent with base APIClient pattern).
// Token is read at request time so it stays fresh after refresh.
matterAxios.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers["Accept-Language"] = buildAcceptLanguage();
  const token = WKApp.loginInfo.token;
  if (token) {
    config.headers["token"] = token;
  }
  const spaceId = WKApp.shared.currentSpaceId;
  if (spaceId) {
    config.headers["X-Space-Id"] = spaceId;
  }
  return config;
});

// Handle 401 — mirror APIClient behavior (trigger logout on expired token)
matterAxios.interceptors.response.use(undefined, (err) => {
  if (err?.response?.status === 401) {
    WKApp.shared.logout();
  }
  return Promise.reject(err);
});

/**
 * Structured API error that preserves server error code and message.
 * Callers can check `err.code` for specific error handling (e.g. LLM_UPSTREAM_ERROR).
 */
export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Extract server error message from axios error response.
 * Returns an ApiError that preserves the structured error code.
 */
function extractApiError(err: unknown): ApiError {
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: { message?: string; code?: string } } };
  };
  const serverError = axiosErr?.response?.data?.error;
  const msg = serverError?.message || (err instanceof Error ? err.message : "Request failed");
  const code = serverError?.code;
  const status = axiosErr?.response?.status;
  // Cap length to prevent pathologically long server error messages in toasts
  const capped = msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
  return new ApiError(capped, code, status);
}

/**
 * Base path for matters service API.
 * Vite dev proxy (apps/web/vite.config.ts) rewrites /matter/* -> /* on the target.
 * Production nginx must have an equivalent rewrite rule.
 */
const BASE = "/matter/api/v1";

/**
 * Build query string params, filtering out undefined values.
 */
function buildParams(obj?: Record<string, unknown>): Record<string, string> {
  if (!obj) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Unwrap axios response — return response.data directly.
 * Passes AbortSignal through to axios so callers can cancel in-flight requests.
 * On cancel, rethrows as { name: 'AbortError' } (not wrapped via extractErrorMessage)
 * so consumers can distinguish cancellation from real errors.
 */
async function get<T>(
  path: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const config: { params: Record<string, string>; signal?: AbortSignal } = {
      params: buildParams(params),
    };
    // 只在有 signal 时加到 config, 避免影响既有调用点的参数形状 (测试快照 + 可读性)
    if (signal) config.signal = signal;
    const resp = await matterAxios.get(`${BASE}${path}`, config);
    return resp.data;
  } catch (err: unknown) {
    if (axios.isCancel(err)) {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw extractApiError(err);
  }
}

async function post<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await matterAxios.post(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw extractApiError(err);
  }
}

async function put<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await matterAxios.put(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw extractApiError(err);
  }
}

async function del<T>(path: string): Promise<T> {
  try {
    const resp = await matterAxios.delete(`${BASE}${path}`);
    return resp.data;
  } catch (err: unknown) {
    throw extractApiError(err);
  }
}

// ─── Matters ────────────────────────────────────────────

export async function listMatters(
  params?: MatterListParams,
  signal?: AbortSignal,
): Promise<PaginatedList<Matter>> {
  return get<PaginatedList<Matter>>(
    "/matters",
    params as unknown as Record<string, unknown>,
    signal,
  );
}

export async function getMatter(
  matterId: string,
  sourceChannelId?: string,
): Promise<MatterDetail> {
  return get<MatterDetail>(
    `/matters/${matterId}`,
    sourceChannelId ? { source_channel_id: sourceChannelId } : undefined,
  );
}

export async function createMatter(
  req: CreateMatterReq,
): Promise<MatterDetail> {
  return post<MatterDetail>("/matters", req);
}

export async function updateMatter(
  matterId: string,
  req: UpdateMatterReq,
): Promise<MatterDetail> {
  return put<MatterDetail>(`/matters/${matterId}`, req);
}

export async function transitionMatter(
  matterId: string,
  status: MatterStatus,
): Promise<MatterDetail> {
  return put<MatterDetail>(`/matters/${matterId}/status`, { status });
}

export async function deleteMatter(matterId: string): Promise<void> {
  return del<void>(`/matters/${matterId}`);
}

// ─── Assignees ──────────────────────────────────────────

export async function addAssignee(
  matterId: string,
  userId: string,
): Promise<void> {
  return post<void>(`/matters/${matterId}/assignees`, { user_id: userId });
}

export async function removeAssignee(
  matterId: string,
  userId: string,
): Promise<void> {
  return del<void>(`/matters/${matterId}/assignees/${userId}`);
}

// ─── Channels ───────────────────────────────────────────

export async function linkChannel(
  matterId: string,
  req: LinkChannelReq,
): Promise<MatterChannel> {
  return post<MatterChannel>(`/matters/${matterId}/channels`, req);
}

export async function unlinkChannel(
  matterId: string,
  channelId: string,
): Promise<void> {
  return del<void>(`/matters/${matterId}/channels/${channelId}`);
}

// ─── Extract (AI 智能创建) ───────────────────────────────

export async function extractMatter(
  req: ExtractMatterReq,
): Promise<ExtractResult> {
  return post<ExtractResult>("/matters/extract", req);
}

// ─── Timeline ───────────────────────────────────────────

export async function listTimeline(
  matterId: string,
  params?: ListCommentsParams,
): Promise<PaginatedList<TimelineEntry>> {
  return get<PaginatedList<TimelineEntry>>(
    `/matters/${matterId}/timeline`,
    params as unknown as Record<string, unknown>,
  );
}

export async function addTimelineEntry(
  matterId: string,
  req: TimelineReq,
): Promise<TimelineEntry> {
  return post<TimelineEntry>(`/matters/${matterId}/timeline`, req);
}

export async function deleteTimelineEntry(
  matterId: string,
  entryId: string,
): Promise<void> {
  return del<void>(`/matters/${matterId}/timeline/${entryId}`);
}

// ─── 详情长尾(tree / iterations / feedback / send-back)──────────
// 后端 feat/loop 全就绪(curl 实测:tree/iterations 200、feedback/send-back 路由在)。
// 类型本地定义(照 ProjectItem/Schedule 先例,additive,不动共享 MatterStatus)。

/** 一轮迭代(critic/roundtable 等模式下领队多轮提交的记录)。 */
export interface IterationRound {
  round: number;
  started_at?: string;
  submitted_at?: string;
  submitted_by?: string;
  outcome?: string; // pending_review / accepted / needs_revision …
}
export interface MatterIterations {
  matter_id: string;
  total_rounds: number;
  current_outcome?: string;
  rounds: IterationRound[];
}
export async function getIterations(matterId: string): Promise<MatterIterations> {
  return get<MatterIterations>(`/matters/${matterId}/iterations`);
}

/** 回路树节点(递归):matter + 协作模式契约 + 子节点。plan/角色图与派子任务的数据源。 */
export interface MatterTreeNode {
  matter: MatterDetail & {
    mode?: string;
    leader_uid?: string;
    project_id?: string;
    has_children?: boolean;
  };
  mode?: string;
  children: MatterTreeNode[];
  barrier_state?: string; // none / waiting / ready …
  join_ready?: boolean;
  contract?: { inputs?: string; report_to?: string; visibility?: string };
}
export async function getMatterTree(matterId: string): Promise<MatterTreeNode> {
  return get<MatterTreeNode>(`/matters/${matterId}/tree`);
}

/** "圈一笔"人类批注(feedback_handler.go feedbackReq 实测):content 必填,可锚到 timeline
 *  条目(entry_id)或结构化锚点(anchor,如选中文字);target_uid 指定针对谁。仅人类可发。
 *  注:"需要修改"打回 = status 流转 review→in_progress(transitionMatter),非本请求字段。 */
export interface FeedbackReq {
  content: string;
  entry_id?: string;
  anchor?: unknown; // 结构化锚点(json.RawMessage),如 {selection,...}
  target_uid?: string;
}
export async function addFeedback(matterId: string, req: FeedbackReq): Promise<void> {
  return post<void>(`/matters/${matterId}/feedback`, req);
}

/** 发回来源群(把回路进展推回来源 IM 会话)。无 body,后端返 {status:queued}(agent_handler SendBack)。 */
export async function sendBack(matterId: string): Promise<void> {
  return post<void>(`/matters/${matterId}/send-back`, {});
}

// ─── 项目共享上下文（设计 06 §9.3:来源=聊天记录引用）────────

// 富字段(getProjects 实测返回);id/name 为核心,其余可选 —— 老消费方(只用 id/name)不受影响。
export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  scope?: string; // default(系统收件箱)/space(共享)/private(私有)
  archived?: number | boolean; // 后端返 0/1
  creator_id?: string;
  default_leader_uid?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SaveProjectReq {
  name?: string;
  scope?: string;
  archived?: boolean;
}

/** archived=1 时含已归档项目(项目详情靠此列表缓存,后端无 GET /projects/:id)。 */
export async function listProjects(includeArchived = false): Promise<ProjectItem[]> {
  const res = await get<{ data: ProjectItem[] } | ProjectItem[]>(
    `/projects`,
    includeArchived ? { archived: 1 } : undefined,
  );
  const arr = Array.isArray(res) ? res : (res as { data: ProjectItem[] }).data;
  return arr ?? [];
}

export async function createProject(req: SaveProjectReq): Promise<ProjectItem> {
  return post<ProjectItem>(`/projects`, req);
}

export async function updateProject(id: string, req: SaveProjectReq): Promise<ProjectItem> {
  return put<ProjectItem>(`/projects/${id}`, req);
}

export interface ProjectSourceReq {
  kind: string;
  title: string;
  ref?: string;
  snippet?: string;
}

export async function addProjectSource(
  projectId: string,
  req: ProjectSourceReq,
): Promise<void> {
  return post<void>(`/projects/${projectId}/sources`, req);
}

// ─── 兼容旧 API（deprecated） ────────────────────────────

/** @deprecated 使用 listTimeline 替代 */
export const listComments = listTimeline;
/** @deprecated 使用 addTimelineEntry 替代 */
export async function addComment(
  matterId: string,
  content: string,
  attachments?: {
    file_url: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  }[],
): Promise<TimelineEntry> {
  const body: TimelineReq = {
    content: content?.trim() || undefined,
    attachments,
  };
  return post<TimelineEntry>(`/matters/${matterId}/timeline`, body);
}
/** @deprecated 使用 deleteTimelineEntry 替代 */
export const deleteComment = deleteTimelineEntry;

// ─── Activities (变更记录) ───────────────────────────────

export async function listActivities(
  matterId: string,
  params?: ListActivitiesParams,
): Promise<PaginatedList<MatterActivity>> {
  return get<PaginatedList<MatterActivity>>(
    `/matters/${matterId}/activities`,
    params as unknown as Record<string, unknown>,
  );
}

// ─── Outputs (产出文件) ──────────────────────────────────

export async function listOutputs(
  matterId: string,
  params?: ListOutputsParams,
): Promise<PaginatedList<MatterOutput>> {
  return get<PaginatedList<MatterOutput>>(
    `/matters/${matterId}/outputs`,
    params as unknown as Record<string, unknown>,
  );
}

// ─── Preference Cards (经验卡) ──────────────────────────

/** 兼容 {data:[]} 与裸数组两种响应形状。 */
function unwrapList<T>(res: { data: T[] } | T[]): T[] {
  return Array.isArray(res) ? res : (res.data ?? []);
}

export async function listPreferenceCards(limit = 100): Promise<PreferenceCard[]> {
  return unwrapList(
    await get<{ data: PreferenceCard[] } | PreferenceCard[]>("/preference-cards", { limit }),
  );
}

/** 后端搜索;本地实例可能 500,调用方需 try/catch 降级到内存过滤。 */
export async function searchPreferenceCards(q: string): Promise<PreferenceCard[]> {
  return unwrapList(
    await get<{ data: PreferenceCard[] } | PreferenceCard[]>("/preference-cards/search", { q }),
  );
}

export async function updatePreferenceCard(
  id: string,
  req: UpdatePreferenceCardReq,
): Promise<PreferenceCard> {
  return put<PreferenceCard>(`/preference-cards/${id}`, req);
}

export async function createPreferenceCard(
  req: CreatePreferenceCardReq,
): Promise<PreferenceCard> {
  return post<PreferenceCard>("/preference-cards", req);
}

export async function deletePreferenceCard(id: string): Promise<void> {
  return del<void>(`/preference-cards/${id}`);
}

// ─── Schedules (自动化) ─────────────────────────────────

export async function listSchedules(): Promise<Schedule[]> {
  return unwrapList(await get<{ data: Schedule[] } | Schedule[]>("/schedules"));
}

export async function createSchedule(req: SaveScheduleReq): Promise<Schedule> {
  return post<Schedule>("/schedules", req);
}

/** 全量更新 + 开关(toggle)共用:传 Partial 即可。 */
export async function updateSchedule(
  id: string,
  req: Partial<SaveScheduleReq> & { enabled?: boolean },
): Promise<Schedule> {
  return put<Schedule>(`/schedules/${id}`, req);
}

export async function deleteSchedule(id: string): Promise<void> {
  return del<void>(`/schedules/${id}`);
}
