"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Button, Badge, LIFT } from "@hearth/ui";
import { Empty } from "@/components/empty";
import { t, plural } from "@hearth/i18n";

export interface TeamCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  hue: string;
  members: number;
  positions: number;
  /** The positions by name, which is what the card actually shows. */
  positionNames: string[];
  needsChecks: boolean;
  archived: boolean;
}

/**
 * R10.1. Every team the church runs.
 *
 * A card each, carrying what somebody opening this screen is asking: what the
 * team is made of, and how many people it has.
 */
export function Teams({
  church,
  teams,
  canManage,
}: {
  church: string;
  teams: TeamCard[];
  canManage?: boolean;
}) {
  if (teams.length === 0) {
    return (
      <Empty
        icon="serving"
        title={t("serving.empty")}
        action={
          canManage ? (
            <Button asChild>
              <Link href={`/serving?church=${church}&view=teams&add=1`}>
                <Plus /> {t("serving.addTeam")}
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {teams.map((team) => (
          <li key={team.id}>
            {/* R24.x. The whole tile opens the team. The title carries the
                link and stretches over the card, so the markup stays an anchor
                around text rather than an anchor around buttons. */}
            <section className={`relative flex h-full cursor-pointer flex-col gap-3.5 rounded-lg border border-line bg-surface p-4.5 focus-within:shadow-md ${LIFT}`}>
              <div className="flex items-center gap-2.5">
                <span
                  className="size-3 shrink-0 rounded-[4px]"
                  style={{ background: `var(--hue-${team.hue}-500)` }}
                />
                <h3 className="min-w-0 flex-1 truncate font-display text-[21px] leading-[26px] text-fg">
                  <Link
                    href={`/serving/${team.slug}?church=${church}`}
                    className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
                  >
                    {team.name}
                  </Link>
                </h3>
                {team.archived ? <Badge tone="neutral">{t("serving.archived")}</Badge> : null}
              </div>

              {/* R10.2. What the team is made of, which is the thing a church
                  recognises its own team by. */}
              {team.positionNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {team.positionNames.map((name) => (
                    <span
                      key={name}
                      className="flex h-[26px] items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}

              {team.needsChecks ? (
                <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                  <ShieldCheck className="size-4" aria-hidden />
                  {t("serving.needsChecks")}
                </span>
              ) : null}

              <div className="mt-auto flex items-center gap-3 border-t border-sunken pt-3">
                <span className="flex-1 text-[13px] text-fg-muted">
                  {[
                    plural("serving.volunteerCount", team.members),
                    plural("serving.positionCount", team.positions),
                  ].join(" · ")}
                </span>

                {/* Lifted above the stretched link, so it keeps its own job. */}
                <Button
                  variant="secondary"
                  className="relative min-h-[34px] px-3 text-[13px]"
                  asChild
                >
                  <Link href={`/serving?church=${church}&team=${team.id}`}>
                    {t("serving.openSchedule")}
                  </Link>
                </Button>
              </div>

            </section>
          </li>
        ))}
      </ul>
    </div>
  );
}
