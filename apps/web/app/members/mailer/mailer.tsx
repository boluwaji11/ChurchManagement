"use client";

import * as React from "react";
import { Archive, Download as DownloadIcon, FileText, Mail, Printer } from "lucide-react";
import {
  Banner, Button, Combobox, Dialog, DialogContent, DialogFooter, Field, IconButton, Input,
  Tooltip,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  PAPER, PAPERS, perPage, unknownMarks, faceOf, sizeOf,
  type PaperStock, type LetterFont, type LetterSize,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Download } from "@/components/download";
import { RichText } from "@/components/rich-text";
import { useRouter } from "next/navigation";
import { archiveMailer, saveMailer } from "./actions";

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
  { mark: "first", label: "post.field.first" },
  { mark: "name", label: "post.field.name" },
  { mark: "address", label: "post.field.address" },
  { mark: "church", label: "post.field.church" },
  { mark: "today", label: "post.field.today" },
  { mark: "from", label: "post.field.from" },
  { mark: "phone", label: "post.field.phone" },
  { mark: "email", label: "post.field.email" },
  { mark: "website", label: "post.field.website" },
] as const;

/**
 * R16.12. What a church posts: labels for the envelopes, or the letters that
 * go inside them.
 *
 * Both answer the same first question, who it is going to, so that is asked
 * once and the two jobs sit behind it. Asking it twice on two screens is how
 * a church ends up posting a letter to one list and labels for another.
 */
/**
 * R16.12. The mailer being written, as it was last saved.
 *
 * Everything the screen holds, so a refresh halfway through a letter opens on
 * the same words, the same list and the same stock.
 */
export interface SavedMailer {
  id: string;
  name: string;
  recipients: string;
  listId: string | null;
  paper: string;
  skip: number;
  font: string;
  fontSize: number;
  body: string;
}

/** When it last saved, short enough to sit in a header. */
const stamp = (at: number): string =>
  new Date(at).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

