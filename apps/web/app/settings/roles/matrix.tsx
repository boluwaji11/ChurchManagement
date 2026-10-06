"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, ChevronDown, ChevronRight, Plus, Undo2 } from "lucide-react";
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
  const archived = roles.filter((role) => role.archived);
  // R1.6. A section somebody has read can be folded away, so the grid is as
  // short as the question they came with.
  const [shut, setShut] = React.useState<string[]>([]);
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
              <th key={role.id} className="px-2 py-3 text-center align-bottom">
                {/* Upright, because nine role names across a table is a column
                    width problem every product solves by turning the words. */}
                <span className="mx-auto flex h-36 w-8 items-end justify-center">
                  {/* R1.6. Owner is the one column nobody may narrow: there is
                      nobody above them to put a permission back. */}
                  {role.key === "owner" ? (
                    <Upright>{nameOf(role)}</Upright>
                  ) : (
                    <RoleForm church={church} role={role} permissions={permissions} groups={groups}>
                      <button
                        type="button"
                        className="cursor-pointer rounded-sm hover:bg-sunken"
                      >
                        <Upright>{nameOf(role)}</Upright>
                      </button>
                    </RoleForm>
                  )}
                </span>
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
                  <td key={role.id} className="px-2 py-2.5 text-center">
                    {held ? (
                      <Check className="mx-auto size-4 text-primary" aria-label={label} />
                    ) : (
                      <span
                        aria-label={label}
                        className="mx-auto block size-1 rounded-full bg-line-strong"
                      />
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

      {archived.length === 0 ? null : <Shelf church={church} roles={archived} />}
    </div>
  );
}

/** R1.6. The roles this church has put away, and the way back. */
function Shelf({ church, roles }: { church: string; roles: RoleRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <section className="flex flex-col gap-2">
      <span className="text-[12px] font-semibold text-fg-subtle">{t("roles.archived")}</span>

      <div className="rounded-[14px] border border-line bg-surface px-5 py-1">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-3 border-b border-sunken py-2.5 last:border-0"
          >
            <span className="flex-1 text-fg-subtle">{nameOf(role)}</span>
            <IconButton
              label={t("roles.restore", { name: nameOf(role) })}
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await putAway(role.id, false, church);
                  router.refresh();
                })
              }
            >
              <Undo2 />
            </IconButton>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A role name turned on its side, so nine of them fit across a table. */
function Upright({ children }: { children: React.ReactNode }) {
  return (
    <span className="rotate-180 text-[12px] font-medium whitespace-nowrap text-fg [text-orientation:mixed] [writing-mode:vertical-rl]">
      {children}
    </span>
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
  children,
}: {
  church: string;
  /** The role being changed, or nothing when one is being written. */
  role?: RoleRow;
  permissions: string[];
  groups: PermissionGroupRow[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(role?.name ?? "");
  const [held, setHeld] = React.useState<string[]>(role?.permissions ?? []);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();
  const [shut, setShut] = React.useState<string[]>([]);
  const fold = (key: string) =>
    setShut((was) => (was.includes(key) ? was.filter((one) => one !== key) : [...was, key]));

  // Reopening shows what is stored, rather than what was abandoned last time.
  React.useEffect(() => {
    if (!open) return;
    setName(role ? nameOf(role) : "");
    setHeld(role?.permissions ?? []);
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
        title={role ? nameOf(role) : t("roles.add")}
        closeLabel={t("common.close")}
        width="520px"
        footer={
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
              disabled={pending || !name.trim()}
              onClick={() =>
                run(() =>
                  role
                    ? saveRole(role.id, name, held, church)
                    : addRole(name, held, church),
                )
              }
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("roles.failed")}>{error}</Banner> : null}

        <div className="flex flex-col gap-5">
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
}: {
  church: string;
  permissions: string[];
  groups: PermissionGroupRow[];
}) {
  return (
    <RoleForm church={church} permissions={permissions} groups={groups}>
      <Button>
        <Plus /> {t("roles.add")}
      </Button>
    </RoleForm>
  );
}
