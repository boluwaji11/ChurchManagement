"use client";

import * as React from "react";
import { FileText, Mail, Printer } from "lucide-react";
import {
  Banner, Button, Combobox, Field, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  PAPER, PAPERS, perPage, unknownMarks, type PaperStock,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Download } from "@/components/download";

export interface PostList {
  id: string;
  name: string;
}

/**
 * R16.12. The dynamic fields, as a church reads them.
 *
 * The mark is what goes in the letter and the name is what it means. A row of
 * `{from}` and `{today}` is a row a volunteer has to decode; a row of "Your
 * name" and "Today's date" is one they can use.
 */
const FIELDS = [
  { mark: "name", label: "post.field.name" },
  { mark: "address", label: "post.field.address" },
  { mark: "church", label: "post.field.church" },
  { mark: "today", label: "post.field.today" },
  { mark: "from", label: "post.field.from" },
] as const;

/**
 * R16.12. What a church posts: labels for the envelopes, or the letters that
 * go inside them.
 *
 * Both answer the same first question, who it is going to, so that is asked
 * once and the two jobs sit behind it. Asking it twice on two screens is how
 * a church ends up posting a letter to one list and labels for another.
 */
export function Mailer({
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
  /* R16.12. One a family, or one a person. A church writing about a members'
     meeting wants a label each; one posting a newsletter wants one through
     each door. */
  const HOUSEHOLDS = "__households";
  const PEOPLE = "__people";

  const [doing, setDoing] = React.useState<"labels" | "letters">("labels");
  const [list, setList] = React.useState(HOUSEHOLDS);
  const [paper, setPaper] = React.useState<PaperStock>("envelope");
  const [skip, setSkip] = React.useState("0");
  const [letter, setLetter] = React.useState("");

  const box = React.useRef<HTMLTextAreaElement>(null);

  /* R16.12. A mark this product cannot fill prints exactly as typed, which
     the church should know before a hundred of them are in envelopes. */
  const strange = unknownMarks(letter);

  const used = Math.max(0, Math.min(perPage(paper) - 1, Number(skip) || 0));
  const whole = list === HOUSEHOLDS || list === PEOPLE;

  const who = (list === PEOPLE ? "&each=person" : "")
    + (whole ? "" : `&list=${list}`);

  const labelsHref = `/members/print/labels?church=${church}&sheet=${paper}${who}`
    + (used > 0 ? `&skip=${used}` : "");

  const lettersHref = `/members/print/letters?church=${church}${who}`
    + `&body=${encodeURIComponent(letter)}`;

  const fileHref = `/api/letters?church=${church}${who}`
    + `&body=${encodeURIComponent(letter)}`;

  /** Puts a mark where the cursor is rather than at the end of the letter. */
  const put = (mark: string) => {
    const at = box.current;
    const token = `{${mark}}`;
    if (!at) {
      setLetter((was) => was + token);
      return;
    }
    const from = at.selectionStart ?? letter.length;
    const to = at.selectionEnd ?? from;
    setLetter(letter.slice(0, from) + token + letter.slice(to));
    requestAnimationFrame(() => {
      at.focus();
      at.setSelectionRange(from + token.length, from + token.length);
    });
  };

  const nothing = households === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* R24.6. Two jobs, named, rather than two buttons at the bottom of one
          screen with a sheet picker between them that only one of them uses. */}
      <div
        role="tablist"
        aria-label={t("post.title")}
        className="flex w-fit gap-1 rounded-full border border-line bg-sunken p-1"
      >
        {([
          { key: "labels", label: t("post.tab.labels"), icon: <Mail /> },
          { key: "letters", label: t("post.tab.letters"), icon: <FileText /> },
        ] as const).map((one) => (
          <button
            key={one.key}
            type="button"
            role="tab"
            aria-selected={doing === one.key}
            onClick={() => setDoing(one.key)}
            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium [&_svg]:size-4 ${
              doing === one.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
            }`}
          >
            {one.icon} {one.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        {/* R1.14. Typing finds one. A church that keeps twenty lists should
            not read the whole menu to reach the one it posts to. */}
        <Field label={t("post.who")}>
          <Combobox
            options={[
              { value: HOUSEHOLDS, label: t("post.perHousehold") },
              { value: PEOPLE, label: t("post.perPerson") },
              /* Named as what they are, so a church's own list is not
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

        {doing === "labels" ? (
          <>
            <Field label={t("post.sheet")}>
              <Select value={paper} onValueChange={(next) => setPaper(next as PaperStock)}>
                <SelectTrigger aria-label={t("post.sheet")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPERS.map((one) => (
                    <SelectItem key={one} value={one}>{PAPER[one].name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* R16.12. A church prints twelve off a sheet of thirty and keeps
                the rest. Without this the next run puts labels on the part
                that has already gone. */}
            {perPage(paper) > 1 ? (
              <Field label={t("post.skip")}>
                <Input
                  inputMode="numeric"
                  value={skip}
                  onChange={(event) => setSkip(event.target.value.replace(/[^0-9]/g, ""))}
                />
              </Field>
            ) : null}
          </>
        ) : null}
      </div>

      {doing === "letters" ? (
        <>
          <Field label={t("post.letter")} required>
            <Textarea
              ref={box}
              rows={10}
              value={letter}
              onChange={(event) => setLetter(event.target.value)}
              placeholder={t("post.letterPlaceholder")}
            />
          </Field>

          {/* R16.12. Each one says what it means and writes its own mark in
              wherever the cursor is. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-label text-fg">{t("post.fields")}</span>
            {FIELDS.map((one) => (
              <button
                key={one.mark}
                type="button"
                onClick={() => put(one.mark)}
                className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-fg hover:bg-sunken"
              >
                {t(one.label as never)}
                <span className="font-mono text-[11px] text-fg-subtle">{`{${one.mark}}`}</span>
              </button>
            ))}
          </div>

          {strange.length > 0 ? (
            <Banner tone="warning" title={t("post.unknown", { marks: strange.join(", ") })} />
          ) : null}
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {doing === "labels" ? (
          <Button asChild disabled={nothing}>
            <a href={labelsHref} target="_blank" rel="noreferrer">
              <Printer /> {t("post.printLabels")}
            </a>
          </Button>
        ) : (
          <>
            <Button asChild disabled={nothing || !letter.trim()}>
              <a href={lettersHref} target="_blank" rel="noreferrer">
                <Printer /> {t("post.printLetters")}
              </a>
            </Button>

            {/* R24.6. The server writes the file, which takes a moment on a
                congregation of any size, so it is asked for in the page and
                the Working panel holds the screen until it lands. */}
            {letter.trim() && !nothing ? (
              <Download
                href={fileHref}
                file="letters.docx"
                label={t("post.writing")}
                title={t("post.writeFailed")}
              >
                <FileText /> {t("post.download")}
              </Download>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
