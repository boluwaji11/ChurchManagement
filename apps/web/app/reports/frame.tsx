import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@connectapp/i18n";
import { DownloadMenu } from "./download";

/** R18.x. How far back a report reads, in days. */
export const WINDOWS = [90, 180, 365] as const;
export type Window = (typeof WINDOWS)[number];

export const windowOf = (raw: string | undefined): Window =>
  WINDOWS.includes(Number(raw) as Window) ? (Number(raw) as Window) : 365;

/** The same date, a number of days earlier, as YYYY-MM-DD. */
export function backBy(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

/**
 * R18.x, R18.10. The frame every report sits in.
 *
 * The way back, how far back it reads, and the file. Written once so a church
 * that has learned one report has learned all of them, and so the window a
 * report was read at is the window the file carries.
 */
export function ReportFrame({
  church,
  title,
  window: days,
  path,
  files = "all",
  children,
}: {
  church: string;
  title: string;
  window: Window;
  /** The report's own segment, for the links that change the window. */
  path: string;
  /**
   * R18.10. Which formats this report leaves in.
   *
   * The three a church gets without building one have a sheet behind them, so
   * they offer all three. Giving is held with the rest of the money and has
   * none of them yet, so it offers nothing rather than a press that answers
   * with a missing page.
   */
  files?: "all" | "none";
  children: React.ReactNode;
}) {
  return (
    <>
      <Link
        href={`/reports?church=${church}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden /> {t("reports.title")}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-display text-[22px] leading-[28px] text-fg">{title}</h2>

        <div className="flex items-center gap-1 rounded-md bg-sunken p-[3px]">
          {WINDOWS.map((one) => (
            <Link
              key={one}
              href={`/reports/${path}?church=${church}&days=${one}`}
              aria-current={one === days ? "page" : undefined}
              className={
                one === days
                  ? "inline-flex min-h-[34px] items-center rounded-sm bg-surface px-3 text-[13px] font-medium text-fg shadow-sm sm:min-h-[26px]"
                  : "inline-flex min-h-[34px] items-center rounded-sm px-3 text-[13px] font-medium text-fg-muted hover:text-fg sm:min-h-[26px]"
              }
            >
              {t(`reports.window.${one}` as never)}
            </Link>
          ))}
        </div>

        {/* R18.10. The same three formats a built report has, so a church
            that has learned one report has learned all of them. Each carries
            the window the report was read at. */}
        {files === "all" ? (
          <DownloadMenu
            csv={`/reports/${path}/export?church=${church}&days=${days}`}
            pptx={`/reports/pptx?church=${church}&report=${path}&days=${days}`}
            print={`/reports/print?church=${church}&report=${path}&days=${days}`}
          />
        ) : null}
      </div>

      {children}
    </>
  );
}
