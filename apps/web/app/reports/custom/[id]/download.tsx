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
 * CSV is the numbers for a spreadsheet, PDF is the report itself for a board
 * pack. Both run the report again as they are asked for.
 */
export function DownloadMenu({
  slug,
  church,
}: {
  slug: string;
  church: string;
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
        <DropdownMenuItem
          onSelect={() => go(`/reports/custom/${slug}/export?church=${church}`, false)}
        >
          {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => go(`/reports/custom/${slug}/pptx?church=${church}`, false)}
        >
          {t("export.pptx")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => go(`/reports/custom/${slug}/print?church=${church}`, true)}
        >
          {t("export.pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
