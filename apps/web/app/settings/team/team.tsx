"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Badge, Banner, Button, Card, CardTitle, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { invite, withdraw, changeRole, removeAccess } from "./actions";

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isSelf: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

const ROLES = [
  "owner", "admin", "staff", "pastoral", "finance", "group_leader", "checkin_volunteer", "member",
] as const;

const roleName = (role: string) => t(`role.${role}` as never);

/**
 * R1.4, R1.7. Who can get in, and what they may do.
 *
 * An invitation is matched to a verified address when that person signs in, so
 * inviting somebody is not the same as giving them access: it is saying that
 * whoever proves this address may have it.
 */
export function Team({
  church,
  members,
  invitations,
}: {
  church: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [message, setMessage] = React.useState<string>();
  const [changing, setChanging] = React.useState<{ member: Member; role: string } | null>(null);
  const [removing, setRemoving] = React.useState<Member | null>(null);
  const [pending, startTransition] = React.useTransition();

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
                  role: roleName(changing.role),
                })
              : ""
          }
        >
          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">{t("team.roleBody")}</p>
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
                    () => changeRole(next.member.userId, next.role as never, church),
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
          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">{t("team.removeBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setRemoving(null)}>
              {t("team.removeKeep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const who = removing;
                setRemoving(null);
                if (who) {
                  run(() => removeAccess(who.userId, church), t("team.removed"));
                }
              }}
            >
              <X /> {t("team.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("team.title")}</CardTitle>
          <InviteDialog church={church} pending={pending} onDone={() => router.refresh()} />
        </div>
        <Separator className="my-4" />

        <ul className="flex flex-col">
          {members.map((member, i) => (
            <li key={member.userId}>
              {i > 0 ? <Separator className="my-3" /> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {member.name ?? member.email}
                  </span>
                  {member.name ? (
                    <span className="text-caption text-fg-muted">{member.email}</span>
                  ) : null}
                </span>

                <span className="flex flex-wrap items-center gap-2">
                  {member.isSelf ? (
                    <Badge tone="neutral">{roleName(member.role)}</Badge>
                  ) : (
                    <>
                      {/* R1.4. Promoting somebody to owner, or demoting the
                          person who set the church up, was one stray click on
                          a dropdown. It is asked for now. */}
                      <Select value={member.role} onValueChange={(role) => setChanging({ member, role })}>
                        <SelectTrigger aria-label={t("team.role")} className="min-w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{roleName(role)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant="ghost" disabled={pending} onClick={() => setRemoving(member)}>
                        <X /> {t("team.remove")}
                      </Button>
                    </>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

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
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() => run(() => withdraw(invitation.id, church))}
                    >
                      <X /> {t("team.withdraw")}
                    </Button>
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

function InviteDialog({
  church,
  pending,
  onDone,
}: {
  church: string;
  pending: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("staff");
  const [failed, setFailed] = React.useState<string>();
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> {t("team.invite")}</Button>
      </DialogTrigger>
      <DialogContent title={t("team.invite")} closeLabel={t("common.close")}>
        <form
          noValidate
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
          <Field label={t("team.email")}>
            <Input name="email" type="email" autoComplete="off" autoFocus />
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("team.role")}</span>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger aria-label={t("team.role")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{roleName(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || saving}>{t("team.invite")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
