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
  FORM_FIELD_KINDS, NEEDS_OPTIONS, CONDITION_OPS, OPS_NEED_VALUE,
  visibleFields, conditionProblem,
  type ConditionOp, type FormAnswer, type FormCondition, type FormFieldDef,
  type FormFieldKind,
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
 * R4.1, R4.2, R4.9. Writing the questions.
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
                    {field.showWhen ? (
                      <ConditionLine fields={form.fields} field={field} />
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
                      earlier={form.fields.slice(0, i)}
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
            earlier={form.fields}
            trigger={<Button variant="secondary"><Plus /> {t("form.add")}</Button>}
          />
          <QuestionDialog
            church={church}
            formId={form.id}
            section
            earlier={form.fields}
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

/** R4.2. The one line that says what a question is waiting on. */
function ConditionLine({ fields, field }: { fields: FormFieldDef[]; field: FormFieldDef }) {
  const condition = field.showWhen!;
  const controller = fields.find((one) => one.id === condition.fieldId);
  const problem = conditionProblem(fields, field);

  const words = OPS_NEED_VALUE.includes(condition.op)
    ? t("form.shownWhen", {
        label: controller?.label ?? "",
        op: t(`form.condition.${condition.op}` as never),
        value: condition.value ?? "",
      })
    : t("form.shownWhenPlain", {
        label: controller?.label ?? "",
        op: t(`form.condition.${condition.op}` as never),
      });

  return (
    <span className={problem ? "text-caption text-danger-text" : "text-caption text-fg-muted"}>
      {problem ? t(problem as never) : words}
    </span>
  );
}

/**
 * R4.1, R4.2. The form as its reader will meet it, answerable.
 *
 * It takes answers because a condition cannot be previewed without one. A
 * church writing "show these three when somebody says yes" wants to say yes
 * here and watch the three appear, which is the only way to be sure the branch
 * is the one they meant.
 */
function Preview({ form }: { form: BuilderForm }) {
  const [answers, setAnswers] = React.useState<Record<string, FormAnswer>>({});
  const set = (id: string, answer: FormAnswer) =>
    setAnswers((was) => ({ ...was, [id]: answer }));

  const shown = visibleFields(form.fields, answers);

  return (
    <div className="flex flex-col gap-4">
      {form.intro ? (
        <p className="text-[length:var(--d-text-body)] text-fg">{form.intro}</p>
      ) : null}

      {shown.map((field) => {
        if (field.kind === "section") {
          return (
            <h3 key={field.id} className="mt-2 font-display text-heading text-fg">
              {field.label}
            </h3>
          );
        }

        const answer = answers[field.id] ?? null;

        return (
          <Field key={field.id} label={field.label} required={field.required} hint={field.help ?? undefined}>
            {field.kind === "long_text" ? (
              <Textarea
                rows={3}
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => set(field.id, e.target.value)}
              />
            ) : field.kind === "checkbox" ? (
              <Checkbox
                checked={answer === true}
                onCheckedChange={(on) => set(field.id, on === true)}
              />
            ) : field.kind === "multi_select" ? (
              <span className="flex flex-col gap-2">
                {(field.options ?? []).map((option) => {
                  const picked = Array.isArray(answer) ? answer : [];
                  return (
                    <label key={option} className="flex cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={picked.includes(option)}
                        onCheckedChange={(on) =>
                          set(
                            field.id,
                            on === true
                              ? [...picked, option]
                              : picked.filter((one) => one !== option),
                          )
                        }
                      />
                      <span className="text-[length:var(--d-text-body)] text-fg">{option}</span>
                    </label>
                  );
                })}
              </span>
            ) : field.kind === "select" ? (
              <Select
                value={typeof answer === "string" ? answer : undefined}
                onValueChange={(next) => set(field.id, next)}
              >
                <SelectTrigger aria-label={field.label}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.kind === "file" ? (
              <Input type="file" disabled />
            ) : (
              <Input
                type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
                value={typeof answer === "string" || typeof answer === "number" ? String(answer) : ""}
                onChange={(e) => set(field.id, e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

/**
 * R4.1, R4.2. One question: what is asked, how, whether it has to be answered,
 * and what has to be true earlier for it to be asked at all.
 */
function QuestionDialog({
  church,
  formId,
  field,
  earlier,
  section,
  trigger,
}: {
  church: string;
  formId: string;
  field?: FormFieldDef;
  /** R4.2. The questions this one can wait on: the ones read before it. */
  earlier: FormFieldDef[];
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

  const [on, setOn] = React.useState(field?.showWhen?.fieldId ?? "");
  const [op, setOp] = React.useState<ConditionOp>(field?.showWhen?.op ?? "is");
  const [answer, setAnswer] = React.useState(field?.showWhen?.value ?? "");

  const wantsOptions = NEEDS_OPTIONS.includes(kind);

  // A heading has no answer, so nothing can be waiting on one.
  const candidates = earlier.filter((one) => one.kind !== "section");
  const controller = candidates.find((one) => one.id === on);
  const wantsAnswer = OPS_NEED_VALUE.includes(op);

  const showWhen: FormCondition | null = on
    ? { fieldId: on, op, value: wantsAnswer ? answer : null }
    : null;

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
          showWhen,
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
          setOn("");
          setAnswer("");
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

          {candidates.length > 0 ? (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <span className="text-label text-fg">{t("form.showWhen")}</span>

                <div className="flex flex-col gap-1.5">
                  <Select value={on || "always"} onValueChange={(next) => setOn(next === "always" ? "" : next)}>
                    <SelectTrigger aria-label={t("form.condition.field")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">{t("form.showAlways")}</SelectItem>
                      {candidates.map((one) => (
                        <SelectItem key={one.id} value={one.id}>{one.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {on ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Select value={op} onValueChange={(next) => setOp(next as ConditionOp)}>
                        <SelectTrigger aria-label={t("form.condition.op")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {t(`form.condition.${option}` as never)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {wantsAnswer ? (
                      controller && NEEDS_OPTIONS.includes(controller.kind) ? (
                        <Select value={answer || undefined} onValueChange={setAnswer}>
                          <SelectTrigger aria-label={t("form.condition.value")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(controller.options ?? []).map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          aria-label={t("form.condition.value")}
                          autoComplete="off"
                        />
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

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
