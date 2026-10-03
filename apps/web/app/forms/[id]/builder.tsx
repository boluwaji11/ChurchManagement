"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Heading } from "lucide-react";
import {
  Badge, Banner, Button, Card, CardTitle, EmptyState, Field, IconButton, Input,
  Separator, Textarea, Checkbox,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import {
  FORM_FIELD_KINDS, NEEDS_OPTIONS, type FormFieldDef, type FormFieldKind,
} from "@hearth/db/rules";
import { saveForm, openOrClose, archiveForm, saveQuestion, dropQuestion, shiftQuestion } from "../actions";

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

/**
 * R4.1, R4.9. Writing the questions.
 *
 * The preview underneath is the point. A church writing a form is writing
 * something its congregation will read once and never ask about, so seeing it
 * as they will see it while writing beats any amount of description.
 */
export function Builder({ church, form }: { church: string; form: BuilderForm }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const [values, setValues] = React.useState({
    name: form.name,
    intro: form.intro ?? "",
    thanks: form.thanks ?? "",
    limit: form.submissionLimit === null ? "" : String(form.submissionLimit),
  });

  const run = (work: () => Promise<{ error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) {
        after?.();
        router.refresh();
      }
    });

  const save = () =>
    run(() =>
      saveForm(
        form.id,
        {
          name: values.name,
          intro: values.intro || null,
          thanks: values.thanks || null,
          submissionLimit: values.limit ? Number(values.limit) : null,
        },
        church,
      ),
    );

  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("form.failed")}>{error}</Banner> : null}

      {form.problems.length > 0 ? (
        <Banner tone="warning" title={t(form.problems[0] as never)} />
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{form.name}</CardTitle>
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={form.status === "open" ? "success" : "neutral"}>
              {t(`form.status.${form.status}` as never)}
            </Badge>

            {form.status === "open" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => openOrClose(form.id, "closed", church))}
              >
                {t("form.close")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pending || form.problems.length > 0}
                onClick={() => run(() => openOrClose(form.id, "open", church))}
              >
                {t("form.open")}
              </Button>
            )}
          </span>
        </div>
        <Separator className="my-4" />

        <div className="flex flex-col gap-4">
          <Field label={t("form.name")} required>
            <Input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              onBlur={save}
              autoComplete="off"
            />
          </Field>

          <Field label={t("form.intro")}>
            <Textarea
              rows={2}
              value={values.intro}
              onChange={(e) => setValues({ ...values, intro: e.target.value })}
              onBlur={save}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("form.thanks")}>
              <Input
                value={values.thanks}
                onChange={(e) => setValues({ ...values, thanks: e.target.value })}
                onBlur={save}
                autoComplete="off"
              />
            </Field>

            <Field label={t("form.limit")}>
              <Input
                type="number"
                min={1}
                value={values.limit}
                onChange={(e) => setValues({ ...values, limit: e.target.value })}
                onBlur={save}
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        {form.fields.length === 0 ? (
          <EmptyState title={t("form.noQuestions")} />
        ) : (
          <ul className="flex flex-col">
            {form.fields.map((field, i) => (
              <li key={field.id}>
                {i > 0 ? <Separator className="my-2" /> : null}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      {field.kind === "section" ? (
                        <Heading className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                      ) : null}
                      <span
                        className={
                          field.kind === "section"
                            ? "font-display text-heading text-fg"
                            : "text-[length:var(--d-text-body)] text-fg"
                        }
                      >
                        {field.label}
                      </span>
                      {field.required ? (
                        <span className="text-danger-text" aria-hidden>*</span>
                      ) : null}
                      <span className="text-caption text-fg-muted">
                        {t(`form.kind.${field.kind}` as never)}
                      </span>
                    </span>
                    {field.help ? (
                      <span className="text-caption text-fg-muted">{field.help}</span>
                    ) : null}
                    {field.options ? (
                      <span className="text-caption text-fg-subtle">
                        {field.options.join(", ")}
                      </span>
                    ) : null}
                  </span>

                  <span className="flex items-center gap-0.5">
                    <IconButton
                      label={t("form.up")}
                      disabled={pending || i === 0}
                      onClick={() => run(() => shiftQuestion(form.id, field.id, "up", church))}
                    >
                      <ChevronUp />
                    </IconButton>
                    <IconButton
                      label={t("form.down")}
                      disabled={pending || i === form.fields.length - 1}
                      onClick={() => run(() => shiftQuestion(form.id, field.id, "down", church))}
                    >
                      <ChevronDown />
                    </IconButton>

                    <QuestionDialog
                      church={church}
                      formId={form.id}
                      field={field}
                      trigger={<IconButton label={t("action.edit")}><Pencil /></IconButton>}
                    />

                    <Dialog>
                      <DialogTrigger asChild>
                        <IconButton label={t("form.remove")} disabled={pending}>
                          <Trash2 />
                        </IconButton>
                      </DialogTrigger>
                      <DialogContent
                        title={t("form.removeTitle", { label: field.label })}
                        closeLabel={t("common.close")}
                      >
                        <p className="text-[length:var(--d-text-body)] text-fg">
                          {t("form.removeBody")}
                        </p>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={pending}
                            onClick={() => run(() => dropQuestion(field.id, church))}
                          >
                            {t("form.remove")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <QuestionDialog
            church={church}
            formId={form.id}
            trigger={<Button variant="secondary"><Plus /> {t("form.add")}</Button>}
          />
          <QuestionDialog
            church={church}
            formId={form.id}
            section
            trigger={<Button variant="ghost"><Heading /> {t("form.addSection")}</Button>}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <CardTitle>{t("form.preview")}</CardTitle>
        <Separator />
        <Preview form={form} />
      </Card>

      <div>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => archiveForm(form.id, !form.archivedAt, church))}
        >
          {form.archivedAt ? t("form.restore") : t("form.archive")}
        </Button>
      </div>
    </div>
  );
}

/** R4.1. The form as its reader will meet it, updating as it is written. */
function Preview({ form }: { form: BuilderForm }) {
  return (
    <div className="flex flex-col gap-4">
      {form.intro ? (
        <p className="text-[length:var(--d-text-body)] text-fg">{form.intro}</p>
      ) : null}

      {form.fields.map((field) => {
        if (field.kind === "section") {
          return (
            <h3 key={field.id} className="mt-2 font-display text-heading text-fg">
              {field.label}
            </h3>
          );
        }

        return (
          <Field key={field.id} label={field.label} required={field.required}>
            {field.kind === "long_text" ? (
              <Textarea rows={3} readOnly />
            ) : field.kind === "checkbox" ? (
              <span className="flex items-center gap-3">
                <Checkbox disabled />
                <span className="text-caption text-fg-muted">{field.help ?? ""}</span>
              </span>
            ) : field.kind === "select" || field.kind === "multi_select" ? (
              <Select disabled>
                <SelectTrigger aria-label={field.label}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                readOnly
                type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : field.kind === "file" ? "file" : "text"}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

/** R4.1. One question: what is asked, how, and whether it has to be answered. */
function QuestionDialog({
  church,
  formId,
  field,
  section,
  trigger,
}: {
  church: string;
  formId: string;
  field?: FormFieldDef;
  section?: boolean;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const [kind, setKind] = React.useState<FormFieldKind>(
    field?.kind ?? (section ? "section" : "text"),
  );
  const [label, setLabel] = React.useState(field?.label ?? "");
  const [help, setHelp] = React.useState(field?.help ?? "");
  const [required, setRequired] = React.useState(field?.required ?? false);
  const [choices, setChoices] = React.useState((field?.options ?? []).join("\n"));

  const wantsOptions = NEEDS_OPTIONS.includes(kind);

  const submit = () =>
    startTransition(async () => {
      const result = await saveQuestion(
        formId,
        field?.id ?? null,
        {
          kind,
          label,
          help: help || null,
          required,
          options: wantsOptions ? choices.split("\n") : null,
        },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setOpen(false);
        if (!field) {
          setLabel("");
          setHelp("");
          setChoices("");
          setRequired(false);
        }
        router.refresh();
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={field ? field.label : section ? t("form.addSection") : t("form.add")}
        closeLabel={t("common.close")}
      >
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("form.failed")}>{error}</Banner> : null}

          {section && !field ? null : (
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("form.kind")}</span>
              <Select value={kind} onValueChange={(next) => setKind(next as FormFieldKind)}>
                <SelectTrigger aria-label={t("form.kind")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_FIELD_KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`form.kind.${option}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Field label={t("form.question")} required>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          {kind === "section" ? null : (
            <>
              <Field label={t("form.help")}>
                <Input
                  value={help}
                  onChange={(e) => setHelp(e.target.value)}
                  autoComplete="off"
                />
              </Field>

              {wantsOptions ? (
                <Field label={t("form.choices")} required>
                  <Textarea
                    rows={4}
                    value={choices}
                    onChange={(e) => setChoices(e.target.value)}
                  />
                </Field>
              ) : null}

              <label className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={required}
                  onCheckedChange={(on) => setRequired(on === true)}
                />
                <span className="text-[length:var(--d-text-body)] text-fg">
                  {t("form.required")}
                </span>
              </label>
            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={pending} onClick={submit}>
              {t("action.save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
