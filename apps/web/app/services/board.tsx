"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, LayoutGrid, List } from "lucide-react";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface ServiceCard {
  id: string;
  href: string;
  when: string;
  name: string;
  theme: string | null;
  items: number;
  minutes: number;
}

/** How many are shown at a time, and how many each press adds. */
const PAGE = 4;

type View = "tiles" | "list";

/**
 * R11.1. What is coming, and what was last held.
 *
 * Four at a time, because a church plans the next one or two and a wall of
 * fifty cards buries them. What has already happened runs down the right,
 * newest first, where it is there to copy a plan from without being in the way.
 */
export function ServiceBoard({
  upcoming,
  past,
}: {
  upcoming: ServiceCard[];
  past: ServiceCard[];
}) {
  const [shown, setShown] = React.useState(PAGE);
  const [view, setView] = React.useState<View>("tiles");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]">
          {([
            ["tiles", LayoutGrid],
            ["list", List],
          ] as const).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={view === value}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium",
                view === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(`services.view.${value}` as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:[grid-template-columns:1fr_auto_minmax(240px,280px)]">
        <div className="flex flex-col gap-3.5">
          {view === "tiles" ? (
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {upcoming.slice(0, shown).map((one, i) => (
                <Card key={one.id} service={one} next={i === 0} />
              ))}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-line bg-surface">
              {upcoming.slice(0, shown).map((one, i) => (
                <li key={one.id}>
                  <Row service={one} next={i === 0} />
                </li>
              ))}
            </ul>
          )}

          {shown < upcoming.length ? (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="self-start rounded-sm px-1 py-1 font-medium text-primary hover:underline"
            >
              {t("services.showMore")}
            </button>
          ) : null}
        </div>

        <div aria-hidden className="hidden w-px bg-line lg:block" />

        <aside className="flex flex-col gap-3">
          <h3 className="text-[13px] font-medium text-fg-subtle">{t("services.past")}</h3>

          {past.length === 0 ? (
            <p className="text-[13px] text-fg-muted">{t("services.noPast")}</p>
          ) : view === "list" ? (
            <ul className="overflow-hidden rounded-lg border border-line bg-sunken">
              {past.map((one) => (
                <li key={one.id}>
                  <Row service={one} quiet />
                </li>
              ))}
            </ul>
          ) : (
            /* A line down the left with a mark at each one, newest at the top,
               so the column reads as a run of weeks rather than a stack. */
            <ol className="relative flex flex-col gap-3 pl-5">
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-[3px] w-px bg-line"
              />
              {past.map((one) => (
                <li key={one.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-5 -left-5 size-[7px] rounded-full bg-line-strong"
                  />
                  <Card service={one} quiet />
                </li>
              ))}
            </ol>
          )}

        </aside>
      </div>
    </div>
  );
}

/** What the footer of a card says about its plan. */
function PlanLine({ service, quiet }: { service: ServiceCard; quiet?: boolean }) {
  if (service.items > 0) {
    return (
      <span className="flex-1 text-fg-muted">
        {t("services.planned", { items: service.items, minutes: service.minutes })}
      </span>
    );
  }

  // A gathering that has happened was never going to be planned after the fact,
  // so saying "not planned yet" of it is saying nothing true.
  if (quiet) return <span className="flex-1 text-fg-subtle">{t("services.noPlan")}</span>;

  return (
    <span className="flex-1 font-medium" style={{ color: "var(--hue-amber-key)" }}>
      {t("services.notPlanned")}
    </span>
  );
}

function Card({
  service,
  next,
  quiet,
}: {
  service: ServiceCard;
  next?: boolean;
  /** A service that has happened, which is read rather than worked on. */
  quiet?: boolean;
}) {
  return (
    <Link
      href={service.href}
      className={`flex flex-col gap-3 rounded-lg border border-line p-4.5 hover:border-line-strong ${
        quiet ? "bg-sunken" : "bg-surface"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[13px] font-medium text-fg-subtle">{service.when}</span>
        {next ? (
          <span className="flex h-[22px] items-center rounded-full bg-primary-soft px-2 text-[11px] font-semibold text-primary">
            {t("services.next")}
          </span>
        ) : null}
      </div>

      <div>
        <div className="font-display text-[21px] leading-[26px] text-fg">{service.name}</div>
        {service.theme ? (
          <div className="mt-0.5 text-[13px] text-fg-muted">{service.theme}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-sunken pt-3 text-[13px]">
        <PlanLine service={service} quiet={quiet} />
        <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
      </div>
    </Link>
  );
}

/** The same service as one line, for somebody reading a run of weeks. */
function Row({
  service,
  next,
  quiet,
}: {
  service: ServiceCard;
  next?: boolean;
  quiet?: boolean;
}) {
  return (
    <Link
      href={service.href}
      className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-line"
    >
      <span
        className={`shrink-0 text-[13px] font-medium text-fg-subtle ${
          quiet ? "" : "w-[160px]"
        }`}
      >
        {service.when}
      </span>
      <span className="min-w-0 flex-1 font-medium text-fg">{service.name}</span>
      {next ? (
        <span className="flex h-[22px] items-center rounded-full bg-primary-soft px-2 text-[11px] font-semibold text-primary">
          {t("services.next")}
        </span>
      ) : null}
      <span
        className={`flex shrink-0 items-center gap-2 text-[13px] ${quiet ? "" : "w-[160px]"}`}
      >
        <PlanLine service={service} quiet={quiet} />
        <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
      </span>
    </Link>
  );
}
