/**
 * Guardrails for LLM-generated Arduino preview sketches (Step 2 compiler).
 * Aligns with arduinoResourceRouter production patterns: INPUT_PULLUP, millis(), core libs only.
 */

export type FirmwarePreviewIssue = {
  code: string;
  message: string;
};

const INCLUDE_RE = /#include\s*[<"]([^">]+)[">]/g;

/** Third-party headers allowed only when the parts list names that hardware. */
const thirdPartyIncludeAllowed = (header: string, partsBlob: string): boolean => {
  const h = header.toLowerCase();
  const parts = partsBlob.toLowerCase();
  if (/mpr121|capacitive touch/.test(parts) && /mpr121|adafruit_mpr121/.test(h)) return true;
  if (/mfrc522|rfid/.test(parts) && /mfrc522|rfid/.test(h)) return true;
  return false;
};

/** Scan preview firmware for blocking delays and unapproved libraries. */
export const auditArduinoPreviewFirmware = (
  code: string,
  parts: string[] = [],
): FirmwarePreviewIssue[] => {
  const issues: FirmwarePreviewIssue[] = [];
  const trimmed = code.trim();
  if (!trimmed) return issues;

  const partsBlob = parts.join(" ");

  for (const match of trimmed.matchAll(INCLUDE_RE)) {
    const header = match[1]?.trim() ?? "";
    if (!header) continue;
    if (header === "Wire.h") continue;
    if (thirdPartyIncludeAllowed(header, partsBlob)) continue;
    issues.push({
      code: "ARDUINO_UNAPPROVED_INCLUDE",
      message: `Preview sketch must use Arduino core libraries only (found #include "${header}"). Match includes to the parts list or omit third-party headers.`,
    });
  }

  for (const match of trimmed.matchAll(/\bdelay\s*\(\s*(\d+)/g)) {
    const ms = Number.parseInt(match[1] ?? "0", 10);
    if (!Number.isFinite(ms) || ms > 50) {
      issues.push({
        code: "ARDUINO_BLOCKING_DELAY",
        message: `Preview sketch must not use blocking delay(${ms}) — use millis() state checks instead (≤50 ms only for minor debounce).`,
      });
      break;
    }
  }

  if (/\bdelay\s*\(\s*[a-zA-Z_]/.test(trimmed)) {
    issues.push({
      code: "ARDUINO_BLOCKING_DELAY",
      message: "Preview sketch must not use delay(variable) — use millis() for non-blocking timing.",
    });
  }

  if (/\bINPUT_PULLDOWN\b/.test(trimmed)) {
    issues.push({
      code: "ARDUINO_PULLDOWN_MODE",
      message: "Use INPUT_PULLUP for switches in preview sketches, not INPUT_PULLDOWN.",
    });
  }

  if (/\bdigitalRead\s*\(/.test(trimmed) && /\bpinMode\s*\([^)]*,\s*INPUT\s*\)/.test(trimmed) && !/\bINPUT_PULLUP\b/.test(trimmed)) {
    issues.push({
      code: "ARDUINO_FLOATING_INPUT",
      message: "Switch inputs must use pinMode(PIN, INPUT_PULLUP) to avoid floating pins.",
    });
  }

  if (!/\bmillis\s*\(\s*\)/.test(trimmed) && /\bloop\s*\(\s*\)/.test(trimmed) && /\bdigitalRead\s*\(/.test(trimmed)) {
    issues.push({
      code: "ARDUINO_NO_MILLIS",
      message: "Preview loop() must use millis() for non-blocking state checks when reading inputs.",
    });
  }

  return issues;
};

export const formatPinoutMapComment = (pinout: Record<string, number | string>): string => {
  const lines = Object.entries(pinout).map(([role, pin]) => `// ${role}: ${pin}`);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
};
