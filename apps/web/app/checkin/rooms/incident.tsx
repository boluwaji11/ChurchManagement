"use client";

import * as React from "react";
import {ClipboardPen } from "lucide-react";
import {
  Banner,
  Button, IconButton, Sheet, SheetTrigger, SheetContent, Field, Input, Textarea, Checkbox,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DateField } from "@/components/date-field";
import { report } from "./actions";
import { useFormError } from "@/lib/form-error";
import { useAnswered } from "@/components/form-actions";

/**
 * R8.13. Writing it down in the room, at the time.
 *
 * Filed from the class roster rather than from a desk somewhere else, because
 * the person who saw it is the person holding the tablet in that room, and a
 * report written on Tuesday from memory is a different document.
 *
 * There is no edit afterwards, and the dialog says so once, because that is a
 * consequence somebody should know before they press.
 */
export function IncidentDialog({
  church,
  memberId,
  personName,
  roomId,
  occurrenceId,
  today,
}: {
  church: string;
  memberId: string;
  personName: string;
  roomId: string;
  occurrenceId: string;
  /** The church's own date, so a station in another timezone files the right day. */
  today: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [notified, setNotified] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  /*
   * R8.22. The tick is the one thing here React holds, so it is the one
   * thing that survives a close: every other field is read off the form and
   * goes with the panel. Left set, the next child's report says a guardian
   * was told when nobody was.
   */
  const shut = (next: boolean) => {
    setOpen(next);
    if (!next) setNotified(false);
  };

  const formId = React.useId();
  const full = useAnswered(formId, open);

  return (
    <Sheet open={open} onOpenChange={shut}>
      <SheetTrigger asChild>
        <IconButton
          label={t("incident.add")}
          variant="ghost"
        >
          <ClipboardPen />
        </IconButton>
      </SheetTrigger>

      <SheetContent
        title={t("incident.heading", { name: personName })}
        closeLabel={t("common.close")}
      >
        <form
          id={formId}
          noValidate
          action={(data) => {
            startTransition(async () => {
              const result = await report(
                {
                  memberId,
                  roomId,
                  occurrenceId,
                  occurredOn: String(data.get("occurredOn") ?? today),
                  volunteers: String(data.get("volunteers") ?? ""),
                  description: String(data.get("description") ?? ""),
                  action: String(data.get("action") ?? ""),
                  guardianNotified: notified,
                },
                church,
              );
              setError(result.error);
              if (!result.error) {
                shut(false);
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? (
            <Banner tone="danger" title={t("incident.failed")}>{error}</Banner>
          ) : null}

          <Field label={t("incident.date")} required>
            <DateField name="occurredOn" defaultValue={today} max={today} />
          </Field>

          <Field label={t("incident.description")} required>
            <Textarea name="description" rows={4} autoFocus />
          </Field>

          <Field label={t("incident.action")} required>
            <Textarea name="action" rows={3} />
          </Field>

          <Field label={t("incident.volunteers")}>
            <Input name="volunteers" autoComplete="off" />
          </Field>

          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={notified} onCheckedChange={(on) => setNotified(on === true)} />
            <span className="text-[length:var(--d-text-body)] text-fg">
              {t("incident.notified")}
            </span>
          </label>


          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => shut(false)}>
              {t("action.cancel")}
            </Button>
              <Button type="submit" disabled={pending || !full}>{t("action.save")}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
