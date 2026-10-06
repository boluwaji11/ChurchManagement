"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Plus, Trash2, UserPlus, X } from "lucide-react";
import {
  Avatar, Banner, Button, Combobox, IconButton, Field, Input, Switch, Textarea,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import {
  saveTeam, savePosition, archivePosition, archiveTeam, addMember, removeMember, findPerson,
  type PersonHit,
} from "./actions";
import { useFormError } from "@/lib/form-error";
import { Confirm } from "@/components/confirm";

export interface TeamDraft {
  id: string;
  name: string;
  description: string | null;
}

/** R10.2. A position as the dialog holds it while it is being edited. */
export interface PositionDraft {
  /** Null on a position being written for the first time. */
  id: string | null;
  name: string;
  /** R10.10. Whether it puts somebody in a room with children. */
  withChildren: boolean;
  /** R10.11. Whether a valid background check gates being scheduled to it. */
  requiresCheck: boolean;
}

/** R10.1. Somebody on the team, as the panel holds them. */
export interface MemberDraft {
  memberId: string;
  name: string;
  /** Null for somebody being put on the team now. */
  membershipId: string | null;
}

const EMPTY_POSITION: PositionDraft = {
  id: null,
  name: "",
  withChildren: false,
  requiresCheck: false,
};

/**
 * R10.1. Writing a team down.
 *
 * One form for creating and for editing, carrying the same fields either way.
 * A form that asks for positions when a team is created and then hides them
 * when it is opened again teaches the reader that the first screen was the real
 * one and this is a lesser version of it.
 */
export function TeamPanel({
  church,
  team,
  positions: existing,
  members: roster,
  title,
  trigger,
}: {
  church: string;
  team?: TeamDraft;
  /** R10.2. What the team schedules today, when one is being edited. */
  positions?: PositionDraft[];
  /** R10.1. Who is on it today. */
  members?: MemberDraft[];
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  /*
   * R10.2. A team is the positions it schedules, so they are written here
   * rather than on a second screen somebody has to find afterwards.
   */
  const blank: PositionDraft[] = existing ?? [];
  const [positions, setPositions] = React.useState<PositionDraft[]>(
    blank.length > 0 ? blank : [EMPTY_POSITION],
  );
  /** The ones taken off the list, archived when the form is saved. */
  const [dropped, setDropped] = React.useState<string[]>([]);
  /*
   * R10.1. Who serves on the team, held here until the form is saved, so a new
   * team is written down with its people in the same press as its positions.
   */
  const [people, setPeople] = React.useState<MemberDraft[]>(roster ?? []);
  const [left, setLeft] = React.useState<string[]>([]);
  /** Which of the panel's two steps is showing. */
  const [step, setStep] = React.useState<"team" | "members">("team");
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [saving, startTransition] = React.useTransition();
  // The actions sit in the panel's own footer, outside the form, so they reach
  // it by name.
  const formId = React.useId();

  const look = React.useCallback(
    (query: string) => {
      void findPerson(query, church).then(setHits);
    },
    [church],
  );

  React.useEffect(() => {
    if (step === "members") look("");
  }, [step, look]);

  const change = (at: number, fields: Partial<PositionDraft>) =>
    setPositions((was) => was.map((one, i) => (i === at ? { ...one, ...fields } : one)));

  // The panel is filled from the team each time it opens, so a close without
  // saving does not leave half an edit behind for the next reader.
  React.useEffect(() => {
    if (!open) return;
    setPositions(blank.length > 0 ? blank : [EMPTY_POSITION]);
    setDropped([]);
    setPeople(roster ?? []);
    setLeft([]);
    setStep("team");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      {/* R24.6. From the right rather than over the middle: the team being
          written down belongs beside the list of teams it joins, and the panel
          has room for the positions without the page moving. */}
      <SheetContent
        title={step === "members" ? t("serving.roster") : title}
        closeLabel={t("common.close")}
        width="520px"
        footer={
          step === "members" ? (
            <Button type="button" onClick={() => setStep("team")}>
              {t("action.done")}
            </Button>
          ) : (
            <>
              {/* R10.1. Putting the team away lives with the form that writes
                  it, at the far end from the press somebody came to make. */}
              {team ? (
                <Confirm
                  title={t("serving.archiveTitle", { name: team.name })}
                  body={t("serving.archiveBody")}
                  confirmLabel={t("serving.archive")}
                  keepLabel={t("serving.keep")}
                  disabled={saving}
                  onConfirm={() => {
                    const data = new FormData();
                    data.set("church", church);
                    data.set("id", team.id);
                    data.set("archived", "true");
                    startTransition(async () => {
                      const result = await archiveTeam(data);
                      setError(result.error);
                      if (!result.error) {
                        setOpen(false);
                        router.refresh();
                      }
                    });
                  }}
                  trigger={
                    <IconButton
                      label={t("serving.archive")}
                      variant="ghost"
                      className="mr-auto"
                    >
                      <Archive />
                    </IconButton>
                  }
                />
              ) : null}

              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" form={formId} disabled={saving}>
                {t("action.save")}
              </Button>
            </>
          )
        }
      >
        {step === "members" ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep("team")}
              className="flex cursor-pointer items-center gap-1.5 self-start font-medium text-primary"
            >
              <ArrowLeft className="size-4" aria-hidden /> {t("serving.backToTeam")}
            </button>

            {/* R10.1. The directory is searched as the name is typed: a church
                of five hundred is not a dropdown. Each choice goes straight on
                the list below, so several people are added in one visit. */}
            <Combobox
              options={hits
                .filter((one) => !people.some((x) => x.memberId === one.id))
                .map((one) => ({
                  value: one.id,
                  label: one.name,
                  keywords: one.household ?? undefined,
                }))}
              value=""
              onChange={(memberId) => {
                const hit = hits.find((one) => one.id === memberId);
                if (!hit) return;
                setPeople((was) => [...was, { memberId, name: hit.name, membershipId: null }]);
                setLeft((was) => was.filter((id) => id !== memberId));
              }}
              placeholder={t("serving.addFromPeople")}
              emptyLabel={t("serving.roster.noMatch")}
              clearLabel={t("date.clear")}
              onQueryChange={look}
            />

            {people.length === 0 ? (
              <p className="flex items-center gap-2 text-[length:var(--d-text-body)] text-fg-muted">
                <UserPlus className="size-4" aria-hidden /> {t("serving.roster.empty")}
              </p>
            ) : (
              <ol className="m-0 flex list-none flex-col p-0">
                {people.map((one, i) => (
                  <li key={one.memberId} className="flex gap-2.5">
                    <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                      {i === people.length - 1 ? null : (
                        <span className="relative my-1 w-px flex-1 bg-primary/40" />
                      )}
                    </span>

                    <span className="flex min-w-0 flex-1 items-center gap-3 pb-3">
                      <Avatar
                        name={one.name}
                        id={one.memberId}
                        className="size-8 text-[12px] font-semibold"
                      />
                      <span className="min-w-0 flex-1 truncate text-fg">{one.name}</span>
                      <IconButton
                        label={t("serving.remove")}
                        variant="ghost"
                        onClick={() => {
                          if (one.membershipId) setLeft((was) => [...was, one.memberId]);
                          setPeople((was) => was.filter((x) => x.memberId !== one.memberId));
                        }}
                      >
                        <X />
                      </IconButton>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
        <form
          id={formId}
          noValidate
          action={(data) => {
            data.set("church", church);
            if (team) data.set("id", team.id);
            startTransition(async () => {
              const result = await saveTeam(data);
              setError(result.error);
              if (result.error) return;

              const teamId = team?.id ?? result.id;
              if (teamId) {
                for (const id of dropped) await archivePosition(id, church);

                for (const one of positions) {
                  const name = one.name.trim();
                  if (!name) continue;
                  const was = (existing ?? []).find((row) => row.id === one.id);
                  if (
                    one.id
                    && was?.name === name
                    && was.withChildren === one.withChildren
                    && was.requiresCheck === one.requiresCheck
                  ) continue;
                  await savePosition(
                    one.id,
                    {
                      teamId,
                      name,
                      // R10.3. Every position asks for one. A church that
                      // wants three vocalists adds three people to it; the
                      // count was a second number to keep right for no gain.
                      needed: 1,
                      withChildren: one.withChildren,
                      requiresCheck: one.requiresCheck,
                    },
                    church,
                  );
                }
              }

              if (teamId) {
                for (const memberId of left) await removeMember(teamId, memberId, church);
                for (const one of people) {
                  if (one.membershipId) continue;
                  await addMember(teamId, one.memberId, "member", church);
                }
              }

              setOpen(false);
              router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

          <Field label={t("serving.team.name")} required>
            <Input name="name" defaultValue={team?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("serving.team.description")}>
            <Textarea name="description" rows={2} defaultValue={team?.description ?? ""} />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("serving.team.positions")}</span>

            {/* R10.2. The same path the setup dock draws: a marker a row, the
                line between them carrying its own dot. A position is one line
                of a list, and a boxed card each made six of them read as six
                separate things. */}
            <div>
              <ol className="m-0 flex list-none flex-col p-0">
                {positions.map((one, i) => (
                  <li key={one.id ?? `new-${i}`} className="flex gap-2.5">
                    <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                      <span className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/40 bg-surface text-[10px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      {i === positions.length - 1 ? null : (
                        <span className="relative my-1 w-px flex-1 bg-primary/40">
                          <span className="absolute top-1/2 left-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                        </span>
                      )}
                    </span>

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-3">
                      <div className="flex items-start gap-2">
                        <input
                          value={one.name}
                          aria-label={t("serving.position.name")}
                          autoComplete="off"
                          className="-mt-1 min-w-0 flex-1 rounded-sm border-b border-line bg-transparent px-1 py-1 text-[length:var(--d-text-body)] text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                          onChange={(e) => change(i, { name: e.target.value })}
                        />
                        {/* R24.x. A row never leaves a list on one press. */}
                        <Confirm
                          title={t("serving.position.removeTitle", {
                            name: one.name || t("serving.position"),
                          })}
                          body={t("serving.position.removeBody")}
                          confirmLabel={t("serving.position.removeAction")}
                          onConfirm={() => {
                            if (one.id) setDropped((was) => [...was, one.id!]);
                            setPositions((was) => was.filter((_, at) => at !== i));
                          }}
                          trigger={
                            <IconButton
                              label={t("serving.position.remove")}
                              variant="ghost"
                              className="-mt-2.5"
                            >
                              <Trash2 />
                            </IconButton>
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        {/* R10.10, R10.11. A position in a children's room is
                            the one place a background check gates scheduling,
                            so the one switch sets both facts. */}
                        <label className="flex items-center gap-1.5 text-[13px] text-fg-muted">
                          <Switch
                            checked={one.withChildren}
                            onCheckedChange={(on) =>
                              change(i, { withChildren: on, requiresCheck: on })
                            }
                          />
                          {t("serving.position.withChildren")}
                        </label>

                        {one.withChildren ? (
                          <span className="pl-11 text-[12px] italic text-fg-subtle">
                            {t("serving.position.checkImplied")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="self-start"
              onClick={() => setPositions((was) => [...was, EMPTY_POSITION])}
            >
              <Plus /> {t("serving.position.add")}
            </Button>
          </div>

          {/* R10.1. Who serves on it, on a step of its own, because a worship
              team of fifteen would otherwise bury the positions above it. */}
          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("serving.roster")}</span>
            <span className="text-[13px] text-fg-muted">
              {plural("serving.volunteerCount", people.length)}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              onClick={() => setStep("members")}
            >
              <UserPlus /> {t("serving.addMembers")}
            </Button>
          </div>

        </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