export function Mailer({
  church,
  lists,
  households,
  saved,
}: {
  church: string;
  /** R1.14. The saved lists a church keeps, so post can go to one of them. */
  lists: PostList[];
  /** How many households hold an address at all. */
  households: number;
  /** R16.12. The record this screen is editing. */
  saved: SavedMailer;
}) {
  /* R16.12. One a family, or one a person. A church writing about a members'
     meeting wants a label each; one posting a newsletter wants one through
     each door. */
  const HOUSEHOLDS = "__households";
  const PEOPLE = "__people";

  const [doing, setDoing] = React.useState<"letters" | "labels">("letters");
  const [name, setName] = React.useState(saved.name);
  const [list, setList] = React.useState(
    saved.recipients === "people"
      ? PEOPLE
      : saved.recipients === "list" && saved.listId
        ? saved.listId
        : HOUSEHOLDS,
  );
  const [paper, setPaper] = React.useState<PaperStock>(saved.paper as PaperStock);
  const [skip, setSkip] = React.useState(String(saved.skip));
  const [font, setFont] = React.useState<LetterFont>(faceOf(saved.font));
  const [size, setSize] = React.useState<LetterSize>(sizeOf(saved.fontSize));
  const [letter, setLetter] = React.useState(saved.body);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [asking, setAsking] = React.useState(false);
  const [putting, setPutting] = React.useState(false);
  const [going, startGoing] = React.useTransition();
  const router = useRouter();
  const away = putting || going;

  /** R16.12. Writes a field's mark where the writer's caret is. */
  const write = React.useRef<((text: string) => void) | null>(null);

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
    + `&font=${font}&size=${size}&body=${encodeURIComponent(letter)}`;

  const fileHref = `/api/letters?church=${church}${who}`
    + `&font=${font}&size=${size}&name=${encodeURIComponent(name)}`
    + `&body=${encodeURIComponent(letter)}`;

  /* The file is named after the mailer, so a church with four of them can
     tell the carol service from the gift day in its downloads folder. */
  const fileName = `${name.trim().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, "-") || "letters"}.docx`;

  /*
   * R16.12. It saves itself.
   *
   * A letter to a congregation is typed over a week in four-minute gaps, and
   * a Save button is a thing somebody closes the laptop without pressing. A
   * beat behind the last keystroke rather than on every one, so a sentence is
   * one write instead of forty.
   */
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    let live = true;
    const timer = setTimeout(() => {
      setSaving(true);
      void saveMailer(
        {
          id: saved.id,
          name,
          recipients: list === PEOPLE ? "people" : list === HOUSEHOLDS ? "households" : "list",
          listId: list === PEOPLE || list === HOUSEHOLDS ? null : list,
          paper,
          skip: Number(skip) || 0,
          font,
          fontSize: size,
          body: letter,
        },
        church,
      ).then((back) => {
        if (!live) return;
        setSaving(false);
        if (back.error) {
          setError(back.error);
          return;
        }
        setError(null);
        setSavedAt(Date.now());
      });
    }, 900);

    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The names of the two sentinels never change, so they are left out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.id, name, list, paper, skip, font, size, letter, church]);

  const put = (mark: string) => {
    if (write.current) write.current(`{${mark}}`);
    else setLetter((was) => `${was}{${mark}}`);
  };

  const nothing = households === 0;
  const ready = !nothing && Boolean(letter.trim());

  /*
   * R24.6. Two ways to take the same letters away, as marks on the heading's
   * own line. Two long buttons under a box saying nearly the same thing is
   * two decisions where there is one.
   */
  const letterActions = (
    <span className="flex items-center gap-1">
      <Tooltip content={t("post.printLetters")}>
        <a
          href={ready ? lettersHref : undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={t("post.printLetters")}
          aria-disabled={!ready}
          className={`grid size-9 place-items-center rounded-[var(--d-radius-control)] [&_svg]:size-[18px] ${
            ready
              ? "cursor-pointer text-fg hover:bg-sunken"
              : "cursor-default text-fg-subtle opacity-45"
          }`}
        >
          <Printer aria-hidden />
        </a>
      </Tooltip>

      {ready ? (
        <Tooltip content={t("post.download")}>
          <Download
            href={fileHref}
            file={fileName}
            label={t("post.writing")}
            title={t("post.writeFailed")}
            className="grid size-9 cursor-pointer place-items-center rounded-[var(--d-radius-control)] text-fg hover:bg-sunken [&_svg]:size-[18px]"
          >
            <DownloadIcon aria-hidden />
          </Download>
        </Tooltip>
      ) : null}
    </span>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* R16.12. The name of the thing being written, and when it last wrote
          itself down. Nothing here is pressed to save it. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label={t("post.name")} required className="min-w-[240px] flex-1">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <span className="flex min-h-9 items-center gap-2">
          <span role="status" className="text-caption text-fg-subtle tabular-nums">
            {saving
              ? t("post.saving")
              : savedAt
                ? t("post.savedAt", { when: stamp(savedAt) })
                : ""}
          </span>

          {/* R2.13. The one thing done to a whole mailer, on the mailer. */}
          <IconButton
            label={t("post.archiveDo")}
            variant="ghost"
            disabled={away}
            className="size-9 min-h-0 [&_svg]:size-[18px]"
            onClick={() => setAsking(true)}
          >
            <Archive />
          </IconButton>
        </span>
      </div>

      <Dialog open={asking} onOpenChange={(next) => { if (!away) setAsking(next); }}>
        <DialogContent title={t("post.archiveAsk", { name })}>
          <DialogFooter>
            <Button variant="secondary" disabled={away} onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              loading={away}
              onClick={() => {
                setPutting(true);
                void archiveMailer(saved.id, true, church).then((back) => {
                  setPutting(false);
                  if (back.error) {
                    setAsking(false);
                    setError(back.error);
                    return;
                  }
                  startGoing(() => router.push(`/members/mailer?church=${church}`));
                });
              }}
            >
              {t("post.archiveDo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p role="status" className="text-[13px] text-danger-text">{error}</p> : null}

      {/* R24.6. Two jobs, named, rather than two buttons at the bottom of one
          screen with a sheet picker between them that only one of them uses. */}
      <div
        role="tablist"
        aria-label={t("post.title")}
        className="flex w-fit gap-1 rounded-full border border-line bg-sunken p-1"
      >
        {([
          { key: "letters", label: t("post.tab.letters"), icon: <FileText /> },
          { key: "labels", label: t("post.tab.labels"), icon: <Mail /> },
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
          <Field label={t("post.letter")} required action={letterActions}>
            <RichText
              defaultValue={saved.body}
              minHeight={260}
              maxHeight={420}
              onChange={setLetter}
              insert={(put) => { write.current = put; }}
              font={font}
              onFont={setFont}
              size={size}
              onSize={setSize}
            />
          </Field>

          {/* R16.12. Each one says what it means and writes its own mark in
              wherever the cursor is. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-label text-fg">{t("post.fields")}:</span>
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

      {doing === "labels" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild disabled={nothing}>
            <a href={labelsHref} target="_blank" rel="noreferrer">
              <Printer /> {t("post.printLabels")}
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
