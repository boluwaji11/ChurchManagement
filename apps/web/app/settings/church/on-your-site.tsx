"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, HandHeart, UserPlus, Users } from "lucide-react";
import {
  Button, Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, cn,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SITE_BUILDERS } from "@connectapp/db/rules";
import { Copyable } from "./copyable";
import { saveSiteBuilder } from "./domain-actions";

type Part = "giving" | "groups" | "join";

const PARTS: { id: Part; icon: typeof Users }[] = [
  { id: "giving", icon: HandHeart },
  { id: "groups", icon: Users },
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
        "flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-colors",
        chosen ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
        style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-heading text-fg">{title}</span>
        <span className="text-[13px] leading-5 text-fg-muted">{says}</span>
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
  builder,
  guessed,
}: {
  giving: string;
  groups: string;
  groupsFrame: string;
  join: string;
  builder: string | null;
  guessed: string | null;
}) {
  const [step, setStep] = React.useState(1);
  const [part, setPart] = React.useState<Part | null>(null);
  const [built, setBuilt] = React.useState(builder ?? guessed ?? "");
  const [, start] = React.useTransition();

  const pastes = part !== null && part !== "join";
  const labels = [t("site.step.page"), t("site.step.site"), t("site.step.add")];

  const button =
    `<a href="${giving}" style="display:inline-block;padding:14px 28px;border-radius:9999px;`
    + `background:#1d1d2d;color:#ffffff;font:600 16px/1 system-ui,sans-serif;`
    + `text-decoration:none">${t("site.give.label")}</a>`;

  const frame =
    `<iframe src="${groupsFrame}" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  const shown =
    part === "giving"
      ? { link: giving, snippet: button, snippetLabel: t("site.give.snippet") }
      : part === "groups"
        ? { link: groups, snippet: frame, snippetLabel: t("site.snippet") }
        : { link: join, snippet: undefined, snippetLabel: undefined };

  const pick = (id: Part) => {
    setPart(id);
    /* The door has nothing to paste, so it skips the question about where. */
    setStep(id === "join" ? 3 : 2);
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <Trail labels={labels} at={step} onGo={setStep} />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {step === 1 ? (
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

        {step === 2 ? (
          <Field label={t("site.builder")}>
            <Select
              value={built}
              onValueChange={(value) => {
                setBuilt(value);
                start(async () => { await saveSiteBuilder(value); });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("builder.unset")} />
              </SelectTrigger>
              <SelectContent>
                {SITE_BUILDERS.map((one) => (
                  <SelectItem key={one} value={one}>{t(`builder.${one}` as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <Copyable
              label={t(`site.part.${part ?? "giving"}` as never)}
              value={shown.link}
              open={shown.link}
            />

            {shown.snippet ? (
              <>
                <Field label={shown.snippetLabel!}>
                  <Textarea
                    readOnly
                    rows={4}
                    value={shown.snippet}
                    onFocus={(e) => e.currentTarget.select()}
                    className="font-mono text-[12px]"
                  />
                </Field>

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
            ) : (
              <p className="m-0 text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                {t("site.join.linkOnly")}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Pinned, so the way on sits in the same place at every step. */}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 1}
          onClick={() => setStep(step === 3 && !pastes ? 1 : step - 1)}
        >
          <ArrowLeft /> {t("action.back")}
        </Button>

        {step === 2 ? (
          <Button type="button" disabled={!built} onClick={() => setStep(3)}>
            {t("action.next")} <ArrowRight />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
