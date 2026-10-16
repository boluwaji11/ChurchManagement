/**
 * HRT-379, R22.2. What happens when somebody comes for the first time.
 *
 * The church's own words throughout: there is nothing here to read from its
 * records, so every field is editable and the canvas carries all of it.
 */

import * as React from "react";
import {
  ArrowRight, Baby, BookOpen, Car, Clock3, Coffee, DoorOpen, Hand, HeartHandshake,
  Info, MapPin, Music, Users,
} from "lucide-react";
import { t } from "@connectapp/i18n";
import { imageOf, linkOf, richOf, rowsOf, textOf } from "@connectapp/db/rules";
import {
  Band, BODY, Btn, Btns, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD, T,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/**
 * The icons a step may name, by the word the church picks in the editor.
 *
 * A name nobody knows falls back to the arrow, so a typo in a stored value
 * draws a step rather than a hole.
 */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  arrow: ArrowRight,
  baby: Baby,
  bible: BookOpen,
  car: Car,
  clock: Clock3,
  coffee: Coffee,
  door: DoorOpen,
  hand: Hand,
  help: Info,
  map: MapPin,
  music: Music,
  people: Users,
  welcome: HeartHandshake,
};

const iconFor = (name: string): React.ComponentType<{ className?: string }> =>
  ICONS[name.trim().toLowerCase()] ?? ArrowRight;

interface Step {
  title: string;
  body: ReturnType<typeof richOf>;
  icon: string;
  at: string;
}

export function VisitSection({ section, site }: SectionViewProps) {
  const steps: Step[] = rowsOf(section.content["items"]).map((row, index) => ({
    title: textOf(row["title"]),
    body: richOf(row["body"]),
    icon: textOf(row["icon"]),
    at: `items.${index}`,
  }));
  const action = linkOf(section.content["action"]);
  const variant = section.variant;
  const centred = section.style?.align === "centre" && variant !== "withImage";

  if (variant === "withImage") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid grid-cols-1 items-start gap-[calc(var(--s-gap)*1.6)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Pic
              value={imageOf(section.content["image"])}
              at="image"
              site={site}
              ratio="4 / 5"
              sizes="(min-width: 1024px) 45vw, 100vw"
              alt={t("website.ph.visit.image")}
              className="rounded-[var(--s-image-corner)]"
            />
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.2)]">
              <Head content={section.content} site={site} />
              {steps.length === 0 ? (
                <NothingYet site={site}>{t("website.empty.visit")}</NothingYet>
              ) : (
                <div className="flex flex-col gap-[var(--s-gap)]">
                  {steps.map((step) => (
                    <CompactStep key={step.at} step={step} site={site} />
                  ))}
                </div>
              )}
              {action ? (
                <Btns>
                  <Btn value={action} at="action" site={site} />
                </Btns>
              ) : null}
            </div>
          </div>
        </Inner>
      </Band>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={variant === "cards"}>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.5)]">
          <Head content={section.content} site={site} centred={centred} />
          {steps.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.visit")}</NothingYet>
          ) : variant === "cards" ? (
            <Grid columns={3}>
              {steps.map((step) => (
                <Card key={step.at} className="flex flex-col gap-4">
                  <IconMark icon={step.icon} />
                  <T
                    value={step.title}
                    as="h3"
                    at={`${step.at}.title`}
                    site={site}
                    className={SUBHEAD}
                  />
                  <P
                    value={step.body}
                    at={`${step.at}.body`}
                    site={site}
                    className={`${BODY} text-[var(--s-muted)]`}
                  />
                </Card>
              ))}
            </Grid>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-0 p-0">
              {steps.map((step, index) => (
                <li
                  key={step.at}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5"
                >
                  {/* The numeral, and under it the thread to the next step, so
                      the column reads as one sequence rather than four cards. */}
                  <div className="flex flex-col items-center gap-2">
                    <span
                      aria-hidden
                      className={
                        "grid size-11 shrink-0 place-items-center rounded-full"
                        + " bg-[var(--s-primary-soft)] font-[family-name:var(--s-display)]"
                        + " text-[1.05rem] leading-none text-[var(--s-primary)]"
                      }
                    >
                      {index + 1}
                    </span>
                    {index === steps.length - 1 ? null : (
                      <span aria-hidden className="w-px flex-1 bg-[var(--s-line)]" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 pb-[calc(var(--s-gap)*1.2)]">
                    <T
                      value={step.title}
                      as="h3"
                      at={`${step.at}.title`}
                      site={site}
                      className={SUBHEAD}
                    />
                    <P
                      value={step.body}
                      at={`${step.at}.body`}
                      site={site}
                      className={`${BODY} text-[var(--s-muted)]`}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {action ? (
            <Btns className={centred ? "justify-center" : ""}>
              <Btn value={action} at="action" site={site} />
            </Btns>
          ) : null}
        </div>
      </Inner>
    </Band>
  );
}

/** A step beside the photograph: its icon, its title, its words. */
function CompactStep({ step, site }: { step: Step; site: SectionViewProps["site"] }) {
  const Icon = iconFor(step.icon);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1">
      <Icon aria-hidden className="mt-[0.15em] size-6 shrink-0 text-[var(--s-primary)]" />
      <div className="flex flex-col gap-1.5">
        <T
          value={step.title}
          as="h3"
          at={`${step.at}.title`}
          site={site}
          className={SUBHEAD}
        />
        <P
          value={step.body}
          at={`${step.at}.body`}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
        />
      </div>
    </div>
  );
}

/** The roundel a card opens with. */
function IconMark({ icon }: { icon: string }) {
  const Icon = iconFor(icon);
  return (
    <span
      className={
        "grid size-12 place-items-center rounded-[calc(var(--s-corner)*0.6)]"
        + " bg-[var(--s-primary-soft)]"
      }
    >
      <Icon aria-hidden className="size-6 text-[var(--s-primary)]" />
    </span>
  );
}
