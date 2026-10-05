"use client";

import * as React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Card, CardTitle, Field, IconButton, Input, Separator, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/** One thing to copy, with the button that copies it. */
function Copyable({
  label,
  value,
  open,
  rows,
}: {
  label: string;
  value: string;
  /** Where it goes, for the one that is a link rather than a snippet. */
  open?: string;
  rows?: number;
}) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <Field label={label}>
        {rows ? (
          <Textarea readOnly rows={rows} value={value} onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <Input readOnly value={value} onFocus={(e) => e.currentTarget.select()} />
        )}
      </Field>

      <div className="flex items-center gap-1">
        <IconButton
          label={copied ? t("joining.copied") : t("joining.copy")}
          variant="ghost"
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy />
        </IconButton>
        {open ? (
          <a
            href={open}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("site.open")}
            title={t("site.open")}
            className="inline-flex size-[var(--d-tap)] items-center justify-center rounded-[var(--d-radius-control)] text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-[var(--d-icon)]"
          >
            <ExternalLink />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * R9.5, R17.1. What a church puts on its own website.
 *
 * The member's door and the group finder, as a link and as a snippet. A church
 * pastes these into the site it already has, which is where its congregation
 * goes looking.
 *
 * The member's door is a link rather than a frame. Signing in inside somebody
 * else's page makes the session a third-party cookie, and Safari and Chrome
 * both refuse those, so a framed sign-in is a sign-in that works until it
 * quietly does not. The finder has no session and frames fine.
 */
export function OnYourSite({ origin, slug, joinCode }: {
  origin: string;
  slug: string;
  joinCode: string | null;
}) {
  const groupsLink = `${origin}/g/${slug}`;
  // The title is read by whoever lands on the church's page with a screen
  // reader, so it is the church's word for groups rather than ours.
  const snippet =
    `<iframe src="${groupsLink}/embed" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  return (
    <Card>
      <CardTitle>{t("site.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-5">
        {joinCode ? (
          <Copyable
            label={t("site.account")}
            value={`${origin}/join/${joinCode}`}
            open={`${origin}/join/${joinCode}`}
          />
        ) : null}

        <Copyable label={t("site.groups")} value={groupsLink} open={groupsLink} />
        <Copyable label={t("site.snippet")} value={snippet} rows={3} />
      </div>
    </Card>
  );
}
