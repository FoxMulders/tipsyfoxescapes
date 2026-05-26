import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  buildRoomFlowchartMermaid,
  wrapMermaidMarkdown,
  type FlowchartPuzzle,
  type FlowchartStoryPlan,
} from "../roomFlowchart.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoomFlowchartPanelProps = {
  storyPlan: FlowchartStoryPlan | null | undefined;
  puzzles: FlowchartPuzzle[];
  themeName?: string;
  fileBase?: string;
};

const downloadBlob = (body: BlobPart, mime: string, filename: string): void => {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
};

const svgToPngBlob = async (svg: string): Promise<Blob> => {
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not rasterize flowchart."));
    img.src = encoded;
  });
  const w = Math.max(img.naturalWidth || 1200, 800);
  const h = Math.max(img.naturalHeight || 600, 400);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = "hsl(222 47% 6%)";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed."))), "image/png");
  });
};

export function RoomFlowchartPanel({ storyPlan, puzzles, themeName, fileBase = "room-flow" }: RoomFlowchartPanelProps) {
  const reactId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const mermaidSource = buildRoomFlowchartMermaid(storyPlan, puzzles);

  const renderChart = useCallback(async () => {
    if (!mermaidSource || !containerRef.current) {
      setSvgMarkup("");
      return;
    }
    setBusy(true);
    setRenderError(null);
    try {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: "dark",
        flowchart: { curve: "basis", padding: 12, htmlLabels: true },
      });
      const renderId = `erb_flow_${reactId}_${Date.now()}`;
      const { svg } = await mermaid.render(renderId, mermaidSource);
      setSvgMarkup(svg);
      containerRef.current.innerHTML = svg;
      if (lightboxRef.current) lightboxRef.current.innerHTML = svg;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not render flowchart.";
      setRenderError(msg);
      setSvgMarkup("");
      if (containerRef.current) containerRef.current.innerHTML = "";
      if (lightboxRef.current) lightboxRef.current.innerHTML = "";
    } finally {
      setBusy(false);
    }
  }, [mermaidSource, reactId]);

  useEffect(() => {
    void renderChart();
  }, [renderChart]);

  useEffect(() => {
    if (!lightboxOpen || !svgMarkup || !lightboxRef.current) return;
    lightboxRef.current.innerHTML = svgMarkup;
  }, [lightboxOpen, svgMarkup]);

  if (!mermaidSource) {
    return (
      <p className="muted room-flowchart-empty">
        Flowchart appears after puzzles are generated and linked to story stages.
      </p>
    );
  }

  const baseName = `${fileBase}-${themeName ? themeName.replace(/[^\w-]+/g, "-").slice(0, 32) : "plan"}`;

  const downloadMmd = () => {
    downloadBlob(mermaidSource, "text/plain;charset=utf-8", `${baseName}.mmd`);
  };

  const downloadMd = () => {
    const title = themeName ? `${themeName} — room flow` : "Room flow";
    downloadBlob(wrapMermaidMarkdown(mermaidSource, title), "text/markdown;charset=utf-8", `${baseName}.md`);
  };

  const downloadSvg = () => {
    if (!svgMarkup) return;
    downloadBlob(svgMarkup, "image/svg+xml;charset=utf-8", `${baseName}.svg`);
  };

  const downloadPng = async () => {
    if (!svgMarkup) return;
    try {
      const blob = await svgToPngBlob(svgMarkup);
      downloadBlob(blob, "image/png", `${baseName}.png`);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "PNG download failed.");
    }
  };

  return (
    <div className="room-flowchart-panel">
      <div className="room-flowchart-toolbar">
        <span className="muted room-flowchart-toolbar-label">Download flowchart</span>
        <button type="button" className="secondary-btn" onClick={downloadMmd} disabled={busy}>
          .mmd
        </button>
        <button type="button" className="secondary-btn" onClick={downloadMd} disabled={busy}>
          .md
        </button>
        <button type="button" className="secondary-btn" onClick={downloadSvg} disabled={busy || !svgMarkup}>
          .svg
        </button>
        <button type="button" className="secondary-btn" onClick={() => void downloadPng()} disabled={busy || !svgMarkup}>
          .png
        </button>
        <button type="button" className="secondary-btn" onClick={() => void renderChart()} disabled={busy}>
          {busy ? "Rendering…" : "Refresh chart"}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => setLightboxOpen(true)}
          disabled={busy || !svgMarkup}
        >
          Enlarge
        </button>
      </div>
      {renderError ? <p className="error-inline room-flowchart-error">{renderError}</p> : null}
      <button
        type="button"
        className="room-flowchart-canvas room-flowchart-canvas--interactive"
        aria-label="Open room flowchart enlarged"
        onClick={() => setLightboxOpen(true)}
        disabled={busy || !svgMarkup}
      >
        <div ref={containerRef} className="room-flowchart-canvas-inner" aria-hidden />
        <span className="room-flowchart-enlarge-hint">Click to enlarge and scroll</span>
      </button>
      <details className="room-flowchart-source">
        <summary className="muted">Mermaid source</summary>
        <pre className="code-block allow-select">{mermaidSource}</pre>
      </details>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="room-flowchart-lightbox">
          <DialogHeader>
            <DialogTitle>{themeName ? `${themeName} — room flow` : "Room flowchart"}</DialogTitle>
            <DialogDescription>Scroll and pan to read puzzle nodes, gates, and progression paths.</DialogDescription>
          </DialogHeader>
          <div ref={lightboxRef} className="room-flowchart-lightbox-scroll" aria-label="Enlarged room flow diagram" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
