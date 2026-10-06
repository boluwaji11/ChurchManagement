import { t } from "@connectapp/i18n";
import { SignOutButton } from "./sign-out-button";

/**
 * R1.7. Who is signed in, on the right of the bar.
 *
 * It used to sit under the heading of whichever screen somebody was on, where
 * it read as part of the question being asked. It belongs with the account, and
 * the account lives in the bar.
 */
export function SignedInAs({ email }: { email: string }) {
  return (
    <div className="ml-auto flex flex-none items-center gap-3">
      {/* The address carries the colour, because it is the part somebody checks
          before they go any further. */}
      <span className="hidden max-w-[320px] truncate text-[14px] text-fg-muted sm:inline">
        {t("chooseChurch.signedInAs")
          .split("{email}")
          .flatMap((part, i) =>
            i === 0
              ? [part]
              : [
                  <span key="email" className="font-medium text-primary">
                    {email}
                  </span>,
                  part,
                ],
          )}
      </span>
      <SignOutButton className="min-h-8 gap-1.5 rounded-lg px-3 text-[13px]" />
    </div>
  );
}
