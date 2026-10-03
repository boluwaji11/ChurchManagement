"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Type, Hash, Calendar, List, ListChecks, ToggleLeft } from "lucide-react";
import {
  Button, IconButton, Input, Textarea, Field, Card, Separator, Banner, Badge,
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
    <div className="flex flex-col gap-8">
      {canManage ? <NewField church={church} /> : null}

      {fields.length === 0 ? null : (
        <Card>
          <ul className="flex flex-col">
            {fields.map((f, i) => (
              <li key={f.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[length:var(--d-text-body)] text-fg">{f.label}</span>
                    <Badge tone="neutral">{typeLabel(f.type)}</Badge>
                    {f.options ? (
                      <span className="text-caption text-fg-muted">{f.options.join(", ")}</span>
                    ) : null}
                  </div>
                  {canManage ? <EditField church={church} field={f} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
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
    <Card>
      <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="church" value={church} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.new")} error={error} required>
            <Input name="label" autoComplete="off" placeholder={t("fields.newPlaceholder")} />
          </Field>
          <Field label={t("fields.type")}>
            <Select name="type" value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{typeLabel(type.value)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {hasChoices(type) ? <Choices /> : null}

        <div>
          <Button type="submit" loading={pending}>
            <Plus /> {t("action.add")}
          </Button>
        </div>
      </form>
    </Card>
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
