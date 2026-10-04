"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@hearth/ui";
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

/**
 * R11.1. What is coming, and what was last held.
 *
 * Four at a time, because a church plans the next one or two and a wall of
 * fifty cards buries them. What has already happened sits down the right, where
 * it is there to copy a plan from without being in the way.
 */
export function ServiceBoard({
  upcoming,
  past,
}: {
  upcoming: ServiceCard[];
  past: ServiceCard[];
}) {
  const [shown, setShown] = React.useState(PAGE);

  return (
    <div className="grid gap-6 lg:[grid-template-columns:1fr_auto_minmax(240px,280px)]">
      <div className="flex flex-col gap-3.5">
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {upcoming.slice(0, shown).map((one, i) => (
            <Card key={one.id} service={one} next={i === 0} />
          ))}
        </div>

        {shown < upcoming.length ? (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => setShown((n) => n + PAGE)}
          >
            {t("services.showMore")}
          </Button>
        ) : null}
      </div>

      <div aria-hidden className="hidden w-px bg-line lg:block" />

      <aside className="flex flex-col gap-3">
        <h3 className="text-[13px] font-medium text-fg-subtle">{t("services.past")}</h3>
        {past.length === 0 ? (
          <p className="text-[13px] text-fg-muted">{t("services.noPast")}</p>
        ) : (
          past.map((one) => <Card key={one.id} service={one} quiet />)
        )}
      </aside>
    </div>
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
  const planned = service.items > 0;

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
        {planned ? (
          <span className="flex-1 text-fg-muted">
            {t("services.planned", { items: service.items, minutes: service.minutes })}
          </span>
        ) : (
          <span className="flex-1 font-medium" style={{ color: "var(--hue-amber-key)" }}>
            {t("services.notPlanned")}
          </span>
        )}
        <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
      </div>
    </Link>
  );
}
