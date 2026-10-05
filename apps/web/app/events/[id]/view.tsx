"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive, ArchiveRestore, ArrowLeft, Check, Download, Eye, Link2, Pencil, Printer,
} from "lucide-react";
import {
  Banner, Button, IconButton, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Table, Thead, Tr, Th, Td,
} from "@hearth/ui";
import type { ChurchEvent, EventRegistration } from "@hearth/db";
import { t, plural } from "@hearth/i18n";
import { Markdown } from "@/components/markdown";
import { Empty } from "@/components/empty";
import { longDate, readableTime, shortDate } from "@/lib/dates";
import { oneLineAddress, directionsLink } from "@/lib/address";
import { publishEvent, openEventRegistration, archiveEvent } from "../actions";

type Tab = "overview" | "registrations";

/** An answer as one cell. A list of choices reads as a list. */
function answerText(value: unknown): string {
  if (value === true) return t("common.yes");
  if (value === false || value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}


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
  registrations,
  questions,
  tab,
}: {
  church: string;
  event: ChurchEvent;
  coverUrl: string | null;
  /** R14.12. Everybody with a place, bookings kept together. */
  registrations: EventRegistration[];
  /** R14.5. The event's questions, which name the roster's extra columns. */
  questions: { id: string; label: string }[];
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
  const going = registrations.filter((one) => one.state === "going");
  const waiting = registrations.filter((one) => one.state === "waiting");
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.going);

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const until = event.endsOn && event.endsOn !== event.startsOn
    ? longDate(event.endsOn)
    : null;

  const place = {
    line1: event.addressLine1 ?? "",
    line2: event.addressLine2 ?? "",
    city: event.city ?? "",
    region: event.region ?? "",
    postalCode: event.postalCode ?? "",
    country: event.country ?? "",
  };
  const address = oneLineAddress(place);
  const directions = directionsLink(place);

  const showing: Tab = event.takesRegistrations ? tab : "overview";

  const go = (next: Tab) => {
    const query = next === "overview" ? "" : `&tab=${next}`;
    router.push(`/events/${event.slug}?church=${church}${query}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {/* R24.6. Back on the left, and on the right the three things done to
          the event itself: look at it as the congregation will, change it, put
          it away. The bar below is about registrations. */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/events?church=${church}`}
          className="inline-flex flex-1 items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("event.title")}
        </Link>

        <Button variant="secondary" asChild>
          <a
            href={`/events/${event.slug}/preview?church=${church}`}
            target="_blank"
            rel="noreferrer"
          >
            <Eye className="size-4" aria-hidden /> {t("event.preview")}
          </a>
        </Button>

        <Button
          variant="ghost"
          asChild
          className="size-[var(--d-tap)] min-h-0 rounded-[var(--d-radius-control)] px-0 [&_svg]:size-[var(--d-icon)]"
        >
          <Link
            href={`/events/${event.slug}/edit?church=${church}`}
            aria-label={t("action.edit")}
            title={t("action.edit")}
          >
            <Pencil />
          </Link>
        </Button>

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
            background: !event.takesRegistrations
              ? "var(--hue-sky-500)"
              : event.registrationOpen
                ? "var(--hue-fern-500)"
                : "var(--fg-subtle)",
          }}
        />
        <span className="min-w-[180px] flex-1 font-medium text-fg">
          {!event.takesRegistrations
            ? t("event.registrationNone")
            : event.registrationOpen
              ? t("event.registrationOpen")
              : t("event.registrationClosed")}
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

        {event.takesRegistrations ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(() => openEventRegistration(event.id, !event.registrationOpen, church))}
          >
            {event.registrationOpen ? t("event.registrationClose") : t("event.registrationReopen")}
          </Button>
        ) : null}

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

      </div>

      {/* The tabs, drawn only where there is a choice. An announcement has one
          thing to look at, and a strip of one tab is a control that does
          nothing. */}
      {event.takesRegistrations ? (
      <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
        {(["overview", "registrations"] as const).map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => go(one)}
            aria-pressed={showing === one}
            className={cn(
              "h-8 cursor-pointer rounded-sm px-3.5 text-[13px] font-medium",
              showing === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {t(`event.tab.${one}` as never)}
          </button>
        ))}
      </div>
      ) : null}

      {showing === "overview" ? (
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
              {event.location ? (
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {event.location}
                </span>
              ) : null}
              <span className="text-[length:var(--d-text-body)] text-fg-muted">
                {address || (event.location ? "" : t("common.none"))}
              </span>
              {directions ? (
                <a
                  href={directions}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("common.directions")}
                </a>
              ) : null}
            </Block>

          </aside>
        </div>
      ) : null}

      {showing === "registrations" ? (
        registrations.length === 0 ? (
          <Empty icon="people" title={t("event.registrations.none")} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex-1 text-[length:var(--d-text-body)] text-fg-muted tabular-nums">
                {[
                  plural("event.going", going.length),
                  waiting.length > 0 ? plural("event.waiting", waiting.length) : null,
                ].filter(Boolean).join(" · ")}
              </span>
              <Button variant="secondary" asChild>
                <a href={`/events/${event.slug}/export?church=${church}`}>
                  <Download className="size-4" aria-hidden /> {t("event.export")}
                </a>
              </Button>
              <Button variant="secondary" asChild>
                <a href={`/events/${event.slug}/roster?church=${church}`} target="_blank" rel="noreferrer">
                  <Printer className="size-4" aria-hidden /> {t("event.roster")}
                </a>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>{t("event.registrant")}</Th>
                    <Th>{t("person.email")}</Th>
                    <Th>{t("person.phone")}</Th>
                    <Th>{t("event.registeredOn")}</Th>
                    {questions.map((one) => (
                      <Th key={one.id}>{one.label}</Th>
                    ))}
                  </Tr>
                </Thead>
                <tbody>
                  {registrations.map((one, index) => (
                    <Tr
                      key={one.id}
                      /* R14.6. A hairline between parties rather than between
                         rows, so a family reads as the one booking it is. */
                      className={
                        index > 0 && registrations[index - 1]!.bookingId !== one.bookingId
                          ? "border-t-2 border-line-strong"
                          : undefined
                      }
                    >
                      <Td>
                        <span className="flex items-center gap-2">
                          {one.personId ? (
                            <Link
                              href={`/people/${one.personId}?church=${church}`}
                              className="font-medium text-fg underline-offset-4 hover:underline"
                            >
                              {one.name}
                            </Link>
                          ) : (
                            <span className="font-medium text-fg">{one.name}</span>
                          )}
                          {one.state === "waiting" ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                              style={{
                                background: "var(--hue-amber-tint)",
                                color: "var(--hue-amber-key)",
                              }}
                            >
                              {t("event.onWaitlist")}
                            </span>
                          ) : null}
                        </span>
                      </Td>
                      <Td className="text-fg-muted">{one.email ?? ""}</Td>
                      <Td className="text-fg-muted tabular-nums">{one.phone ?? ""}</Td>
                      <Td className="text-fg-muted tabular-nums">
                        {shortDate(one.registeredAt.slice(0, 10))}
                      </Td>
                      {questions.map((q) => (
                        <Td key={q.id} className="text-fg-muted">
                          {answerText(one.answers[q.id])}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )
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
