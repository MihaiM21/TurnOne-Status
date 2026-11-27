/** State returned by form Server Actions (consumed with useActionState). */
export interface FormState {
  /** Per-field errors; `form` is a general error. */
  errors?: Record<string, string>;
  /** Submitted values, so the form can be refilled after an error (React resets forms). */
  values?: Record<string, string>;
}

/** Flattens FormData to strings; `comp` checkboxes become `comp:<id>` = "on". */
export function formToValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    if (k === "comp") out[`comp:${v}`] = "on";
    else out[k] = v;
  }
  return out;
}
