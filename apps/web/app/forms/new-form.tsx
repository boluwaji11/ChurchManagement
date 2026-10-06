"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Plus } from "lucide-react";
import {
  Button, Sheet, SheetTrigger, SheetContent, LIFT,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { FORM_TEMPLATES } from "@connectapp/db/rules";
import { newForm } from "./actions";

/**
 * R4.1, R4.8. Where a form starts.
 *
 * A blank one, or one of the six a church writes anyway. The templates are the
 * point: a connection card that already asks for an email and already writes
 * it onto a person's record is a working form in one press, where a blank page
 * is an hour of guessing which questions matter.
 */
export function NewFormButton({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const start = (template?: string) =>
    startTransition(async () => {
      const result = await newForm({ name: t("form.untitled") }, church, template);
      if (result.id) {
        setOpen(false);
        router.push(`/forms/${result.slug ?? result.id}?church=${church}`);
      }
    });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button">
          <Plus /> {t("form.new")}
        </Button>
      </SheetTrigger>

      <SheetContent title={t("form.start")} closeLabel={t("common.close")} width="560px">
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          <button
            type="button"
            disabled={pending}
            onClick={() => start()}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-line-strong bg-surface px-4 py-3.5 text-left ${LIFT}`}
          >
            <FilePlus2 className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <span className="font-medium text-fg">{t("form.start.blank")}</span>
          </button>

          {FORM_TEMPLATES.map((one) => (
            <button
              key={one.key}
              type="button"
              disabled={pending}
              onClick={() => start(one.key)}
              className={`flex cursor-pointer flex-col gap-1.5 overflow-hidden rounded-xl border border-line bg-surface px-4 py-3.5 text-left ${LIFT}`}
            >
              <span
                aria-hidden
                className="-mx-4 -mt-3.5 mb-0.5 h-1.5"
                style={{ background: `var(--hue-${one.hue}-500)` }}
              />
              <span className="font-medium text-fg">{t(one.name)}</span>
              <span className="text-[12px] text-fg-subtle tabular-nums">
                {one.questions.length}
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
