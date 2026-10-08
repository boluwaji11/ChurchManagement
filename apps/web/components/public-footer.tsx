import * as React from "react";
import type { PublicChurch } from "@connectapp/db";

/** A hairline between two things in the line, never before the first. */
function Rule() {
  return <span aria-hidden className="h-3.5 w-px bg-line-strong" />;
}

/**
 * R24.6. Who to reach, at the foot of a page the open web reads.
 *
 * The church's name and whatever it has given to be contacted on. The name
 * opens the church's own website where it has one, because somebody who landed
 * on an event page from a bulletin often wants the church rather than the
 * event. A church that has filled in nothing gets its name and no rule.
 */
export function PublicFooter({ church }: { church: PublicChurch }) {
  const site = church.website?.trim();
  const href = site
    ? /^https?:\/\//i.test(site) ? site : `https://${site}`
    : null;

  const parts: React.ReactNode[] = [
    href ? (
      <a
        key="name"
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="flex min-h-11 items-center font-medium underline-offset-4 hover:text-fg hover:underline sm:min-h-0"
      >
        {church.name}
      </a>
    ) : (
      <span key="name">{church.name}</span>
    ),
    church.email ? (
      <a
        key="email"
        href={`mailto:${church.email}`}
        className="flex min-h-11 items-center underline-offset-4 hover:text-fg hover:underline sm:min-h-0"
      >
        {church.email}
      </a>
    ) : null,
    church.phone ? (
      <a
        key="phone"
        href={`tel:${church.phone.replace(/[^+\d]/g, "")}`}
        className="flex min-h-11 items-center underline-offset-4 hover:text-fg hover:underline sm:min-h-0"
      >
        {church.phone}
      </a>
    ) : null,
  ].filter(Boolean);

  return (
    /* The last thing on the page, so it carries the inset at the foot of an
       installed phone screen as well as its own padding. */
    <footer className="mt-auto border-t border-line pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-4 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))]">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-caption text-fg-muted">
        {parts.map((part, at) => (
          <React.Fragment key={at}>
            {at > 0 ? <Rule /> : null}
            {part}
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
}
