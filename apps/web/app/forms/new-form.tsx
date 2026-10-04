"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { newForm } from "./actions";

/**
 * R4.1. A form starts as a blank one with a name on it, already open on screen.
 *
 * The design has no dialog here. A church pressing New form wants to write
 * questions, and asking for a name first is one screen in the way of that. The
 * name is written where it is read, at the top of the builder.
 */
export function NewFormButton({ church }: { church: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await newForm({ name: t("form.untitled") }, church);
          if (result.id) router.push(`/forms/${result.id}?church=${church}`);
        })}
    >
      <Plus /> {t("form.new")}
    </Button>
  );
}
