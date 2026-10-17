"use client";

import * as React from "react";
import Link from "next/link";
import { Button, Banner } from "@connectapp/ui";
import { letMeIn } from "./actions";

/**
 * HRT-402. Three states, one screen: nobody signed in, somebody signed in who
 * is not on the team, and somebody who is and has only to press through.
 */
export function Gate({
  next, email, onTheTeam,
}: {
  next: string;
  email: string | null;
  onTheTeam: boolean;
}) {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-5 rounded-[16px] border border-line bg-surface p-7">
        <p className="m-0 text-caption font-semibold tracking-[0.14em] text-ember-800 uppercase">
          ● Sandbox
        </p>

        {!email ? (
          <>
            <h1 className="m-0 text-[22px] font-semibold text-fg">
              This is a managed site
            </h1>
            <Button asChild>
              <Link href={`/sign-in?next=${encodeURIComponent(`/dev-gate?next=${next}`)}`}>
                Sign in
              </Link>
            </Button>
          </>
        ) : !onTheTeam ? (
          <>
            <h1 className="m-0 text-[22px] font-semibold text-fg">
              This is a managed site
            </h1>
            <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
              {email} is not on it.
            </p>
            <Button asChild variant="secondary">
              <Link href="/auth/sign-out">Sign out</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="m-0 text-[22px] font-semibold text-fg">
              Welcome back
            </h1>
            <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">{email}</p>
            {error ? <Banner tone="danger" title="That did not work">{error}</Banner> : null}
            <Button
              disabled={pending}
              loading={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await letMeIn(next);
                  setError(
                    result?.error === "not-on-the-team"
                      ? "That account is not on the team."
                      : result?.error,
                  );
                });
              }}
            >
              Continue
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
