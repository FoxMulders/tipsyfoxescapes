import { useCallback, useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  buildRoomFlowchartMermaid,
  wrapMermaidMarkdown,
  type FlowchartPuzzle,
  type FlowchartStoryPlan,
} from "../roomFlowchart.ts";

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
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed."))), "image/png");
  });
};

export function RoomFlowchartPanel({ storyPlan, puzzles, themeName, fileBase = "room-flow" }: RoomFlowchartPanelProps) {
  const reactId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mermaidSource = buildRoomFlowchartMermaid(storyPlan, puzzles);

  const renderChart = useCallback(async () => {
    if (!mermaidSource || !containerRef.current) {
      setSvgMarkup("");
      return;
    }
    setBusy(true);
    setRenderError(null);
    try {
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not render flowchart.";
      setRenderError(msg);
      setSvgMarkup("");
      if (containerRef.current) containerRef.current.innerHTML = "";
    } finally {
      setBusy(false);
    }
  }, [mermaidSource, reactId]);

  useEffect(() => {
    void renderChart();
  }, [renderChart]);

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
      </div>
      {renderError ? <p className="error-inline room-flowchart-error">{renderError}</p> : null}
      <div ref={containerRef} className="room-flowchart-canvas" aria-label="Room flow Mermaid diagram" />
      <details className="room-flowchart-source">
        <summary className="muted">Mermaid source</summary>
        <pre className="code-block allow-select">{mermaidSource}</pre>
      </details>
    </div>
  );
}
