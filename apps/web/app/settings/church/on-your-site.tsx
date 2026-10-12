"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, HandHeart, UserPlus, Users } from "lucide-react";
import {
  Button, Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, cn,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SITE_BUILDERS } from "@connectapp/db/rules";
import { Copyable } from "./copyable";
import { saveSiteBuilder } from "./domain-actions";

type Part = "giving" | "groups" | "events" | "join";

/*
 * Alphabetical by the name on screen, because somebody looking for Squarespace
 * reads down the list rather than guessing our order. The two that are not
 * products sit at the end, where a reader lands after not finding theirs.
 */
const LAST = ["code", "other"];
const BUILDERS = [
  ...SITE_BUILDERS.filter((one) => !LAST.includes(one))
    .slice()
    .sort((a, b) => t(`builder.${a}` as never).localeCompare(t(`builder.${b}` as never))),
  ...LAST,
];

const PARTS: { id: Part; icon: typeof Users }[] = [
  { id: "giving", icon: HandHeart },
  { id: "groups", icon: Users },
  { id: "events", icon: CalendarDays },
  { id: "join", icon: UserPlus },
];

/**
 * The three steps, and the one being taken.
 *
 * The ones behind are pressable, because somebody who picked Giving and then
 * wondered what Groups looked like should not have to start again. The one
 * ahead is not: it has nothing to show until this one is answered.
 */
