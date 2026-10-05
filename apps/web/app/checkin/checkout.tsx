"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Badge, Banner, BlockingInterrupt, Button, IconButton, Dialog, DialogTrigger, DialogContent, Field, Input,
  RadioGroup, RadioItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { pickup, release } from "./actions";
import type { PickupPerson, OverrideKind } from "@connectapp/db";

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
    memberId: string;
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
  onDone,
}: {
  church: string;
  visitId: string;
  childId: string;
  childName: string;
  /** Where the caller keeps its own copy of who is in the room. */
  onDone?: () => void;
  /** R8.7. What to do when there is no server to ask. */
  offline?: OfflineCheckout;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [members, setPeople] = React.useState<PickupPerson[]>([]);
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
      setPeople(result.members ?? []);
    });
  }, [open, childId, church, offline]);

  const go = (override: { kind: string; reason: string } | null) => {
    startTransition(async () => {
      // R8.7. With no network the station asks the same questions itself and
      // writes the answer to its log, because a child whose parent is standing
      // there cannot wait for the wifi.
      if (offline && !offline.online) {
        const stopped = await offline.release({
          memberId: childId,
          typed: code,
          collectedBy,
          override: override as { kind: OverrideKind; reason: string } | null,
        });
        if (!stopped) {
          setOpen(false);
          onDone?.();
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
        onDone?.();
        router.refresh();
        return;
      }
      if (result.block) setBlock(result.block);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("checkout.title")}
          variant="secondary"
        >
          <LogOut />
        </IconButton>
      </DialogTrigger>
      <DialogContent title={t("checkout.heading", { name: childName })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("checkout.failed")}>{error}</Banner> : null}

          {block ? (
            /*
             * R8.9, R24.14. A blocking warning is blocking. It fills the
             * screen, it cannot be pressed past by accident, and the way
             * through costs a sentence that is written down with the name of
             * whoever decided.
             */
            <BlockingInterrupt
              heading={t("checkout.blocked")}
              detail={block.message}
              action={
                <div className="flex w-full max-w-md flex-col gap-4">
                  <Field label={t("checkout.reason")} required>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      autoComplete="off"
                      autoFocus
                    />
                  </Field>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setBlock(null);
                        setReason("");
                      }}
                    >
                      {t("checkout.stop")}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={pending || reason.trim().length === 0}
                      onClick={() => go({ kind: block.kind, reason })}
                    >
                      {t("checkout.override")}
                    </Button>
                  </div>
                </div>
              }
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-fg">{t("checkout.who")}</span>
                <RadioGroup
                  value={collectedBy ?? "other"}
                  onValueChange={(value) => setCollectedBy(value === "other" ? null : value)}
                >
                  {members.map((person) => (
                    <RadioItem key={person.id} value={person.id}>
                      <span className="text-fg">{person.name}</span>
                      {person.restricted ? (
                        <Badge tone="danger">{t("checkout.restricted")}</Badge>
                      ) : null}
                    </RadioItem>
                  ))}
                  <RadioItem value="other">
                    <span className="text-fg">{t("checkout.someoneElse")}</span>
                  </RadioItem>
                </RadioGroup>
              </div>

              <Field label={t("checkout.code")}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  className="font-mono tracking-widest"
                />
              </Field>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("action.cancel")}
                </Button>
              <Button disabled={pending} onClick={() => go(null)}>
                  <LogOut /> {t("checkout.release")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
