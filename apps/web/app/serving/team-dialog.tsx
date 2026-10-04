"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus } from "lucide-react";
import {
  Banner, Button, IconButton, Field, HueDot, Input, Textarea,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  HUES, type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { saveTeam, savePosition } from "./actions";

export interface TeamDraft {
  id: string;
  name: string;
  description: string | null;
  hue: string;
}

/**
 * R10.1. Writing a team down.
 *
 * One form for creating and for editing. A team has three fields, because the
 * schedule is where the work is and a church that has to describe a team before it
 * can schedule anybody never gets to the schedule.
 */
export function TeamDialog({
  church,
  team,
  title,
  trigger,
}: {
  church: string;
  team?: TeamDraft;
  title: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [hue, setHue] = React.useState(team?.hue ?? "teal");
  /*
   * R10.2. A team is the positions it schedules, so they are written here
   * rather than on a second screen somebody has to find afterwards. Editing an
   * existing team leaves them alone: they are managed on the team itself.
   */
  const [positions, setPositions] = React.useState<string[]>([""]);
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} closeLabel={t("common.close")}>
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("hue", hue);
            if (team) data.set("id", team.id);
            startTransition(async () => {
              const result = await saveTeam(data);
              setError(result.error);
              if (result.error) return;

              if (!team && result.id) {
                for (const name of positions.map((one) => one.trim()).filter(Boolean)) {
                  await savePosition(
                    null,
                    { teamId: result.id, name, needed: 1, withChildren: false, requiresCheck: false },
                    church,
                  );
                }
              }

              setPositions([""]);
              setOpen(false);
              router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

          <Field label={t("serving.team.name")} required>
            <Input name="name" defaultValue={team?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("serving.team.description")}>
            <Textarea name="description" rows={2} defaultValue={team?.description ?? ""} />
          </Field>

          {team ? null : (
            <div className="flex flex-col gap-2">
              <span className="text-label text-fg">{t("serving.team.positions")}</span>
              {positions.map((one, i) => (
                <Input
                  key={i}
                  value={one}
                  aria-label={t("serving.team.positionName")}
                  autoComplete="off"
                  onChange={(e) =>
                    setPositions((was) => was.map((x, at) => (at === i ? e.target.value : x)))
                  }
                />
              ))}
              <Button
                type="button"
                variant="ghost"
                className="self-start"
                onClick={() => setPositions((was) => [...was, ""])}
              >
                <Plus /> {t("serving.position.add")}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("serving.team.colour")}</span>
            <Select value={hue} onValueChange={setHue}>
              <SelectTrigger aria-label={t("serving.team.colour")} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HUES.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="flex items-center gap-2">
                      <HueDot hue={option as Hue} />
                      {t(`hue.${option}` as never)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>{t("action.save")}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveTeamDialog({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton
          label={t("serving.archive")}
          variant="ghost"
        >
          <Archive />
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("serving.archiveTitle", { name })}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("serving.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("serving.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              <Archive /> {t("serving.archive")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
