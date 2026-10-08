"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Type, AlignLeft, Mail, Phone, CircleDot, SquareCheck, Calendar,
  GripVertical, Trash2, Check, Link2, Hash, ToggleLeft, Paperclip, Heading, Plus, X,
  Archive, ArchiveRestore, Code, User, ChevronUp, ChevronDown,
} from "lucide-react";
import {
  Banner, Button, IconButton, Input, Spinner, cn,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import {
  NEEDS_OPTIONS, CUSTOM_TARGET, targetsFor, FILE_KINDS, FILES_CEILING,
  UPLOAD_RULES, ONE_MIB,
  type FormFieldDef, type FormFieldKind,
} from "@connectapp/db/rules";
import {
  saveForm, openOrClose, archiveForm, saveQuestion, dropQuestion, orderQuestions,
  shiftQuestion,
} from "../actions";
import { FormCover } from "./cover";
import { FormViews } from "./views";
import { Responses, type SubmissionRow } from "./responses";

export interface BuilderForm {
  id: string;
  name: string;
  intro: string | null;
  hue: string;
  thanks: string | null;
  slug: string;
  status: string;
  submissionLimit: number | null;
  archivedAt: string | null;
  fields: FormFieldDef[];
  problems: string[];
}

/** The icon that names each kind, the same one in the pill and in the Add row. */
const KIND_ICON: Record<FormFieldKind, React.ElementType> = {
  text: Type,
  long_text: AlignLeft,
  email: Mail,
  phone: Phone,
  select: CircleDot,
  multi_select: SquareCheck,
  date: Calendar,
  number: Hash,
  checkbox: ToggleLeft,
  file: Paperclip,
  section: Heading,
};

/**
 * R4.1, R4.4. What the Add row offers, in the order the design puts them.
 *
 * A name is two questions rather than one, because a directory holds a first
 * name and a surname and a single box asking for "name" produces records that
 * cannot be sorted or searched. Adding it adds both, already pointed at the
 * record, which is the common case done in one press.
 *
 * `target` is what the answer becomes on a person's record. Where an answer can
 * only ever be one thing, it is set here and the church never has to think
 * about it: an email question is an email address and nothing else.
 */
interface Addable {
  key: string;
  icon: React.ElementType;
  /** The questions this press adds, in order. */
  questions: { kind: FormFieldKind; labelKey: string; target?: string }[];
}

const ADDABLE: Addable[] = [
  {
    key: "name",
    icon: User,
    questions: [
      { kind: "text", labelKey: "form.target.first_name", target: "first_name" },
      { kind: "text", labelKey: "form.target.last_name", target: "last_name" },
    ],
  },
  { key: "email", icon: Mail, questions: [{ kind: "email", labelKey: "form.kind.email", target: "email" }] },
  { key: "phone", icon: Phone, questions: [{ kind: "phone", labelKey: "form.kind.phone", target: "phone" }] },
  { key: "text", icon: Type, questions: [{ kind: "text", labelKey: "form.kind.text" }] },
  { key: "long_text", icon: AlignLeft, questions: [{ kind: "long_text", labelKey: "form.kind.long_text" }] },
  { key: "select", icon: CircleDot, questions: [{ kind: "select", labelKey: "form.kind.select" }] },
  { key: "multi_select", icon: SquareCheck, questions: [{ kind: "multi_select", labelKey: "form.kind.multi_select" }] },
  { key: "date", icon: Calendar, questions: [{ kind: "date", labelKey: "form.kind.date" }] },
  { key: "file", icon: Paperclip, questions: [{ kind: "file", labelKey: "form.kind.file" }] },
];

/** Radix cannot hold an empty value, so "no field" needs a name of its own. */
const NOTHING = "nothing";

/** A question that types an answer on one line. */
const ONE_LINE: FormFieldKind[] = ["text", "email", "phone", "date", "number"];

/**
 * R4.1, R4.2, R4.9. Writing the questions, with the form itself alongside.
 *
 * Built to docs/redesign/design: the questions down the left, each one its own
 * card carrying what it asks and how, and what the congregation will meet down
 * the right. A church writing a form is writing something members read once and
 * never ask about, so seeing it as they will see it beats any description of it.
 */
export function Builder({
  church,
  form,
  view,
  responses,
  page,
  perPage,
  total,
  personFields,
  coverUrl,
}: {
  church: string;
  form: BuilderForm;
  view: "questions" | "responses";
  responses: SubmissionRow[];
  page: number;
  perPage: number;
  total: number;
  /** R4.4. The church's own person fields, as answers can be saved onto them. */
  personFields: { id: string; label: string }[];
  /** R4.1. The cover, signed, because the bucket is private. */
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(form.name);
  const [copied, setCopied] = React.useState<"link" | "embed" | null>(null);

  // The origin is read after mount, because the server does not have one and a
  // link rendered from nothing would not match on hydration.
  const [origin, setOrigin] = React.useState("");
  React.useEffect(() => setOrigin(window.location.origin), []);

  // Dragged and dropped-on, by question id, so the list can show where a
  // question will land before the drop happens.
  const [held, setHeld] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const drop = (onto: string) => {
    const from = form.fields.findIndex((one) => one.id === held);
    const to = form.fields.findIndex((one) => one.id === onto);
    setHeld(null);
    setOver(null);
    if (from === -1 || to === -1 || from === to) return;

    const ids = form.fields.map((one) => one.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved!);
    run(() => orderQuestions(form.id, ids, church));
  };

  const shift = (id: string, direction: "up" | "down") =>
    run(() => shiftQuestion(form.id, id, direction, church));

  /*
   * R4.3. The public link, and the snippet that puts the same form inside the
   * church's own page.
   *
   * Built from the window rather than from a configured base URL, so the link
   * a church copies is the one they are looking at: a church on a preview
   * deployment gets the preview link rather than a production link that does
   * not hold their form yet.
   */
  const publicLink = origin ? `${origin}/f/${church}/${form.slug}` : "";
  const snippet = publicLink
    ? `<iframe src="${publicLink}/embed" title="${form.name}" width="100%" height="720" `
      + `style="border:0" loading="lazy"></iframe>`
    : "";

  const copy = async (text: string, what: "link" | "embed") => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("form.failed")}>{error}</Banner> : null}

      <FormViews view={view} />

      {/* The name is written where it is read, at 28px in Fraunces over a
          dashed rule that says it can be typed in. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== form.name) {
              run(() => saveForm(form.id, { name: name.trim() }, church));
            }
          }}
          aria-label={t("form.name")}
          autoComplete="off"
          className="min-w-0 flex-[1_1_300px] border-b border-dashed border-line-strong bg-transparent py-0.5 font-display text-[22px] leading-[28px] text-fg outline-none focus-visible:border-primary"
        />

        <StatusSwitch
          status={form.archivedAt ? "archived" : form.status}
          disabled={pending || Boolean(form.archivedAt)}
          onPick={(next) => run(() => openOrClose(form.id, next, church))}
        />

        {/* R4.3. A draft has no public link, so neither action is offered
            until the form has been opened at least once. */}
        {form.status === "draft" || form.archivedAt ? null : (
          <>
            <button
              type="button"
              onClick={() => copy(publicLink, "link")}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border px-3.5 text-label font-medium",
                copied === "link"
                  ? "border-[var(--hue-fern-500)] bg-[var(--hue-fern-tint)] text-[var(--hue-fern-key)]"
                  : "border-line-strong bg-surface text-fg hover:bg-sunken",
              )}
            >
              {copied === "link" ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Link2 className="size-4" aria-hidden />
              )}
              {copied === "link" ? t("form.linkCopied") : t("form.copyLink")}
            </button>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3.5 text-label font-medium text-fg hover:bg-sunken"
                >
                  <Code className="size-4" aria-hidden />
                  {t("form.embed")}
                </button>
              </DialogTrigger>
              <DialogContent title={t("form.embedTitle")} closeLabel={t("common.close")}>
                <pre className="overflow-x-auto rounded-lg border border-line bg-sunken p-3.5 text-[12px] leading-5 text-fg">
                  <code>{snippet}</code>
                </pre>
                <DialogFooter>
                  <Button type="button" onClick={() => copy(snippet, "embed")}>
                    {copied === "embed" ? <Check className="size-4" aria-hidden /> : null}
                    {copied === "embed" ? t("form.linkCopied") : t("form.copySnippet")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* R4.1. Archiving is the third state, for a form a church is done
            with. Bringing one back needs no asking, so only the putting away
            is confirmed, and it ends on the Forms list where the form now
            is not. */}
        {form.archivedAt ? (
          <IconButton
            label={t("form.restore")}
            disabled={pending}
            onClick={() => run(() => archiveForm(form.id, false, church))}
          >
            <ArchiveRestore />
          </IconButton>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <IconButton label={t("form.archive")} disabled={pending}>
                <Archive />
              </IconButton>
            </DialogTrigger>
            <DialogContent
              title={t("form.archiveTitle", { name: form.name })}
              closeLabel={t("common.close")}
            >
              <p className="text-[length:var(--d-text-body)] text-fg">
                {t("form.archiveBody")}
              </p>
              <DialogFooter>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await archiveForm(form.id, true, church);
                      if (result.error) setError(result.error);
                      else router.push(`/forms?church=${church}`);
                    })}
                >
                  {t("form.archive")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {view === "responses" ? (
        <Responses
          church={church}
          formId={form.id}
          fields={form.fields}
          rows={responses}
          page={page}
          perPage={perPage}
          total={total}
        />
      ) : (
      <>
      <FormCover
        church={church}
        formId={form.id}
        hue={form.hue}
        coverUrl={coverUrl}
      />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_440px] flex-col gap-2.5">
          <span className="hidden items-center gap-1.5 text-[12px] text-fg-subtle sm:flex">
            <GripVertical className="size-3.5" aria-hidden />
            {t("form.reorder")}
          </span>

          {form.fields.map((field) => (
            <Question
              key={field.id}
              church={church}
              formId={form.id}
              field={field}
              personFields={personFields}
              pending={pending}
              held={held === field.id}
              over={over === field.id}
              first={form.fields[0]?.id === field.id}
              last={form.fields[form.fields.length - 1]?.id === field.id}
              onHold={() => setHeld(field.id)}
              onOver={() => setOver(field.id)}
              onDrop={() => drop(field.id)}
              onShift={(direction) => shift(field.id, direction)}
              onDone={() => router.refresh()}
              onError={setError}
            />
          ))}

          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            <span className="mr-1 text-label font-bold text-primary">
              {t("form.addLabel")}
            </span>
            {ADDABLE.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.key}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      for (const question of entry.questions) {
                        const result = await saveQuestion(
                          form.id,
                          null,
                          {
                            kind: question.kind,
                            label: t(question.labelKey as never),
                            required: false,
                            options: NEEDS_OPTIONS.includes(question.kind)
                              ? [`${t("form.newChoice")} 1`, `${t("form.newChoice")} 2`]
                              : null,
                            mapsTo: question.target ?? null,
                          },
                          church,
                        );
                        if (result.error) return result;
                      }
                      return {};
                    })}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface px-3 text-label font-medium text-fg hover:bg-sunken"
                >
                  <Icon className="size-3.5" aria-hidden />
                  {t(`form.add.${entry.key}` as never)}
                </button>
              );
            })}
          </div>
        </div>

        {/* The rule separates what is being written from what it will read
            as, so the two columns are not mistaken for one list. */}
        <aside className="sticky top-21 flex flex-[1_1_300px] flex-col gap-2 border-line md:border-l md:pl-6">
          <span className="text-[12px] font-medium text-fg-subtle">{t("form.preview")}</span>
          <div className="flex flex-col gap-4 overflow-hidden rounded-[14px] border border-line bg-surface">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="aspect-[6/1] w-full object-cover" />
            ) : (
              <span
                aria-hidden
                className="h-2 w-full"
                style={{ background: `var(--hue-${form.hue}-500)` }}
              />
            )}

            <div className="flex flex-col gap-4 px-[22px] pt-0 pb-[22px]">
            <span className="font-display text-[22px] leading-7 text-fg">{name}</span>

            {form.intro ? (
              <p className="text-[length:var(--d-text-body)] text-fg-muted">{form.intro}</p>
            ) : null}

            {form.fields.map((field) => (
              <AsRead key={field.id} field={field} />
            ))}

            <span className="grid h-10 place-items-center rounded-[10px] bg-primary font-semibold text-primary-fg">
              {t("form.send")}
            </span>
            </div>
          </div>
        </aside>
      </div>
      </>
      )}
    </div>
  );
}

