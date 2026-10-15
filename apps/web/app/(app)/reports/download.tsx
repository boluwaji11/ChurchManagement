"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  IconButton, Spinner,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R18.10. A built report taken off the screen, in the format it is wanted in.
 *
 * CSV is the numbers for a spreadsheet, PowerPoint is the charts for a board
 * pack with the numbers still behind them, and PDF is the report on paper. Each
 * runs the report again as it is asked for.
 */
export function DownloadMenu({
  csv,
  pptx,
  print,
}: {
  /** Where each format comes from, already carrying the church and the window. */
  csv: string;
  pptx: string;
  print: string;
}) {
  const [working, setWorking] = React.useState(false);

  // The browser does the fetching on a plain navigation, so the only feedback
  // the control owes is that the press landed.
  const go = (href: string, newTab: boolean) => {
    setWorking(true);
    window.setTimeout(() => setWorking(false), 1500);
    if (newTab) window.open(href, "_blank", "noopener");
    else window.location.href = href;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={t("reports.export")} variant="ghost" disabled={working}>
          {working ? <Spinner label={t("reports.export")} /> : <Download />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => go(csv, false)}>
          {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go(pptx, false)}>
          {t("export.pptx")}
        </DropdownMenuItem>
        {/* The print view opens in its own tab and prints itself, which is
            where the PDF comes from. */}
        <DropdownMenuItem onSelect={() => go(print, true)}>
          {t("export.pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
