"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Input,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { addGathering } from "./actions";

const REPEATS = ["never", "weekly", "fortnightly", "monthly"] as const;

/**
 * R7.1. A new service, one-off or repeating.
 *
 * A repeating service is written once and the calendar is kept topped up from
 * the pattern, because a church that has to create fifty-two rows to say
 * "every week" will stop saying it.
 */
export function AddService({
  church,
  today,
  nowTime,
}: {
  church: string;
  /** The church's own date, so a service cannot be planned into yesterday. */
  today: string;
  nowTime: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [repeat, setRepeat] = React.useState<string>("never");
  const [date, setDate] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> {t("services.add")}
        </Button>
      </SheetTrigger>

      <SheetContent
        title={t("services.add")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form="add-service" disabled={pending}>
              {t("action.add")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("services.failed")}>{error}</Banner> : null}

        <form
          id="add-service"
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("repeat", repeat);
            startTransition(async () => {
              const result = await addGathering(data);
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                setRepeat("never");
                setDate("");
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t("services.name")} required>
            <Input name="name" autoComplete="off" />
          </Field>

          <div className="flex flex-wrap gap-4">
            <Field label={t("services.date")} required className="flex-1">
              <DateField name="occursOn" min={today} onValueChange={setDate} />
            </Field>
            <Field label={t("services.time")} required className="flex-1">
              {/* A day that has gone is not a day to plan, and on today the
                  hours that have gone are not hours to plan either. */}
              <TimeField name="startsAt" min={date === today ? nowTime : undefined} />
            </Field>
          </div>

          <Field label={t("services.repeat")}>
            <Select value={repeat} onValueChange={setRepeat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPEATS.map((r) => (
                  <SelectItem key={r} value={r}>{t(`services.repeat.${r}` as never)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Only once it repeats. An end date on a one-off is a question
              about something that cannot happen. */}
          {repeat === "never" ? null : (
            <Field label={t("services.until")}>
              <DateField name="untilOn" min={date || today} />
            </Field>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