function Trail({
  labels,
  at,
  onGo,
}: {
  labels: string[];
  at: number;
  onGo: (step: number) => void;
}) {
  return (
    <ol className="flex list-none items-start gap-0 p-0">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < at;
        const here = n === at;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "bg-transparent" : done || here ? "bg-primary" : "bg-line")} />
              <span
                aria-hidden
                className={cn(
                  "mx-1 size-3 shrink-0 rounded-full",
                  here ? "bg-primary ring-4 ring-primary/20" : done ? "bg-primary" : "bg-line",
                )}
              />
              <span className={cn("h-0.5 flex-1 rounded-full", i === labels.length - 1 ? "bg-transparent" : done ? "bg-primary" : "bg-line")} />
            </span>

            {done ? (
              <button
                type="button"
                onClick={() => onGo(n)}
                className="rounded-sm text-center text-[13px] text-fg-muted hover:text-fg"
              >
                {label}
              </button>
            ) : (
              <span className={cn("text-center text-[13px]", here ? "font-semibold text-fg" : "text-fg-subtle")}>
                {label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One of the two ways to use a page, with what it is for above it. */
function Use({
  title,
  says,
  children,
}: {
  title: string;
  says: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="m-0 text-[length:var(--d-text-body)] font-medium leading-5 text-fg">
        {title}
      </h4>
      <p className="m-0 text-[12px] leading-4 text-fg-subtle">{says}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

/** One thing to pick, as a whole row rather than a dot beside a word. */
function Choice({
  icon,
  title,
  says,
  chosen,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  says: string;
  chosen: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={chosen}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
        chosen ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-[15px]"
        style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[length:var(--d-text-body)] font-medium leading-5 text-fg">{title}</span>
        <span className="text-[12px] leading-4 text-fg-subtle">{says}</span>
      </span>
      {chosen ? <Check className="size-[18px] shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}

/**
 * R9.5, R13.5, R17.1. What a church puts on the site it already has.
 *
 * A flow rather than a wall. The three questions are asked one at a time and
 * in the order somebody answers them anyway: which page, where the site is
 * built, and then the words and the code for that pair. Every step back is a
 * press on the trail, so trying the other page costs nothing.
 *
 * Giving is a button, the finder is a frame, and the door is a link only. The
 * giving page carries Stripe's own checkout, and nesting a payment frame
 * inside ours inside the church's page is three deep before a card number is
 * typed. Signing in can never be framed at all: a session inside somebody
 * else's page is a third-party cookie, Safari and Chrome both refuse those,
 * and a framed door works until it quietly does not. So the door skips the
 * second step, because there is nothing to paste anywhere.
 */
export function OnYourSite({
  giving,
  groups,
  groupsFrame,
  join,
  events,
  eventsFrame,
  builder,
  guessed,
}: {
  giving: string;
  groups: string;
  groupsFrame: string;
  join: string;
  events: string;
  eventsFrame: string;
  builder: string | null;
  guessed: string | null;
}) {
  const [at, setAt] = React.useState(1);
  const [part, setPart] = React.useState<Part | null>(null);
  const [built, setBuilt] = React.useState(builder ?? guessed ?? "");
  const [, start] = React.useTransition();

  /*
   * The door has nothing to paste anywhere, so it has two steps rather than
   * three. Skipping the middle one of three looked like the screen had
   * failed; a trail of two says there were only ever two.
   */
  const trail: ("page" | "site" | "add")[] =
    part === "join" ? ["page", "add"] : ["page", "site", "add"];
  const here = trail[at - 1] ?? "page";
  const labels = trail.map((one) => t(`site.step.${one}` as never));

  const button =
    `<a href="${giving}" style="display:inline-block;padding:14px 28px;border-radius:9999px;`
    + `background:#1d1d2d;color:#ffffff;font:600 16px/1 system-ui,sans-serif;`
    + `text-decoration:none">${t("site.give.label")}</a>`;

  const framed = (src: string, title: string) =>
    `<iframe src="${src}" title="${title}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  const shown =
    part === "giving"
      ? { link: giving, snippet: button }
      : part === "groups"
        ? { link: groups, snippet: framed(groupsFrame, t("nav.groups")) }
        : part === "events"
          ? { link: events, snippet: framed(eventsFrame, t("nav.events")) }
          : { link: join, snippet: undefined };

  const pick = (id: Part) => {
    setPart(id);
    setAt(2);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <Trail labels={labels} at={at} onGo={setAt} />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {here === "page" ? (
          <div className="flex flex-col gap-2">
            {PARTS.map(({ id, icon: Mark }) => (
              <Choice
                key={id}
                icon={<Mark />}
                title={t(`site.part.${id}` as never)}
                says={t(`site.choice.${id}` as never)}
                chosen={part === id}
                onPick={() => pick(id)}
              />
            ))}
          </div>
        ) : null}

        {here === "site" ? (
          <Field label={t("site.builder")}>
            <Select
              value={built}
              onValueChange={(value) => {
                setBuilt(value);
                start(async () => { await saveSiteBuilder(value); });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("common.chooseOne")} />
              </SelectTrigger>
              <SelectContent>
                {BUILDERS.map((one) => (
                  <SelectItem key={one} value={one}>{t(`builder.${one}` as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {here === "add" ? (
          <div className="flex flex-col gap-5">
            {shown.snippet ? (
              <p className="m-0 text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                {t("site.use.intro")}
              </p>
            ) : null}

            <Use
              title={t("site.use.link")}
              says={t(`site.link.${part ?? "giving"}` as never)}
            >
              <Copyable
                label={t(`site.part.${part ?? "giving"}` as never)}
                value={shown.link}
                open={shown.link}
              />
            </Use>

            {shown.snippet ? (
              <>
                <Use
                  title={t("site.use.code")}
                  says={t(`site.code.${part ?? "giving"}` as never)}
                >
                  <Textarea
                    readOnly
                    rows={4}
                    value={shown.snippet}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-[12px]"
                  />
                </Use>

                {built ? (
                  <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-sunken p-4">
                    <h4 className="m-0 text-caption font-medium tracking-[0.02em] text-fg-subtle uppercase">
                      {t("site.whereToPaste")}
                    </h4>
                    <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
                      {t(`steps.${built}` as never)
                        .split("\n")
                        .map((line) => (
                          <li key={line} className="text-[length:var(--d-text-body)] leading-6 text-fg">
                            {line}
                          </li>
                        ))}
                    </ol>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Pinned, so the way on sits in the same place at every step. The
          first step has nothing behind it, so it carries no bar at all. */}
      {at > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAt(at - 1)}
          >
            <ArrowLeft /> {t("action.back")}
          </Button>

          {here === "site" ? (
            <Button type="button" variant="ghost" disabled={!built} onClick={() => setAt(3)}>
              {t("action.next")} <ArrowRight />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
