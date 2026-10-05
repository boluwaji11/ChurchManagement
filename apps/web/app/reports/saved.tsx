"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Table2 } from "lucide-react";
import { Button, IconButton, Dialog, DialogContent, DialogFooter } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { archiveReport } from "./build/actions";

export interface SavedCard {
  id: string;
  slug: string;
  name: string;
  subject: string;
}

/**
 * R18.x. The reports a church built, on the page it reads reports from.
 *
 * A tile is clickable, so the whole card opens the report and the two actions
 * sit above it as icons. They appear on every card, so they carry the icon
 * alone and say what they are through their label.
 */
export function SavedReports({ church, reports }: { church: string; reports: SavedCard[] }) {
  const router = useRouter();
  const [asking, setAsking] = React.useState<SavedCard | null>(null);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[22px] leading-7 text-fg">{t("report.yours")}</h2>
      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {reports.map((one) => (
          <div
            key={one.id}
            className="relative flex items-start gap-3 rounded-[14px] border border-line bg-surface p-5 transition-colors hover:bg-sunken"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-lg"
              style={{ background: "var(--hue-indigo-tint)", color: "var(--hue-indigo-key)" }}
            >
              <Table2 className="size-4" />
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* Stretched, so the whole tile opens it and the buttons beside
                  it stay buttons rather than links inside a link. */}
              <Link
                href={`/reports/custom/${one.slug}?church=${church}`}
                className="font-semibold text-fg after:absolute after:inset-0 after:content-['']"
              >
                {one.name}
              </Link>
              <span className="text-caption text-fg-muted">
                {t(`report.subject.${one.subject}` as never)}
              </span>
            </span>

            <span className="relative z-10 flex shrink-0 items-center">
              <IconButton
                label={t("report.edit")}
                variant="ghost"
                className="size-8 min-h-0 [&_svg]:size-4"
                onClick={() => router.push(`/reports/build?church=${church}&id=${one.slug}`)}
              >
                <Pencil />
              </IconButton>
              <IconButton
                label={t("report.archive")}
                variant="ghost"
                className="size-8 min-h-0 [&_svg]:size-4"
                onClick={() => setAsking(one)}
              >
                <Archive />
              </IconButton>
            </span>
          </div>
        ))}
      </div>

      <Dialog open={asking !== null} onOpenChange={(open) => { if (!open) setAsking(null); }}>
        <DialogContent title={asking ? t("report.archiveAsk", { name: asking.name }) : ""}>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAsking(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              loading={working}
              onClick={() => {
                if (!asking) return;
                setWorking(true);
                void archiveReport(asking.id, true, church).then((result) => {
                  setWorking(false);
                  setAsking(null);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              {t("report.archiveDo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
