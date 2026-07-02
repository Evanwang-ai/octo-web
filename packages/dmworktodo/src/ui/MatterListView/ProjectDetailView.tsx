/**
 * [INPUT]: 依赖 react;./index 的 MatterListView(内嵌看板,project 过滤);../MemberPicker(controlled 管人);
 *          api/todoApi 的 listProjects/listProjectMembers/add/removeProjectMember/listProjectBots/removeProjectBot/
 *          listProjectSources/removeProjectSource;@octo/base WKApp/WKAvatar;../UserName;utils/toast。
 * [OUTPUT]: 默认导出 ProjectDetailView(原生项目详情:头[名/范围]+ tab 看板/成员/上下文;替 iframe #/project/:id)。
 * [POS]: MatterListView 的项目详情(P2),被 MatterRouteHost view="projectDetail" 挂载;GET /projects/:id 404 靠列表缓存。
 *        真相源 vanilla renderProjectDetail。兄弟:ProjectsView/MatterRouteHost。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { WKApp } from "@octo/base";
import WKAvatar from "@octo/base/src/Components/WKAvatar";
import { Channel, ChannelTypePerson } from "wukongimjssdk";
import MatterListView from "./index";
import MemberPicker from "../MemberPicker";
import UserName from "../UserName";
import { Toast } from "../../utils/toast";
import {
  listProjects,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  listProjectBots,
  removeProjectBot,
  listProjectSources,
  addProjectSource,
  removeProjectSource,
  uploadProjectFile,
} from "../../api/todoApi";
import type { ProjectMember, ProjectBot, ProjectSource } from "../../api/todoApi";
import "./projectDetail.css";

type Tab = "board" | "members" | "context";
const isBot = (uid?: string) => !!uid && uid.endsWith("_bot");

// 来源引用(对齐 vanilla ctxRefHTML):http(s)→新窗打开/下载;非 http→"引用 · ref" 只读。
function SourceRef({ kind, refUrl }: { kind: string; refUrl?: string }) {
  const ref = (refUrl || "").trim();
  if (!ref) return null;
  const label = kind === "file" ? "打开文件" : kind === "link" ? "打开链接" : "引用";
  if (/^https?:\/\//i.test(ref)) {
    return (
      <a className="cr-ref" href={ref} target="_blank" rel="noopener noreferrer" title={ref}>
        {label}
      </a>
    );
  }
  return (
    <span className="cr-ref cr-ref-plain" title={ref}>
      {label} · {ref}
    </span>
  );
}
const SCOPE_LABEL: Record<string, string> = {
  default: "系统收件箱",
  space: "空间共享",
  private: "私有",
};

export default function ProjectDetailView({
  projectId,
  onBack,
  onOpenMatter,
}: {
  projectId: string;
  onBack?: () => void;
  onOpenMatter?: (id: string) => void;
}) {
  const myUid = WKApp.loginInfo.uid ?? "";
  const [name, setName] = useState("项目");
  const [scope, setScope] = useState<string>("");
  const [creatorUid, setCreatorUid] = useState<string>("");
  const [tab, setTab] = useState<Tab>("board");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [bots, setBots] = useState<ProjectBot[]>([]);
  const [sources, setSources] = useState<ProjectSource[]>([]);
  const [srcOpen, setSrcOpen] = useState(false);
  const [srcKind, setSrcKind] = useState("link");
  const [srcTitle, setSrcTitle] = useState("");
  const [srcRef, setSrcRef] = useState("");
  const [srcBusy, setSrcBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // GET /projects/:id 404 → 从列表缓存取名/范围/creator。
  useEffect(() => {
    let alive = true;
    listProjects(true)
      .then((ps) => {
        const p = ps.find((x) => x.id === projectId);
        if (alive && p) {
          setName(p.name);
          setScope(p.scope || "");
          setCreatorUid(p.creator_id || "");
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [projectId]);

  const reloadMembers = useCallback(() => {
    listProjectMembers(projectId)
      .then((m) => {
        if (mountedRef.current) setMembers(m);
      })
      .catch(() => {});
    listProjectBots(projectId)
      .then((b) => {
        if (mountedRef.current) setBots(b);
      })
      .catch(() => {});
  }, [projectId]);
  const reloadSources = useCallback(() => {
    listProjectSources(projectId)
      .then((s) => {
        if (mountedRef.current) setSources(s);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    reloadMembers();
    reloadSources();
  }, [reloadMembers, reloadSources]);

  // MemberPicker controlled:onChange 给全量 uids,diff 出增删 → 项目成员 API。
  const memberUids = members.map((m) => m.user_uid);
  const onMembersChange = async (next: string[]) => {
    const prev = new Set(memberUids);
    const nextSet = new Set(next);
    const added = next.filter((u) => !prev.has(u));
    const removed = memberUids.filter((u) => !nextSet.has(u));
    try {
      for (const u of added) await addProjectMember(projectId, u);
      for (const u of removed) await removeProjectMember(projectId, u);
      reloadMembers();
    } catch {
      if (mountedRef.current) Toast.error("成员更新失败");
      reloadMembers();
    }
  };

  const removeBot = async (botUid: string) => {
    try {
      await removeProjectBot(projectId, botUid);
      reloadMembers();
    } catch {
      if (mountedRef.current) Toast.error("移除 bot 失败");
    }
  };
  const removeSource = async (sid: string) => {
    try {
      await removeProjectSource(projectId, sid);
      reloadSources();
    } catch {
      if (mountedRef.current) Toast.error("移除来源失败");
    }
  };
  // 文件上传(跨仓 octo-server /file/upload)→ 写入 kind=file 来源。
  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选同一文件
    if (!file || uploading) return;
    setUploading(true);
    try {
      const { url, name } = await uploadProjectFile(file, projectId);
      await addProjectSource(projectId, { kind: "file", title: name, ref: url });
      if (mountedRef.current) reloadSources();
    } catch {
      if (mountedRef.current) Toast.error("文件上传失败");
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  // 加来源(文本:链接/笔记)。
  const addSource = async () => {
    const title = srcTitle.trim();
    if (!title || srcBusy) return;
    setSrcBusy(true);
    try {
      await addProjectSource(projectId, {
        kind: srcKind,
        title,
        ...(srcRef.trim() ? { ref: srcRef.trim() } : {}),
      });
      if (!mountedRef.current) return;
      setSrcTitle("");
      setSrcRef("");
      setSrcOpen(false);
      reloadSources();
    } catch {
      if (mountedRef.current) Toast.error("加来源失败");
    } finally {
      if (mountedRef.current) setSrcBusy(false);
    }
  };

  return (
    <div className="pdv">
      <div className="pdv-head">
        <div className="pdv-crumb">
          {onBack && (
            <button type="button" className="pdv-back" onClick={onBack}>
              项目
            </button>
          )}
          <span className="pdv-crumb-sep">›</span>
          <span className="pdv-crumb-cur">{name}</span>
        </div>
        <div className="pdv-title-row">
          <h1 className="pdv-title">{name}</h1>
          {scope && <span className="pdv-scope">{SCOPE_LABEL[scope] || scope}</span>}
        </div>
        <div className="pdv-tabs" role="tablist">
          {(
            [
              ["board", "看板"],
              ["members", `成员 ${members.length + bots.length || ""}`.trim()],
              ["context", `上下文 ${sources.length || ""}`.trim()],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`pdv-tab${tab === k ? " is-active" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pdv-body">
        {/* 看板:内嵌真 MatterListView,强制 project 过滤(复用全部 viewSpec/board/交互) */}
        <div className="pdv-pane" style={{ display: tab === "board" ? "block" : "none" }}>
          <MatterListView
            baseFilters={{ project_id: projectId }}
            embedded
            onOpenDetail={onOpenMatter}
          />
        </div>

        {tab === "members" && (
          <div className="pdv-pane pdv-pane-pad">
            <div className="pdv-sec-h">
              成员<span className="pdv-sec-c">{members.length}</span>
            </div>
            <div className="pdv-member-picker">
              <MemberPicker
                mode="controlled"
                value={memberUids}
                onChange={onMembersChange}
                humansOnly
                placeholder="加人(空间内任意人,免费)"
              />
            </div>
            <div className="pdv-list">
              {members.map((m) => (
                <div key={m.id} className="pdv-row">
                  <WKAvatar
                    channel={new Channel(m.user_uid, ChannelTypePerson)}
                    style={{ width: 22, height: 22, borderRadius: "50%" }}
                  />
                  <span className="pdv-row-name">
                    <UserName uid={m.user_uid} />
                  </span>
                  {m.role === "creator" && <span className="pdv-role">创建者</span>}
                </div>
              ))}
            </div>

            <div className="pdv-sec-h">
              可调度 Bot<span className="pdv-sec-c">{bots.length}</span>
            </div>
            <div className="pdv-list">
              {bots.length === 0 && <div className="pdv-empty">还没有常驻 bot(主人在此加自己的 bot)</div>}
              {bots.map((b) => (
                <div key={b.id} className="pdv-row">
                  <WKAvatar
                    channel={new Channel(b.bot_uid, ChannelTypePerson)}
                    style={{ width: 22, height: 22, borderRadius: "50%" }}
                  />
                  <span className="pdv-row-name">
                    <UserName uid={b.bot_uid} />
                  </span>
                  {isBot(b.bot_uid) && <span className="pdv-ai">AI</span>}
                  {b.owner_uid === myUid && (
                    <button type="button" className="pdv-row-x" onClick={() => removeBot(b.bot_uid)}>
                      移除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "context" && (
          <div className="pdv-pane pdv-pane-pad">
            <div className="pdv-sec-h">
              上下文来源<span className="pdv-sec-c">{sources.length}</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
                <button
                  type="button"
                  className="pdv-add-src"
                  style={{ marginLeft: 0 }}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "上传中…" : "↥ 上传文件"}
                </button>
                <button
                  type="button"
                  className="pdv-add-src"
                  style={{ marginLeft: 0 }}
                  onClick={() => setSrcOpen((v) => !v)}
                >
                  + 加来源
                </button>
              </span>
              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                onChange={onFilePick}
              />
            </div>
            {srcOpen && (
              <div className="pdv-src-form">
                <select
                  className="pdv-src-kind-sel"
                  aria-label="来源类型"
                  value={srcKind}
                  onChange={(e) => setSrcKind(e.target.value)}
                >
                  <option value="link">链接</option>
                  <option value="note">笔记</option>
                  <option value="doc">文档</option>
                </select>
                <input
                  className="pdv-src-title-in"
                  aria-label="来源标题"
                  placeholder="标题"
                  maxLength={200}
                  value={srcTitle}
                  onChange={(e) => setSrcTitle(e.target.value)}
                />
                <input
                  className="pdv-src-ref-in"
                  aria-label="来源链接"
                  placeholder="链接/引用(可选)"
                  value={srcRef}
                  onChange={(e) => setSrcRef(e.target.value)}
                />
                <button
                  type="button"
                  className="pdv-src-go"
                  onClick={addSource}
                  disabled={srcBusy || !srcTitle.trim()}
                >
                  {srcBusy ? "添加中…" : "添加"}
                </button>
              </div>
            )}
            <div className="pdv-list">
              {sources.length === 0 && <div className="pdv-empty">还没有共享上下文</div>}
              {sources.map((s) => (
                <div key={s.id} className="pdv-src">
                  <div className="pdv-src-main">
                    <span className="pdv-src-kind">{s.kind}</span>
                    <span className="pdv-src-title">{s.title}</span>
                    <SourceRef kind={s.kind} refUrl={s.ref} />
                  </div>
                  {s.snippet && <div className="pdv-src-snip">{s.snippet}</div>}
                  <button type="button" className="pdv-row-x" onClick={() => removeSource(s.id)}>
                    移除
                  </button>
                </div>
              ))}
            </div>
            {creatorUid && myUid !== creatorUid && (
              <div className="pdv-note">仅项目创建者可管理上下文来源</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
