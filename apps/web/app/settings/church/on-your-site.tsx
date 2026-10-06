"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Globe, Link2, Users } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Input, Separator, Switch, Textarea,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { saveDomain, setSignup } from "./domain-actions";

/**
 * One address, with the two things anybody does to it.
 *
 * The buttons sit on the end of the field rather than under it: the row then
 * reads as one control, and three of these down a screen do not become three
 * rows of loose icons.
 */
function Copyable({ value, open, label }: { value: string; open?: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center gap-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface pr-1 focus-within:border-fg-subtle">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[13px] text-fg outline-none"
      />

      <button
        type="button"
        aria-label={copied ? t("joining.copied") : t("joining.copy")}
        title={copied ? t("joining.copied") : t("joining.copy")}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </button>

      {open ? (
        <a
          href={open}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t("site.open")}
          title={t("site.open")}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
        >
          <ExternalLink />
        </a>
      ) : null}
    </div>
  );
}

/** The mark at the head of a card, so the three read apart at a glance. */
function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
        {icon}
      </span>
      <CardTitle>{title}</CardTitle>
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
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {/* R1.7. The address a church puts behind "My account" on its own
          website. There is no code to hand out: the address names the church,
          and the switch decides whether it is open. */}
      <Card className="flex h-full flex-col gap-4">
        <Head icon={<Link2 />} title={t("site.account")} />
        <Separator />

        <Copyable label={t("site.account")} value={accountLink} open={accountLink} />

        <label className="mt-auto flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
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
      </Card>

      <Card className="flex h-full flex-col gap-4">
        <Head icon={<Users />} title={t("site.groups")} />
        <Separator />

        <Copyable label={t("site.groups")} value={groupsLink} open={groupsLink} />

        <Field label={t("site.snippet")}>
          <Textarea
            readOnly
            rows={3}
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-[12px]"
          />
        </Field>
      </Card>

      {/* R1.1, R17.1. The church's own name over the whole of it. A frame
          cannot carry a session, so this is the way the signed-in screens live
          on the church's own address. */}
      <Card className="flex flex-col gap-4 lg:col-span-2">
        <Head icon={<Globe />} title={t("domain.title")} />
        <Separator />

        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("domain.label")} className="min-w-[260px] flex-1">
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

        <p className="text-[13px] text-fg-muted">{t("domain.dns", { target: appHost })}</p>

        {error ? <Banner tone="danger" title={t("domain.title")}>{error}</Banner> : null}
      </Card>
    </div>
  );
}
