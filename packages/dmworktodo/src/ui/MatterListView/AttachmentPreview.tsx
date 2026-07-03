/**
 * [INPUT]: @octo/base MarkdownContent(md 渲染);URL 由调用方 resolveAndGuardUrl 校验后传入。
 * [OUTPUT]: 对外默认导出 AttachmentPreview —— 附件预览 overlay(欠账 §9-④,
 *           vanilla openAttachPreview L8074-8116 直译)。
 * [POS]: dmworktodo/ui/MatterListView 的附件预览模态,MatterDetailView TlAttachments 点击挂载,
 *        portal 到 body。分支:pdf→fetch blob+objectURL iframe(dev 跨源直嵌 PDF viewer 不渲染,
 *        blob 恒同源)/ html→沙箱 iframe(allow-same-origin)/ md→fetch 文本+markdown /
 *        图片→居中 img(React 扩展,vanilla 此类落"下载")/ 其它→"此格式暂不支持预览"+下载。
 *        Esc/遮罩/×关闭。
 * [PROTOCOL]: 变更时更新此头部,然后检查 CLAUDE.md
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import MarkdownContent from "@octo/base/src/Messages/Text/MarkdownContent";

const IMG_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);

export default function AttachmentPreview({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  const ext = (name.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const isMd = ext === "md" || ext === "markdown";
  const isPdf = ext === "pdf";
  const [mdText, setMdText] = useState<string | null>(null);
  const [mdErr, setMdErr] = useState(false);
  // pdf 走 blob objectURL:dev 下 vite(:3000)跨源嵌网关(:28080)的 iframe,Chrome PDF viewer
  // 不渲染(哭脸,顶层/同源均正常,CDP 实测);blob 恒同源,prod 同源部署下也无害。
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState(false);

  useEffect(() => {
    if (!isMd) return;
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => {
        if (alive) setMdText(t);
      })
      .catch(() => {
        if (alive) setMdErr(true);
      });
    return () => {
      alive = false;
    };
  }, [url, isMd]);

  useEffect(() => {
    if (!isPdf) return;
    let alive = true;
    let obj: string | null = null;
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        const o = URL.createObjectURL(
          b.type === "application/pdf" ? b : new Blob([b], { type: "application/pdf" }),
        );
        // 关闭早于 fetch 完成:cleanup 时 obj 还是 null,迟到的 objectURL 无人回收——就地 revoke(codex)。
        if (!alive) {
          URL.revokeObjectURL(o);
          return;
        }
        obj = o;
        setPdfUrl(o);
      })
      .catch(() => {
        if (alive) setPdfErr(true);
      });
    return () => {
      alive = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [url, isPdf]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // vanilla triggerDownload:同源文件 download 属性直下;跨源浏览器会退化为导航。
  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  let body: React.ReactNode;
  if (isPdf) {
    body = pdfErr ? (
      <div className="mdv-ap-fallback">
        <div className="mdv-ap-err">加载失败</div>
        <button type="button" className="mdv-ap-dl" onClick={download}>
          下载文件
        </button>
      </div>
    ) : pdfUrl === null ? (
      <div className="mdv-ap-fallback">
        <div className="mdv-ap-dim">加载中…</div>
      </div>
    ) : (
      <iframe className="mdv-ap-frame" src={pdfUrl} title={name} />
    );
  } else if (ext === "html" || ext === "htm") {
    body = <iframe className="mdv-ap-frame" sandbox="allow-same-origin" src={url} title={name} />;
  } else if (isMd) {
    body = (
      <div className="mdv-ap-md">
        {mdErr ? (
          <div className="mdv-ap-err">加载失败</div>
        ) : mdText === null ? (
          <div className="mdv-ap-dim">加载中…</div>
        ) : (
          <MarkdownContent content={mdText} />
        )}
      </div>
    );
  } else if (IMG_EXT.has(ext)) {
    body = (
      <div className="mdv-ap-imgwrap">
        <img className="mdv-ap-img" src={url} alt={name} />
      </div>
    );
  } else {
    body = (
      <div className="mdv-ap-fallback">
        <div className="mdv-ap-dim">此格式暂不支持预览</div>
        <button type="button" className="mdv-ap-dl" onClick={download}>
          下载文件
        </button>
      </div>
    );
  }

  return createPortal(
    <div
      className="mdv-ap-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mdv-ap-box" role="dialog" aria-modal="true" aria-label={`预览 ${name}`}>
        <div className="mdv-ap-head">
          <span className="mdv-ap-name" title={name}>
            {name}
          </span>
          <button type="button" className="mdv-ap-x" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mdv-ap-body">{body}</div>
      </div>
    </div>,
    document.body,
  );
}
