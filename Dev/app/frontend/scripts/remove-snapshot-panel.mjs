import fs from "node:fs";

const path = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(path, "utf8");
const start = "  const planningSnapshotPanel = (";
const end = "  const savedPlansManageList:";
const i0 = s.indexOf(start);
const i1 = s.indexOf(end);
if (i0 < 0 || i1 < 0) {
  console.error("markers", { i0, i1 });
  process.exit(1);
}
fs.writeFileSync(path, s.slice(0, i0) + s.slice(i1));
console.log("removed planningSnapshotPanel");
