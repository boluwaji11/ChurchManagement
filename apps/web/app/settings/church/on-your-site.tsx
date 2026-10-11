"use client";

import * as React from "react";
import { HandHeart, Users } from "lucide-react";
import { Card, CardTitle, Field, Separator, Textarea } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Copyable } from "./copyable";

function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4"
        style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
      >
        {icon}
      </span>
      <CardTitle>{title}</CardTitle>
    </div>
  );
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <Textarea
        readOnly
        rows={3}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-[12px]"
      />
    </Field>
  );
}

/**
 * R9.5, R13.5, R17.1. What a church puts on its own website.
 *
 * Giving is a button and the group finder is a frame, and the difference is
 * not a style choice.
 *
 * A frame is right for the finder: it has no session, nothing it holds is
 * private, and a church wants its groups to read as part of its own page.
 * Giving is a button because the giving page carries Stripe's own checkout,
 * and nesting somebody else's payment frame inside ours inside the church's
 * page is three deep. It is also what a church asks for: a Give button on the
 * home page, not a donation form halfway down it.
 *
 * Signing in is neither. A session inside somebody else's page is a
 * third-party cookie, Safari and Chrome both refuse those, and a framed
 * sign-in is one that works until it quietly does not. The church's own
 * address is the sign-in, and it is a link.
 */
export function OnYourSite({
  giving,
  groups,
  groupsFrame,
}: {
  /** The church's giving page, on its own address. */
  giving: string;
  /** The group finder, on its own address. */
  groups: string;
  /** The same finder with the church's page around it stripped off. */
  groupsFrame: string;
}) {
  /*
   * Styled inline, because a church's own site has no stylesheet of ours and
   * an unstyled link in the middle of a home page does not read as the thing
   * somebody presses to give.
   */
  const button =
    `<a href="${giving}" style="display:inline-block;padding:14px 28px;border-radius:9999px;`
    + `background:#1d1d2d;color:#ffffff;font:600 16px/1 system-ui,sans-serif;`
    + `text-decoration:none">${t("site.give.label")}</a>`;

  const frame =
    `<iframe src="${groupsFrame}" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-4">
        <Head icon={<HandHeart />} title={t("site.give.title")} />
        <Separator />
        <Copyable label={t("site.give.title")} value={giving} open={giving} />
        <Snippet label={t("site.give.snippet")} value={button} />
      </Card>

      <Card className="flex flex-col gap-4">
        <Head icon={<Users />} title={t("site.groups")} />
        <Separator />
        <Copyable label={t("site.groups")} value={groups} open={groups} />
        <Snippet label={t("site.snippet")} value={frame} />
      </Card>
    </div>
  );
}
