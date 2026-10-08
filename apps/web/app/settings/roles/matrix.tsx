"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Archive, Check, ChevronDown, ChevronRight, Lock, Plus, Undo2, X,
} from "lucide-react";
import {
  Banner, Button, Checkbox, Field, IconButton, Input, Spinner,
  Sheet, SheetTrigger, SheetContent, Tooltip, cn,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { addRole, saveRole, putAway } from "./actions";
import { useFormError } from "@/lib/form-error";
import { ResizableTable } from "@/components/resizable-columns";

/** One heading in the permission list, and what sits under it. */
export interface PermissionGroupRow {
  key: string;
  permissions: string[];
}

export interface RoleRow {
  id: string;
  /** The built-in's own name, such as "staff", or a slug for a custom role. */
  key: string;
  name: string;
  permissions: string[];
  builtin: boolean;
  archived: boolean;
  members: number;
}

/**
 * What this church calls the role.
 *
 * A built-in is seeded with its own key as its name, so an untouched one reads
 * as the product's word for it and a renamed one reads as the church's.
 */
const nameOf = (role: RoleRow) =>
  role.builtin && role.name === role.key ? t(`role.${role.key}` as never) : role.name;

/**
 * R1.6. The permission matrix, every permission against every role.
 *
 * The grid is the honest shape of the thing: a role is the column of ticks under
 * its name and nothing else, so reading down one tells an administrator exactly
 * what they are handing somebody.
 *
 * The nine built-in columns are fixed. A church that quietly took "run check-in"
 * off Check-in volunteer would have broken a service rather than configured one,
 * so its own answers go in its own roles, which it writes in full.
 */
export function Matrix({
  church,
  roles,
  permissions,
  groups,
  mine,
}: {
  church: string;
  roles: RoleRow[];
  permissions: string[];
  groups: PermissionGroupRow[];
  /** R1.6. What the reader holds, which is the most they can give away. */
  mine: string[];
}) {
  const open = roles.filter((role) => !role.archived);
  /*
   * R1.6. Only the first section is open to begin with. Twenty rows against
   * nine columns is a wall, and the one everybody comes for is Members.
   */
  const [shut, setShut] = React.useState<string[]>(groups.slice(1).map((one) => one.key));
  const fold = (key: string) =>
    setShut((was) => (was.includes(key) ? was.filter((one) => one !== key) : [...was, key]));

  return (
    <div className="flex flex-col gap-5">
      <ResizableTable id="roles" className="rounded-[14px] border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {/* R24.6. Pinned, and held to 190px on a phone. The names run
                to half a sentence, so left to size itself the column took
                the whole screen and every role sat off the right edge with
                nothing to say so. */}
            <th className="sticky left-0 z-10 w-[190px] border-r border-line bg-surface px-4 py-3 align-bottom text-[12px] font-semibold text-fg sm:w-auto sm:border-r-0 sm:px-5">
              {t("roles.permission")}
            </th>

            {open.map((role) => (
              <th
                key={role.id}
                className="w-[92px] border-l border-line px-2 py-3 text-center align-bottom text-[12px] font-medium text-fg"
              >
                {/* R1.6. Owner is the one column nobody may narrow: there is
                    nobody above them to put a permission back. */}
                {/* R24.x. The name is the way in, so it is drawn as one: purple
                    is what the rest of the product presses. Owner is ink,
                    because there is nobody above them to put a permission
                    back and the column cannot be changed. */}
                {role.key === "owner" ? (
                  nameOf(role)
                ) : (
                  <RoleForm church={church} role={role} permissions={permissions} groups={groups} mine={mine}>
                    <button
                      type="button"
                      className="min-h-8 w-full cursor-pointer rounded-sm px-1 py-1.5 font-medium text-primary underline decoration-primary/35 underline-offset-[3px] hover:bg-sunken hover:decoration-primary"
                    >
                      {nameOf(role)}
                    </button>
                  </RoleForm>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.key}>
              <tr className="border-b border-sunken">
                <th
                  colSpan={open.length + 1}
                  className="sticky left-0 bg-sunken/60 p-0 text-left"
                >
                  <button
                    type="button"
                    onClick={() => fold(group.key)}
                    aria-expanded={!shut.includes(group.key)}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-5 py-2 text-[12px] font-semibold tracking-[0.04em] text-fg-muted uppercase"
                  >
                    {shut.includes(group.key) ? (
                      <ChevronRight className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden />
                    )}
                    {t(`roles.group.${group.key}` as never)}
                  </button>
                </th>
              </tr>

              {(shut.includes(group.key) ? [] : group.permissions).map((permission) => (
            <tr key={permission} className="border-b border-sunken last:border-0">
              <td className="sticky left-0 z-10 border-r border-line bg-surface px-4 py-2.5 text-[length:var(--d-text-body)] text-fg sm:border-r-0 sm:px-5">
                {t(`permission.${permission}` as never)}
              </td>

              {open.map((role) => {
                const held = role.permissions.includes(permission);
                const label = t(held ? "roles.cell.on" : "roles.cell.off", {
                  role: nameOf(role),
                  permission: t(`permission.${permission}` as never),
                });

                return (
                  <td key={role.id} className="border-l border-sunken px-2 py-2.5 text-center">
                    {held ? (
                      <Check className="mx-auto size-4 text-primary" aria-label={label} />
                    ) : (
                      <X className="mx-auto size-4 text-fg-subtle/50" aria-label={label} />
                    )}
                  </td>
                );
              })}
            </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      </ResizableTable>

    </div>
  );
}

/**
 * R1.6. The roles this church wrote and later put away.
 *
 * A role off the list grants nobody anything, so bringing one back is held to
 * the same reach as writing one: every permission it holds has to be one the
 * reader holds themselves. The server refuses the rest, and the row says so
 * before anybody presses it.
 */
export function ArchivedRoles({
  church,
  roles,
  permissions,
  mine,
}: {
  church: string;
  roles: RoleRow[];
  permissions: string[];
  /** R1.6. What the reader holds, which is the most they can give away. */
  mine: string[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  /* Which role is being brought back, so one control spins rather than all. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  const bringBack = (id: string) => {
    setDoing(id);
    startTransition(async () => {
      const result = await putAway(id, false, church);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  if (roles.length === 0) {
    return <p className="text-fg-muted">{t("roles.archived.none")}</p>;
  }

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("roles.failed")}>{error}</Banner> : null}

      <ul className="flex flex-col rounded-[14px] border border-line bg-surface px-5 py-1">
        {roles.map((role) => {
          const beyond = !role.permissions.every((one) => mine.includes(one));

          return (
            <li
              key={role.id}
              className="flex flex-wrap items-center gap-3 border-b border-sunken py-2.5 last:border-0"
            >
              <span className="min-w-0 flex-1 truncate text-fg">{nameOf(role)}</span>

              <span className="text-[12px] text-fg-subtle tabular-nums">
                {t("roles.heldCount", {
                  count: role.permissions.length,
                  total: permissions.length,
                })}
              </span>

              {beyond ? (
                <span className="flex items-center gap-1.5 text-[13px] text-fg-subtle">
                  <Lock className="size-3.5 shrink-0" aria-hidden />
                  {t("roles.restoreBeyond")}
                </span>
              ) : (
                <IconButton
                  label={t("roles.restore", { name: nameOf(role) })}
                  variant="ghost"
                  disabled={pending}
                  onClick={() => bringBack(role.id)}
                >
                  {doing === role.id ? (
                    <Spinner label={t("roles.restore", { name: nameOf(role) })} />
                  ) : (
                    <Undo2 />
                  )}
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * R1.6. A role's name and everything it may do, in one form.
 *
 * Adding and editing ask the same question, so they are the same box. The
 * permissions are checkboxes rather than cells in the grid: somebody writing a
 * role is deciding what it is for, and that decision reads as a list.
 */
export function RoleForm({
  church,
  role,
  permissions,
  groups,
  shelf = [],
  mine,
  children,
}: {
  church: string;
  /** The role being changed, or nothing when one is being written. */
  role?: RoleRow;
  permissions: string[];
  groups: PermissionGroupRow[];
  /** R1.6. The ready-made roles this church has not taken up yet. */
  shelf?: RoleRow[];
  /**
   * R1.5, R1.6, R21.2. What the reader holds themselves.
   *
   * A permission outside it is drawn and locked. An Admin who could tick the
   * money onto a role would be reading the giving a moment later, and the
   * server refuses it, so the box has to say so before it is pressed.
   */
  mine: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(role?.name ?? "");
  const [held, setHeld] = React.useState<string[]>(role?.permissions ?? []);
  const [pending, startTransition] = React.useTransition();
  // R1.6. Adding opens on the ready-made roles. Editing opens on the role.
  const [picking, setPicking] = React.useState(!role && shelf.length > 0);
  const [error, setError] = useFormError(open && !picking);
  /** A ready-made role being read before it is taken up. */
  const [taking, setTaking] = React.useState<RoleRow | null>(null);
  const [shut, setShut] = React.useState<string[]>(groups.slice(1).map((one) => one.key));
  const fold = (key: string) =>
    setShut((was) => (was.includes(key) ? was.filter((one) => one !== key) : [...was, key]));

  // Reopening shows what is stored, rather than what was abandoned last time.
  React.useEffect(() => {
    if (!open) return;
    setName(role ? nameOf(role) : "");
    setHeld(role?.permissions ?? []);
    setShut(groups.slice(1).map((one) => one.key));
    setPicking(!role && shelf.length > 0);
    setTaking(null);
    setError(undefined);
  }, [open, role?.name, role?.permissions]);

  /* Which of the two footer controls was pressed. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  const run = (key: string, work: () => Promise<{ error?: string }>) => {
    setDoing(key);
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        router.refresh();
      }
    });
  };

  /**
   * R1.5, R1.6, R21.2. Whether this box is the reader's to move.
   *
   * Taking a permission away is held to the same rule as giving it: an Admin
   * who could strip the money off Finance has locked the church out of its
   * own giving by the other door.
   */
  const locked = (permission: string) => !mine.includes(permission);

  /** Whatever the reader may not touch, exactly as the role already has it. */
  const keeping = (current: string[]) =>
    permissions.filter((one) => locked(one) && current.includes(one));

  const toggle = (permission: string, on: boolean) =>
    setHeld((current) =>
      on ? [...current, permission] : current.filter((one) => one !== permission),
    );

  /** Every permission under one heading, on or off together. */
  const setGroup = (group: PermissionGroupRow, on: boolean) =>
    setHeld((current) => {
      const mineHere = group.permissions.filter((one) => !locked(one));
      const without = current.filter((one) => !mineHere.includes(one));
      return on ? [...without, ...mineHere] : without;
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        title={role ? nameOf(role) : picking ? t("roles.start") : taking ? nameOf(taking) : t("roles.add")}
        closeLabel={t("common.close")}
        width="520px"
        footer={
          picking ? null : (
          <>
            {role ? (
              <IconButton
                label={t("roles.archiveOne", { name: nameOf(role) })}
                variant="ghost"
                className="mr-auto"
                disabled={pending}
                onClick={() => run("archive", () => putAway(role.id, true, church))}
              >
                {doing === "archive" ? (
                  <Spinner label={t("roles.archiveOne", { name: nameOf(role) })} />
                ) : (
                  <Archive />
                )}
              </IconButton>
            ) : null}

            <Button
              type="button"
              /* R1.6. A role that holds nothing is a member with a different
                 word on it. The built-ins are exempt: Group leader holds none
                 of these and still means something. */
              loading={doing === "save"}
              disabled={pending || !name.trim() || (!taking?.builtin && !role?.builtin && held.length === 0)}
              onClick={() =>
                run("save", async () => {
                  if (role) return saveRole(role.id, name, held, church);
                  if (!taking) return addRole(name, held, church);

                  /*
                   * Taking a ready-made role up unchanged leaves it tracking
                   * the product: a permission we add later reaches it. Only a
                   * church that edited it owns it from then on.
                   */
                  const same =
                    name === nameOf(taking) &&
                    held.length === taking.permissions.length &&
                    held.every((one) => taking.permissions.includes(one));

                  if (!same) {
                    const written = await saveRole(taking.id, name, held, church);
                    if (written.error) return written;
                  }
                  return putAway(taking.id, false, church);
                })
              }
            >
              {taking ? t("action.add") : t("action.save")}
            </Button>
          </>
          )
        }
      >
        {error ? <Banner tone="danger" title={t("roles.failed")}>{error}</Banner> : null}

        {picking ? (
          /*
           * R1.6. The roles the product already knows how to be, before a blank
           * name and twenty checkboxes. Taking one up puts it back on the grid
           * with the permissions it has always had.
           */
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                setTaking(null);
                setName("");
                setHeld([]);
                setPicking(false);
              }}
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-3 text-left hover:bg-sunken"
            >
              <Plus className="size-[18px] shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 font-semibold text-fg">{t("roles.ownRole")}</span>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </button>

            <hr className="my-2 border-0 border-t border-line" />

            <ol className="m-0 flex list-none flex-col p-0">
              {shelf.map((one) => (
                <li key={one.id} className="flex gap-2.5">
                  <span className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                    <span className="mt-4 size-2.5 shrink-0 rounded-full bg-primary" />
                    <span className="my-1 w-px flex-1 bg-primary/35" />
                  </span>

                  {/*
                    * R1.5, R1.6, R21.2. A ready-made role holding more than
                    * the reader does is drawn locked. Taking it up puts it
                    * back on the grid and makes it assignable, which the
                    * server holds to the same reach as writing one.
                    */}
                  {one.permissions.some(locked) ? (
                    <div className="mb-1 flex min-w-0 flex-1 items-center gap-3 px-2 py-2.5">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium text-fg-muted">{nameOf(one)}</span>
                        <span className="truncate text-[12px] text-fg-subtle">
                          {t("roles.restoreBeyond")}
                        </span>
                      </span>
                      <Lock className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    </div>
                  ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTaking(one);
                      setName(nameOf(one));
                      setHeld(one.permissions);
                      setPicking(false);
                    }}
                    className="mb-1 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-sunken"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-fg">{nameOf(one)}</span>
                      <span className="truncate text-[12px] text-fg-subtle">
                        {t("roles.heldCount", {
                          count: one.permissions.length,
                          total: permissions.length,
                        })}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                  </button>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="flex flex-col gap-5" hidden={picking}>
          {role || shelf.length === 0 ? null : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex cursor-pointer items-center gap-1.5 self-start font-medium text-primary"
            >
              <ArrowLeft className="size-4" aria-hidden /> {t("fields.back")}
            </button>
          )}

          <Field label={t("roles.name")} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-label text-fg">{t("roles.permission")}</span>

              {/* Most roles a church writes are "everything except two things",
                  so the quickest way in is everything and then two unticks. */}
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg-muted">
                <Checkbox
                  checked={permissions.every((one) => locked(one) || held.includes(one))}
                  onCheckedChange={(on) =>
                    setHeld(
                      on === true
                        ? permissions.filter((one) => !locked(one) || held.includes(one))
                        : keeping(held),
                    )
                  }
                />
                {t("roles.all")}
              </label>
            </div>

            {/* R1.6. Under headings, because the question somebody arrives with
                is narrower than twenty rows: what may this role do with our
                members, and what may it do at check-in. */}
            {groups.map((group) => {
              const whole = group.permissions.every((one) => locked(one) || held.includes(one));
              const folded = shut.includes(group.key);
              const count = group.permissions.filter((one) => held.includes(one)).length;
              /* A heading with nothing in it the reader may move is itself fixed. */
              const shutOut = group.permissions.every((one) => locked(one));

              return (
                <section key={group.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2.5 rounded-sm px-1 py-1.5">
                    <Checkbox
                      checked={whole}
                      disabled={shutOut}
                      onCheckedChange={(on) => setGroup(group, on === true)}
                      aria-label={t(`roles.group.${group.key}` as never)}
                    />
                    <button
                      type="button"
                      onClick={() => fold(group.key)}
                      aria-expanded={!folded}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left text-[13px] font-semibold tracking-[0.04em] text-fg-muted uppercase"
                    >
                      {folded ? (
                        <ChevronRight className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5" aria-hidden />
                      )}
                      {t(`roles.group.${group.key}` as never)}
                      {folded && count > 0 ? (
                        <span className="font-medium tracking-normal normal-case text-fg-subtle">
                          {t("roles.heldCount", { count, total: group.permissions.length })}
                        </span>
                      ) : null}
                    </button>
                  </div>

                  {(folded ? [] : group.permissions).map((permission) => {
                    const fixed = locked(permission);
                    const row = (
                      <label
                        key={permission}
                        className={cn(
                          "flex items-center gap-2.5 rounded-sm px-1 py-1.5 pl-7",
                          fixed ? "cursor-default" : "cursor-pointer hover:bg-sunken",
                        )}
                      >
                        <Checkbox
                          checked={held.includes(permission)}
                          disabled={fixed}
                          onCheckedChange={(on) => toggle(permission, on === true)}
                        />
                        <span
                          className={cn(
                            "text-[length:var(--d-text-body)]",
                            fixed ? "text-fg-subtle" : "text-fg",
                          )}
                        >
                          {t(`permission.${permission}` as never)}
                        </span>
                        {fixed ? <Lock className="size-3.5 shrink-0 text-fg-subtle" aria-hidden /> : null}
                      </label>
                    );

                    return fixed ? (
                      <Tooltip key={permission} content={t("roles.beyond")}>
                        <span className="block">{row}</span>
                      </Tooltip>
                    ) : row;
                  })}
                </section>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** R1.6. The one action this screen carries, beside its title. */
export function NewRole({
  church,
  permissions,
  groups,
  shelf,
  mine,
}: {
  church: string;
  permissions: string[];
  groups: PermissionGroupRow[];
  shelf?: RoleRow[];
  mine: string[];
}) {
  return (
    <RoleForm church={church} permissions={permissions} groups={groups} shelf={shelf} mine={mine}>
      <Button>
        <Plus /> {t("roles.add")}
      </Button>
    </RoleForm>
  );
}
