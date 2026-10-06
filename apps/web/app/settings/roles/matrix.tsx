"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Check, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import {
  Banner, Button, Checkbox, Field, IconButton, Input,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { addRole, saveRole, putAway } from "./actions";
import { useFormError } from "@/lib/form-error";

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
}: {
  church: string;
  roles: RoleRow[];
  permissions: string[];
  groups: PermissionGroupRow[];
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
      <section className="overflow-x-auto rounded-[14px] border border-line bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 bg-surface px-5 py-3 align-bottom text-[12px] font-semibold text-fg">
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
                  <RoleForm church={church} role={role} permissions={permissions} groups={groups}>
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-sm px-1 py-0.5 font-medium text-primary underline decoration-primary/35 underline-offset-[3px] hover:bg-sunken hover:decoration-primary"
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
              <td className="sticky left-0 bg-surface px-5 py-2.5 text-[length:var(--d-text-body)] text-fg">
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
      </section>

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
  children,
}: {
  church: string;
  /** The role being changed, or nothing when one is being written. */
  role?: RoleRow;
  permissions: string[];
  groups: PermissionGroupRow[];
  /** R1.6. The ready-made roles this church has not taken up yet. */
  shelf?: RoleRow[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(role?.name ?? "");
  const [held, setHeld] = React.useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();
  // R1.6. Adding opens on the ready-made roles. Editing opens on the role.
  const [picking, setPicking] = React.useState(!role && shelf.length > 0);
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

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        router.refresh();
      }
    });

  const toggle = (permission: string, on: boolean) =>
    setHeld((current) =>
      on ? [...current, permission] : current.filter((one) => one !== permission),
    );

  /** Every permission under one heading, on or off together. */
  const setGroup = (group: PermissionGroupRow, on: boolean) =>
    setHeld((current) => {
      const without = current.filter((one) => !group.permissions.includes(one));
      return on ? [...without, ...group.permissions] : without;
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
                onClick={() => run(() => putAway(role.id, true, church))}
              >
                <Archive />
              </IconButton>
            ) : null}

            <Button
              type="button"
              /* R1.6. A role that holds nothing is a member with a different
                 word on it. The built-ins are exempt: Group leader holds none
                 of these and still means something. */
              disabled={pending || !name.trim() || (!taking?.builtin && !role?.builtin && held.length === 0)}
              onClick={() =>
                run(async () => {
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
                  checked={held.length === permissions.length}
                  onCheckedChange={(on) => setHeld(on === true ? [...permissions] : [])}
                />
                {t("roles.all")}
              </label>
            </div>

            {/* R1.6. Under headings, because the question somebody arrives with
                is narrower than twenty rows: what may this role do with our
                members, and what may it do at check-in. */}
            {groups.map((group) => {
              const whole = group.permissions.every((one) => held.includes(one));
              const folded = shut.includes(group.key);
              const count = group.permissions.filter((one) => held.includes(one)).length;

              return (
                <section key={group.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2.5 rounded-sm px-1 py-1.5">
                    <Checkbox
                      checked={whole}
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

                  {(folded ? [] : group.permissions).map((permission) => (
                    <label
                      key={permission}
                      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 pl-7 hover:bg-sunken"
                    >
                      <Checkbox
                        checked={held.includes(permission)}
                        onCheckedChange={(on) => toggle(permission, on === true)}
                      />
                      <span className="text-[length:var(--d-text-body)] text-fg">
                        {t(`permission.${permission}` as never)}
                      </span>
                    </label>
                  ))}
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
}: {
  church: string;
  permissions: string[];
  groups: PermissionGroupRow[];
  shelf?: RoleRow[];
}) {
  return (
    <RoleForm church={church} permissions={permissions} groups={groups} shelf={shelf}>
      <Button>
        <Plus /> {t("roles.add")}
      </Button>
    </RoleForm>
  );
}
