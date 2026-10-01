"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import {
  Badge, Button, Dialog, DialogTrigger, DialogContent, Field, Input,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { pickup, release } from "./actions";
import type { PickupPerson, OverrideKind } from "@hearth/db";

/**
 * R8.7 to R8.9. Letting a child go.
 *
 * Three questions, asked in one place: the code off the guardian's label, who
 * is standing there, and whether anything stands between them and this child.
 *
 * A block is a stop, not a line of text beside a button. It fills the dialog,
 * it says what it is, and passing it costs a sentence explaining why, which is
 * written down with the name of whoever decided.
 */
export interface OfflineCheckout {
  online: boolean;
  /** R8.8. The list the station pulled down before the service. */
  pickupFor: (childId: string) => PickupPerson[];
  /** Applies the same rules the server does, against what the station holds. */
  release: (input: {
    personId: string;
    typed: string;
    collectedBy: string | null;
    override: { kind: OverrideKind; reason: string } | null;
  }) => Promise<OverrideKind | null>;
}

export function Checkout({
  church,
  visitId,
  childId,
  childName,
  offline,
}: {
  church: string;
  visitId: string;
  childId: string;
  childName: string;
  /** R8.7. What to do when there is no server to ask. */
  offline?: OfflineCheckout;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [people, setPeople] = React.useState<PickupPerson[]>([]);
  const [collectedBy, setCollectedBy] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [block, setBlock] = React.useState<{ kind: string; message: string } | null>(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    setBlock(null);
    setReason("");
    setCode("");
    setCollectedBy(null);
    setError(undefined);
    if (offline && !offline.online) {
      setPeople(offline.pickupFor(childId));
      return;
    }

    startTransition(async () => {
      const result = await pickup(childId, church);
      setError(result.error);
      setPeople(result.people ?? []);
    });
  }, [open, childId, church, offline]);

  const go = (override: { kind: string; reason: string } | null) => {
    startTransition(async () => {
      // R8.7. With no network the station asks the same questions itself and
      // writes the answer to its log, because a child whose parent is standing
      // there cannot wait for the wifi.
      if (offline && !offline.online) {
        const stopped = await offline.release({
          personId: childId,
          typed: code,
          collectedBy,
          override: override as { kind: OverrideKind; reason: string } | null,
        });
        if (!stopped) {
          setOpen(false);
          return;
        }
        setBlock({ kind: stopped, message: t(`checkout.block.${stopped}` as never) });
        return;
      }

      const result = await release(
        visitId,
        code,
        collectedBy,
        override as never,
        church,
      );
      setError(result.error);
      if (result.released) {
        setOpen(false);
        router.refresh();
        return;
      }
      if (result.block) setBlock(result.block);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary"><LogOut /> {t("checkout.title")}</Button>
      </DialogTrigger>
      <DialogContent title={t("checkout.heading", { name: childName })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <p className="text-[length:var(--d-text-body)] text-danger">{error}</p> : null}

          {block ? (
            /* R24.14. A stop, filling the dialog, passed deliberately. */
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-lg bg-critical p-4 text-white">
                <ShieldAlert className="size-6 shrink-0" aria-hidden />
                <p className="text-[length:var(--d-text-body)] font-medium">{block.message}</p>
              </div>

              <Field label={t("checkout.reason")}>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="danger"
                  disabled={pending || reason.trim().length === 0}
                  onClick={() => go({ kind: block.kind, reason })}
                >
                  {t("checkout.override")}
                </Button>
                <Button variant="ghost" onClick={() => setBlock(null)}>
                  {t("action.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-fg">{t("checkout.who")}</span>
                <div className="flex flex-col gap-2">
                  {people.map((person) => (
                    <label key={person.id} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="collectedBy"
                        checked={collectedBy === person.id}
                        onChange={() => setCollectedBy(person.id)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className="text-[length:var(--d-text-body)] text-fg">
                        {person.name}
                      </span>
                      {person.restricted ? (
                        <Badge tone="danger">{t("checkout.restricted")}</Badge>
                      ) : null}
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="collectedBy"
                      checked={collectedBy === null}
                      onChange={() => setCollectedBy(null)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="text-[length:var(--d-text-body)] text-fg">
                      {t("checkout.someoneElse")}
                    </span>
                  </label>
                </div>
              </div>

              <Field label={t("checkout.code")}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  className="font-mono tracking-widest"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={pending} onClick={() => go(null)}>
                  <LogOut /> {t("checkout.release")}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("action.cancel")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
