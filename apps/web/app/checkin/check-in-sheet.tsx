"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banner, Button, Field,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { place } from "./actions";

/**
 * R8.14. Putting an arriving child in a class, without dragging.
 *
 * The same move the board makes by drag, for somebody on a phone, somebody
 * using a keyboard, and somebody who would rather pick from a list.
 */
export function CheckInSheet({
  church,
  waiting,
  rooms,
  trigger,
}: {
  church: string;
  waiting: { visitId: string; name: string }[];
  rooms: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [visitId, setVisitId] = React.useState("");
  const [roomId, setRoomId] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const submit = () => {
    if (!visitId || !roomId) return;
    startTransition(async () => {
      const result = await place(visitId, roomId, church);
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        setVisitId("");
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
            <Button onClick={submit} disabled={pending || !visitId || !roomId}>
              {t("checkin.check")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("board.failed")}>{error}</Banner> : null}

        {waiting.length === 0 ? (
          <Button variant="secondary" asChild className="self-start">
            <Link href={`/checkin/station?church=${church}`}>{t("board.goToDesk")}</Link>
          </Button>
        ) : (
          <>
            <Field label={t("board.child")} required>
              <Select value={visitId} onValueChange={setVisitId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {waiting.map((child) => (
                    <SelectItem key={child.visitId} value={child.visitId}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("checkin.room")} required>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
