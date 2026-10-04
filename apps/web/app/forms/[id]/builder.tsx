"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Type, AlignLeft, Mail, Phone, CircleDot, SquareCheck, Calendar,
  GripVertical, Trash2, Check, Link2, Hash, ToggleLeft, Paperclip, Heading, Plus, X,
  Archive, ArchiveRestore,
} from "lucide-react";
import {
  Banner, Button, IconButton, cn,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { NEEDS_OPTIONS, type FormFieldDef, type FormFieldKind } from "@hearth/db/rules";
import {
  saveForm, openOrClose, archiveForm, saveQuestion, dropQuestion, orderQuestions,
} from "../actions";
import { FormViews } from "./views";
import { Responses, type SubmissionRow } from "./responses";

export interface BuilderForm {
  id: string;
  name: string;
  intro: string | null;
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

/** R4.1. The seven a church reaches for, in the order the design puts them. */
const ADDABLE: FormFieldKind[] = [
  "text", "long_text", "email", "phone", "select", "multi_select", "date",
];

/** A question that types an answer on one line. */
const ONE_LINE: FormFieldKind[] = ["text", "email", "phone", "date", "number"];

/**
 * R4.1, R4.2, R4.9. Writing the questions, with the form itself alongside.
 *
 * Built to docs/redesign/design: the questions down the left, each one its own
 * card carrying what it asks and how, and what the congregation will meet down
 * the right. A church writing a form is writing something people read once and
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
}: {
  church: string;
  form: BuilderForm;
  view: "questions" | "responses";
  responses: SubmissionRow[];
  page: number;
  perPage: number;
  total: number;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(form.name);
  const [copied, setCopied] = React.useState(false);

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

  const copyLink = async () => {
    const link = `${window.location.origin}/f/${form.slug}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
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
          className="min-w-0 flex-[1_1_300px] border-b border-dashed border-line-strong bg-transparent py-0.5 font-display text-[28px] leading-[34px] text-fg outline-none focus-visible:border-primary"
        />

        <StatusSwitch
          status={form.archivedAt ? "archived" : form.status}
          disabled={pending || Boolean(form.archivedAt)}
          onPick={(next) => run(() => openOrClose(form.id, next, church))}
        />

        <button
          type="button"
          onClick={copyLink}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3.5 text-label font-medium text-fg hover:bg-sunken"
        >
          <Link2 className="size-4" aria-hidden />
          {copied ? t("form.linkCopied") : t("form.copyLink")}
        </button>

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
          fields={form.fields}
          rows={responses}
          page={page}
          perPage={perPage}
          total={total}
        />
      ) : (
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_440px] flex-col gap-2.5">
          <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
            <GripVertical className="size-3.5" aria-hidden />
            {t("form.reorder")}
          </span>

          {form.fields.map((field) => (
            <Question
              key={field.id}
              church={church}
              formId={form.id}
              field={field}
              pending={pending}
              held={held === field.id}
              over={over === field.id}
              onHold={() => setHeld(field.id)}
              onOver={() => setOver(field.id)}
              onDrop={() => drop(field.id)}
              onDone={() => router.refresh()}
              onError={setError}
            />
          ))}

          <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
            <span className="mr-1 text-label font-medium text-fg-muted">
              {t("form.addLabel")}
            </span>
            {ADDABLE.map((kind) => {
              const Icon = KIND_ICON[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      saveQuestion(
                        form.id,
                        null,
                        {
                          kind,
                          label: t(`form.kind.${kind}` as never),
                          required: false,
                          options: NEEDS_OPTIONS.includes(kind)
                            ? [`${t("form.newChoice")} 1`, `${t("form.newChoice")} 2`]
                            : null,
                        },
                        church,
                      ),
                    )}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface px-3 text-label font-medium text-fg hover:bg-sunken"
                >
                  <Icon className="size-3.5" aria-hidden />
                  {t(`form.kind.${kind}` as never)}
                </button>
              );
            })}
          </div>
        </div>

        {/* The rule separates what is being written from what it will read
            as, so the two columns are not mistaken for one list. */}
        <aside className="sticky top-21 flex flex-[1_1_300px] flex-col gap-2 border-line md:border-l md:pl-6">
          <span className="text-[12px] font-medium text-fg-subtle">{t("form.preview")}</span>
          <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-[22px]">
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
        </aside>
      </div>
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
            "h-[30px] cursor-pointer rounded-[7px] px-3.5 text-label font-medium",
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
  pending,
  held,
  over,
  onHold,
  onOver,
  onDrop,
  onDone,
  onError,
}: {
  church: string;
  formId: string;
  field: FormFieldDef;
  pending: boolean;
  held: boolean;
  over: boolean;
  onHold: () => void;
  onOver: () => void;
  onDrop: () => void;
  onDone: () => void;
  onError: (message?: string) => void;
}) {
  const [label, setLabel] = React.useState(field.label);
  const [options, setOptions] = React.useState(field.options ?? []);
  const Icon = KIND_ICON[field.kind];
  const wantsOptions = NEEDS_OPTIONS.includes(field.kind);

  React.useEffect(() => setLabel(field.label), [field.label]);
  React.useEffect(() => setOptions(field.options ?? []), [field.options]);

  const save = (changes: { label?: string; required?: boolean; options?: string[] }) =>
    void saveQuestion(
      formId,
      field.id,
      {
        kind: field.kind,
        label: changes.label ?? label,
        help: field.help,
        required: changes.required ?? field.required,
        options: wantsOptions ? (changes.options ?? options) : null,
        showWhen: field.showWhen ?? null,
      },
      church,
    ).then((result) => {
      onError(result.error);
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
      <GripVertical
        className="mt-2 size-4 shrink-0 cursor-grab text-fg-subtle"
        aria-hidden
      />

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
              disabled={pending}
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

          <IconButton
            label={t("form.remove")}
            disabled={pending}
            onClick={() =>
              void dropQuestion(field.id, church).then((result) => {
                onError(result.error);
                if (!result.error) onDone();
              })}
          >
            <Trash2 />
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
                  disabled={pending || options.length <= 1}
                  onClick={() => save({ options: options.filter((_, i) => i !== at) })}
                >
                  <X />
                </IconButton>
              </span>
            ))}

            <button
              type="button"
              disabled={pending}
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

      {ONE_LINE.includes(field.kind) ? (
        <span className="h-9 rounded-lg border border-line-strong" />
      ) : null}

      {field.kind === "long_text" ? (
        <span className="h-18 rounded-lg border border-line-strong" />
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
