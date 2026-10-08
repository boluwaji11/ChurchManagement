"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import {
  Button, Field, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  PAPER, PAPERS, perPage, type PaperStock,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";

export interface PostList {
  id: string;
  name: string;
}

/**
 * R16.12. Choosing what to post, and on what.
 *
 * Three questions and a press. The church already owns the sheets, so the
 * stock is named the way the box is, and the count says how many sheets to
 * put in the tray before anybody presses anything.
 *
 * Opening the sheet in its own tab rather than printing from here: a
 * volunteer wants to look at it before it goes through the printer, and a
 * print dialog over a screen they cannot read is how a box of labels gets
 * wasted.
 */
export function Labels({
  church,
  lists,
  households,
}: {
  church: string;
  /** R1.14. The saved lists a church keeps, so post can go to one of them. */
  lists: PostList[];
  /** How many households hold an address at all. */
  households: number;
}) {
  const EVERYONE = "__all";

  const [paper, setPaper] = React.useState<PaperStock>("avery5160");
  const [list, setList] = React.useState(EVERYONE);
  const [skip, setSkip] = React.useState("0");

  const used = Math.max(0, Math.min(perPage(paper) - 1, Number(skip) || 0));
  const sheets = Math.ceil((households + used) / perPage(paper));

  const href = `/members/print/labels?church=${church}&sheet=${paper}`
    + (list === EVERYONE ? "" : `&list=${list}`)
    + (used > 0 ? `&skip=${used}` : "");

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        <Field label={t("post.who")}>
          <Select value={list} onValueChange={setList}>
            <SelectTrigger aria-label={t("post.who")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={EVERYONE}>{t("post.everyone")}</SelectItem>
              {lists.map((one) => (
                <SelectItem key={one.id} value={one.id}>{one.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("post.sheet")}>
          <Select value={paper} onValueChange={(next) => setPaper(next as PaperStock)}>
            <SelectTrigger aria-label={t("post.sheet")}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAPERS.map((one) => (
                <SelectItem key={one} value={one}>
                  {PAPER[one].name} ({plural("post.count", perPage(one))})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* R16.12. A church prints twelve off a sheet of thirty and keeps the
            rest. Without this the next run puts labels on the part that has
            already gone. */}
        {perPage(paper) > 1 ? (
          <Field label={t("post.skip")}>
            <Input
              inputMode="numeric"
              value={skip}
              onChange={(event) => setSkip(event.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button asChild disabled={households === 0}>
          <a href={href} target="_blank" rel="noreferrer">
            <Printer /> {t("post.print")}
          </a>
        </Button>

        <span className="text-[length:var(--d-text-body)] text-fg-muted">
          {plural("post.count", households)}
          {households > 0 ? ` · ${plural("post.sheets", sheets)}` : ""}
        </span>
      </div>
    </div>
  );
}
