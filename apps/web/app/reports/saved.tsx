"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisVertical, Table2 } from "lucide-react";
import {
  Button, Field, IconButton, Input, Spinner, Dialog, DialogContent, DialogFooter,
  Sheet, SheetContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { archiveReport, renameReport } from "./build/actions";

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
export function SavedReports({
  church,
  reports,
  putAway = false,
}: {
  church: string;
  reports: SavedCard[];
  /** R24.6. Whether this is the list of the ones put away. */
  putAway?: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = React.useState<SavedCard | null>(null);
  const [naming, setNaming] = React.useState<SavedCard | null>(null);
  const [name, setName] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /*
   * R24.6. Everything on this screen writes and then redraws the grid, so the
   * press is held for the whole round trip: the panel and the confirmation stay
   * where they are with the button spinning, and a card acted on from its own
   * menu carries the spinner on that menu.
   */
  const [redrawing, startRedraw] = React.useTransition();
  const [onCard, setOnCard] = React.useState<string | null>(null);
  const busy = working || redrawing;

  React.useEffect(() => {
    if (!busy) setOnCard(null);
  }, [busy]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-[22px] leading-7 text-fg">
        {putAway ? t("report.archived.title") : t("report.yours")}
      </h2>
      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
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

            {/* One way in to everything that is not opening it. */}
            <span className="relative z-10 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton
                    label={t("report.more", { name: one.name })}
                    variant="ghost"
                    disabled={busy}
                    className="size-8 min-h-0 [&_svg]:size-4"
                  >
                    {onCard === one.id ? <Spinner /> : <EllipsisVertical />}
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {putAway ? (
                    /* R24.6. A report that has been put away has one thing
                       that can be done to it. */
                    <DropdownMenuItem
                      onSelect={() => {
                        setOnCard(one.id);
                        setWorking(true);
                        void archiveReport(one.id, false, church).then((result) => {
                          setWorking(false);
                          if (result.error) {
                            setError(result.error);
                            return;
                          }
                          startRedraw(() => router.refresh());
                        });
                      }}
                    >
                      {t("report.restore")}
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onSelect={() => {
                          setOnCard(one.id);
                          startRedraw(() => {
                            router.push(`/reports/build?church=${church}&id=${one.slug}`);
                          });
                        }}
                      >
                        {t("report.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => { setName(one.name); setNaming(one); }}
                      >
                        {t("report.rename")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setAsking(one)}>
                        {t("report.archiveDo")}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
      </div>

      <Sheet
        open={naming !== null}
        onOpenChange={(open) => { if (!open && !busy) setNaming(null); }}
      >
        <SheetContent
          title={t("report.rename")}
          closeLabel={t("action.cancel")}
          footer={
            <>
            <Button variant="secondary" disabled={busy} onClick={() => setNaming(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              loading={busy}
              /* `Button` reads an explicit `disabled` ahead of `loading`, so
                 the two conditions are given as one. */
              disabled={busy || !name.trim()}
              onClick={() => {
                if (!naming) return;
                setWorking(true);
                void renameReport(naming.id, name, church).then((result) => {
                  setWorking(false);
                  if (result.error) {
                    setNaming(null);
                    setError(result.error);
                    return;
                  }
                  startRedraw(() => {
                    router.refresh();
                    setNaming(null);
                  });
                });
              }}
            >
              {t("action.save")}
            </Button>
            </>
          }
        >
          <div
            aria-busy={busy}
            className={busy ? "pointer-events-none opacity-60" : undefined}
          >
            <Field label={t("report.name")} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </Field>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={asking !== null}
        onOpenChange={(open) => { if (!open && !busy) setAsking(null); }}
      >
        <DialogContent title={asking ? t("report.archiveAsk", { name: asking.name }) : ""}>
          <DialogFooter>
            <Button variant="secondary" disabled={busy} onClick={() => setAsking(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                if (!asking) return;
                setWorking(true);
                void archiveReport(asking.id, true, church).then((result) => {
                  setWorking(false);
                  if (result.error) {
                    setAsking(null);
                    setError(result.error);
                    return;
                  }
                  startRedraw(() => {
                    router.refresh();
                    setAsking(null);
                  });
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
