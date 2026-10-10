"use client";

import * as React from "react";
import { Check, CircleCheck, Globe } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Separator, Switch,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { claimPortalName, setSignup, openPortal } from "./domain-actions";
import { Copyable } from "./copyable";

/**
 * R1.1, R17.1. Where a congregation signs in.
 *
 * A name under ours rather than a name of the church's own. We own the domain
 * and hold the certificate, so the church types a word and is finished: there
 * is no record to add anywhere, and their website is not involved.
 *
 * The name is theirs to choose because the slug was ours to choose. A church
 * called Riverside Fellowship that everybody knows as One Family should not
 * have to read "riverside" out from the front.
 */
export function PortalAddress({
  church,
  slug,
  name,
  host,
  origin,
  selfSignup,
  portalOpen,
  canEdit,
}: {
  church: string;
  /** The church's own slug, which answers until a name is chosen. */
  slug: string;
  /** The name the church chose, where it has. */
  name: string | null;
  /** Our own host, which every church gets a name under. */
  host: string;
  /** The scheme, so the address can be handed out whole. */
  origin: string;
  /** R1.7. Whether somebody can make an account at this address. */
  selfSignup: boolean;
  /** R17.1. Whether the address answers at all. */
  portalOpen: boolean;
  canEdit: boolean;
}) {
  const [draft, setDraft] = React.useState(name ?? "");
  const [taken, setTaken] = React.useState(name);
  /* What was just taken, so the screen says so rather than only changing. */
  const [took, setTook] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const [working, start] = React.useTransition();
  const [open, setOpen] = React.useState(selfSignup);
  const [live_, setLive] = React.useState(portalOpen);

  const live = taken ?? slug;
  const changed = draft.trim().toLowerCase() !== (taken ?? "");

  /*
   * R1.1. One press. Taking the name is the check: the query layer refuses a
   * name another church holds and a shape nobody could type, so asking first
   * and then asking again was two presses for one answer.
   */
  const take = () =>
    start(async () => {
      setError(undefined);
      setTook(null);
      const answer = await claimPortalName(draft, church);
      if (answer.error) {
        setError(answer.error);
        return;
      }
      setTaken(answer.name ?? null);
      setTook(answer.name ?? null);
    });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
          style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
        >
          <Globe />
        </span>
        <CardTitle>{t("portal.title")}</CardTitle>

        <span
          className="ml-auto flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold"
          style={
            live_
              ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
              : { background: "var(--color-sunken)", color: "var(--color-fg-muted)" }
          }
        >
          {live_ ? <CircleCheck className="size-3.5" aria-hidden /> : null}
          {live_ ? t("domain.state.live") : t("domain.state.none")}
        </span>
      </div>

      <Separator />

      <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("portal.lede")}</p>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {/* The address itself, read as one thing: the name they chose and the
          part we own, which never changes. */}
      <Field label={t("portal.label")}>
        {/* The name and the part we own, read as one address left to right.
            Capped, because a field the width of the card put the name a hand's
            width from the domain it belongs to. */}
        <div className="flex w-fit max-w-full items-center rounded-[var(--d-radius-control)] border border-line-strong bg-surface focus-within:border-fg-subtle">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(undefined);
              setTook(null);
            }}
            placeholder={slug}
            disabled={!canEdit}
            aria-label={t("portal.label")}
            /* Sized to what is typed, so the name sits against the domain it
               belongs to and the whole address reads from the left. */
            size={Math.max((draft || slug).length + 1, 10)}
            className="min-w-0 bg-transparent py-2.5 pl-3 font-mono text-[13px] text-fg outline-none"
          />
          <span className="shrink-0 py-2.5 pr-3 font-mono text-[13px] text-fg-subtle">
            .{host}
          </span>
        </div>
      </Field>

      {took ? (
        <Banner tone="success">{t("portal.free", { name: `${took}.${host}` })}</Banner>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          loading={working}
          disabled={!canEdit || !changed || working}
          onClick={take}
        >
          <Check /> {t("portal.use")}
        </Button>

      </div>

      <Separator />

      {/* R1.7, R17.1. The address itself, to paste on the church's own site.
          It is the sign-in and the sign-up both, so the card that used to
          carry a second link to the same place has gone. */}
      <Field label={t("portal.current")}>
        <Copyable value={`${origin}//${live}.${host}`} label={t("portal.current")} />
      </Field>

      {/* R17.1. Whether the address answers at all. Off while a church is
          still getting ready, and staff still work at the main address. */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
        <Switch
          checked={live_}
          disabled={working || !canEdit}
          onCheckedChange={(on) => {
            setLive(on);
            start(async () => {
              const answer = await openPortal(on, church);
              if (answer.error) {
                setLive(!on);
                setError(answer.error);
              }
            });
          }}
        />
        {t("portal.open")}
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
        <Switch
          checked={open}
          disabled={working || !canEdit}
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
  );
}
