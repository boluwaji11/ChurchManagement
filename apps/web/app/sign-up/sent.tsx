"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { resendSignUp } from "./actions";
import { AUTH_BUTTON } from "../auth-shell";

/**
 * R1.7. The stop between making an account and starting a church.
 *
 * Built like the rest of the site rather than left as a banner where the form
 * used to be: the address in full, so a typo is visible, and the two things
 * somebody does when the email has not come.
 */
export function SignUpSent({ email, next }: { email: string; next?: string }) {
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Mail className="size-7" />
      </span>

      <div className="flex flex-col gap-2">
        <p className="m-0 text-[17px] leading-7 text-fg">
          {t("signUp.sent.body")
            .split("{email}")
            .flatMap((part, i) =>
              i === 0
                ? [part]
                : [
                    <strong key="email" className="font-semibold text-fg">
                      {email}
                    </strong>,
                    part,
                  ],
            )}
        </p>
        <p className="m-0 text-[15px] text-fg-muted">
          {done ? t("signUp.sent.resent") : t("signUp.sent.wait")}
        </p>
        {error ? <p className="m-0 text-[15px] text-danger-text">{error}</p> : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        full
        className={AUTH_BUTTON}
        disabled={pending || done}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("email", email);
            if (next) data.set("next", next);
            const answer = await resendSignUp(data);
            if (answer.error) setError(answer.error);
            else setDone(true);
          })
        }
      >
        {t("signUp.sent.again")}
      </Button>

      <Link
        href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        className="text-[15px] font-medium text-primary"
      >
        {t("signUp.sent.other")}
      </Link>
    </div>
  );
}
