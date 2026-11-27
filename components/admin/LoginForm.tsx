"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { Field, FormError, SubmitButton } from "./Field";
import type { FormState } from "./types";
import { inputCls } from "./ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError message={state.errors?.form} />
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className={inputCls}
        />
      </Field>
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
