"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, HelpCircle } from "lucide-react";
import {
  Avatar, Badge, Banner, Button, Combobox, IconButton, Card, CardTitle, Field, Input,
  Separator,
  Dialog, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { Confirm } from "@/components/confirm";
import {
  invite, invitees, withdraw, changeRole, removeAccess,
} from "./actions";

export interface ChurchRoleOption {
  id: string;
  /** The built-in's own name, such as "staff", or a slug for a custom role. */
  key: string;
  name: string;
  builtin: boolean;
  permissions: string[];
}

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  /** R1.6. The church's own role they hold, where they hold one. */
  roleId: string | null;
  roleName: string | null;
  isSelf: boolean;
  /** Already written the way this church reads a date, or null. */
  lastSignedIn: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const roleName = (role: string) => t(`role.${role}` as never);

/** A built-in's name is ours to write; a church's own role carries its own. */
function titleOf(role?: ChurchRoleOption): string {
  if (!role) return "";
  return role.builtin ? roleName(role.key) : role.name;
}

/** The row standing for a built-in, for a member who is on one. */
function idFor(roles: ChurchRoleOption[], key: string): string {
  return roles.find((role) => role.builtin && role.key === key)?.id ?? "";
}


/**
 * R1.4, R1.7. Who can get in, and what they may do.
 *
 * An invitation is matched to a verified address when that person signs in, so
 * inviting somebody is not the same as giving them access: it is saying that
 * whoever proves this address may have it.
 */
export function Team({
  church,
  roles,
  members,
  invitations,
  approved,
}: {
  church: string;
  /** R1.6. Every role this church has, built-in and its own. */
  roles: ChurchRoleOption[];
  members: Member[];
  invitations: Invitation[];
  /** R1.1. Whether a human has looked at this church yet. */
  approved: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = React.useState<string>();
  const [changing, setChanging] = React.useState<{ member: Member; role: string } | null>(null);
  const [error, setError] = useFormError(changing);
  const [removing, setRemoving] = React.useState<Member | null>(null);
  const [pending, startTransition] = React.useTransition();
  /** R1.4. Whether the person reading this holds the church's own keys. */
  const iAmOwner = members.some((one) => one.isSelf && one.role === "owner");

  const run = (work: () => Promise<{ error?: string }>, said?: string) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      setMessage(result.error ? undefined : said);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("team.failed")}>{error}</Banner> : null}
      {message ? <Banner tone="success" title={message} /> : null}

      {/* R1.4. Both of these change what somebody may do, and neither is
          obvious from the row afterwards, so both are asked and both answer. */}
      <Dialog open={changing !== null} onOpenChange={(on) => setChanging(on ? changing : null)}>
        <DialogContent
          alert
          title={
            changing
              ? t("team.roleTitle", {
                  name: changing.member.name ?? changing.member.email,
                  role: titleOf(roles.find((r) => r.id === changing.role)),
                })
              : ""
          }
        >
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setChanging(null)}>
              {t("team.roleKeep")}
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                const next = changing;
                setChanging(null);
                if (next) {
                  run(
                    () => {
                      const picked = roles.find((r) => r.id === next.role);
                      return picked?.builtin
                        ? changeRole(next.member.userId, picked.key as never, church, null)
                        : changeRole(next.member.userId, "member" as never, church, next.role);
                    },
                    t("team.roleChanged"),
                  );
                }
              }}
            >
              {t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(on) => setRemoving(on ? removing : null)}>
        <DialogContent
          alert
          title={
            removing
              ? t("team.removeTitle", { name: removing.name ?? removing.email })
              : ""
          }
        >
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setRemoving(null)}>
              {t("team.removeKeep")}
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                const who = removing;
                setRemoving(null);
                if (who) {
                  run(() => removeAccess(who.userId, church), t("team.removed"));
                }
              }}
            >
              {t("team.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R1.1. A church nobody has looked at yet cannot reach outside itself,
          so the button is not offered. The server refuses it as well. */}
      {approved ? (
        <div className="flex justify-end">
          <InviteDialog church={church} roles={roles} pending={pending} onDone={() => router.refresh()} />
        </div>
      ) : (
        <Banner tone="info" title={t("team.waiting")}>{t("team.waitingBody")}</Banner>
      )}

      {/* R1.4. A row per person: who they are, what they may do, and when they
          were last here. The three a church checks when somebody leaves. */}
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-3 text-[12px] font-semibold text-fg">
                {t("team.person")}
              </th>
              <th className="w-66 px-5 py-3 text-[12px] font-semibold text-fg">
                <span className="flex items-center gap-1">
                  {t("team.roleColumn")}
                  <RoleGuide roles={roles} />
                </span>
              </th>
              <th className="w-44 px-5 py-3 text-[12px] font-semibold text-fg">
                {t("team.lastSignedIn")}
              </th>
              <th className="w-12 px-2" />
            </tr>
          </thead>

          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar
                      name={member.name ?? member.email}
                      id={member.userId}
                      className="size-8 shrink-0 text-[12px] font-semibold"
                    />
                    <span className="flex min-w-0 flex-col leading-[18px]">
                      <span className="truncate font-medium text-fg">
                        {member.name ?? member.email}
                      </span>
                      {member.name ? (
                        <span className="truncate text-[12px] text-fg-subtle">{member.email}</span>
                      ) : null}
                    </span>
                  </span>
                </td>

                <td className="px-5 py-3">
                  {/* R1.4. An owner's row is only an owner's to change. There
                      is nobody above them to undo it. */}
                  {member.isSelf || (member.role === "owner" && !iAmOwner) ? (
                    <Badge tone="neutral">{member.roleName ?? roleName(member.role)}</Badge>
                  ) : (
                    /* R1.4. Promoting somebody to owner, or demoting the person
                       who set the church up, was one stray click on a dropdown.
                       It is asked for now. */
                    <Select
                      value={member.roleId ?? idFor(roles, member.role)}
                      onValueChange={(role) => setChanging({ member, role })}
                    >
                      <SelectTrigger aria-label={t("team.role")} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>{titleOf(role)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>

                <td className="px-5 py-3 text-[length:var(--d-text-body)] text-fg-muted">
                  {member.lastSignedIn ?? t("team.neverSignedIn")}
                </td>

                <td className="px-2 py-3">
                  {member.isSelf || member.role === "owner" ? null : (
                    <IconButton
                      label={t("team.remove")}
                      variant="ghost"
                      disabled={pending}
                      onClick={() => setRemoving(member)}
                    >
                      <X />
                    </IconButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invitations.length > 0 ? (
        <Card>
          <CardTitle>{t("team.invited")}</CardTitle>
          <Separator className="my-4" />
          <ul className="flex flex-col">
            {invitations.map((invitation, i) => (
              <li key={invitation.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {invitation.email}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{roleName(invitation.role)}</Badge>
                    <span className="text-caption text-fg-muted">
                      {t("team.until", { day: invitation.expiresAt })}
                    </span>
                    {/* R24.x. Withdrawing an invitation takes away the only
                        way that address has in, so it asks first. */}
                    <Confirm
                      title={t("team.withdrawTitle", { email: invitation.email })}
                      body={t("team.withdrawBody")}
                      confirmLabel={t("team.withdraw")}
                      disabled={pending}
                      onConfirm={() => run(() => withdraw(invitation.id, church))}
                      trigger={
                        <IconButton
                          label={t("team.withdraw")}
                          variant="ghost"
                          disabled={pending}
                        >
                          <X />
                        </IconButton>
                      }
                    />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * R1.4, R1.6. What each role can see.
 *
 * The dropdown offers a column of words and no way to tell them apart, which
 * leaves an administrator guessing what they are handing somebody. The question
 * mark on the Role column opens this: the roles down a single line, each
 * listing what it actually reaches.
 *
 * Read from the permissions each role holds rather than from a sentence written
 * beside it, so a role this church wrote describes itself, and a built-in whose
 * permissions a church has changed describes what it now does.
 *
 * A hue per role, from the same twelve the rest of the product assigns, so a
 * role reads the same here as it does anywhere a role is shown.
 */
const ROLE_HUES: Record<string, string> = {
  owner: "violet",
  admin: "indigo",
  staff: "sky",
  pastoral: "teal",
  finance: "fern",
  group_leader: "citron",
  team_leader: "amber",
  checkin_volunteer: "coral",
  member: "clay",
};

/** The hue for a role this church wrote, picked from its name so it is stable. */
function hueOf(role: ChurchRoleOption): string {
  if (ROLE_HUES[role.key]) return ROLE_HUES[role.key]!;
  const hues = Object.values(ROLE_HUES);
  let sum = 0;
  for (const ch of role.key) sum += ch.charCodeAt(0);
  return hues[sum % hues.length]!;
}

/**
 * R1.6. The areas a permission belongs to, in the order a summary reads them.
 *
 * A role is summarised by what it touches rather than by its eighteen
 * permissions listed out, because a wall of names is a wall nobody reads and
 * the question being asked is "what does this role get into".
 */
const AREAS: Array<[string, string[]]> = [
  ["area.members", ["members.edit", "members.archive"]],
  ["area.notes", ["members.notes.confidential"]],
  ["area.giving", ["giving.amounts"]],
  ["area.settings", ["church.manage", "church.fields", "church.tags"]],
  ["area.checkin", ["checkin.rooms", "checkin.stations", "checkin.run", "checkin.supervise"]],
  ["area.safeguarding", ["checkin.incidents", "checkin.checks"]],
  ["area.followups", ["followups.manage"]],
  ["area.groups", ["groups.manage"]],
  ["area.services", ["services.manage"]],
  ["area.teams", ["teams.manage", "teams.lead"]],
];

/** What this role reaches, in one line, from the permissions it holds. */
function summarise(role: ChurchRoleOption, everything: number): string {
  if (role.permissions.length === 0) return t("roles.nothing");
  if (role.permissions.length === everything) return t("roles.everything");

  const held = AREAS.filter(([, permissions]) =>
    permissions.some((one) => role.permissions.includes(one)),
  ).map(([key]) => t(key as never));

  if (held.length === 0) return t("roles.nothing");
  if (held.length === 1) return `${sentence(held[0]!)}.`;

  const last = held.pop()!;
  return `${sentence(t("roles.and", { list: held.join(", "), last }))}.`;
}

/** The summary opens a line, so it opens with a capital. */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function RoleGuide({ roles }: { roles: ChurchRoleOption[] }) {
  // The widest set any role holds is the whole catalogue, which the Owner has.
  const everything = Math.max(...roles.map((role) => role.permissions.length), 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <IconButton
          label={t("roles.title")}
          variant="ghost"
          className="size-6 min-h-0 [&_svg]:size-4"
        >
          <HelpCircle />
        </IconButton>
      </SheetTrigger>

      <SheetContent title={t("roles.title")} closeLabel={t("common.close")}>
        {/* The line runs behind the dots, so the roles read as one ladder from
            the whole church down to one person's own record. */}
        <ol className="relative flex flex-col gap-5 pl-6">
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-[5px] w-px bg-line-strong"
          />

          {roles.map((role) => (
            <li key={role.id} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-6 size-[11px] rounded-full border-2 border-canvas"
                style={{ background: `var(--hue-${hueOf(role)}-500)` }}
              />
              <span className="block font-semibold text-fg">{titleOf(role)}</span>
              <span className="block text-[13px] leading-[18px] text-fg-muted">
                {summarise(role, everything)}
              </span>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
}

function InviteDialog({
  church,
  roles,
  pending,
  onDone,
}: {
  church: string;
  /** R1.6. The roles this church has taken up. Nothing else may be given. */
  roles: ChurchRoleOption[];
  pending: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  // Everything but Owner, which is given by handing the church over.
  const giveable = roles.filter((one) => one.key !== "owner");
  const [role, setRole] = React.useState(giveable[0]?.id ?? "");
  const [failed, setFailed] = React.useState<string>();
  const [saving, startTransition] = React.useTransition();

  /*
   * R1.7. Most members a church gives an account to are already in People, with
   * an address the church typed once. Picking them fills the box and ties the
   * account to their record, so a volunteer becomes somebody a follow-up can
   * land on without anybody retyping an address.
   */
  const [person, setPerson] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [found, setFound] = React.useState<{ id: string; name: string; email: string }[]>([]);
  const [email, setEmail] = React.useState("");

  const look = React.useCallback(
    (search: string) => {
      setQuery(search);
      if (!search.trim()) {
        setFound([]);
        return;
      }
      void invitees(search, church).then(setFound);
    },
    [church],
  );

  const formId = React.useId();
  const [dirty, setDirty] = React.useState(false);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPerson("");
      setEmail("");
      setQuery("");
      setFound([]);
      setFailed(undefined);
      setDirty(false);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button><Plus /> {t("team.invite")}</Button>
      </SheetTrigger>
      <SheetContent
        title={t("team.invite")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="submit" form={formId} disabled={pending || saving || !dirty || !role}>
              {t("team.send")}
            </Button>
          </>
        }
      >
        {guard}

        <form
          id={formId}
          noValidate
          onInput={() => setDirty(true)}
          action={(data) => {
            data.set("church", church);
            data.set("role", role);
            startTransition(async () => {
              const result = await invite(data);
              setFailed(result.error);
              if (!result.error) {
                setOpen(false);
                onDone();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {/* Inside the box. A banner at the top of the page is behind the
              dialog that is still open, which is nothing at all. */}
          {failed ? <Banner tone="danger" title={t("team.failed")}>{failed}</Banner> : null}

          <input type="hidden" name="memberId" value={person} />

          <Field label={t("team.fromPeople")}>
            <Combobox
              options={found.map((one) => ({
                value: one.id,
                label: one.name,
                keywords: one.email,
              }))}
              value={person}
              onChange={(id) => {
                setPerson(id);
                setEmail(found.find((one) => one.id === id)?.email ?? "");
              }}
              onQueryChange={look}
              placeholder={t("team.findPerson")}
              emptyLabel={query.trim() ? t("team.noPerson") : t("team.typeName")}
              clearLabel={t("date.clear")}
              aria-label={t("team.fromPeople")}
            />
          </Field>

          <Field label={t("team.email")} required>
            <Input
              name="email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // An address typed by hand is no longer the picked person's.
                setPerson("");
              }}
            />
          </Field>

          <Field label={t("team.role")}>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {giveable.map((one) => (
                  <SelectItem key={one.id} value={one.id}>{titleOf(one)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

        </form>
      </SheetContent>
    </Sheet>
  );
}
