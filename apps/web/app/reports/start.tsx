"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Button, Sheet, SheetContent, Field, Input,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { startReport } from "./build/actions";

/**
 * R18.12. A report begins with its name.
 *
 * Asked once, here, so the builder is only ever arranging something that
 * already exists and never carries a box for the name above the page it is
 * arranging.
 */
export function StartReport({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /*
   * R24.6. The builder is a page of its own, so the panel stays where it is
   * with its button spinning until that page arrives. Closing it on the write
   * and opening the route afterwards left a second of a screen that had not
   * answered the press.
   */
  const [going, startGoing] = React.useTransition();
  const busy = working || going;

  const go = () => {
    if (!name.trim() || busy) return;
    setWorking(true);
    setError(null);
    void startReport(name, church).then((back) => {
      if (back.error) {
        setWorking(false);
        setError(back.error);
        return;
      }
      startGoing(() => {
        router.push(`/reports/build?church=${church}&id=${back.slug}`);
        setOpen(false);
      });
    });
  };

  return (
    <>
      <Button onClick={() => { setName(""); setError(null); setOpen(true); }}>
        <Plus /> {t("report.build")}
      </Button>

      <Sheet open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
        <SheetContent
          title={t("report.build")}
          closeLabel={t("action.cancel")}
          footer={
            <>
              <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
                {t("action.cancel")}
              </Button>
              {/* `Button` reads an explicit `disabled` ahead of `loading`,
                  so the two conditions are given as one. */}
              <Button loading={busy} disabled={busy || !name.trim()} onClick={go}>
                {t("report.start")}
              </Button>
            </>
          }
        >
          <div
            aria-busy={busy}
            className={busy ? "pointer-events-none opacity-60" : undefined}
          >
          <Field label={t("report.name")} required error={error ?? undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }}
              placeholder={t("report.namePlaceholder")}
              autoFocus
            />
          </Field>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
}
