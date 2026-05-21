/** @param {Array<{ severity: string, code: string, field: string, message: string, requiredChange?: string }>} failures */
export function printDepartmentFailures(department, failures) {
  if (!failures.length) return;
  console.error(`\n=== ${department.toUpperCase()} QA FAILED ===`);
  for (const f of failures) {
    const tag = f.severity === "error" ? "ERROR" : "WARN";
    console.error(`[${tag}] ${f.code} (${f.field}): ${f.message}`);
    if (f.requiredChange) console.error(`       → ${f.requiredChange}`);
  }
}

export function exitWithSummary(results) {
  const failed = results.filter((r) => !r.pass);
  console.log("\n--- QA suite summary ---");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.department}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  if (failed.length > 0) {
    console.error(`\n${failed.length} department(s) failed. Push blocked until resolved.`);
    process.exit(1);
  }
  console.log("\nAll QA departments passed.");
  process.exit(0);
}
