import { useMemo } from "react";
import { creativeEnginesStore } from "./store.ts";
import { useCreativeEnginesStore } from "./hooks/useCreativeEnginesStore.ts";

export function StoryTimelineEditor(): JSX.Element {
  const narrativeNodes = useCreativeEnginesStore((s) => s.narrativeNodes);
  const selectedId = useCreativeEnginesStore((s) => s.selectedNarrativeId);
  const validationIssues = useCreativeEnginesStore((s) => s.validationIssues);

  const byAct = useMemo(() => {
    const map = new Map<number, typeof narrativeNodes>();
    for (const node of narrativeNodes) {
      const list = map.get(node.actIndex) ?? [];
      list.push(node);
      map.set(node.actIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [narrativeNodes]);

  const issueByNode = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of validationIssues) {
      if (issue.engine === "narrative" || issue.engine === "cross") {
        for (const id of issue.relatedIds) {
          map.set(id, (map.get(id) ?? 0) + 1);
        }
      }
    }
    return map;
  }, [validationIssues]);

  return (
    <div className="ce-timeline-editor" role="region" aria-label="Story timeline editor">
      <div className="ce-timeline-toolbar">
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            creativeEnginesStore.addNarrativeNode({
              kind: "dialogue_trigger",
              label: "New dialogue trigger",
              track: "adult",
              actIndex: (byAct.length > 0 ? byAct[byAct.length - 1]![0] : 0) + 1,
              puzzleIds: [],
              dialogueTrigger: `trigger_${Date.now()}`,
              triggerRef: `trigger_${Date.now()}`,
            })
          }
        >
          Add trigger
        </button>
      </div>

      <div className="ce-timeline-track-labels" aria-hidden>
        <span className="ce-track-badge ce-track-badge--adult">Adult track</span>
        <span className="ce-track-badge ce-track-badge--junior">Junior track</span>
      </div>

      <ol className="ce-timeline-acts" aria-label="Narrative acts timeline">
        {byAct.map(([actIndex, nodes]) => (
          <li key={actIndex} className="ce-timeline-act">
            <header className="ce-timeline-act-head">
              <span className="ce-act-index">Act {actIndex}</span>
              <span className="muted">{nodes.filter((n) => n.kind === "act").map((n) => n.label).join(" · ") || "Untitled act"}</span>
            </header>
            <ul className="ce-timeline-nodes" role="tree" aria-label={`Act ${actIndex} nodes`}>
              {nodes.map((node) => {
                const selected = node.id === selectedId;
                const issueCount = issueByNode.get(node.id) ?? 0;
                return (
                  <li key={node.id} role="treeitem" aria-selected={selected} aria-expanded="true">
                    <button
                      type="button"
                      className={`ce-timeline-node ce-timeline-node--${node.kind}${selected ? " ce-timeline-node--selected" : ""}${issueCount ? " ce-timeline-node--error" : ""}`}
                      onClick={() => creativeEnginesStore.selectNarrative(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Delete") {
                          e.preventDefault();
                          creativeEnginesStore.deleteNarrativeNode(node.id);
                        }
                      }}
                    >
                      <span className="ce-node-kind">{node.kind.replace("_", " ")}</span>
                      <span className="ce-node-label">{node.label}</span>
                      <span className={`ce-track-pill ce-track-pill--${node.track}`}>{node.track}</span>
                      {node.dialogueTrigger ? (
                        <span className="ce-node-trigger" title="Dialogue trigger">
                          ⚡ {node.dialogueTrigger}
                        </span>
                      ) : null}
                      {issueCount ? <span className="ce-node-issue-badge">{issueCount} issue(s)</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <table className="ce-a11y-mirror-table" aria-label="Keyboard navigable narrative tree mirror">
        <caption className="sr-only">Narrative timeline mirror for screen readers</caption>
        <thead>
          <tr>
            <th scope="col">Act</th>
            <th scope="col">Kind</th>
            <th scope="col">Label</th>
            <th scope="col">Track</th>
            <th scope="col">Puzzles</th>
          </tr>
        </thead>
        <tbody>
          {narrativeNodes.map((node) => (
            <tr key={`mirror-${node.id}`} tabIndex={0} onFocus={() => creativeEnginesStore.selectNarrative(node.id)}>
              <td>{node.actIndex}</td>
              <td>{node.kind}</td>
              <td>{node.label}</td>
              <td>{node.track}</td>
              <td>{node.puzzleIds.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
