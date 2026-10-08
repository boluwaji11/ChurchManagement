"use client";

import * as React from "react";
import { FileText, Printer } from "lucide-react";
import {
  Banner, Button, Combobox, Field, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  PAPER, PAPERS, perPage, MERGE_FIELDS, unknownMarks, type PaperStock,
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
  /* R16.12. One a family, or one a person. A church writing about a
     members' meeting wants a label each; one posting a newsletter wants
     one through each door. */
  const HOUSEHOLDS = "__households";
  const PEOPLE = "__people";

  const [paper, setPaper] = React.useState<PaperStock>("envelope");
  const [list, setList] = React.useState(HOUSEHOLDS);
  const [skip, setSkip] = React.useState("0");
  const [letter, setLetter] = React.useState("");

  /* R16.12. A mark this product cannot fill prints exactly as typed, which
     the church should know before a hundred of them are in envelopes. */
  const strange = unknownMarks(letter);

  const used = Math.max(0, Math.min(perPage(paper) - 1, Number(skip) || 0));

  const whole = list === HOUSEHOLDS || list === PEOPLE;
  const href = `/members/print/labels?church=${church}&sheet=${paper}`
    + (list === PEOPLE ? "&each=person" : "")
    + (whole ? "" : `&list=${list}`)
    + (used > 0 ? `&skip=${used}` : "");

  const letterHref = `/members/print/letters?church=${church}`
    + (list === PEOPLE ? "&each=person" : "")
    + (whole ? "" : `&list=${list}`)
    + `&body=${encodeURIComponent(letter)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        {/* R1.14. Typing finds one. A church that keeps twenty lists should
            not read the whole menu to reach the one it posts to. */}
        <Field label={t("post.who")}>
          <Combobox
            options={[
              { value: HOUSEHOLDS, label: t("post.perHousehold") },
              { value: PEOPLE, label: t("post.perPerson") },
              /* R1.14. Named as what they are, so a church's own list is not
                 mistaken for one of the product's own choices. */
              ...lists.map((one) => ({
                value: one.id,
                label: t("post.fromList", { name: one.name }),
              })),
            ]}
            value={list}
            onChange={(next) => setList(next || HOUSEHOLDS)}
            clearable={false}
            aria-label={t("post.who")}
            emptyLabel={t("lists.noneFound")}
            clearLabel={t("common.close")}
          />
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

      {/* R16.12. A letter is the same choice of who, with words on it, so it
          is the same screen rather than a second one asking the same three
          questions. */}
      <Field label={t("letter.body")}>
        <Textarea
          rows={8}
          value={letter}
          onChange={(event) => setLetter(event.target.value)}
          placeholder={t("letter.placeholder")}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-label text-fg">{t("letter.fields")}</span>
        {MERGE_FIELDS.map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => setLetter((was) => `${was}{${one}}`)}
            className="min-h-9 cursor-pointer rounded-full border border-line-strong bg-surface px-3 font-mono text-[12px] text-fg hover:bg-sunken"
          >
            {`{${one}}`}
          </button>
        ))}
      </div>

      {strange.length > 0 ? (
        <Banner tone="warning" title={t("letter.unknown", { marks: strange.join(", ") })} />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild disabled={households === 0}>
          <a href={href} target="_blank" rel="noreferrer">
            <Printer /> {t("post.print")}
          </a>
        </Button>

        <Button asChild variant="secondary" disabled={households === 0 || !letter.trim()}>
          <a href={letterHref} target="_blank" rel="noreferrer">
            <FileText /> {t("letter.print")}
          </a>
        </Button>
      </div>
    </div>
  );
}
