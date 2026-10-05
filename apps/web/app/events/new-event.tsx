"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/** R14.1. The one action this screen carries, in the corner the design gives it. */
export function NewEventButton({ church }: { church: string }) {
  return (
    <Button asChild>
      <Link href={`/events/new?church=${church}`}>
        <Plus /> {t("event.new")}
      </Link>
    </Button>
  );
}
