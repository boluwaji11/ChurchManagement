"use client";

import * as React from "react";
import { Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar, Banner, Button, Combobox, Field, IconButton,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { findPerson, join, type PersonHit } from "./actions";

/**
 * R9.4, R24.6. Putting people in a group, from a panel at the right.
 *
 * A membership is a record the church keeps, so it is written in the panel
 * rather than in a field above the roster.
 *
 * Nobody joins on being picked. A leader typing up a roster is adding eight
 * people from a directory of four hundred, and a lookup that writes the moment
 * a name is chosen turns a misread surname into a membership somebody then has
 * to find and undo. The names gather in a list, the list is read once, and one
 * press writes them.
 *
 * Everybody joins as a member. Who leads it is set on the group itself, where
 * the question is asked once rather than on every row.
 */
export function AddMember({ church, groupId }: { church: string; groupId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<PersonHit[]>([]);
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [error, setError] = React.useState<string>();
  const [searching, setSearching] = React.useState(false);
  const [saving, startSaving] = React.useTransition();
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);

  /* Nothing is fetched until a name is being typed: the first fifty surnames
     in the alphabet answer nobody's question. */
  const look = (query: string) => {
    if (query.trim().length < 2) {
      ticket.current += 1;
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

  const pick = (memberId: string) => {
    const one = hits.find((hit) => hit.id === memberId);
    if (!one || picked.some((each) => each.id === one.id)) return;
    setPicked((was) => [...was, one]);
    setHits([]);
  };

  /* Blank on every close, including Cancel and Escape: a panel that reopens
     holding four names somebody walked away from is a panel that writes them
     the next time anybody presses Add. */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPicked([]);
      setHits([]);
      setError(undefined);
    }
  };

  const save = () => {
    if (picked.length === 0) return;
    startSaving(async () => {
      for (const one of picked) {
        const result = await join(groupId, one.id, "member", church);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      close(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> {t("groups.addMembers")}
        </Button>
      </SheetTrigger>

      <SheetContent
        title={t("groups.addMembers")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={save} disabled={saving || picked.length === 0} loading={saving}>
              {picked.length > 0 ? plural("groups.addCount", picked.length) : t("groups.addDo")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

        <Field label={t("groups.findMember")}>
          <Searching on={searching}>
            <Combobox
              options={hits
                .filter((one) => !picked.some((each) => each.id === one.id))
                .map((one) => ({
                  value: one.id,
                  label: one.name,
                  keywords: one.household ?? undefined,
                }))}
              value=""
              onChange={pick}
              onQueryChange={look}
              icon={<Search />}
              placeholder={t("groups.findMember")}
              emptyLabel={t("person.noMatch")}
              clearLabel={t("date.clear")}
            />
          </Searching>
        </Field>

        {/* Who is about to join, read once before anybody does. A hairline
            between the rows and a cross on each, the way every other list in
            the product takes something back off. */}
        {picked.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line rounded-[14px] border border-line bg-surface">
            {picked.map((one) => (
              <li key={one.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={one.name} id={one.id} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                  {one.name}
                </span>
                <IconButton
                  label={t("groups.dontAdd", { name: one.name })}
                  variant="ghost"
                  className="size-8 min-h-0 [&_svg]:size-4"
                  onClick={() => setPicked((was) => was.filter((each) => each.id !== one.id))}
                >
                  <X />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
