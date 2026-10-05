"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogFooter, Field, Input,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
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

  const go = () => {
    if (!name.trim()) return;
    setWorking(true);
    setError(null);
    void startReport(name, church).then((back) => {
      setWorking(false);
      if (back.error) {
        setError(back.error);
        return;
      }
      setOpen(false);
      router.push(`/reports/build?church=${church}&id=${back.slug}`);
    });
  };

  return (
    <>
      <Button onClick={() => { setName(""); setError(null); setOpen(true); }}>
        <Plus /> {t("report.build")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("report.build")} closeLabel={t("action.cancel")}>
          <Field label={t("report.name")} required error={error ?? undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }}
              placeholder={t("report.namePlaceholder")}
              autoFocus
            />
          </Field>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button loading={working} disabled={!name.trim()} onClick={go}>
              {t("report.start")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
