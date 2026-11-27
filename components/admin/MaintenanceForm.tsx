"use client";

import { useActionState } from "react";
import { createMaintenanceAction, updateMaintenanceAction } from "@/app/admin/actions";
import { MAX_BODY, MAX_TITLE, toUtcInput } from "./constants";
import type { Maintenance } from "@/lib/status/types";
import { ComponentPicker, selectedFromValues } from "./ComponentPicker";
import { Checkbox, Field, FormError, SubmitButton } from "./Field";
import type { FormState } from "./types";
import { inputCls } from "./ui";

/** All times are UTC: the inputs are labelled "UTC" and parsed as UTC on the server. */
export function MaintenanceForm({ maintenance }: { maintenance?: Maintenance }) {
  const [state, action] = useActionState<FormState, FormData>(
    maintenance ? updateMaintenanceAction : createMaintenanceAction,
    {},
  );
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const selected =
    selectedFromValues(state.values) ?? Object.fromEntries((maintenance?.componentIds ?? []).map((id) => [id, ""]));
  return (
    <form action={action} className="flex flex-col gap-5">
      {maintenance && <input type="hidden" name="id" value={maintenance.id} />}
      <FormError message={e.form} />
      <Field label="Title" htmlFor="m-title" error={e.title} hint={`Up to ${MAX_TITLE} characters.`}>
        <input id="m-title" name="title" required defaultValue={v.title ?? maintenance?.title} className={inputCls} />
      </Field>
      <Field label="Description" htmlFor="m-body" error={e.body} hint={`Shown publicly. Up to ${MAX_BODY} characters.`}>
        <textarea id="m-body" name="body" rows={4} required defaultValue={v.body ?? maintenance?.body} className={inputCls} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start (UTC)" htmlFor="m-start" error={e.start}>
          <input
            id="m-start"
            name="start"
            type="datetime-local"
            required
            defaultValue={v.start ?? (maintenance ? toUtcInput(maintenance.scheduledStart) : "")}
            className={`${inputCls} num`}
          />
        </Field>
        <Field label="End (UTC)" htmlFor="m-end" error={e.end}>
          <input
            id="m-end"
            name="end"
            type="datetime-local"
            required
            defaultValue={v.end ?? (maintenance ? toUtcInput(maintenance.scheduledEnd) : "")}
            className={`${inputCls} num`}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Enter times in <span className="num text-fg">UTC</span>, not your local time zone.
      </p>
      <ComponentPicker selected={selected} withStatus={false} error={e.components} />
      {!maintenance && (
        <Checkbox name="discord" label="Post to Discord" defaultChecked={state.values ? v.discord === "on" : false} />
      )}
      <div>
        <SubmitButton>{maintenance ? "Save changes" : "Schedule maintenance"}</SubmitButton>
      </div>
    </form>
  );
}
