"use client";

import * as React from "react";
import { Users } from "lucide-react";
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

/**
 * R9.5, R17.1. What a church puts on its own website.
 *
 * The member's door and the group finder, as a link and as a snippet. A church
 * pastes these into the site it already has, which is where its congregation
 * goes looking.
 *
 * The member's door is a link rather than a frame. Signing in inside somebody
 * else's page makes the session a third-party cookie, and Safari and Chrome
 * both refuse those, so a framed sign-in is a sign-in that works until it
 * quietly does not. The finder has no session and frames fine.
 */
export function OnYourSite({ origin, slug }: { origin: string; slug: string }) {
  const groupsLink = `${origin}/g/${slug}`;
  // The title is read by whoever lands on the church's page with a screen
  // reader, so it is the church's word for groups rather than ours.
  const snippet =
    `<iframe src="${groupsLink}/embed" title="${t("nav.groups")}" width="100%" height="720" `
    + `style="border:0" loading="lazy"></iframe>`;

  return (
      <Card className="flex flex-col gap-4">
        <Head icon={<Users />} title={t("site.groups")} />
        <Separator />

        <Copyable label={t("site.groups")} value={groupsLink} open={groupsLink} />

        <Field label={t("site.snippet")}>
          <Textarea
            readOnly
            rows={3}
            value={snippet}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-[12px]"
          />
        </Field>
      </Card>
  );
}
