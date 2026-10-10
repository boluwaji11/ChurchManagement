"use client";

import * as React from "react";
import {
  Check, ChevronDown, CircleCheck, Clock, Copy, ExternalLink, Globe, Link2,
  Search, Users,
} from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Input, Separator, Switch, Textarea, Tooltip
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import {
  consoleFor, isApex, hostLabel, suggestSubdomain, type DomainFindings,
} from "@connectapp/db/rules";
import { saveDomain, setSignup, checkDomain } from "./domain-actions";
import { DomainReading } from "./domain-reading";
import { Steps, Step } from "@/components/steps";

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
 * R22.2. One line of the record, as a provider's form asks for it.
 *
 * A row rather than a field, because three fields across a card gave the word
 * CNAME a third of the screen and told nobody anything. The value is the part
 * that has to be typed exactly, so it is the part that is monospaced and the
 * part the button copies.
 */
function RecordRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="w-24 shrink-0 text-caption text-fg-subtle">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{value}</code>
      <Tooltip content={copied ? t("domain.copied") : t("domain.copy")}>
        <button
          type="button"
          aria-label={copied ? t("domain.copied") : t("domain.copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-3.5"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </button>
      </Tooltip>
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
export function OnYourSite({ origin, slug, selfSignup, domain, appHost, approved }: {
  origin: string;
  slug: string;
  /** R1.1. Whether a human has looked at this church yet. */
  approved: boolean;
  /** R1.7. Whether somebody can make an account from the church's own address. */
  selfSignup: boolean;
  /** R1.1. The church's own address, where it has pointed one here. */
  domain: string | null;
  /** What a church points its CNAME at. */
  appHost: string;
}) {
  /*
   * R1.1. None of this reaches anybody until the church has been approved: the
   * join address, the group finder and the church's own domain are all refused
   * at the door. The switch reads off rather than on, because what it says it
   * does is not happening.
   */
  const [open, setOpen] = React.useState(approved && selfSignup);
  const [draft, setDraft] = React.useState(domain ?? "");
  const [error, setError] = React.useState<string>();
  /* R1.7. The join switch, which saves on its own. */
  const [pending, start] = React.useTransition();
  /* HRT-283. What the lookup found, held until the field is typed over. */
  const [found, setFound] = React.useState<DomainFindings | null>(null);
  const [checking, startChecking] = React.useTransition();
  /* R22.2. The rest of the reading, which is a diagnosis rather than a task. */
  const [more, setMore] = React.useState(false);

  const check = () =>
    startChecking(async () => {
      setError(undefined);
      setFound(null);
      const back = await checkDomain(draft, slug, appHost);
      if (back.error || !back.found) {
        setError(back.error);
        return;
      }
      setFound(back.found);

      // Kept under the name as we read it back, so a pasted address with a
      // scheme on the front is stored as a domain.
      const kept = await saveDomain(back.found.domain, slug);
      setError(kept.error);
      if (!kept.error) setDraft(kept.domain ?? "");
    });

  const accountLink = `${origin}/join/${slug}`;
  const groupsLink = `${origin}/g/${slug}`;
  // The title is read by whoever lands on the church's page with a screen
  // reader, so it is the church's word for groups rather than ours.
  const snippet =
    `<iframe src="${groupsLink}/embed" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  /* R1.1. What the address card's badge says, in one word. */
  const live = found?.pointsHere === true;
  /* R22.2. Where they go to add it, where we recognised the provider. */
  const providerConsole = consoleFor(found?.registrar);

  /*
   * R1.1. A CNAME cannot sit on the domain itself. Every provider refuses it,
   * and one that did not would take the church's email down with it, so an
   * apex is answered with a name underneath it rather than with a record.
   */
  const apex = found ? isApex(found.domain) : false;
  const suggested = found ? suggestSubdomain(found.domain) : "";

  /* R22.2. What to press and what to type, at the provider we recognised. */
  const steps = found
    ? t(`dns.steps.${found.registrar ?? "generic"}` as never, {
        name: hostLabel(found.domain),
        target: appHost,
      })
    : "";
  /* A provider we hold no steps for falls back to the general ones, and the
     key coming back unresolved is how we know. */
  const howTo = (steps.startsWith("dns.steps.")
    ? t("dns.steps.generic", { name: hostLabel(found!.domain), target: appHost })
    : steps
  ).split("|");

  return (
    <div className="flex max-w-[1120px] flex-col gap-4">
      {approved ? null : (
        <Banner tone="info" title={t("site.waiting")}>{t("site.waitingBody")}</Banner>
      )}

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {/* R24.6. The task on the left and the two links on the right. The
          address is a thing a church sets up once, with steps and a state;
          the links are two strings to copy. Stacking them made the second
          kind look as heavy as the first. */}
      <div className="grid items-start gap-5 xl:[grid-template-columns:minmax(0,1fr)_minmax(300px,380px)]">

      {/* R1.1, R17.1. The church's own name over the whole of it. A frame
          cannot carry a session, so this is the way the signed-in screens live
          on the church's own address. */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Head icon={<Globe />} title={t("domain.title")} />

          {/* R24.6. Green when it is working, and it says which. The same
              badge the giving card carries, because it answers the same
              question: is this thing on. */}
          <span className="ml-auto flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold"
            style={
              live
                ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
                : { background: "var(--color-sunken)", color: "var(--color-fg-muted)" }
            }
          >
            {live ? <CircleCheck className="size-3.5" aria-hidden /> : null}
            {live
              ? t("domain.state.live")
              : found
                ? t("domain.state.waiting")
                : t("domain.state.none")}
          </span>
        </div>
        <Separator />

        {/* R22.2. The one sentence this card earns: what pointing an address
            here actually gets the church. Nothing else on it explains itself
            without this. */}
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("domain.lede", { ours: accountLink.replace(/^https?:\/\//, "") })}
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("domain.label")} className="min-w-[260px] flex-1">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                // A reading of the old name under the new one is worse than
                // no reading at all.
                setFound(null);
              }}
              placeholder={t("domain.hint")}
              inputMode="url"
              disabled={!approved}
            />
          </Field>
          {/*
            HRT-283, R22.2. One press rather than two.
            It reads the domain and, when the name is a real one, keeps it.
            Asking somebody to press Check and then Save is asking them to
            confirm a decision they already made by typing the name, and
            storing the name changes nothing on its own: the address only
            starts working once their provider points it here.
          */}
          <Button
            loading={checking}
            disabled={!approved || !draft.trim() || checking}
            onClick={() => check()}
          >
            <Search /> {t("domain.check")}
          </Button>
        </div>

        {/*
          R1.1. The one question this card has to answer: does the address
          work. Until it has been looked at there is nothing to say, so
          nothing is said.
        */}
        {/* R1.1. The domain itself cannot carry this record, so the screen
            says what will work rather than what their provider will refuse. */}
        {found && !found.pointsHere && apex ? (
          <Banner tone="warning" title={t("domain.apex.title", { domain: found.domain })}>
            <div className="flex flex-col items-start gap-2.5">
              <span>{t("domain.apex.body")}</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft(suggested);
                  setFound(null);
                }}
              >
                {t("domain.apex.use", { suggested })}
              </Button>
            </div>
          </Banner>
        ) : null}

        {found?.pointsHere === false && !apex ? (
          <Steps>
            {/* R22.2. Named, and linked, because we read their nameservers to
                find out. Naming the provider and leaving them to find it is
                the half of the job that helps nobody. */}
            <Step
              icon={<Globe />}
              title={
                found.registrar
                  ? t("domain.step.addAt", { provider: found.registrar })
                  : t("domain.step.add")
              }
            >
              <div className="overflow-hidden rounded-[12px] border border-line bg-sunken">
                <div className="divide-y divide-line">
                  <RecordRow label={t("domain.record.type")} value="CNAME" />
                  <RecordRow label={t("domain.record.name")} value={hostLabel(found.domain)} />
                  <RecordRow label={t("domain.record.target")} value={appHost} />
                </div>
              </div>

              {/* R22.2. What to press, in their provider's own words. The
                  record above is what goes in the boxes; this is where the
                  boxes are. */}
              <div className="flex flex-col gap-2">
                <span className="text-caption font-semibold text-fg-subtle">
                  {found.registrar
                    ? t("domain.stepsFor", { provider: found.registrar })
                    : t("domain.stepsGeneric")}
                </span>
                <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {howTo.map((one, at) => (
                    <li key={one} className="flex gap-2.5 text-[13px] leading-5 text-fg-muted">
                      <span className="w-4 shrink-0 text-right font-mono text-fg-subtle">
                        {at + 1}
                      </span>
                      <span className="min-w-0">{one}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {providerConsole ? (
                <a
                  href={providerConsole}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-primary no-underline hover:underline"
                >
                  {t("domain.openConsole", { provider: found.registrar ?? "" })}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </Step>

            <Step icon={<Clock />} title={t("domain.step.wait")}>
              <p className="text-[13px] text-fg-muted">{t("domain.step.waitBody")}</p>
            </Step>

            <Step icon={<Check />} title={t("domain.step.done")} last>
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                loading={checking}
                disabled={checking}
                onClick={() => check()}
              >
                {t("domain.recheck")}
              </Button>
            </Step>
          </Steps>
        ) : null}

        {/* R22.2. Everything else we read is a diagnosis rather than a task,
            so it waits behind a press. */}
        {found ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMore(!more)}
              aria-expanded={more}
              className="inline-flex cursor-pointer items-center gap-1.5 self-start text-[13px] font-medium text-fg-muted hover:text-fg"
            >
              <ChevronDown
                className={`size-4 transition-transform ${more ? "rotate-180" : ""}`}
                aria-hidden
              />
              {more ? t("domain.less") : t("domain.more")}
            </button>
            {more ? <DomainReading found={found} /> : null}
          </div>
        ) : null}

      </Card>

      {/* R1.7, R9.5. What a church pastes into the site it already has. */}
      <div className="flex min-w-0 flex-col gap-5">
      {/* R1.7. The address a church puts behind "My account" on its own
          website. There is no code to hand out: the address names the church,
          and the switch decides whether it is open. */}
      <Card className="flex flex-col gap-4">
        <Head icon={<Link2 />} title={t("site.account")} />
        <Separator />

        <Copyable label={t("site.account")} value={accountLink} open={accountLink} />

        <label className="mt-auto flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
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
      </div>
      </div>
    </div>
  );
}
