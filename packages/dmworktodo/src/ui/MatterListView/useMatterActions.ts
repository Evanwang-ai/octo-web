/**
 * [INPUT]: 依赖 api/todoApi 的 updateMatter/transitionMatter/deleteMatter;@octo/base 的 WKApp;
 *          utils/toast 的 Toast;调用方注入的 optimisticUpdate/removeOptimistic/reload。
 * [OUTPUT]: 对外提供 useMatterActions —— 单条回路写操作(改优先级/状态/删除)+ 乐观更新 + 广播刷新 + 失败回滚。
 * [POS]: dmworktodo/ui/MatterListView 的写操作层,被 index.tsx(列表快改/右键、看板拖拽)复用;
 *        把"改一条 + 乐观 + emit matter-updated + 失败 reload"收敛为单一真相,消除各交互处的重复。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo, type MutableRefObject } from "react";
import { WKApp } from "@octo/base";
import { updateMatter, transitionMatter, deleteMatter } from "../../api/todoApi";
import type { Matter, MatterPriority, MatterStatus } from "../../bridge/types";
import { Toast } from "../../utils/toast";

// ── 调用方注入的乐观/刷新原语(来自 useMatterList) ──
export interface MatterMutators {
  optimisticUpdate: (id: string, patch: Partial<Matter>) => void;
  removeOptimistic: (id: string) => void;
  reload: () => void;
}

export interface MatterActions {
  setPriority: (id: string, priority: number) => void;
  setStatus: (id: string, status: string) => void;
  remove: (id: string, title?: string) => void;
}

// "变更即重载"信号 —— 所有回路列表面据此静默刷新(单一信号源)。
const emitUpdated = (id: string) =>
  WKApp.mittBus.emit("wk:matter-updated", { matterId: id });

/**
 * 单条回路写操作。乐观先行(即时反馈),落库成功广播刷新,失败回滚 + Toast。
 * 状态类型 MatterStatus 为 stale 三态,实际后端七态 —— 在边界 cast,不污染上层。
 * mountedRef 守护异步回调里的 setState 触达(reload/removeOptimistic),防卸载后 setMatters;
 * emit/Toast 无组件内副作用,不守(卸载后广播仍应让其它列表面刷新)。
 */
export function useMatterActions(
  m: MatterMutators,
  mountedRef: MutableRefObject<boolean>,
): MatterActions {
  const { optimisticUpdate, removeOptimistic, reload } = m;
  return useMemo<MatterActions>(
    () => ({
      setPriority(id, priority) {
        optimisticUpdate(id, { priority: priority as MatterPriority });
        updateMatter(id, { priority: priority as MatterPriority })
          .then(() => emitUpdated(id))
          .catch(() => {
            Toast.error("优先级修改失败");
            if (mountedRef.current) reload();
          });
      },
      setStatus(id, status) {
        optimisticUpdate(id, { status: status as MatterStatus });
        transitionMatter(id, status as MatterStatus)
          .then(() => emitUpdated(id))
          .catch(() => {
            Toast.error("状态流转被拒绝");
            if (mountedRef.current) reload();
          });
      },
      remove(id, title) {
        if (!window.confirm(`删除回路${title ? `「${title}」` : ""}?此操作不可撤销。`)) return;
        deleteMatter(id)
          .then(() => {
            if (mountedRef.current) removeOptimistic(id);
            WKApp.mittBus.emit("wk:matter-deleted", { matterId: id });
            Toast.success("已删除");
          })
          .catch(() => Toast.error("删除失败"));
      },
    }),
    [optimisticUpdate, removeOptimistic, reload, mountedRef],
  );
}
