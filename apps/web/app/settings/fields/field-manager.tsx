"use client";

import * as React from "react";
import { Pencil, Trash2, Type, Hash, Calendar, List, ListChecks, ToggleLeft } from "lucide-react";
import {
  Button, IconButton, Input, Textarea, Field, Separator, Banner,
  Dialog, DialogTrigger, DialogContent, DialogClose,
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

/**
 * R1.10. Every extra detail this church keeps on a person.
 *
 * One card, a row per field with what it is called and what shape its answer
 * takes, and the row that adds another underneath. The design's shape, and the
 * one a church reads down in a second.
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
  return (
    <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
      {fields.map((f) => (
        <div
          key={f.id}
          className="flex min-h-14 flex-wrap items-center gap-3 border-b border-sunken py-2"
        >
          <span className="min-w-0 flex-1">
            <span className="font-medium text-fg">{f.label}</span>
            {f.options ? (
              <span className="block text-[12px] text-fg-subtle">{f.options.join(", ")}</span>
            ) : null}
          </span>

          <span className="flex h-6.5 items-center rounded-full bg-sunken px-2.5 text-[12px] font-medium text-fg-muted">
            {typeLabel(f.type)}
          </span>

          {canManage ? <EditField church={church} field={f} /> : null}
        </div>
      ))}

      {canManage ? <NewField church={church} /> : null}
    </section>
  );
}

function NewField({ church }: { church: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [type, setType] = React.useState("text");
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  const action = async (data: FormData) => {
    setError(undefined);
    setPending(true);
    try {
      const result = await addField(data);
      if (result.error) setError(result.error);
      else {
        formRef.current?.reset();
        setType("text");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-2 py-3.5">
      <input type="hidden" name="church" value={church} />

      <div className="flex flex-wrap gap-2">
        <Input
          name="label"
          autoComplete="off"
          placeholder={t("fields.new")}
          aria-label={t("fields.new")}
          className="min-w-45 flex-1"
        />

        <Select name="type" value={type} onValueChange={setType}>
          <SelectTrigger aria-label={t("fields.type")} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((one) => (
              <SelectItem key={one.value} value={one.value}>{typeLabel(one.value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" loading={pending}>{t("fields.add")}</Button>
      </div>

      {hasChoices(type) ? <Choices /> : null}
      {error ? <p role="alert" className="text-caption text-danger-text">{error}</p> : null}
    </form>
  );
}

/** One choice per line. A textarea beats a repeating row builder for six items. */
function Choices({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label={t("fields.choices")}>
      <Textarea name="options" rows={4} defaultValue={defaultValue} placeholder={t("fields.choicesPlaceholder")} />
    </Field>
  );
}

function EditField({ church, field }: { church: string; field: FieldItem }) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const run = async (fn: (d: FormData) => Promise<{ error?: string }>, data: FormData) => {
    setError(undefined);
    setPending(true);
    try {
      const result = await fn(data);
      if (result.error) setError(result.error);
      else setOpen(false);
    } finally {
      setPending(false);
    }
  };

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setError(undefined);
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <IconButton
          label={t("action.edit")}
          variant="ghost"
        >
          <Pencil />
        </IconButton>
      </DialogTrigger>

      <DialogContent title={field.label} description={typeLabel(field.type)} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("fields.failed")} className="mb-4">{error}</Banner> : null}

        <form action={(d) => run(saveField, d)} className="flex flex-col gap-4">
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={field.id} />

          <Field label={t("fields.name")} required>
            <Input name="label" defaultValue={field.label} autoComplete="off" />
          </Field>

          {hasChoices(field.type) ? <Choices defaultValue={(field.options ?? []).join("\n")} /> : null}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>{t("action.save")}</Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">{t("action.cancel")}</Button>
            </DialogClose>
          </div>
        </form>

        <Separator className="my-5" />

        {confirming ? (
          <form action={(d) => run(removeField, d)} className="flex flex-col gap-3">
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="id" value={field.id} />
            <p className="text-[length:var(--d-text-body)] text-fg">{t("fields.deleteBody")}</p>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="danger" loading={pending}>
                <Trash2 /> {t("fields.deleteAction", { name: field.label })}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>{t("fields.keep")}</Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 /> {t("action.delete")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
