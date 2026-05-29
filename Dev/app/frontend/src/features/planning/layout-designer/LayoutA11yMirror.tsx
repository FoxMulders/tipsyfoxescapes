import type { RoomLayoutDocument } from "../../../../../shared/roomLayout";

type LayoutA11yMirrorProps = {
  layout: RoomLayoutDocument;
  announcement: string;
};

export function LayoutA11yMirror({ layout, announcement }: LayoutA11yMirrorProps) {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <p>{announcement}</p>
      <table>
        <caption>Room layout elements</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Type</th>
            <th scope="col">X (m)</th>
            <th scope="col">Y (m)</th>
          </tr>
        </thead>
        <tbody>
          {layout.elements.length === 0 ? (
            <tr>
              <td colSpan={4}>No items placed yet.</td>
            </tr>
          ) : (
            layout.elements.map((el, idx) => (
              <tr key={el.id}>
                <td>
                  Item {idx + 1}: {el.label}
                </td>
                <td>{el.kind}</td>
                <td>{el.xM}</td>
                <td>{el.yM}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
