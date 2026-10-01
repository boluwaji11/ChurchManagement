"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  Badge, Banner, Button, Card, CardTitle, Field, Input, Separator,
  Dialog, DialogTrigger, DialogContent,
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
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("team.title")}>{error}</Banner> : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("team.title")}</CardTitle>
          <InviteDialog church={church} pending={pending} onDone={() => router.refresh()} onError={setError} />
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
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        run(() => changeRole(member.userId, role as never, church))
                      }
                    >
                      <SelectTrigger aria-label={t("team.role")} className="min-w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{roleName(role)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {member.isSelf ? null : (
                    <Button
                      variant="ghost"
                      disabled={pending}
                      onClick={() => run(() => removeAccess(member.userId, church))}
                    >
                      <X /> {t("team.remove")}
                    </Button>
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
  onError,
}: {
  church: string;
  pending: boolean;
  onDone: () => void;
  onError: (error?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("staff");
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
              onError(result.error);
              if (!result.error) {
                setOpen(false);
                onDone();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
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
