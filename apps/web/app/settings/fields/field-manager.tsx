"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Type, Hash, Calendar, List, ListChecks, ToggleLeft } from "lucide-react";
import {
  Banner, Button, IconButton, Input, Textarea, Field,
  Sheet, SheetTrigger, SheetContent,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { addField, saveField, removeField } from "../../fields/actions";

export interface FieldItem {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
}

const TYPES = [
  { value: "text", icon: Type },
  { value: "number", icon: Hash },
  { value: "date", icon: Calendar },
  { value: "select", icon: List },
  { value: "multi_select", icon: ListChecks },
  { value: "boolean", icon: ToggleLeft },
] as const;

type FieldTypeValue = (typeof TYPES)[number]["value"];
const isKnownType = (type: string): type is FieldTypeValue =>
  TYPES.some((x) => x.value === type);

/** An unknown type renders itself, so a new one is ugly rather than blank. */
const typeLabel = (type: string): string => (isKnownType(type) ? t(`fieldType.${type}`) : type);
const hasChoices = (type: string) => type === "select" || type === "multi_select";

/** The icon for the shape an answer takes, which reads faster than the word. */
const iconFor = (type: string) => TYPES.find((one) => one.value === type)?.icon ?? Type;

/**
 * R1.10. Every extra detail this church keeps on a person.
 *
 * A row per field: what it is called, the shape its answer takes, and the
 * choices where it offers any. The whole row opens it in the right-hand pane,
 * which is where everything else in the product is edited.
 */
export function FieldManager({
  church,
  fields,
  canManage,
}: {
  church: string;
  fields: FieldItem[];
  canManage: boolean;
}) {
  if (fields.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
      {fields.map((field) => {
        const Icon = iconFor(field.type);

        return (
          <div
            key={field.id}
            className="relative flex min-h-14 items-center gap-3 border-b border-sunken py-2 last:border-0"
          >
            {canManage ? (
              <FieldSheet church={church} field={field}>
                <button
                  type="button"
                  aria-label={t("fields.editOne", { name: field.label })}
                  className="absolute inset-0 cursor-pointer rounded-md"
                />
              </FieldSheet>
            ) : null}

            <span className="pointer-events-none relative grid size-9 shrink-0 place-items-center rounded-[10px] bg-sunken text-fg-muted">
              <Icon className="size-[18px]" aria-hidden />
            </span>

            <span className="pointer-events-none relative min-w-0 flex-1">
              <span className="block font-medium text-fg">{field.label}</span>
              {field.options ? (
                <span className="block truncate text-[12px] text-fg-subtle">
                  {field.options.join(", ")}
                </span>
              ) : null}
            </span>

            <span className="pointer-events-none relative flex h-6.5 shrink-0 items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg-muted">
              {typeLabel(field.type)}
            </span>
          </div>
        );
      })}
    </section>
  );
}

/** One choice per line. A textarea beats a repeating row builder for six items. */
function Choices({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label={t("fields.choices")}>
      <Textarea
        name="options"
        rows={4}
        defaultValue={defaultValue}
        placeholder={t("fields.choicesPlaceholder")}
      />
    </Field>
  );
}

/**
 * R1.10. A field's name, the shape of its answer, and its choices.
 *
 * Adding and editing ask the same thing, so they are the same pane. The type is
 * fixed once a field exists: answers are already stored against it, and turning
 * a date into a list would leave every one of them unreadable.
 */
function FieldSheet({
  church,
  field,
  children,
}: {
  church: string;
  /** The field being changed, or nothing when one is being added. */
  field?: FieldItem;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState(field?.type ?? "text");
  const [label, setLabel] = React.useState(field?.label ?? "");
  const [error, setError] = React.useState<string>();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setType(field?.type ?? "text");
    setLabel(field?.label ?? "");
    setError(undefined);
    setConfirming(false);
  }, [open, field?.type, field?.label]);

  const run = async (fn: (d: FormData) => Promise<{ error?: string }>, data: FormData) => {
    setError(undefined);
    setPending(true);
    try {
      const result = await fn(data);
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent
        title={field ? field.label : t("fields.add")}
        closeLabel={t("common.close")}
        footer={
          <>
            {field ? (
              <IconButton
                label={t("fields.deleteOne", { name: field.label })}
                variant="ghost"
                className="mr-auto"
                disabled={pending}
                onClick={() => setConfirming(true)}
              >
                <Trash2 />
              </IconButton>
            ) : null}

            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="submit"
              form="field-form"
              disabled={pending || !label.trim()}
              aria-disabled={pending || !label.trim()}
            >
              {field ? t("action.save") : t("action.add")}
            </Button>
          </>
        }
      >
        {error ? <Banner tone="danger" title={t("fields.failed")}>{error}</Banner> : null}

        {confirming && field ? (
          <form
            action={(d) => run(removeField, d)}
            className="flex flex-col gap-3 rounded-[14px] border border-danger bg-surface p-4"
          >
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="id" value={field.id} />
            <p className="text-[length:var(--d-text-body)] text-fg">{t("fields.deleteBody")}</p>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                {t("fields.keep")}
              </Button>
              <Button type="submit" variant="danger" loading={pending}>
                {t("fields.deleteAction", { name: field.label })}
              </Button>
            </div>
          </form>
        ) : null}

        <form
          id="field-form"
          action={(d) => run(field ? saveField : addField, d)}
          noValidate
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="church" value={church} />
          {field ? <input type="hidden" name="id" value={field.id} /> : null}

          <Field label={t("fields.name")} required>
            <Input
              name="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          {field ? (
            <Field label={t("fields.type")}>
              <Input value={typeLabel(field.type)} readOnly disabled />
            </Field>
          ) : (
            <Field label={t("fields.type")}>
              <Select name="type" value={type} onValueChange={setType}>
                <SelectTrigger aria-label={t("fields.type")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((one) => (
                    <SelectItem key={one.value} value={one.value}>
                      {typeLabel(one.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {hasChoices(field?.type ?? type) ? (
            <Choices defaultValue={(field?.options ?? []).join("\n")} />
          ) : null}
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** R1.10. The one action this screen carries, beside its title. */
export function NewField({ church }: { church: string }) {
  return (
    <FieldSheet church={church}>
      <Button>
        <Plus /> {t("fields.add")}
      </Button>
    </FieldSheet>
  );
}
