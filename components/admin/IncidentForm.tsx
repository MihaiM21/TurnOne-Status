"use client";

import { useActionState } from "react";
import { createIncidentAction } from "@/app/admin/actions";
import { IMPACTS, OPEN_STATES, MAX_BODY, MAX_TITLE } from "./constants";
import { IMPACT_META, INCIDENT_STATE_LABEL } from "@/components/status/statusMeta";
import { ComponentPicker, selectedFromValues } from "./ComponentPicker";
import { Checkbox, Field, FormError, SubmitButton } from "./Field";
import type { FormState } from "./types";
import { inputCls } from "./ui";

export function IncidentForm() {
  const [state, action] = useActionState<FormState, FormData>(createIncidentAction, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError message={e.form} />
      <Field label="Title" htmlFor="title" error={e.title} hint={`Up to ${MAX_TITLE} characters.`}>
        <input id="title" name="title" required defaultValue={v.title} className={inputCls} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Impact" htmlFor="impact" error={e.impact}>
          <select id="impact" name="impact" defaultValue={v.impact ?? "minor"} className={inputCls}>
            {IMPACTS.map((i) => (
              <option key={i} value={i}>
                {IMPACT_META[i].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Initial state" htmlFor="state" error={e.state}>
          <select id="state" name="state" defaultValue={v.state ?? "investigating"} className={inputCls}>
            {OPEN_STATES.map((s) => (
              <option key={s} value={s}>
                {INCIDENT_STATE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ComponentPicker selected={selectedFromValues(state.values) ?? {}} error={e.components} />
      <Field label="First update" htmlFor="body" error={e.body} hint={`Shown publicly. Up to ${MAX_BODY} characters.`}>
        <textarea id="body" name="body" rows={5} required defaultValue={v.body} className={inputCls} />
      </Field>
      <Checkbox name="discord" label="Post to Discord" defaultChecked={state.values ? v.discord === "on" : true} />
      <div>
        <SubmitButton>Create incident</SubmitButton>
      </div>
    </form>
  );
}