/** R4.1. Open or closed, the two states a church switches between. */
function StatusSwitch({
  status,
  disabled,
  onPick,
}: {
  status: string;
  disabled: boolean;
  onPick: (next: "open" | "closed") => void;
}) {
  return (
    <div className="flex rounded-[10px] bg-line p-[3px]">
      {(["open", "closed"] as const).map((one) => (
        <button
          key={one}
          type="button"
          disabled={disabled}
          aria-pressed={status === one}
          onClick={() => onPick(one)}
          className={cn(
            "h-9 cursor-pointer rounded-[7px] px-3.5 text-label font-medium sm:h-[30px]",
            status === one ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
          )}
        >
          {t(`form.status.${one}` as never)}
        </button>
      ))}
    </div>
  );
}

/**
 * R4.1. One question, written in place.
 *
 * What is asked is typed on the row itself. Everything a form builder normally
 * buries in a dialog, what kind it is, whether it has to be answered, what the
 * choices are, is on the card, because a church writing six questions should
 * not open six dialogs.
 */
function Question({
  church,
  formId,
  field,
  personFields,
  pending,
  held,
  over,
  first,
  last,
  onHold,
  onOver,
  onDrop,
  onShift,
  onDone,
  onError,
}: {
  church: string;
  formId: string;
  field: FormFieldDef;
  personFields: { id: string; label: string }[];
  pending: boolean;
  held: boolean;
  over: boolean;
  /** Where it sits, so the end of the run cannot be moved past. */
  first: boolean;
  last: boolean;
  onHold: () => void;
  onOver: () => void;
  onDrop: () => void;
  onShift: (direction: "up" | "down") => void;
  onDone: () => void;
  onError: (message?: string) => void;
}) {
  const [label, setLabel] = React.useState(field.label);
  const [help, setHelp] = React.useState(field.help ?? "");
  const [options, setOptions] = React.useState(field.options ?? []);
  // Each question writes itself as it is changed, so the row owns the flag for
  // its own write rather than reading the page's.
  const [writing, startWriting] = React.useTransition();
  const [kept, setKept] = React.useState(false);
  const busy = pending || writing;
  const Icon = KIND_ICON[field.kind];
  const wantsOptions = NEEDS_OPTIONS.includes(field.kind);

  /*
   * The core fields this kind of answer can hold, then the church's own. An
   * email question can only ever be an email address, so the list is short and
   * nothing in it can be wrong.
   */
  const targets = field.kind === "section"
    ? []
    : [
        ...targetsFor(field.kind).map((one) => ({
          value: one,
          label: t(`form.target.${one}` as never),
        })),
        ...personFields.map((one) => ({
          value: `${CUSTOM_TARGET}${one.id}`,
          label: one.label,
        })),
      ];

  React.useEffect(() => setLabel(field.label), [field.label]);
  React.useEffect(() => setHelp(field.help ?? ""), [field.help]);
  React.useEffect(() => setOptions(field.options ?? []), [field.options]);

  /*
   * "Saved" answers a press that already worked, so it goes the way the
   * confirmation banner in components/said.tsx goes: five seconds, then off
   * the row. Left up, it reads as a label on the question rather than an
   * answer to something the writer just did.
   */
  React.useEffect(() => {
    if (!kept) return;
    const timer = window.setTimeout(() => setKept(false), 5000);
    return () => window.clearTimeout(timer);
  }, [kept]);

  const save = (changes: {
    label?: string;
    required?: boolean;
    options?: string[];
    mapsTo?: string | null;
    maxFiles?: number;
    fileKinds?: string;
    help?: string | null;
  }) =>
    startWriting(async () => {
      // Cleared first, so a second write that works gets its own five seconds
      // rather than inheriting what is left of the last one's.
      setKept(false);
      const result = await saveQuestion(
        formId,
        field.id,
        {
          kind: field.kind,
          label: changes.label ?? label,
          required: changes.required ?? field.required,
          options: wantsOptions ? (changes.options ?? options) : null,
          showWhen: field.showWhen ?? null,
          help: changes.help === undefined ? (field.help ?? null) : changes.help,
          mapsTo: changes.mapsTo === undefined ? (field.mapsTo ?? null) : changes.mapsTo,
          maxFiles: changes.maxFiles ?? field.maxFiles ?? 1,
          fileKinds: changes.fileKinds ?? field.fileKinds ?? "any",
        },
        church,
      );
      onError(result.error);
      setKept(!result.error);
      if (!result.error) onDone();
    });

  return (
    <div
      draggable
      onDragStart={onHold}
      onDragOver={(e) => {
        e.preventDefault();
        onOver();
      }}
      onDrop={onDrop}
      onDragEnd={onDrop}
      className={cn(
        "flex gap-2.5 rounded-xl border bg-surface px-3.5 py-3",
        over ? "border-primary" : "border-line",
        held && "opacity-50",
      )}
    >
      {/* R4.1, R24.6. The handle is for a mouse. The pair under it is how a
          question moves on a phone, where nothing can be dragged. */}
      <span className="flex shrink-0 flex-col items-center">
        <GripVertical
          className="mt-2 hidden size-4 cursor-grab text-fg-subtle sm:block"
          aria-hidden
        />
        <IconButton
          label={t("form.up")}
          variant="ghost"
          disabled={busy || first}
          className="size-8 min-h-0 [&_svg]:size-4"
          onClick={() => onShift("up")}
        >
          <ChevronUp />
        </IconButton>
        <IconButton
          label={t("form.down")}
          variant="ghost"
          disabled={busy || last}
          className="size-8 min-h-0 [&_svg]:size-4"
          onClick={() => onShift("down")}
        >
          <ChevronDown />
        </IconButton>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-sunken px-2 py-0.5 text-[12px] font-medium text-fg-muted">
            <Icon className="size-3" aria-hidden />
            {t(`form.kind.${field.kind}` as never)}
          </span>
          <span className="flex-1" />

          {field.kind === "section" ? null : (
            <button
              type="button"
              disabled={busy}
              aria-pressed={field.required}
              onClick={() => save({ required: !field.required })}
              className={cn(
                "flex h-7 cursor-pointer items-center gap-1.5 px-2 text-[12px] font-medium",
                field.required ? "text-fg" : "text-fg-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded-[4px]",
                  field.required
                    ? "bg-primary text-primary-fg"
                    : "border border-line-strong text-transparent",
                )}
              >
                <Check className="size-2.5" aria-hidden />
              </span>
              {t("form.required")}
            </button>
          )}

          {/* It saves itself as it is changed, so it says where that has got
              to. */}
          <span role="status" className="text-caption text-fg-subtle">
            {writing ? t("action.saving") : kept ? t("common.saved") : ""}
          </span>

          <IconButton
            label={t("form.remove")}
            disabled={busy}
            onClick={() =>
              startWriting(async () => {
                const result = await dropQuestion(field.id, church);
                onError(result.error);
                if (!result.error) onDone();
              })}
          >
            {writing ? <Spinner label={t("form.remove")} /> : <Trash2 />}
          </IconButton>
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label.trim() && label !== field.label) save({ label: label.trim() });
          }}
          aria-label={t("form.question")}
          autoComplete="off"
          className="h-9.5 rounded-lg border border-line bg-canvas px-2.5 font-medium text-fg outline-none focus-visible:border-primary"
        />

        {/* R4.1. The church's own words under its own question. A question
            asking for a dedication photo needs to say what the photo is for and
            what to call the file, and only the church knows that. */}
        {field.kind !== "section" ? (
          <textarea
            value={help}
            onChange={(e) => setHelp(e.target.value)}
            onBlur={() => {
              const next = help.trim();
              if (next !== (field.help ?? "")) save({ help: next || null });
            }}
            rows={help.trim() ? 2 : 1}
            aria-label={t("form.help")}
            placeholder={t("form.help")}
            className="resize-y rounded-lg border border-line bg-canvas px-2.5 py-2 text-[13px] text-fg-muted outline-none placeholder:text-fg-subtle placeholder:italic focus-visible:border-primary"
          />
        ) : null}

        {/* R4.4. Where this answer goes on the person's record. A church
            writes its questions in its own words, so the words cannot be read
            for meaning and the question is asked here once. */}
        {targets.length > 0 ? (
          <label className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-fg-subtle">
            {t("form.mapsTo")}
            <Select
              value={field.mapsTo ?? NOTHING}
              onValueChange={(next) => save({ mapsTo: next === NOTHING ? null : next })}
              disabled={busy}
            >
              <SelectTrigger className="h-8 min-h-0 w-auto min-w-[160px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOTHING}>{t("form.mapsTo.none")}</SelectItem>
                {targets.map((one) => (
                  <SelectItem key={one.value} value={one.value}>
                    {one.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        {/* R4.1. How many files this question takes, and of what kind. A
            church asking for a dedication photo and one asking for three
            children's pictures are the same question with a different number
            on it. */}
        {field.kind === "file" ? (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[12px] font-medium text-fg-subtle">
              {t("form.files.howMany")}
              <Input
                type="number"
                min={1}
                max={FILES_CEILING}
                defaultValue={field.maxFiles ?? 1}
                disabled={busy}
                onBlur={(e) => {
                  const next = Math.min(FILES_CEILING, Math.max(1, Number(e.target.value) || 1));
                  e.target.value = String(next);
                  if (next !== (field.maxFiles ?? 1)) save({ maxFiles: next });
                }}
                className="h-8 min-h-0 w-20 text-[13px]"
              />
            </label>

            <label className="flex items-center gap-2 text-[12px] font-medium text-fg-subtle">
              {t("form.files.kind")}
              <Select
                value={field.fileKinds ?? "any"}
                onValueChange={(next) => save({ fileKinds: next })}
                disabled={busy}
              >
                <SelectTrigger className="h-8 min-h-0 w-auto min-w-[140px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_KINDS.map((one) => (
                    <SelectItem key={one} value={one}>
                      {t(`form.files.${one}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        ) : null}

        {wantsOptions ? (
          <div className="flex flex-wrap gap-1.5">
            {options.map((option, at) => (
              <span
                key={at}
                className="flex items-center gap-1 rounded-full border border-line-strong py-0.5 pr-1 pl-2.5 text-[12px]"
              >
                <input
                  value={option}
                  size={Math.max(option.length, 4)}
                  onChange={(e) =>
                    setOptions(options.map((one, i) => (i === at ? e.target.value : one)))}
                  onBlur={() => {
                    const tidy = options.map((one) => one.trim()).filter(Boolean);
                    if (tidy.join("\u0000") !== (field.options ?? []).join("\u0000")) {
                      save({ options: tidy });
                    }
                  }}
                  aria-label={t("form.choices")}
                  autoComplete="off"
                  className="min-w-6 bg-transparent text-[12px] text-fg outline-none"
                />
                <IconButton
                  label={t("form.removeChoice", { label: option })}
                  className="size-5 min-h-0 [&_svg]:size-3"
                  disabled={busy || options.length <= 1}
                  onClick={() => save({ options: options.filter((_, i) => i !== at) })}
                >
                  <X />
                </IconButton>
              </span>
            ))}

            <button
              type="button"
              disabled={busy}
              onClick={() =>
                save({ options: [...options, `${t("form.newChoice")} ${options.length + 1}`] })}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[12px] font-medium text-fg-muted hover:text-fg"
            >
              <Plus className="size-3" aria-hidden />
              {t("form.addChoice")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** R4.1. One question as its reader meets it: the words, and the room to answer. */
function AsRead({ field }: { field: FormFieldDef }) {
  if (field.kind === "section") {
    return <span className="font-display text-[18px] text-fg">{field.label}</span>;
  }

  const options = field.options ?? [];

  return (
    <div className="flex flex-col gap-1.5 text-label font-medium text-fg">
      <span>
        {field.label}
        {field.required ? <span className="text-danger-text"> *</span> : null}
      </span>

      {field.help ? (
        <span className="text-caption leading-5 font-normal text-fg-muted">{field.help}</span>
      ) : null}

      {ONE_LINE.includes(field.kind) ? (
        <span className="h-9 rounded-lg border border-line-strong" />
      ) : null}

      {field.kind === "long_text" ? (
        <span className="h-18 rounded-lg border border-line-strong" />
      ) : null}

      {field.kind === "file" ? (
        <span className="flex flex-col gap-1 font-normal">
          <span className="h-9 w-36 rounded-lg border border-dashed border-line-strong" />
          <span className="text-caption text-fg-subtle">
            {plural("form.files.limit", field.maxFiles ?? 1, {
              count: field.maxFiles ?? 1,
              size: `${Math.round(UPLOAD_RULES.form_answer.maxBytes / ONE_MIB)} MB`,
            })}
          </span>
        </span>
      ) : null}

      {options.length > 0 ? (
        <div className="flex flex-col gap-1.5 font-normal">
          {options.map((option) => (
            <span key={option} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-3.5 shrink-0 border border-line-strong",
                  field.kind === "select" ? "rounded-full" : "rounded-[4px]",
                )}
              />
              {option}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
