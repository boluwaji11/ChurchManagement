"use client";

import * as React from "react";
import { Copy, ExternalLink } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, IconButton, Input, Separator, Switch, Textarea,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { saveDomain, setSignup } from "./domain-actions";

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
export function OnYourSite({ origin, slug, selfSignup, domain, appHost }: {
  origin: string;
  slug: string;
  /** R1.7. Whether somebody can make an account from the church's own address. */
  selfSignup: boolean;
  /** R1.1. The church's own address, where it has pointed one here. */
  domain: string | null;
  /** What a church points its CNAME at. */
  appHost: string;
}) {
  const [open, setOpen] = React.useState(selfSignup);
  const [draft, setDraft] = React.useState(domain ?? "");
  const [saved, setSaved] = React.useState(domain);
  const [error, setError] = React.useState<string>();
  const [pending, start] = React.useTransition();

  const accountLink = `${origin}/join/${slug}`;
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
        {/* R1.7. The address a church puts behind "My account" on its own
            website. There is no code to hand out: the address names the church,
            and the switch below decides whether it is open. */}
        <div className="flex flex-col gap-3">
          <Copyable label={t("site.account")} value={accountLink} open={accountLink} />
          <label className="flex cursor-pointer items-center gap-3 text-[length:var(--d-text-body)] text-fg">
            <Switch
              checked={open}
              disabled={pending}
              onCheckedChange={(on) => {
                setOpen(on);
                start(async () => {
                  const answer = await setSignup(on);
                  if (answer?.error) {
                    setOpen(!on);
                    setError(answer.error);
                  }
                });
              }}
            />
            {t("site.account.open")}
          </label>
        </div>

        <Copyable label={t("site.groups")} value={groupsLink} open={groupsLink} />
        <Copyable label={t("site.snippet")} value={snippet} rows={3} />

        {/* R1.1, R17.1. The church's own name over the whole of it. A frame
            cannot carry a session, so this is the way the signed-in screens
            live on the church's own address. */}
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <span className="font-semibold text-fg">{t("domain.title")}</span>
          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("domain.dns", { target: appHost })}
          </p>

          <div className="flex flex-wrap items-end gap-2">
            <Field label={t("domain.label")} className="min-w-[240px] flex-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("domain.hint")}
                inputMode="url"
              />
            </Field>
            <Button
              variant="secondary"
              loading={pending}
              disabled={draft.trim() === (saved ?? "")}
              onClick={() =>
                start(async () => {
                  const back = await saveDomain(draft, slug);
                  setError(back.error);
                  if (!back.error) {
                    setSaved(back.domain ?? null);
                    setDraft(back.domain ?? "");
                  }
                })
              }
            >
              {t("action.save")}
            </Button>
          </div>

          {error ? <Banner tone="danger" title={t("domain.title")}>{error}</Banner> : null}
        </div>
      </div>
    </Card>
  );
}
