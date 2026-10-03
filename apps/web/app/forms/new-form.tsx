"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Input, Dialog, DialogTrigger, DialogContent,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { newForm } from "./actions";

/** R4.1. A form starts as a name and nothing else, then gets its questions. */
export function NewFormButton({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> {t("form.new")}</Button>
      </DialogTrigger>
      <DialogContent title={t("form.new")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("form.failed")}>{error}</Banner> : null}

          <Field label={t("form.name")} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await newForm({ name }, church);
                  setError(result.error);
                  if (!result.error && result.id) {
                    setOpen(false);
                    router.push(`/forms/${result.id}?church=${church}`);
                  }
                })}
            >
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
