"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Banner, Button, IconButton, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Confirm } from "@/components/confirm";
import { savePosition, archivePosition } from "../actions";

export interface PositionRow {
  id: string;
  name: string;
  needed: number;
  withChildren: boolean;
  requiresCheck: boolean;
}

/**
 * R10.2. The positions a team schedules, and how much of the month each one
 * still owes.
 *
 * The count is the point of the list: a leader reads it to find the row that is
 * short, which is the row they are here to fill.
 */
export function Positions({
  church,
  teamId,
  positions,
  canManage,
}: {
  church: string;
  teamId: string;
  positions: PositionRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<{ error?: string }>) => {
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  const add = () => {
    const wanted = name.trim();
    if (!wanted) return;
    run(async () => {
      const result = await savePosition(
        null,
        { teamId, name: wanted, needed: 1, withChildren: false, requiresCheck: false },
        church,
      );
      if (!result.error) setName("");
      return result;
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("serving.failed")}>{error}</Banner> : null}

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            aria-label={t("serving.position.name")}
            placeholder={t("serving.newPosition")}
            className="min-w-0 flex-1"
          />
          <Button onClick={add} disabled={pending || !name.trim()}>
            <Plus /> {t("action.add")}
          </Button>
        </div>
      ) : null}

      <ul className="flex flex-col">
        {positions.map((position) => (
          <li
            key={position.id}
            className="flex items-center gap-3 border-b border-sunken py-3 first:pt-0"
          >
            <span className="min-w-0 flex-1 truncate font-medium text-fg">{position.name}</span>
            {canManage ? (
              <Confirm
                title={t("serving.position.removeTitle", { name: position.name })}
                body={t("serving.position.removeBody")}
                confirmLabel={t("serving.position.removeAction")}
                disabled={pending}
                onConfirm={() => run(() => archivePosition(position.id, church))}
                trigger={
                  <IconButton
                    label={t("serving.position.archive")}
                    variant="ghost"
                    disabled={pending}
                  >
                    <Trash2 />
                  </IconButton>
                }
              />
            ) : null}
          </li>
        ))}
      </ul>

    </div>
  );
}
