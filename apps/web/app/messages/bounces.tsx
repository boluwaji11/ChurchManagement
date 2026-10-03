"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { Banner, Card, CardTitle, EmptyState, IconButton, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { restoreAddress } from "./actions";

export interface BouncedRow {
  personId: string;
  name: string;
  email: string;
  reason: string | null;
  at: string;
}

/**
 * R16.7. The addresses a mail server refused for good.
 *
 * Marked rather than deleted, because somebody has to be able to see that the
 * address they are looking at is the one that bounced, and why. A church that
 * has spoken to the person puts it back.
 */
export function Bounces({ church, rows }: { church: string; rows: BouncedRow[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <Card aria-busy={pending}>
      <CardTitle>{t("bounce.title")}</CardTitle>
      <Separator className="my-4" />

      {error ? <Banner tone="danger" title={error} /> : null}

      {rows.length === 0 ? (
        <EmptyState title={t("bounce.empty")} />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row, i) => (
            <li key={`${row.personId}-${row.email}`}>
              {i > 0 ? <Separator className="my-2" /> : null}
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/people/${row.personId}?church=${church}`}
                    className="truncate text-[length:var(--d-text-body)] text-fg hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="truncate text-caption text-fg-muted">{row.email}</span>
                  {row.reason ? (
                    <span className="truncate text-caption text-danger-text">{row.reason}</span>
                  ) : null}
                </span>

                <IconButton
                  label={t("bounce.restore")}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await restoreAddress(row.personId, row.email, church);
                      setError(result.error);
                      if (!result.error) router.refresh();
                    })}
                >
                  <Undo2 />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
