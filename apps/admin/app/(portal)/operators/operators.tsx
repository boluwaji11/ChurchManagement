"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, UserMinus } from "lucide-react";
import {
  Badge, Banner, Button, Dialog, DialogContent, DialogFooter, DialogTrigger,
  Field, IconButton, Input,
} from "@connectapp/ui";
import { grantAdmin, revokeAdmin } from "@/app/actions";

export interface OperatorRow {
  userId: string;
  name: string;
  email: string;
  grantedBy: string | null;
  granted: React.ReactNode;
  revoked: boolean;
}

/** R21.x. The list, and the two things that change it. */
export function Operators({ me, rows }: { me: string; rows: OperatorRow[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const live = rows.filter((one) => !one.revoked);
  const gone = rows.filter((one) => one.revoked);

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title="That did not work">{error}</Banner> : null}

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus /> Add an operator</Button>
          </DialogTrigger>
          <DialogContent title="Add an operator" closeLabel="Close">
            <form
              noValidate
              className="flex flex-col gap-4"
              action={(data) => {
                startTransition(async () => {
                  const result = await grantAdmin(data);
                  setError(result.error);
                  if (!result.error) {
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <Field label="Email address" required>
                <Input name="email" type="email" autoComplete="off" autoFocus />
              </Field>
              <Field label="Name" required>
                <Input name="name" autoComplete="off" />
              </Field>
              <p className="text-[13px] text-fg-muted">
                They sign in with the account they already have.
              </p>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>Add them</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {live.map((one) => (
          <li key={one.userId} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <span className="flex min-w-[220px] flex-1 flex-col gap-0.5">
              <span className="font-semibold text-fg">{one.name}</span>
              <span className="text-[12px] text-fg-subtle">{one.email}</span>
            </span>
            <span className="text-[13px] text-fg-muted">
              since {one.granted}
              {one.grantedBy ? `, by ${one.grantedBy}` : ""}
            </span>
            {one.userId === me ? (
              <Badge tone="neutral">You</Badge>
            ) : (
              <IconButton
                label={`Take ${one.name}'s access away`}
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await revokeAdmin(one.userId);
                    setError(result.error);
                    if (!result.error) router.refresh();
                  });
                }}
              >
                <UserMinus />
              </IconButton>
            )}
          </li>
        ))}
      </ul>

      {gone.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">No longer operators</h2>
          {gone.map((one) => (
            <span key={one.userId} className="text-[length:var(--d-text-body)] text-fg-muted">
              {one.name} · {one.email}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
