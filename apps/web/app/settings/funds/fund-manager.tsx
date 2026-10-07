"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, Checkbox, Dialog, DialogContent, DialogFooter, Field, IconButton,
  Input, LIFT, Sheet, SheetContent, SheetTrigger, Textarea,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { Fund } from "@connectapp/db";
import { usePanelGuard } from "@/components/panel-guard";
import { useFormError } from "@/lib/form-error";
import { saveFund, archiveFund } from "./actions";

/**
 * R13.9. The funds a church keeps.
 *
 * A tile each, the way the group types and the service types are drawn. A
 * restricted fund wears the word, because that is the distinction a treasurer
 * is answerable for.
 */
export function FundManager({ church, funds }: { church: string; funds: Fund[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [asking, setAsking] = React.useState<Fund | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const live = funds.filter((one) => !one.archived);
  const archived = funds.filter((one) => one.archived);

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("fund.failed")}>{error}</Banner> : null}

      <div className="flex justify-end">
        <FundPanel church={church} pending={pending} />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {live.map((fund) => (
          <FundPanel
            key={fund.id}
            church={church}
            pending={pending}
            fund={fund}
            onArchive={() => setAsking(fund)}
            trigger={
              <button
                type="button"
                className={`flex cursor-pointer flex-col gap-1 rounded-[14px] border border-line bg-surface p-4 text-left ${LIFT}`}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                    {fund.name}
                  </span>
                  {fund.restricted ? (
                    <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                      {t("giving.restricted")}
                    </span>
                  ) : null}
                </span>
                {fund.code ? (
                  <span className="font-mono text-[12px] text-fg-subtle">{fund.code}</span>
                ) : null}
              </button>
            }
          />
        ))}
      </div>

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("fund.archived")}</h2>
          {archived.map((fund) => (
            <div key={fund.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{fund.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => run(() => archiveFund(fund.id, false, church))}
              >
                <Undo2 className="size-4" aria-hidden /> {t("fund.restore")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={asking !== null} onOpenChange={(on) => (on ? null : setAsking(null))}>
        <DialogContent alert title={t("fund.archiveTitle", { name: asking?.name ?? "" })}>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(null)}>
              {t("fund.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const one = asking;
                setAsking(null);
                if (one) run(() => archiveFund(one.id, true, church));
              }}
            >
              {t("fund.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** R13.9. Writing a fund down, or changing one. */
function FundPanel({
  church,
  pending,
  fund,
  trigger,
  onArchive,
}: {
  church: string;
  pending: boolean;
  fund?: Fund;
  trigger?: React.ReactNode;
  onArchive?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = useFormError(open);

  const [name, setName] = React.useState(fund?.name ?? "");
  const [code, setCode] = React.useState(fund?.code ?? "");
  const [restricted, setRestricted] = React.useState(fund?.restricted ?? false);
  const [description, setDescription] = React.useState(fund?.description ?? "");

  React.useEffect(() => {
    if (!open) return;
    setName(fund?.name ?? "");
    setCode(fund?.code ?? "");
    setRestricted(fund?.restricted ?? false);
    setDescription(fund?.description ?? "");
  }, [open, fund?.name, fund?.code, fund?.restricted, fund?.description]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setDirty(false);
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const save = () =>
    startTransition(async () => {
      const result = await saveFund(
        { id: fund?.id, name, code: code || null, restricted, description: description || null },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setDirty(false);
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("fund.add")}</Button>}
      </SheetTrigger>

      <SheetContent
        title={fund ? t("fund.editTitle", { name: fund.name }) : t("fund.newTitle")}
        closeLabel={t("common.close")}
        footer={
          <>
            {fund && onArchive ? (
              <IconButton
                label={t("fund.archive")}
                variant="ghost"
                className="mr-auto"
                disabled={pending || saving}
                onClick={() => {
                  setOpen(false);
                  onArchive();
                }}
              >
                <Archive />
              </IconButton>
            ) : null}
            <Button
              type="button"
              disabled={pending || saving || !dirty}
              loading={saving}
              onClick={save}
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        {guard}

        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("fund.failed")}>{error}</Banner> : null}

          <Field label={t("fund.name")} required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder={t("fund.namePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label={t("fund.code")}>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setDirty(true);
              }}
              placeholder={t("fund.codePlaceholder")}
              autoComplete="off"
              className="font-mono"
            />
          </Field>

          {/* R13.9. The one answer a treasurer is answerable for. */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
            <Checkbox
              checked={restricted}
              onCheckedChange={(on) => {
                setRestricted(on === true);
                setDirty(true);
              }}
            />
            <span className="flex min-w-0 flex-col">
              <span>{t("fund.restricted")}</span>
              <span className="text-[13px] text-fg-muted">{t("fund.restricted.hint")}</span>
            </span>
          </label>

          <Field label={t("fund.description")}>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}
