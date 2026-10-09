"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Banner, Button, Combobox, Field,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { findPerson, join, type PersonHit } from "./actions";

/**
 * R9.4, R24.6. Putting somebody in a group, from a panel at the right.
 *
 * The screen's one action opens it, which is where every other screen in the
 * product puts the thing it is for. A membership is a record the church keeps,
 * so it is written in the panel rather than in a field above the roster.
 *
 * The same directory lookup every other person field uses, so a leader does
 * not have to learn a second way of finding members. The panel stays open
 * after each one: a leader typing up a roster is adding eight people, not one.
 *
 * Everybody joins as a member. Who leads it is set on the group itself, where
 * the question is asked once rather than on every row.
 */
export function AddMember({ church, groupId }: { church: string; groupId: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> {t("groups.addPerson")}
        </Button>
      </SheetTrigger>
      <SheetContent
        title={t("groups.addPerson")}
        closeLabel={t("common.close")}
        footer={
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        <Lookup church={church} groupId={groupId} />
      </SheetContent>
    </Sheet>
  );
}

function Lookup({ church, groupId }: { church: string; groupId: string }) {
  const router = useRouter();
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [searching, setSearching] = React.useState(false);
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);

  const look = (query: string) => {
    if (query.trim().length < 2) {
      ticket.current++;
      setSearching(false);
      setHits([]);
      return;
    }
    const mine = ++ticket.current;
    setSearching(true);
    void findPerson(query, church).then((found) => {
      if (mine !== ticket.current) return;
      setSearching(false);
      setHits(found);
    });
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

      <Field label={t("groups.addPerson")} required>
      <Searching on={searching}>
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
      </Searching>
      </Field>
    </div>
  );
}
