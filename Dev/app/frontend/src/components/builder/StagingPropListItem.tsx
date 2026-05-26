import { parseStagingPropLine } from "@/lib/puzzleDisplayUtils";

export function StagingPropListItem({ item }: { item: string }) {
  const { badge, body } = parseStagingPropLine(item);
  if (!badge) {
    return <li>{item}</li>;
  }
  return (
    <li className="staging-prop-item">
      <span className="staging-prop-badge">{badge}</span>
      {body ? <span className="staging-prop-body">{body}</span> : null}
    </li>
  );
}
