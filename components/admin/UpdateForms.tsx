"use client";

import { useActionState } from "react";
import { editIncidentAction, postUpdateAction, resolveIncidentAction } from "@/app/admin/actions";
import { DEFAULT_RESOLVE_BODY, IMPACTS, MAX_BODY, MAX_TITLE, UPDATE_STATES } from "./constants";
import { IMPACT_META, INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import type { Incident } from "@/lib/status/types";
import { ComponentPicker, selectedFromValues } from "./ComponentPicker";
import { Checkbox, Field, FormError, SubmitButton } from "./Field";
import type { FormState } from "./types";
import { btnCls, inputCls } from "./ui";

export function PostUpdateForm({ incident }: { incident: Incident }) {
  const [state, action] = useActionState<FormState, FormData>(postUpdateAction, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const current = Object.fromEntries(incident.components.map((c) => [c.id, c.status as string]));
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={incident.id} />
      <FormError message={e.form} />
      <Field label="State" htmlFor="u-state" error={e.state}>
        <select
          id="u-state"
          name="state"
          defaultValue={v.state ?? (incident.state === "resolved" ? "monitoring" : incident.state)}
          className={inputCls}
        >
          {UPDATE_STATES.map((s) => (
            <option key={s} value={s}>
              {INCIDENT_STATE_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Update" htmlFor="u-body" error={e.body} hint={`Shown publicly. Up to ${MAX_BODY} characters.`}>
        <textarea id="u-body" name="body" rows={4} required defaultValue={v.body} className={inputCls} />
      </Field>
      <ComponentPicker selected={selectedFromValues(state.values) ?? current} error={e.components} />
      <Checkbox name="discord" label="Post to Discord" defaultChecked={state.values ? v.discord === "on" : true} />
      <div>
        <SubmitButton>Post update</SubmitButton>
      </div>
    </form>
  );
}

export function ResolveForm({ incidentId }: { incidentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(resolveIncidentAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={incidentId} />
      <FormError message={e.form} />
      <Field label="Resolution message" htmlFor="r-body" error={e.body}>
        <textarea
          id="r-body"
          name="body"
          rows={2}
          required
          defaultValue={state.values?.body ?? DEFAULT_RESOLVE_BODY}
          className={inputCls}
        />
      </Field>
      <Checkbox name="discord" label="Post to Discord" defaultChecked={state.values ? state.values.discord === "on" : true} />
      <div>
        <SubmitButton className={btnCls}>Resolve incident</SubmitButton>
      </div>
    </form>
  );
}

export function EditIncidentForm({ incident }: { incident: Incident }) {
  const [state, action] = useActionState<FormState, FormData>(editIncidentAction, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={incident.id} />
      <FormError message={e.form} />
      <Field label="Title" htmlFor="e-title" error={e.title} hint={`Up to ${MAX_TITLE} characters.`}>
        <input id="e-title" name="title" required defaultValue={v.title ?? incident.title} className={inputCls} />
      </Field>
      <Field label="Impact" htmlFor="e-impact" error={e.impact}>
        <select id="e-impact" name="impact" defaultValue={v.impact ?? incident.impact} className={inputCls}>
          {IMPACTS.map((i) => (
            <option key={i} value={i}>
              {IMPACT_META[i].label}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <SubmitButton className={btnCls}>Save changes</SubmitButton>
      </div>
    </form>
  );
}
