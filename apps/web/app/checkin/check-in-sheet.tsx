"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Banner, Button, Combobox, Field,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { place, checkInTo } from "./actions";

export interface Candidate {
  /** "v:<visitId>" for somebody already here, "p:<memberId>" for anybody else. */
  value: string;
  label: string;
  /** Matched on as well as the name, so a surname or a household finds them. */
  keywords?: string;
}

/**
 * R8.14. Checking a child in, or putting one who is here into a class.
 *
 * The same two answers the desk gives, from the screen the supervisor is
 * already on: who, and which class. Somebody who was checked in at the desk is
 * moved; anybody else is checked in here, which writes the visit, the code and
 * the attendance in one go.
 */
export function CheckInSheet({
  church,
  occurrenceId,
  candidates,
  rooms,
  trigger,
}: {
  church: string;
  occurrenceId: string;
  candidates: Candidate[];
  rooms: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [who, setWho] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    if (!who || !roomId) return;
    const [kind, id] = [who.slice(0, 1), who.slice(2)];

    startTransition(async () => {
      const result =
        kind === "v"
          ? await place(id, roomId, church)
          : await checkInTo({ occurrenceId, memberId: id, roomId }, church);

      setError(result.error);
      if (!result.error) {
        setOpen(false);
        setWho("");
        setRoomId("");
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        title={t("board.checkIn.title")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={submit} disabled={pending || !who || !roomId}>
              {t("checkin.check")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

        <Field label={t("board.child")} required>
          <Combobox
            options={candidates}
            value={who}
            onChange={setWho}
            emptyLabel={t("incident.noPerson")}
            clearLabel={t("date.clear")}
          />
        </Field>

        <Field label={t("checkin.room")} required>
          <Combobox
            options={rooms.map((room) => ({ value: room.id, label: room.name }))}
            value={roomId}
            onChange={setRoomId}
            emptyLabel={t("board.noRooms.title")}
            clearLabel={t("date.clear")}
          />
        </Field>
      </SheetContent>
    </Sheet>
  );
}
