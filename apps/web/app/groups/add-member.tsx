"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Banner, Combobox } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { findPerson, join, type PersonHit } from "./actions";

/**
 * R9.4. Putting somebody in a group.
 *
 * The same directory lookup every other person field uses, so a leader does not
 * have to learn a second way of finding members. The matches float over the page
 * rather than opening above the roster, which otherwise pushes the list down
 * while somebody is still typing.
 *
 * Everybody joins as a member. Who leads it is set on the group itself, where
 * the question is asked once rather than on every row.
 */
export function AddMember({ church, groupId }: { church: string; groupId: string }) {
  const router = useRouter();
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const look = (query: string) => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    void findPerson(query, church).then(setHits);
  };

  const add = (memberId: string) => {
    if (!memberId) return;
    startTransition(async () => {
      const result = await join(groupId, memberId, "member", church);
      setError(result.error);
      setHits([]);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      <Combobox
        options={hits.map((one) => ({
          value: one.id,
          label: one.name,
          keywords: one.household ?? undefined,
        }))}
        value=""
        onChange={add}
        onQueryChange={look}
        icon={<Search />}
        placeholder={t("groups.addPerson")}
        emptyLabel={t("person.noMatch")}
        clearLabel={t("date.clear")}
      />
    </div>
  );
}
