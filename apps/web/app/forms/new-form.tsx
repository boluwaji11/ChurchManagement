"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, Sheet, SheetTrigger, SheetContent } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { LibraryPicker } from "@/components/library-picker";
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
        {/* R4.1, R4.8. The same shape as tags, group types and the rest:
            writing your own leads, and the six a church keeps anyway hang
            off it. They were a grid of tiles, which read as six equal
            choices with the blank form hidden among them. */}
        <LibraryPicker
          ownLabel={t("form.ownForm")}
          items={FORM_TEMPLATES.map((one) => ({
            key: one.key,
            label: t(one.name),
            detail: plural("form.questions", one.questions.length),
          }))}
          onOwn={() => start()}
          onPick={(item) => start(item.key)}
          busy={pending}
        />
      </SheetContent>
    </Sheet>
  );
}
