"use client";

import * as React from "react";
import { useActionState } from "react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { signIn, type Done } from "../actions";

/** R21.x. An address and a password, and the second gate behind them. */
export function SignInForm() {
  const [state, action, pending] = useActionState<Done, FormData>(signIn, {});

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-4 rounded-[18px] border border-line bg-surface p-6 shadow-sm"
    >
      <h1 className="font-display text-[22px] text-fg">Sign in</h1>

      {state.error ? <Banner tone="danger" title="That did not work">{state.error}</Banner> : null}

      <Field label="Email address" required>
        <Input name="email" type="email" autoComplete="email" autoFocus />
      </Field>

      <Field label="Password" required>
        <Input name="password" type="password" autoComplete="current-password" />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
