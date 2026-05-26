import PDFDocument from "pdfkit";

const BRAND = {
  teal: "#2ec4b6",
  tealDark: "#1a8f84",
  navy: "#0b1220",
  slate: "#334155",
  muted: "#64748b",
  amber: "#f59e0b",
  white: "#f8fafc",
};

const DISCLAIMER =
  "Tipsy Fox Escapes provides puzzle frameworks and narrative storylines only. We assume no liability or responsibility for physical construction, property damage, or personal injury. It is the sole responsibility of the user to implement strict safety precautions and verify that all physical puzzles are safe to build, install, and operate prior to construction.";

/** Branded, readable PDF from markdown export (trial conversion-quality layout). */
export function markdownExportToPdfBuffer(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "LETTER", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 48;

    const ensureSpace = (blockHeight = 24): void => {
      if (doc.y + blockHeight > bottomLimit) doc.addPage();
    };

    const drawHeaderBand = (): void => {
      const bandH = 56;
      doc.save();
      doc.rect(0, 0, doc.page.width, bandH).fill(BRAND.navy);
      doc.fillColor(BRAND.teal).font("Helvetica-Bold").fontSize(18);
      doc.text("Tipsy Fox Escapes", doc.page.margins.left, 18, { width: pageWidth });
      doc.fillColor(BRAND.white).font("Helvetica").fontSize(10);
      doc.text("Escape Room Plan — Host Runbook", doc.page.margins.left, 38, { width: pageWidth });
      doc.restore();
      doc.y = bandH + 16;
    };

    const drawSectionRule = (): void => {
      ensureSpace(12);
      const y = doc.y;
      doc.save();
      doc.strokeColor(BRAND.teal).lineWidth(1).moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).stroke();
      doc.restore();
      doc.moveDown(0.5);
    };

    const writeBlock = (text: string, opts?: { fontSize?: number; bold?: boolean; mono?: boolean }) => {
      const fontSize = opts?.fontSize ?? 9.5;
      doc.fontSize(fontSize);
      doc.fillColor(BRAND.navy);
      doc.font(opts?.mono ? "Courier" : opts?.bold ? "Helvetica-Bold" : "Helvetica");
      const lines = text.split("\n");
      for (const line of lines) {
        ensureSpace(14);
        const trimmed = line.trimEnd();
        if (!trimmed) {
          doc.moveDown(0.35);
          continue;
        }
        if (trimmed.startsWith("# ")) {
          doc.font("Helvetica-Bold").fontSize(16).fillColor(BRAND.tealDark).text(trimmed.slice(2), { width: pageWidth });
          doc.font("Helvetica").fontSize(fontSize).fillColor(BRAND.navy);
          drawSectionRule();
          continue;
        }
        if (trimmed.startsWith("## ")) {
          doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND.tealDark).text(trimmed.slice(3), { width: pageWidth });
          doc.font(opts?.mono ? "Courier" : "Helvetica").fontSize(fontSize).fillColor(BRAND.navy);
          doc.moveDown(0.25);
          continue;
        }
        if (trimmed.startsWith("### ")) {
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor(BRAND.slate).text(trimmed.slice(4), { width: pageWidth });
          doc.font(opts?.mono ? "Courier" : "Helvetica").fontSize(fontSize).fillColor(BRAND.navy);
          doc.moveDown(0.2);
          continue;
        }
        if (trimmed.startsWith("- ")) {
          doc.text(`  •  ${trimmed.slice(2)}`, { width: pageWidth, lineGap: 2 });
          continue;
        }
        doc.text(trimmed, { width: pageWidth, lineGap: 2 });
      }
    };

    drawHeaderBand();
    doc.font("Helvetica").fontSize(8).fillColor(BRAND.muted);
    doc.text(`Generated ${new Date().toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}`, {
      align: "right",
      width: pageWidth,
    });
    doc.fillColor(BRAND.navy);
    doc.moveDown(0.6);

    const sections = markdown.split(/\n(?=## )/);
    for (const section of sections) {
      const isDiagram =
        section.includes("Room layout sketch") ||
        section.includes("```") ||
        section.includes("│") ||
        section.includes("└");
      const isSafety = /Safety Protocols/i.test(section);
      if (isSafety) {
        ensureSpace(40);
        doc.save();
        doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 8, 2).fill(BRAND.amber);
        doc.restore();
        doc.moveDown(0.15);
      }
      writeBlock(section, { mono: isDiagram, fontSize: isDiagram ? 7.5 : 9.5 });
      doc.moveDown(0.35);
    }

    ensureSpace(60);
    doc.moveDown(0.5);
    doc.save();
    doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 52, 4).fill("#fff7ed");
    doc.fillColor(BRAND.amber).font("Helvetica-Bold").fontSize(9);
    doc.text("Liability disclaimer", doc.page.margins.left + 10, doc.y + 8, { width: pageWidth - 20 });
    doc.fillColor(BRAND.slate).font("Helvetica").fontSize(8);
    doc.text(DISCLAIMER, doc.page.margins.left + 10, doc.y + 22, { width: pageWidth - 20, lineGap: 1.5 });
    doc.restore();
    doc.y += 58;

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(BRAND.muted);
      doc.text(`Tipsy Fox Escapes · Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, {
        align: "center",
        width: pageWidth,
      });
      doc.fillColor(BRAND.navy);
    }

    doc.end();
  });
}
