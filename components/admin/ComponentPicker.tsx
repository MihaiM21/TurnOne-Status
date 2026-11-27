import { COMPONENTS, GROUPS } from "@/lib/status/components";
import { FORCED_STATUSES } from "./constants";
import { STATUS_META } from "@/components/status/statusMeta";
import { inputCls } from "./ui";

/** id -> forced status (or "" for plain mode), from submitted form values. */
export function selectedFromValues(values: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!values) return undefined;
  const out: Record<string, string> = {};
  for (const k of Object.keys(values)) {
    if (k.startsWith("comp:")) {
      const id = k.slice(5);
      out[id] = values[`status_${id}`] ?? "";
    }
  }
  return out;
}

/**
 * Checkbox per registry component, grouped. With `withStatus` each row also gets a
 * status select (degraded / partial outage / major outage); names: `comp`, `status_<id>`.
 */
export function ComponentPicker({
  selected,
  withStatus = true,
  error,
}: {
  selected: Record<string, string>;
  withStatus?: boolean;
  error?: string;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="label mb-2 p-0">Affected components</legend>
      {GROUPS.map((g) => {
        const items = COMPONENTS.filter((c) => c.group === g.id);
        if (!items.length) return null;
        return (
          <div key={g.id}>
            <p className="mb-1.5 text-xs font-medium text-muted">{g.name}</p>
            <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
              {items.map((c) => {
                const on = c.id in selected;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2"
                  >
                    <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="comp"
                        value={c.id}
                        defaultChecked={on}
                        className="size-4 shrink-0 accent-[#d40924]"
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                    {withStatus && (
                      <select
                        name={`status_${c.id}`}
                        defaultValue={selected[c.id] || "degraded"}
                        aria-label={`Status for ${c.name}`}
                        className={`${inputCls} !w-auto !py-1 text-xs`}
                      >
                        {FORCED_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-xs text-major">
          {error}
        </p>
      )}
    </fieldset>
  );
}
