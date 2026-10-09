"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar, Banner, Button, Checkbox, Field, IconButton,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { SearchField } from "@/components/search-field";
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
  const [query, setQuery] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [searching, setSearching] = React.useState(false);
  const [saving, startSaving] = React.useTransition();
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);

  /* Nothing is fetched until a name is being typed: the first fifty surnames
     in the alphabet answer nobody's question. */
  const look = (next: string) => {
    setQuery(next);
    if (next.trim().length < 2) {
      ticket.current += 1;
      setSearching(false);
      setHits([]);
      return;
    }
    const mine = ++ticket.current;
    setSearching(true);
    void findPerson(next, church).then((found) => {
      if (mine !== ticket.current) return;
      setSearching(false);
      setHits(found);
    });
  };

  /* Ticking a name keeps the answers on screen. A leader looking up a
     household is adding four people from one search, and a list that put
     itself away on the first of them made them type the surname four times. */
  const toggle = (one: PersonHit) =>
    setPicked((was) =>
      was.some((each) => each.id === one.id)
        ? was.filter((each) => each.id !== one.id)
        : [...was, one]);

  /* Blank on every close, including Cancel and Escape: a panel that reopens
     holding four names somebody walked away from is a panel that writes them
     the next time anybody presses Add. */
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPicked([]);
      setHits([]);
      setQuery("");
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
            <SearchField
              value={query}
              onChange={look}
              placeholder={t("groups.findMember")}
              className="max-w-none"
            />
          </Searching>
        </Field>

        {/* What the search found, ticked one at a time and staying put. */}
        {query.trim().length >= 2 && !searching ? (
          hits.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("person.noMatch")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-[14px] border border-line bg-surface">
              {hits.map((one) => {
                const on = picked.some((each) => each.id === one.id);
                return (
                  <li key={one.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-sunken">
                      <Checkbox checked={on} onCheckedChange={() => toggle(one)} />
                      <Avatar name={one.name} id={one.id} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[length:var(--d-text-body)] text-fg">
                          {one.name}
                        </span>
                        {one.household ? (
                          <span className="truncate text-caption text-fg-subtle">
                            {one.household}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}

        {/* Who is about to join, read once before anybody does, including
            whoever was found under a search since typed over. */}
        {picked.length > 0 ? (
          <>
          {/* R24.6. The rail the product uses wherever a few things are about
              to become one thing: a dot a row and a line running between
              them. */}
          <ol className="m-0 flex list-none flex-col p-0">
            {picked.map((one) => (
              <li key={one.id} className="flex gap-2.5">
                <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                  <span className="mt-4 size-2.5 shrink-0 rounded-full bg-primary" />
                  <span className="my-1 w-px flex-1 bg-primary/35" />
                </span>

                <span className="flex min-w-0 flex-1 items-center gap-3 py-2">
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
                </span>
              </li>
            ))}
          </ol>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
