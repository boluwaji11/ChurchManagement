"use client";

import * as React from "react";
import {
  Button, Checkbox, Field, Textarea, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";

export interface WaitingSlot {
  assignmentId: string;
  personName: string;
  /** "Drums · Worship · Oct 5", as the row reads. */
  slot: string;
}

/**
 * R10.6. Asking people to serve.
 *
 * Who is being asked, how they are asked, and what arrives: a volunteer sees
 * the gathering, the position and two buttons, and answers without signing in.
 *
 * Nothing leaves yet. Messaging is deferred, so this writes nothing and sends
 * nothing; it is the shape the request takes once a church has supplied its own
 * mail and text credentials.
 */
export function SendRequests({
  church,
  waiting,
  trigger,
}: {
  church: string;
  waiting: WaitingSlot[];
  trigger: React.ReactNode;
}) {
  const [picked, setPicked] = React.useState<string[]>(waiting.map((one) => one.assignmentId));
  const [how, setHow] = React.useState("both");

  const first = waiting.find((one) => picked.includes(one.assignmentId)) ?? waiting[0];

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent title={t("serving.send")} closeLabel={t("common.close")} className="max-w-3xl">
        <p className="-mt-2 mb-4 text-fg-muted">
          {waiting.length === 0
            ? t("serving.send.none")
            : plural("serving.send.waiting", waiting.length)}
        </p>

        <div className="grid gap-6 md:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="flex max-h-[46vh] flex-col overflow-y-auto">
            {waiting.map((one) => (
              <li
                key={one.assignmentId}
                className="flex items-start gap-3 border-b border-line py-3 last:border-0"
              >
                <Checkbox
                  checked={picked.includes(one.assignmentId)}
                  onCheckedChange={(on) =>
                    setPicked((was) =>
                      on === true
                        ? [...was, one.assignmentId]
                        : was.filter((id) => id !== one.assignmentId),
                    )
                  }
                  aria-label={one.personName}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-fg">{one.personName}</span>
                  <span className="text-[13px] text-fg-muted">{one.slot}</span>
                  <span className="text-[13px] text-fg-subtle">{t("serving.send.notAsked")}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("serving.send.by")}</span>
              <div className="flex items-center gap-1 self-start rounded-md bg-sunken p-[3px]">
                {(["both", "email", "sms"] as const).map((one) => (
                  <button
                    key={one}
                    type="button"
                    onClick={() => setHow(one)}
                    aria-pressed={how === one}
                    className={cn(
                      "h-8 rounded-sm px-3 text-[13px] font-medium",
                      how === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted",
                    )}
                  >
                    {t(`serving.send.${one}` as never)}
                  </button>
                ))}
              </div>
            </div>

            <Field label={t("serving.send.note")}>
              <Textarea rows={4} placeholder={t("serving.send.notePlaceholder")} />
            </Field>

            {/* R10.6. What lands on their phone, so nobody sends something they
                have not read. */}
            {first ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-fg">{t("serving.send.preview")}</span>
                <div className="flex flex-col gap-2.5 rounded-md border border-line bg-sunken p-4">
                  <span className="text-fg">
                    {t("serving.send.greeting", { name: first.personName.split(" ")[0] ?? "", church })}
                  </span>
                  <span className="font-semibold text-fg">{first.slot}</span>
                  <span className="flex gap-2">
                    <span className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-white">
                      {t("serving.send.accept")}
                    </span>
                    <span className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium text-fg">
                      {t("serving.send.decline")}
                    </span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button disabled>{t("serving.send.action", { count: picked.length })}</Button>
          <DialogClose asChild>
            <Button variant="secondary" data-dismiss>{t("action.cancel")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
