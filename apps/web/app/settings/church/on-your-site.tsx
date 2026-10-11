"use client";

import * as React from "react";
import { HandHeart, UserPlus, Users } from "lucide-react";
import {
  Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SITE_BUILDERS } from "@connectapp/db/rules";
import { Copyable } from "./copyable";
import { saveSiteBuilder } from "./domain-actions";

type Part = "giving" | "groups" | "join";

const ICON = { giving: HandHeart, groups: Users, join: UserPlus } as const;

/**
 * R9.5, R13.5, R17.1. What a church puts on the site it already has.
 *
 * One picker rather than a card for each. A church adds one of these at a
 * time, on the afternoon it decides to, and three cards side by side asks it
 * to read all three to find the one it came for.
 *
 * Giving is a button, the finder is a frame, and the door is a link only.
 * The giving page carries Stripe's own checkout, and nesting a payment frame
 * inside ours inside the church's page is three deep before a card number is
 * typed; a Give button on the home page is also what a church asks for.
 * Signing in can never be framed at all, because a session inside somebody
 * else's page is a third-party cookie and Safari and Chrome both refuse
 * those, so a framed door works until it quietly does not.
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
  /** What the church has told us, or null until it has. */
  builder: string | null;
  /** What its nameservers suggested, where they named one at all. */
  guessed: string | null;
}) {
  const [part, setPart] = React.useState<Part>("giving");
  /* The guess stands in until the church says otherwise, and saving it is
     what turns a guess into an answer. */
  const [built, setBuilt] = React.useState<string>(builder ?? guessed ?? "");
  const [, start] = React.useTransition();

  const button =
    `<a href="${giving}" style="display:inline-block;padding:14px 28px;border-radius:9999px;`
    + `background:#1d1d2d;color:#ffffff;font:600 16px/1 system-ui,sans-serif;`
    + `text-decoration:none">${t("site.give.label")}</a>`;

  const frame =
    `<iframe src="${groupsFrame}" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  const showing: { link: string; snippet?: string; snippetLabel?: string } =
    part === "giving"
      ? { link: giving, snippet: button, snippetLabel: t("site.give.snippet") }
      : part === "groups"
        ? { link: groups, snippet: frame, snippetLabel: t("site.snippet") }
        : { link: join };

  const Mark = ICON[part];

  return (
    <div className="flex flex-col gap-5">
      <Field label={t("site.which")}>
        <Select value={part} onValueChange={(value) => setPart(value as Part)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="giving">{t("site.part.giving")}</SelectItem>
            <SelectItem value="groups">{t("site.part.groups")}</SelectItem>
            <SelectItem value="join">{t("site.part.join")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
          style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
        >
          <Mark />
        </span>
        <span className="text-heading text-fg">{t(`site.part.${part}` as never)}</span>
      </div>

      <Copyable label={t(`site.part.${part}` as never)} value={showing.link} open={showing.link} />

      {showing.snippet ? (
        <>
          <Field label={showing.snippetLabel!}>
            <Textarea
              readOnly
              rows={4}
              value={showing.snippet}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-[12px]"
            />
          </Field>

          {/* R9.5, R22.2. "Paste this into your website" is the instruction a
              volunteer gets stuck on, and it is a different few presses at
              every builder. */}
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

          {built ? (
            <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-sunken p-4">
              <h4 className="m-0 text-caption font-medium tracking-[0.02em] text-fg-subtle uppercase">
                {t("site.whereToPaste")}
              </h4>
              <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
                {t(`steps.${built}` as never)
                  .split("\n")
                  .map((step) => (
                    <li key={step} className="text-[length:var(--d-text-body)] leading-6 text-fg">
                      {step}
                    </li>
                  ))}
              </ol>
            </section>
          ) : null}
        </>
      ) : (
        /* R1.4. The one that is a link and nothing else, said once. */
        <p className="m-0 text-[length:var(--d-text-body)] leading-6 text-fg-muted">
          {t("site.join.linkOnly")}
        </p>
      )}
    </div>
  );
}
