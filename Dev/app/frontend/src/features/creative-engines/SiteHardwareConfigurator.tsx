import { useId, useMemo } from "react";
import { creativeEnginesStore } from "./store.ts";
import { useCreativeEnginesStore } from "./hooks/useCreativeEnginesStore.ts";

export function SiteHardwareConfigurator(): JSX.Element {
  const hardwareMappings = useCreativeEnginesStore((s) => s.hardwareMappings);
  const virtualStates = useCreativeEnginesStore((s) => s.virtualStates);
  const selectedId = useCreativeEnginesStore((s) => s.selectedHardwareId);
  const formId = useId();

  const stateById = useMemo(() => new Map(virtualStates.map((v) => [v.id, v])), [virtualStates]);
  const selected = hardwareMappings.find((r) => r.id === selectedId) ?? hardwareMappings[0];

  return (
    <div className="ce-hardware-config" role="region" aria-label="Site hardware configurator">
      <div className="ce-hardware-toolbar">
        <button
          type="button"
          className="secondary-btn"
          onClick={() =>
            creativeEnginesStore.addSensorRegister(`sensor_${Date.now()}`, "New floor sensor", "gpio-new")
          }
        >
          Add sensor register
        </button>
      </div>

      <table className="ce-hardware-matrix" aria-label="Virtual state to physical output matrix">
        <caption className="sr-only">Hardware mapping matrix</caption>
        <thead>
          <tr>
            <th scope="col">Virtual state</th>
            <th scope="col">Output</th>
            <th scope="col">Port / channel</th>
            <th scope="col">Label</th>
            <th scope="col">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {hardwareMappings.map((row) => {
            const vs = stateById.get(row.virtualStateId);
            const active = row.id === selected?.id;
            return (
              <tr
                key={row.id}
                className={active ? "ce-hardware-row--selected" : undefined}
                tabIndex={0}
                onClick={() => creativeEnginesStore.selectHardware(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") creativeEnginesStore.selectHardware(row.id);
                }}
              >
                <td>
                  <code>{vs?.label ?? row.virtualStateId}</code>
                  <span className="ce-hardware-source">{vs?.source ?? "unknown"}</span>
                </td>
                <td>
                  <span className={`ce-output-badge ce-output-badge--${row.outputKind}`}>{row.outputKind}</span>
                </td>
                <td>
                  {row.port}
                  {row.channel != null ? ` · ch ${row.channel}` : ""}
                </td>
                <td>{row.label}</td>
                <td>{row.enabled ? "Yes" : "No"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected ? (
        <form className="ce-hardware-form" aria-labelledby={`${formId}-title`} onSubmit={(e) => e.preventDefault()}>
          <h4 id={`${formId}-title`}>Edit mapping</h4>
          <label htmlFor={`${formId}-label`}>
            Label
            <input
              id={`${formId}-label`}
              type="text"
              value={selected.label}
              onChange={(e) => creativeEnginesStore.updateHardwareMapping(selected.id, { label: e.target.value })}
            />
          </label>
          <label htmlFor={`${formId}-port`}>
            Port
            <input
              id={`${formId}-port`}
              type="text"
              value={selected.port}
              onChange={(e) => creativeEnginesStore.updateHardwareMapping(selected.id, { port: e.target.value })}
            />
          </label>
          <label htmlFor={`${formId}-kind`}>
            Output kind
            <select
              id={`${formId}-kind`}
              value={selected.outputKind}
              onChange={(e) =>
                creativeEnginesStore.updateHardwareMapping(selected.id, {
                  outputKind: e.target.value as typeof selected.outputKind,
                })
              }
            >
              <option value="relay">Relay</option>
              <option value="maglock">Maglock</option>
              <option value="dmx">DMX</option>
              <option value="sensor">Sensor</option>
            </select>
          </label>
          {selected.outputKind === "dmx" ? (
            <label htmlFor={`${formId}-channel`}>
              DMX channel
              <input
                id={`${formId}-channel`}
                type="number"
                min={1}
                max={512}
                value={selected.channel ?? 1}
                onChange={(e) =>
                  creativeEnginesStore.updateHardwareMapping(selected.id, { channel: Number(e.target.value) })
                }
              />
            </label>
          ) : null}
          <label htmlFor={`${formId}-enabled`} className="ce-hardware-checkbox">
            <input
              id={`${formId}-enabled`}
              type="checkbox"
              checked={selected.enabled}
              onChange={(e) => creativeEnginesStore.updateHardwareMapping(selected.id, { enabled: e.target.checked })}
            />
            Enabled
          </label>
        </form>
      ) : (
        <p className="muted">Add puzzles to seed virtual states, then map relays, maglocks, or DMX.</p>
      )}
    </div>
  );
}
