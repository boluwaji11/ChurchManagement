"use client";

import * as React from "react";
import { Check, CircleAlert, CircleCheck, Copy, ExternalLink, Globe } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Field, Separator, Switch,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { checkPortalName, claimPortalName, openPortal } from "./domain-actions";

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
  slug,
  name,
  host,
  origin,
  spanning,
  portalOpen,
  approved,
  canEdit,
}: {
  /** The church's own slug, which answers until a name is chosen. */
  slug: string;
  /** The name the church chose, where it has. */
  name: string | null;
  /** Our own host, which every church gets a name under. */
  host: string;
  /** The scheme, so the address can be handed out whole. */
  origin: string;
  /**
   * R1.4. Whether the session cookie reaches every name under our host.
   *
   * It does wherever `AUTH_COOKIE_DOMAIN` is set. It cannot on localhost,
   * where a browser refuses a domain cookie on a single-label host, so a
   * move to the new name would arrive as a stranger and ask them to sign in.
   */
  spanning: boolean;
  /** R17.1. Whether the address answers at all. */
  portalOpen: boolean;
  /** R1.1. Whether the church has been approved for external access. */
  approved: boolean;
  canEdit: boolean;
}) {
  const [draft, setDraft] = React.useState(name ?? "");
  const [taken, setTaken] = React.useState(name);
  /* What was just taken, so the screen says so rather than only changing. */
  const [took, setTook] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const [working, start] = React.useTransition();
  const [live_, setLive] = React.useState(approved && portalOpen);

  React.useEffect(() => {
    setLive(approved && portalOpen);
  }, [approved, portalOpen]);

  const live = taken ?? slug;
  const changed = draft.trim().toLowerCase() !== (taken ?? "");

  /*
   * R1.1, R17.1. Whether the name in the field is one this church could take,
   * asked while they are still typing it.
   *
   * The press is still the only write and the query layer is still the rule;
   * this is the screen saying early what it is about to say late. Asked once
   * the typing stops, and an answer to a word that is no longer in the field
   * is dropped, because the alternative is the field saying "taken" about
   * something somebody has already backspaced away from.
   */
  const [free, setFree] = React.useState<boolean | null>(null);
  const [asking, setAsking] = React.useState(false);
  /* What the check said, under the field. The banner above is for a write
     that failed, which is a different thing to be told and a different place
     to be told it. */
  const [hint, setHint] = React.useState<string>();

  React.useEffect(() => {
    const word = draft.trim().toLowerCase();
    setFree(null);
    setHint(undefined);
    if (!canEdit || !word || word === (taken ?? "")) {
      setAsking(false);
      return;
    }

    /*
     * R1.1. The slug is the address this church already answers on, so
     * typing it back is not a name becoming available: it is the name they
     * are using. Free, because it is theirs, and said in its own words.
     * Nothing is asked of the server, because the answer is here.
     */
    if (word === slug) {
      setAsking(false);
      setFree(true);
      return;
    }

    setAsking(true);
    let live = true;
    const timer = setTimeout(async () => {
      const answer = await checkPortalName(word);
      if (!live) return;
      setAsking(false);
      setFree(Boolean(answer.free));
      setHint(answer.error);
    }, 400);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [draft, taken, slug, canEdit]);

  /* R1.1. The slug they already answer on, typed back. There is nothing to
     save, so the button is dark. */
  const current = draft.trim().toLowerCase() === slug && !taken;

  /* R17.1. The address, whole, for pasting anywhere that is not this screen. */
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(`${origin}//${live}.${host}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  /*
   * R1.1. One press. Taking the name is the check: the query layer refuses a
   * name another church holds and a shape nobody could type, so asking first
   * and then asking again was two presses for one answer.
   */
  const take = () =>
    start(async () => {
      setError(undefined);
      setTook(null);
      const answer = await claimPortalName(draft);
      if (answer.error) {
        setError(answer.error);
        return;
      }
      setTaken(answer.name ?? null);
      setTook(answer.name ?? null);

      /*
       * R1.1, R17.1. The tab moves to the address that was just taken.
       *
       * The old one is gone the moment this saves, and staying on it left
       * somebody reading a name in the bar they had replaced, on a page that
       * had quietly stopped being reachable there.
       */
      /*
       * R1.1, R1.4. The tab follows the new name, where a session can follow
       * it.
       *
       * Where it cannot, nothing moves. A cookie is host-only without a
       * domain, so every other host is a host this reader has no session on,
       * our own included, and each of them would answer by asking them to
       * sign in. Standing still costs nothing: the address they are on has
       * stopped naming a church, and the session names it instead, which is
       * what the action wrote down a moment ago.
       */
      if (!spanning) return;

      const moved = answer.name ?? slug;
      const here = typeof window === "undefined" ? "" : window.location.host;
      if (!here.endsWith(`.${host}`) || here === `${moved}.${host}`) return;

      window.location.href = `${origin}//${moved}.${host}${window.location.pathname}`;
    });

  return (
    <Card id="portal-address" className="flex flex-col gap-4">
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
          {live_ ? t("portal.state.on") : t("portal.state.off")}
        </span>
      </div>

      <Separator />

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {took ? (
        <Banner tone="success">{t("portal.free", { name: `${took}.${host}` })}</Banner>
      ) : null}

      <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("portal.lede")}</p>


      {/* The address itself, read as one thing: the name they chose and the
          part we own, which never changes. */}
      <Field label={t("portal.label")}>
        {/* The name and the part we own, read as one address left to right.
            Capped, because a field the width of the card put the name a hand's
            width from the domain it belongs to. */}
        {/* R22.1. What the guide rings. The card is the errand; this is the
            one place on it where anything is typed, and a coachmark against
            the card put itself a card's height away from the field. */}
        <div
          data-guide="portal-address"
          className="flex w-fit max-w-full items-center rounded-[var(--d-radius-control)] border border-line-strong bg-surface focus-within:border-fg-subtle"
        >
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
            /*
             * Sized to exactly what is typed, so the address reads from the
             * left with the name against the domain it belongs to.
             *
             * `field-sizing` is the browser doing it precisely. `size` is the
             * same idea a character at a time, for the browsers that have not
             * got it yet, and it is why a space is left on the end: a field
             * sized to the last character has nowhere to put the caret.
             */
            size={Math.max((draft || slug).length + 1, 8)}
            className="min-w-0 bg-transparent py-2.5 pl-3 text-[16px] font-medium text-fg outline-none [field-sizing:content]"
          />
          <span className="shrink-0 border-l border-line bg-sunken py-2.5 pr-3 pl-3 text-[15px] text-fg-subtle">
            .{host}
          </span>
        </div>
      </Field>

      {asking ? (
        <p className="-mt-1 text-[length:var(--d-text-caption)] text-fg-subtle">
          {t("portal.state.checking")}
        </p>
      ) : hint ? (
        <p className="-mt-1 flex items-center gap-1.5 text-[length:var(--d-text-caption)] font-medium text-danger-text">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {hint}
        </p>
      ) : free ? (
        <p
          className="-mt-1 flex items-center gap-1.5 text-[length:var(--d-text-caption)] font-medium"
          style={{ color: "var(--hue-fern-key)" }}
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {current ? t("portal.state.current") : t("portal.state.free")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          loading={working}
          disabled={!canEdit || !changed || working || free !== true || current}
          onClick={take}
        >
          <Check /> {t("portal.use")}
        </Button>

      </div>

      <Separator />

      {/* R1.7, R17.1. The address itself, to paste on the church's own site.
          It is the sign-in and the sign-up both, so the card that used to
          carry a second link to the same place has gone. */}
      {/* R17.1. A link, because the one thing anybody does with it is open
          it. Copying the words off the screen still works. */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`${origin}//${live}.${host}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-full items-center gap-1.5 break-all text-[15px] font-medium text-primary no-underline hover:underline"
        >
          {live}.{host}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>

        <button
          type="button"
          onClick={copy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded text-[length:var(--d-text-caption)] font-medium text-fg-muted transition-colors duration-instant hover:text-fg"
        >
          <Copy className="size-3.5 shrink-0" aria-hidden />
          {copied ? t("portal.copied") : t("portal.copy")}
        </button>
      </div>

      {/* R17.1. Whether the address answers at all. Off while a church is
          still getting ready, and staff still work at the main address. */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
        <Switch
          checked={approved && live_}
          disabled={working || !canEdit || !approved}
          onCheckedChange={(on) => {
            setLive(on);
            start(async () => {
              const answer = await openPortal(on);
              if (answer.error) {
                setLive(!on);
                setError(answer.error);
              }
            });
          }}
        />
        {t("portal.open")}
      </label>

    </Card>
  );
}
