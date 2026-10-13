"use client";

import * as React from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar, Banner, Button, Checkbox, Field, IconButton,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Searching } from "@/components/searching";
import { SearchField } from "@/components/search-field";
import { findPerson, join, type PersonHit } from "./actions";

/** R24.6. The step this screen is, inside the group's own window. */
const STEP = "add";

/** Asks the window to show a part of itself. */
const show = (id: string) =>
  window.dispatchEvent(new CustomEvent("record-section", { detail: id }));

/**
 * R9.4, R24.6. The mark that opens the step, in the window's row of marks.
 *
 * A filled button beside three icons reads as the only thing there.
 */
export function AddMemberMark() {
  return (
    <IconButton
      label={t("groups.addMembers")}
      variant="ghost"
      onClick={() => show(STEP)}
    >
      <Plus />
    </IconButton>
  );
}

/**
 * R9.4, R24.6. Putting people in a group, as a step of the group's own window.
 *
 * It was a second panel sliding in from the right over the first, which is two
 * windows for one errand and leaves the group half covered behind it. The
 * group's window shows this instead, and the way back out is at the top of it:
 * a leader who has just added four people lands back on the group.
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
export function AddMemberStep({ groupId }: { groupId: string }) {
  const router = useRouter();
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
    void findPerson(next).then((found) => {
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

  /* Blank on the way out, however it is left: a step that reopens holding
     four names somebody walked away from is a step that writes them the next
     time anybody presses Add. */
  const leave = () => {
    setPicked([]);
    setHits([]);
    setQuery("");
    setError(undefined);
    show("__back__");
  };

  const save = () => {
    if (picked.length === 0) return;
    startSaving(async () => {
      for (const one of picked) {
        const result = await join(groupId, one.id, "member");
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      leave();
      router.refresh();
    });
  };

  return (
    <section data-record-section id={STEP} className="flex flex-col gap-5">
      {/* R24.6. The way back, over the step rather than beside the window's
          close square, because closing the window and leaving this step are
          two different errands. */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={leave}
          disabled={saving}
          className="-ml-2 h-9 min-h-0 px-2 text-[13px] font-medium text-primary"
        >
          <ArrowLeft /> {t("groups.addBack")}
        </Button>

        <span className="flex-1" />

        <Button onClick={save} disabled={saving || picked.length === 0} loading={saving}>
          {picked.length > 0 ? plural("groups.addCount", picked.length) : t("groups.addDo")}
        </Button>
      </div>

      <h3 className="font-display text-[22px] leading-7 text-fg">{t("groups.addMembers")}</h3>

        {error ? <Banner tone="danger">{error}</Banner> : null}

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
    </section>
  );
}
