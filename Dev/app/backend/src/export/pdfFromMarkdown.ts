import PDFDocument from "pdfkit";

/** Paginated plain-text PDF from markdown export (flowchart sketch preserved as monospace lines). */
export function markdownExportToPdfBuffer(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "LETTER", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottomLimit = doc.page.height - doc.page.margins.bottom - 24;

    const writeBlock = (text: string, opts?: { fontSize?: number; bold?: boolean; mono?: boolean }) => {
      const fontSize = opts?.fontSize ?? 9;
      doc.fontSize(fontSize);
      doc.font(opts?.mono ? "Courier" : opts?.bold ? "Helvetica-Bold" : "Helvetica");
      const lines = text.split("\n");
      for (const line of lines) {
        if (doc.y > bottomLimit) doc.addPage();
        const trimmed = line.trimEnd();
        if (!trimmed) {
          doc.moveDown(0.35);
          continue;
        }
        if (trimmed.startsWith("# ")) {
          doc.font("Helvetica-Bold").fontSize(14).text(trimmed.slice(2), { width: pageWidth });
          doc.font("Helvetica").fontSize(fontSize);
          doc.moveDown(0.4);
          continue;
        }
        if (trimmed.startsWith("## ")) {
          doc.font("Helvetica-Bold").fontSize(11).text(trimmed.slice(3), { width: pageWidth });
          doc.font(opts?.mono ? "Courier" : "Helvetica").fontSize(fontSize);
          doc.moveDown(0.3);
          continue;
        }
        doc.text(trimmed, { width: pageWidth, lineGap: 2 });
      }
    };

    doc.font("Helvetica-Bold").fontSize(16).text("Escape Room Plan", { align: "center", width: pageWidth });
    doc.moveDown(0.6);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555555")
      .text(`Generated ${new Date().toISOString()}`, { align: "center", width: pageWidth });
    doc.fillColor("#000000");
    doc.moveDown(0.8);

    const sections = markdown.split(/\n(?=## )/);
    for (const section of sections) {
      const isDiagram =
        section.includes("Room layout sketch") ||
        section.includes("```") ||
        section.includes("│") ||
        section.includes("└");
      writeBlock(section, { mono: isDiagram, fontSize: isDiagram ? 7.5 : 9 });
      doc.moveDown(0.35);
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#666666");
      doc.text(`Page ${i + 1} of ${range.count}`, 48, doc.page.height - 36, {
        align: "center",
        width: pageWidth,
      });
      doc.fillColor("#000000");
    }

    doc.end();
  });
}
