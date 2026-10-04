"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, UserPlus } from "lucide-react";
import { Avatar, Banner, Badge, Combobox, IconButton } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { addMember, removeMember, findPerson, type PersonHit } from "../actions";

export interface RosterMember {
  id: string;
  personId: string;
  name: string;
  role: string;
  joinedOn: string;
  positions: { id: string; name: string }[];
  /** How many times they are down to serve this month. */
  scheduled: number;
}

export interface PositionOption {
  id: string;
  name: string;
}

/**
 * R10.1. Who serves on this team, and how much each of them is already doing.
 *
 * Adding somebody is the same search the station and the group roster use,
 * because a church has one directory and a worship leader should not have to
 * learn a second way of finding people in it.
 */
export function Roster({
  church,
  teamId,
  members,
  month,
}: {
  church: string;
  teamId: string;
  members: RosterMember[];
  /** The month the counts are about, named in the line under each person. */
  month: string;
}) {
  const router = useRouter();
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  /*
   * R10.1. The directory is searched as the name is typed, rather than a page
   * of it being held here: a church of five hundred is not a dropdown.
   */
  const look = React.useCallback(
    (query: string) => {
      startTransition(async () => setHits(await findPerson(query, church)));
    },
    [church],
  );

  React.useEffect(() => {
    look("");
  }, [look]);

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const held = new Set(members.map((one) => one.personId));

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      <Combobox
        options={hits
          .filter((one) => !held.has(one.id))
          .map((one) => ({ value: one.id, label: one.name, keywords: one.household ?? undefined }))}
        value=""
        onChange={(personId) => run(() => addMember(teamId, personId, "member", church))}
        placeholder={t("serving.addFromPeople")}
        emptyLabel={t("serving.roster.noMatch")}
        clearLabel={t("date.clear")}
        onQueryChange={look}
      />

      <ul className="flex flex-col">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 border-b border-sunken py-2.5 last:border-0"
          >
            <Avatar
              name={member.name}
              id={member.personId}
              className="size-9 text-[12px] font-semibold"
            />

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/people/${member.personId}?church=${church}`}
                  className="font-medium text-fg underline-offset-4 hover:underline"
                >
                  {member.name}
                </Link>
                {member.role === "leader" ? (
                  <Badge tone="neutral">{t("serving.role.leader")}</Badge>
                ) : null}
              </span>
              <span className="text-[13px] text-fg-muted">
                {t("serving.scheduled", { count: member.scheduled, month })}
              </span>
            </span>

            <IconButton
              label={t("serving.remove")}
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => removeMember(teamId, member.personId, church))}
            >
              <X />
            </IconButton>
          </li>
        ))}
      </ul>

      {members.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-fg-muted">
          <UserPlus className="size-4" aria-hidden /> {t("serving.roster.empty")}
        </p>
      ) : null}
    </div>
  );
}
