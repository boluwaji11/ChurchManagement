"use client";

import * as React from "react";
import { Check, Copy, ExternalLink, Link2, Users } from "lucide-react";
import {
  Banner, Card, CardTitle, Field, Separator, Switch, Textarea, Tooltip,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { setSignup } from "./domain-actions";

/**
 * One address, with the two things anybody does to it.
 *
 * The buttons sit on the end of the field rather than under it: the row then
 * reads as one control, and two of these down a screen do not become two rows
 * of loose icons.
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

      <Tooltip content={copied ? t("joining.copied") : t("joining.copy")}>
        <button
          type="button"
          aria-label={copied ? t("joining.copied") : t("joining.copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </button>
      </Tooltip>

      {open ? (
        <Tooltip content={t("site.open")}>
          <a
            href={open}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t("site.open")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
          >
            <ExternalLink />
          </a>
        </Tooltip>
      ) : null}
    </div>
  );
}

function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
        style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
      >
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
export function OnYourSite({ origin, slug, selfSignup, approved }: {
  origin: string;
  slug: string;
  /** R1.1. Whether a human has looked at this church yet. */
  approved: boolean;
  /** R1.7. Whether somebody can make an account from the church's own address. */
  selfSignup: boolean;
}) {
  /*
   * R1.1. None of this reaches anybody until the church has been approved: the
   * join address and the group finder are both refused at the door. The switch
   * reads off rather than on, because what it says it does is not happening.
   */
  const [open, setOpen] = React.useState(approved && selfSignup);
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
    <>
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {/* R1.7. The address a church puts behind "My account" on its own
          website. There is no code to hand out: the address names the church,
          and the switch decides whether it is open. */}
      <Card className="flex flex-col gap-4">
        <Head icon={<Link2 />} title={t("site.account")} />
        <Separator />

        <Copyable label={t("site.account")} value={accountLink} open={accountLink} />

        <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
          <Switch
            checked={open}
            disabled={pending || !approved}
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

      <Card className="flex flex-col gap-4">
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
    </>
  );
}
