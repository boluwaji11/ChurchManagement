"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListFilter, ListPlus } from "lucide-react";
import {
  Button, Field, Input, Sheet, SheetContent, Banner, Combobox,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { saveView, saveSelection } from "./list-actions";
import type { ListOption } from "./directory";

/**
 * R1.14. Keeping a view of the directory, and opening one again.
 *
 * Two kinds, and which one somebody gets depends on what they did before
 * pressing. Narrowing the directory and saving it keeps the filters, so the
 * list answers itself as people change. Ticking members and saving them keeps
 * those members, and nobody joins it without being put on it.
 *
 * Both were written as server actions and neither had a control, so a church
 * could not make a list at all and the screen that reads one could only be
 * reached by typing an id into the address.
 */

/** The filters a rule list may hold, the same ten the repository keeps. */
const RULE_PARAMS = [
  "q", "status", "tag", "has", "show", "missing", "joined", "group", "serving", "seen",
] as const;

/**
 * R1.14. The narrowed directory, kept under a name.
 *
 * Offered only while something is actually narrowing the list: saving the
 * whole directory as a list would be saving the screen it is already on.
 */
export function SaveView({
  church,
  params,
}: {
  church: string;
  params: URLSearchParams;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [failed, setFailed] = React.useState<string>();
  const [pending, start] = React.useTransition();

  const save = () => {
    const data = new FormData();
    data.set("church", church);
    data.set("name", name);
    for (const key of RULE_PARAMS) {
      const value = params.get(key);
      if (value) data.set(key, value);
    }

    setFailed(undefined);
    start(async () => {
      const result = await saveView(data);
      if (result.error) {
        setFailed(result.error);
        return;
      }
      setOpen(false);
      setName("");
      // Straight onto the list it just made, which is the thing asked for.
      router.push(`/members?church=${church}&list=${result.id}`);
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setFailed(undefined);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[34px] cursor-pointer items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
      >
        <ListPlus /> {t("lists.save")}
      </button>

      <SheetContent
        title={t("lists.saveTitle")}
        closeLabel={t("action.cancel")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={pending} disabled={!name.trim()} onClick={save}>
              {t("action.save")}
            </Button>
          </>
        }
      >
        {failed ? <Banner tone="danger" title={t("lists.error.name")}>{failed}</Banner> : null}

        <Field label={t("lists.name")} required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("lists.namePlaceholder")}
            autoFocus
          />
        </Field>
      </SheetContent>
    </Sheet>
  );
}

/**
 * R1.14. The lists a church keeps, and the one being opened.
 *
 * A plain control on the row rather than a drawer: a church has a handful of
 * these and the whole point is reaching one in a press.
 */
export function OpenList({
  church,
  lists,
}: {
  church: string;
  lists: ListOption[];
}) {
  const router = useRouter();
  if (lists.length === 0) return null;

  return (
    <div className="w-[200px]">
      {/* Typing finds one. A church that keeps twenty of these should not
          have to read the list to reach the one it opens every Monday. */}
      <Combobox
        options={lists.map((one) => ({ value: one.id, label: one.name }))}
        value=""
        onChange={(id) => {
          if (id) router.push(`/members?church=${church}&list=${id}`);
        }}
        clearable={false}
        placeholder={t("lists.title")}
        icon={<ListFilter />}
        emptyLabel={t("lists.noneFound")}
        clearLabel={t("common.close")}
        aria-label={t("lists.which")}
        /* The same hairline as the box beside it: the two are one pair, a way
           in by name and a way in by list. The field's own border is on the
           box inside this one, so it is reached through it. */
        className="[&>div]:border-line [&>div]:shadow-none hover:[&>div]:border-line-strong"
      />
    </div>
  );
}

/**
 * R1.14. Putting the members who are ticked onto a list.
 *
 * Either one the church already keeps, or a new one named here. Only a picked
 * list can be added to: a list that answers itself answers itself, and the
 * server refuses it, so it is not offered.
 */
export function AddToList({
  church,
  lists,
  ids,
  onDone,
}: {
  church: string;
  lists: ListOption[];
  ids: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [failed, setFailed] = React.useState<string>();
  const [pending, start] = React.useTransition();

  const picked = lists.filter((one) => one.kind === "static");

  const put = (listId?: string) => {
    const data = new FormData();
    data.set("church", church);
    if (listId) data.set("listId", listId);
    else data.set("name", name);
    for (const id of ids) data.append("ids", id);

    setFailed(undefined);
    start(async () => {
      const result = await saveSelection(data);
      if (result.error) {
        setFailed(result.error);
        return;
      }
      setOpen(false);
      setName("");
      onDone();
      router.refresh();
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName("");
          setFailed(undefined);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
      >
        <ListPlus /> {t("lists.addTo")}
      </button>

      <SheetContent
        title={t("lists.addToTitle", { count: ids.length })}
        closeLabel={t("action.cancel")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={pending} disabled={!name.trim()} onClick={() => put()}>
              {t("lists.newList")}
            </Button>
          </>
        }
      >
        {failed ? <Banner tone="danger" title={t("lists.error.name")}>{failed}</Banner> : null}

        {picked.length > 0 ? (
          <div className="flex flex-col gap-1">
            {picked.map((one) => (
              <button
                key={one.id}
                type="button"
                disabled={pending}
                onClick={() => put(one.id)}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-left hover:bg-sunken"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{one.name}</span>
                {one.count === null ? null : (
                  <span data-numeric className="shrink-0 text-[13px] text-fg-muted">
                    {one.count}
                  </span>
                )}
              </button>
            ))}

            <hr className="my-2 border-0 border-t border-line" />
          </div>
        ) : null}

        <Field label={t("lists.name")} required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("lists.namePlaceholder")}
          />
        </Field>
      </SheetContent>
    </Sheet>
  );
}
