"use client";

import * as React from "react";
import { Check, CircleCheck, Globe, X } from "lucide-react";
import { Banner, Button, Card, CardTitle, Field, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { claimPortalName, checkPortalName } from "./domain-actions";

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
  canEdit,
}: {
  church: string;
  /** The church's own slug, which answers until a name is chosen. */
  slug: string;
  /** The name the church chose, where it has. */
  name: string | null;
  /** Our own host, which every church gets a name under. */
  host: string;
  canEdit: boolean;
}) {
  const [draft, setDraft] = React.useState(name ?? "");
  const [taken, setTaken] = React.useState(name);
  const [free, setFree] = React.useState<boolean | null>(null);
  const [cleaned, setCleaned] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string>();
  const [working, start] = React.useTransition();

  const live = taken ?? slug;
  const changed = draft.trim().toLowerCase() !== (taken ?? "");

  const look = () =>
    start(async () => {
      setError(undefined);
      const answer = await checkPortalName(draft, church);
      setFree(answer.free);
      setCleaned(answer.cleaned);
    });

  const take = () =>
    start(async () => {
      const answer = await claimPortalName(draft, church);
      if (answer.error) {
        setError(answer.error);
        return;
      }
      setTaken(answer.name ?? null);
      setFree(null);
      setCleaned(null);
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
          style={{ background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }}
        >
          <CircleCheck className="size-3.5" aria-hidden />
          {t("domain.state.live")}
        </span>
      </div>

      <Separator />

      <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("portal.lede")}</p>

      {error ? <Banner tone="danger">{error}</Banner> : null}

      {/* The address itself, read as one thing: the name they chose and the
          part we own, which never changes. */}
      <Field label={t("portal.label")}>
        <div className="flex items-center gap-0 rounded-[var(--d-radius-control)] border border-line-strong bg-surface focus-within:border-fg-subtle">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setFree(null);
              setCleaned(null);
            }}
            placeholder={slug}
            disabled={!canEdit}
            aria-label={t("portal.label")}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-right font-mono text-[13px] text-fg outline-none"
          />
          <span className="shrink-0 py-2.5 pr-3 font-mono text-[13px] text-fg-subtle">
            .{host}
          </span>
        </div>
      </Field>

      {/* R1.1. The answer to the only question: has somebody got it. */}
      {free === true && cleaned ? (
        <Banner tone="success">{t("portal.free", { name: `${cleaned}.${host}` })}</Banner>
      ) : null}
      {free === false ? <Banner tone="danger">{t("portal.taken")}</Banner> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          loading={working}
          disabled={!canEdit || !changed || working}
          onClick={look}
        >
          <Check /> {t("portal.check")}
        </Button>

        <Button
          type="button"
          loading={working}
          disabled={!canEdit || !changed || free !== true || working}
          onClick={take}
        >
          {t("portal.use")}
        </Button>

        {taken ? (
          <Button
            type="button"
            variant="ghost"
            loading={working}
            disabled={!canEdit || working}
            onClick={() =>
              start(async () => {
                const answer = await claimPortalName("", church);
                setError(answer.error);
                if (answer.error) return;
                setTaken(null);
                setDraft("");
                setFree(null);
              })
            }
          >
            <X /> {t("domain.remove")}
          </Button>
        ) : null}
      </div>

      <p className="text-caption text-fg-muted">
        {t("portal.current")}{" "}
        <a
          href={`https://${live}.${host}`}
          target="_blank"
          rel="noreferrer noopener"
          className="font-mono text-primary underline-offset-4 hover:underline"
        >
          {live}.{host}
        </a>
      </p>
    </Card>
  );
}
