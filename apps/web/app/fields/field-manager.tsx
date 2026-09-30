"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Type, Hash, Calendar, List, ListChecks, ToggleLeft } from "lucide-react";
import {
  Button, Input, Textarea, Field, Card, Separator, Banner, Badge,
  Dialog, DialogTrigger, DialogContent, DialogClose,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { addField, saveField, removeField } from "./actions";

export interface FieldItem {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
}

const TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "select", label: "One choice", icon: List },
  { value: "multi_select", label: "Several choices", icon: ListChecks },
  { value: "boolean", label: "Yes or no", icon: ToggleLeft },
] as const;

const typeLabel = (type: string) => TYPES.find((t) => t.value === type)?.label ?? type;
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
          <Field label="New field" error={error}>
            <Input name="label" autoComplete="off" placeholder="Dietary notes" />
          </Field>
          <Field label="Type">
            <Select name="type" value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {hasChoices(type) ? <Choices /> : null}

        <div>
          <Button type="submit" loading={pending}>
            <Plus /> Add
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** One choice per line. A textarea beats a repeating row builder for six items. */
function Choices({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label="Choices, one per line">
      <Textarea name="options" rows={4} defaultValue={defaultValue} placeholder={"Vegetarian\nGluten free\nNut allergy"} />
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
        <Button variant="ghost">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>

      <DialogContent title={field.label} description={typeLabel(field.type)}>
        {error ? <Banner tone="danger" title="Not saved" className="mb-4">{error}</Banner> : null}

        <form action={(d) => run(saveField, d)} className="flex flex-col gap-4">
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={field.id} />

          <Field label="Name">
            <Input name="label" defaultValue={field.label} autoComplete="off" />
          </Field>

          {hasChoices(field.type) ? <Choices defaultValue={(field.options ?? []).join("\n")} /> : null}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>Save</Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
          </div>
        </form>

        <Separator className="my-5" />

        {confirming ? (
          <form action={(d) => run(removeField, d)} className="flex flex-col gap-3">
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="id" value={field.id} />
            <p className="text-[length:var(--d-text-body)] text-fg">
              Deletes the field and everything recorded in it. This cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="danger" loading={pending}>
                <Trash2 /> Delete {field.label}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Keep it</Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 /> Delete
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
