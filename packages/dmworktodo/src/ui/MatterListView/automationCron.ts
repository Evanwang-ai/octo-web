/**
 * [INPUT]: 无(纯函数)。
 * [OUTPUT]: cronHuman(cron 5 段 → 人话:每天/工作日/每周X/每月X号;步进/范围/高级原样)。
 * [POS]: MatterListView 自动化的 cron 人话工具,AutomationView(列表)+ AutomationWizard(编辑预览)+ AutomationDetailView 共用。
 *        对齐 vanilla parseCronSimple。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export function cronHuman(cron: string): string {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length < 5) return cron || "";
  const [min, hour, dom, , dow] = parts;
  // 分/时非纯数字(含 * / , - 步进/范围/通配)= 无固定时刻 → 不硬套"每天",原样显示。
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour)) return cron;
  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dom === "*" && dow === "*") return `每天 ${time}`;
  if (dom === "*" && dow === "1-5") return `工作日 ${time}`;
  if (dom === "*" && /^[0-6]$/.test(dow)) return `每周${WEEK[+dow]} ${time}`;
  if (/^\d+$/.test(dom) && dow === "*") return `每月${dom}号 ${time}`;
  return cron; // 高级 cron 原样
}
