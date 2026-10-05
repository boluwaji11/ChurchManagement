"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Link2, Check, Plus, Pencil } from "lucide-react";
import {
  Banner, Button, IconButton, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import type { ChurchEvent } from "@hearth/db";
import { t, plural } from "@hearth/i18n";
import { Markdown } from "@/components/markdown";
import { Empty } from "@/components/empty";
import { longDate, readableTime } from "@/lib/dates";
import { oneLineAddress } from "@/lib/address";
import {
  publishEvent, openEventRegistration, archiveEvent, startEventForm,
} from "../actions";

type Tab = "overview" | "registrations" | "questions";

/**
 * R14.1, R14.4. An event as the church reads it.
 *
 * The same shape a group's page has: the cover and the name, the line saying
 * whether it is taking registrations, then tabs. A church that has learned one
 * of these screens has learned both.
 */
export function EventView({
  church,
  event,
  coverUrl,
  questions,
  formId,
  tab,
}: {
  church: string;
  event: ChurchEvent;
  coverUrl: string | null;
  questions: number;
  formId: string | null;
  tab: Tab;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setOrigin(window.location.origin), []);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const publicLink = origin ? `${origin}/e/${church}/${event.slug}` : "";
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.going);

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const until = event.endsOn && event.endsOn !== event.startsOn
    ? longDate(event.endsOn)
    : null;

  const address = oneLineAddress({
    line1: event.addressLine1 ?? "",
    line2: event.addressLine2 ?? "",
    city: event.city ?? "",
    region: event.region ?? "",
    postalCode: event.postalCode ?? "",
    country: event.country ?? "",
  });

  const go = (next: Tab) => {
    const query = next === "overview" ? "" : `&tab=${next}`;
    router.push(`/events/${event.id}?church=${church}${query}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("event.failed")}>{error}</Banner> : null}

      {/* The name and when on the left, the cover beside them, which is what
          the designer was drawing. */}
      <div className="grid items-center gap-7 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="flex flex-col gap-2.5">
          <span
            className="w-fit rounded-full px-2.5 py-0.5 text-[12px] font-medium"
            style={{
              background: `var(--hue-${event.hue}-tint)`,
              color: `var(--hue-${event.hue}-key)`,
            }}
          >
            {t(`event.status.${event.status}` as never)}
          </span>

          <h1 className="font-display text-[32px] leading-[38px] text-fg">{event.name}</h1>

          <p className="text-[length:var(--d-text-body)] text-fg-muted">
            {when}
            {until ? ` ${t("event.toDate", { date: until })}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>

        {coverUrl ? (
          <img src={coverUrl} alt="" className="aspect-[16/9] w-full rounded-[14px] object-cover" />
        ) : (
          <div
            aria-hidden
            className="aspect-[16/9] w-full rounded-[14px]"
            style={{ background: `var(--hue-${event.hue}-tint)` }}
          />
        )}
      </div>

      {/* Whether it is taking registrations, and the actions that change it. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-[18px] py-3.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{
            background: event.registrationOpen ? "var(--hue-fern-500)" : "var(--fg-subtle)",
          }}
        />
        <span className="min-w-[180px] flex-1 font-medium text-fg">
          {event.registrationOpen ? t("event.registrationOpen") : t("event.registrationClosed")}
          {left !== null ? ` · ${left === 0 ? t("event.full") : plural("event.placesLeft", left)}` : ""}
        </span>

        {event.status === "published" ? (
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(publicLink);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2500);
            }}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border px-3.5 text-label font-medium",
              copied
                ? "border-[var(--hue-fern-500)] bg-[var(--hue-fern-tint)] text-[var(--hue-fern-key)]"
                : "border-line-strong bg-surface text-fg hover:bg-sunken",
            )}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            {copied ? t("form.linkCopied") : t("form.copyLink")}
          </button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => openEventRegistration(event.id, !event.registrationOpen, church))}
        >
          {event.registrationOpen ? t("event.registrationClose") : t("event.registrationReopen")}
        </Button>

        {event.status === "published" ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => publishEvent(event.id, "draft", church))}
          >
            {t("event.unpublish")}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishEvent(event.id, "published", church))}
          >
            {t("event.publish")}
          </Button>
        )}

        {event.archivedAt ? (
          <IconButton
            label={t("event.restore")}
            disabled={pending}
            onClick={() => run(() => archiveEvent(event.id, false, church))}
          >
            <ArchiveRestore />
          </IconButton>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <IconButton label={t("event.archive")} disabled={pending}>
                <Archive />
              </IconButton>
            </DialogTrigger>
            <DialogContent
              title={t("event.archiveTitle", { name: event.name })}
              closeLabel={t("common.close")}
            >
              <DialogFooter>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await archiveEvent(event.id, true, church);
                      if (result.error) setError(result.error);
                      else router.push(`/events?church=${church}`);
                    })}
                >
                  {t("event.archive")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* The tabs, the same three a group's page carries. */}
      <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
        {(["overview", "registrations", "questions"] as const).map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => go(one)}
            aria-pressed={tab === one}
            className={cn(
              "h-8 cursor-pointer rounded-sm px-3.5 text-[13px] font-medium",
              tab === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {t(`event.tab.${one}` as never)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="flex flex-wrap items-start gap-10">
          <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-6">
            <Block label={t("event.about")}>
              {event.description ? (
                <Markdown text={event.description} className="max-w-[68ch]" />
              ) : (
                <span className="text-[length:var(--d-text-body)] text-fg-subtle">
                  {t("common.none")}
                </span>
              )}
            </Block>
          </div>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-6 border-line md:border-l md:pl-8">
            <Block label={t("event.when")}>
              <span className="text-[length:var(--d-text-body)] text-fg">
                {when}
                {until ? ` ${t("event.toDate", { date: until })}` : ""}
              </span>
            </Block>

            <Block label={t("event.where")}>
              <span className="text-[length:var(--d-text-body)] text-fg">
                {[event.location, address].filter(Boolean).join(", ") || t("common.none")}
              </span>
            </Block>

            {event.contactName ? (
              <Block label={t("event.contact")}>
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {event.contactName}
                </span>
              </Block>
            ) : null}
          </aside>
        </div>
      ) : null}

      {tab === "registrations" ? (
        <Empty icon="people" title={t("event.registrations.none")} />
      ) : null}

      {tab === "questions" ? (
        <div className="flex flex-col items-start gap-4">
          {formId ? (
            <>
              <p className="text-[length:var(--d-text-body)] text-fg">
                {plural("form.questions", questions)}
              </p>
              <Button asChild variant="secondary">
                <Link href={`/forms/${formId}?church=${church}`}>
                  <Pencil className="size-4" aria-hidden /> {t("event.questions.edit")}
                </Link>
              </Button>
            </>
          ) : (
            <Empty
              icon="form"
              title={t("event.questions.empty")}
              action={
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await startEventForm(event.id, church);
                      if (result.error) setError(result.error);
                      else if (result.id) router.push(`/forms/${result.id}?church=${church}`);
                    })}
                >
                  <Plus className="size-4" aria-hidden /> {t("event.questions.add")}
                </Button>
              }
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A heading over a block, the same shape the designer uses. */
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold tracking-[0.06em] text-fg uppercase">{label}</span>
      {children}
    </div>
  );
}
