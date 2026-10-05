"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import {
  Button, Checkbox, Dialog, DialogTrigger, DialogContent, DialogFooter, IconButton,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * R14.12. Choosing what the printed sheet carries, before it prints.
 *
 * A church taking a register at a door wants names and a tick box and nothing
 * else. One at a camp wants the allergy answer in front of it. Printing every
 * column and asking somebody to fold the paper is not an answer.
 */
export function PrintRoster({
  church,
  eventSlug,
  questions,
}: {
  church: string;
  eventSlug: string;
  questions: { id: string; label: string }[];
}) {
  const columns = [
    { id: "email", label: t("person.email") },
    { id: "phone", label: t("person.phone") },
    { id: "emergency", label: t("event.emergency") },
    ...questions,
  ];

  const [open, setOpen] = React.useState(false);
  const [chosen, setChosen] = React.useState<string[]>(() => columns.map((one) => one.id));

  const toggle = (id: string) =>
    setChosen((was) => (was.includes(id) ? was.filter((one) => one !== id) : [...was, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label={t("event.roster")} variant="ghost">
          <Printer />
        </IconButton>
      </DialogTrigger>

      <DialogContent title={t("event.roster")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-2.5">
          {/* The name and the tick box are always on the sheet: a register
              without a name is not a register. */}
          <span className="text-[length:var(--d-text-body)] text-fg-muted">
            {t("event.registrant")}
          </span>

          {columns.map((one) => (
            <label
              key={one.id}
              className="flex cursor-pointer items-center gap-2.5 text-[length:var(--d-text-body)] text-fg"
            >
              <Checkbox
                checked={chosen.includes(one.id)}
                onCheckedChange={() => toggle(one.id)}
              />
              {one.label}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              setOpen(false);
              window.open(
                `/events/${eventSlug}/roster?church=${church}&columns=${chosen.join(",")}`,
                "_blank",
                "noreferrer",
              );
            }}
          >
            {t("event.roster")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
