"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, FileSpreadsheet } from "lucide-react";
import {
  Button, Card, CardTitle, Separator, Banner, Badge,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  RadioGroup, RadioItem, Spinner, Working,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import {
  inspectFile, previewImport, runImport, undoImport,
  type Inspection, type Preview, type ImportResult,
} from "./actions";

/** R19.4. Thirty days from today, as a date a church reads. */
function undoBy(): string {
  const day = new Date();
  day.setDate(day.getDate() + 30);
  return day.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

const IGNORE = "";
const WORKBOOK = /\.xlsx?$/i;

/**
 * Bytes to base64 in a browser.
 *
 * In chunks, because spreading a megabyte of bytes into String.fromCharCode in
 * one call overflows the argument limit and throws, and a church's directory is
 * exactly the size where that starts happening.
 */
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}
/** The picker needs a value, and an empty string is not one Radix will accept. */
const IGNORE_VALUE = "__ignore";

type Step = "file" | "map" | "preview" | "done";

export function ImportWizard({
  church,
  history,
}: {
  church: string;
  /** R19.5. What has been imported before, beside the drop zone. */
  history?: React.ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("file");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const [file, setFile] = React.useState<{ filename: string; text?: string; base64?: string }>({ filename: "" });
  const [inspection, setInspection] = React.useState<Inspection>();
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [strategy, setStrategy] = React.useState("skip");
  const [preview, setPreview] = React.useState<Preview>();
  const [result, setResult] = React.useState<ImportResult>();

  const reset = () => {
    setStep("file");
    setError(undefined);
    setFile({ filename: "" });
    setInspection(undefined);
    setMapping({});
    setPreview(undefined);
    setResult(undefined);
  };

  const onFile = async (chosen: File) => {
    setBusy(true);
    setError(undefined);
    try {
      // A workbook is binary, so it travels as base64. A text file travels as
      // text, because turning it into bytes and back would only risk the encoding.
      const payload = WORKBOOK.test(chosen.name)
        ? { filename: chosen.name, base64: toBase64(await chosen.arrayBuffer()) }
        : { filename: chosen.name, text: await chosen.text() };

      const found = await inspectFile({ church, ...payload });
      if (found.error) {
        setError(found.error);
        return;
      }
      setFile(payload);
      setInspection(found);
      setMapping(found.mapping ?? {});
      setStep("map");
    } finally {
      setBusy(false);
    }
  };

  const toPreview = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const found = await previewImport({
        church, ...file, mapping, strategy: strategy as never, groups: inspection?.groups,
      });
      if (found.error) {
        setError(found.error);
        return;
      }
      setPreview(found);
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const done = await runImport({
        church, ...file, mapping, strategy: strategy as never, groups: inspection?.groups,
      });
      if (done.error) {
        setError(done.error);
        return;
      }
      setResult(done);
      setStep("done");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Steps current={step} />

      {/* R19.2. Reading a file, building the preview and writing the rows all
          take long enough that the screen has to say so. */}
      <Working open={busy} label={t("import.running")} />

      {error ? <Banner tone="danger" title={t("import.failed")}>{error}</Banner> : null}

      {step === "file" ? (
        <div className="grid items-start gap-5 lg:[grid-template-columns:1fr_minmax(300px,360px)]">
          <ChooseFile busy={busy} onFile={onFile} />
          {history}
        </div>
      ) : null}

      {step === "map" && inspection ? (
        <MapColumns
          filename={file.filename}
          inspection={inspection}
          mapping={mapping}
          setMapping={setMapping}
          strategy={strategy}
          setStrategy={setStrategy}
          busy={busy}
          onBack={reset}
          onNext={toPreview}
        />
      ) : null}

      {step === "preview" && preview ? (
        <PreviewStep
          preview={preview}
          busy={busy}
          onBack={() => setStep("map")}
          onConfirm={doImport}
        />
      ) : null}

      {step === "done" && result ? (
        <Done
          church={church}
          result={result}
          groups={inspection?.groups}
          undoBy={undoBy()}
        />
      ) : null}
    </div>
  );
}

/**
 * R19.1. Where you are in the import, as the design draws it.
 *
 * A numbered dot per step joined by a rule, the done ones ticked in jade, the
 * one you are on filled in ink. Four steps, so somebody who stops halfway knows
 * what is left.
 */
function Steps({ current }: { current: Step }) {
  const order = ["file", "map", "preview", "done"] as const;
  const labels: Record<(typeof order)[number], string> = {
    file: t("import.step.file"),
    map: t("import.step.map"),
    preview: t("import.step.preview"),
    done: t("import.step.done"),
  };
  const index = order.indexOf(current as (typeof order)[number]);

  return (
    <ol className="flex items-center overflow-x-auto">
      {order.map((s, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <li key={s} className="flex flex-none items-center">
            <span
              aria-current={now ? "step" : undefined}
              className={`flex flex-none items-center gap-2 text-[13px] whitespace-nowrap ${
                now ? "font-semibold text-fg" : done ? "font-medium text-fg" : "font-medium text-fg-subtle"
              }`}
            >
              <span
                className="grid size-6 place-items-center rounded-full text-[12px] font-semibold"
                style={{
                  background: done
                    ? "var(--hue-jade-500)"
                    : now
                      ? "var(--color-primary)"
                      : "var(--color-surface)",
                  color: done || now ? "white" : "var(--color-fg-subtle)",
                  border: done || now ? "none" : "1px solid var(--color-line-strong)",
                }}
              >
                {done ? "\u2713" : i + 1}
              </span>
              {labels[s]}
            </span>
            {i < order.length - 1 ? (
              <span
                aria-hidden
                className="mx-2.5 h-0.5 min-w-6 flex-[1_1_24px] rounded-sm"
                style={{ background: done ? "var(--hue-jade-500)" : "var(--color-line)" }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * R19.1. The drop zone.
 *
 * One target the whole width of the screen, because the first thing a church
 * does here is hand over a file they exported from whatever they were using
 * before, and the hard part should not be finding where to put it.
 */
function ChooseFile({ busy, onFile }: { busy: boolean; onFile: (f: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);

  const take = (file?: File | null) => {
    if (file) onFile(file);
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-lg border-2 border-dashed bg-surface px-6 py-12 text-fg-muted hover:border-primary hover:bg-sunken disabled:cursor-wait ${
          over ? "border-primary bg-sunken" : "border-line-strong"
        }`}
      >
        {busy ? (
          <Spinner />
        ) : (
          <FileSpreadsheet className="size-8 text-primary" aria-hidden />
        )}
        <span className="text-[16px] font-semibold text-fg">{t("import.drop")}</span>
        <span className="text-[13px]">{t("import.recognised")}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.tsv,.txt"
        onChange={(e) => take(e.target.files?.[0])}
        className="hidden"
      />
    </>
  );
}

function MapColumns({
  filename,
  inspection,
  mapping,
  setMapping,
  strategy,
  setStrategy,
  busy,
  onBack,
  onNext,
}: {
  filename: string;
  inspection: Inspection;
  mapping: Record<string, string>;
  setMapping: (m: Record<string, string>) => void;
  strategy: string;
  setStrategy: (s: string) => void;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const fields = inspection.fields ?? [];
  // A field already taken by another column is not offered twice.
  const taken = new Set(Object.values(mapping).filter(Boolean));
  const headers = inspection.headers ?? [];

  return (
    <>
      {/* The file, in one line above the table: what it is called, how big it
          is, and where it came out of. */}
      <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-fg-muted">
        <FileSpreadsheet className="size-[18px] shrink-0 text-primary" aria-hidden />
        <span className="font-semibold text-fg">{filename}</span>
        <span>
          {t("import.fileLine", { rows: inspection.rowCount ?? 0, columns: headers.length })}
        </span>
        {inspection.source ? (
          <Badge tone="info">{t("import.detected", { name: inspection.source })}</Badge>
        ) : null}
      </div>

      <section className="overflow-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-fg">
              <th className="border-b border-line px-4 py-3 font-medium">{t("import.column")}</th>
              <th className="border-b border-line px-4 py-3 font-medium">{t("import.sample")}</th>
              <th className="border-b border-line px-4 py-3 font-medium">{t("import.field")}</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((header) => {
              const current = mapping[header] ?? IGNORE;
              return (
                <tr key={header}>
                  <td className="border-b border-sunken px-4 py-2.5 font-medium text-fg">
                    {header}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5 text-[13px] text-fg-muted">
                    {inspection.samples?.[header] || ""}
                  </td>
                  <td className="border-b border-sunken px-4 py-2.5">
                    <Select
                      value={current === IGNORE ? IGNORE_VALUE : current}
                      onValueChange={(v) =>
                        setMapping({ ...mapping, [header]: v === IGNORE_VALUE ? IGNORE : v })
                      }
                    >
                      <SelectTrigger className="min-h-[34px] min-w-[180px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE_VALUE}>{t("import.ignore")}</SelectItem>
                        {fields
                          .filter((f) => f.key === current || !taken.has(f.key))
                          .map((f) => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* What to do about somebody already in the directory is a question about
          a people file. A membership row joins a group or it does not. */}
      {inspection.groups ? null : (
        <Card>
          <CardTitle>{t("import.strategy")}</CardTitle>
          <Separator className="my-4" />
          <RadioGroup value={strategy} onValueChange={setStrategy}>
            <RadioItem value="skip">{t("import.strategy.skip")}</RadioItem>
            <RadioItem value="update">{t("import.strategy.update")}</RadioItem>
            <RadioItem value="create">{t("import.strategy.create")}</RadioItem>
          </RadioGroup>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          {t("import.back")}
        </Button>
        <Button onClick={onNext} loading={busy}>
          {t("import.checkFile")}
        </Button>
      </div>
    </>
  );
}

/** One of the three numbers at the top of the check step. */
function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4.5 py-4">
      <div
        className="text-[13px] font-medium"
        style={{ color: warn ? "var(--hue-amber-key)" : "var(--color-fg-muted)" }}
      >
        {label}
      </div>
      <div className="font-display text-[36px] leading-[42px] text-fg">{value}</div>
    </div>
  );
}

function PreviewStep({
  preview,
  busy,
  onBack,
  onConfirm,
}: {
  preview: Preview;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const totals = preview.totals ?? { create: 0, update: 0, skip: 0, fail: 0 };
  const willWrite = totals.create + totals.update;
  const problems = (preview.rows ?? []).filter(
    (row) => row.outcome === "skip" || row.outcome === "fail",
  );

  return (
    <>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Stat label={t("import.stat.new")} value={totals.create} />
        <Stat label={t("import.stat.updates")} value={totals.update} />
        <Stat label={t("import.stat.problems")} value={totals.skip + totals.fail} warn />
      </div>

      {problems.length > 0 ? (
        <section className="rounded-lg border border-line bg-surface px-5 py-2">
          {problems.map((row) => (
            <div
              key={row.lineNumber}
              className="flex items-start gap-3 border-b border-sunken py-2.5 last:border-0"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                style={{ color: "var(--hue-amber-key)" }}
                aria-hidden
              />
              <span data-numeric className="w-16 shrink-0 font-mono text-[12px] text-fg-muted">
                {t("import.row", { line: row.lineNumber })}
              </span>
              <span className="min-w-0 flex-1 text-fg">
                {[row.name, row.detail].filter(Boolean).join(" · ")}
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onBack}>
          {t("import.back")}
        </Button>
        <Button onClick={onConfirm} loading={busy} disabled={willWrite === 0}>
          {totals.skip + totals.fail > 0
            ? t("import.commitSkipping", {
                count: willWrite,
                skipped: totals.skip + totals.fail,
              })
            : t("import.commit", { count: willWrite })}
        </Button>
      </div>

      {willWrite === 0 ? <Banner tone="info" title={t("import.nothingToDo")} /> : null}
    </>
  );
}

function Done({
  church,
  result,
  groups,
  undoBy,
}: {
  church: string;
  result: ImportResult;
  groups?: boolean;
  /** R19.4. The last day this import can be taken back. */
  undoBy: string;
}) {
  const [undone, setUndone] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState<string>();
  const added = (result.created ?? 0) + (result.updated ?? 0);

  const undo = async () => {
    if (!result.batchId) return;
    setPending(true);
    try {
      const data = new FormData();
      data.set("church", church);
      data.set("batchId", result.batchId);
      data.set("kind", groups ? "groups" : "people");
      const outcome = await undoImport(data);
      if (outcome.error) setFailed(outcome.error);
      else setUndone(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="flex flex-col items-center gap-2.5 rounded-lg border border-line bg-surface px-6 py-8 text-center">
      <span
        className="grid size-14 place-items-center rounded-full text-white"
        style={{ background: "var(--hue-jade-500)" }}
      >
        <Check className="size-7" aria-hidden />
      </span>

      <h2 className="font-display text-[26px] leading-8 text-fg">
        {undone ? t("import.rolledBack") : plural("import.done.heading", added)}
      </h2>

      {undone ? null : (
        <p className="text-fg-muted">{t("import.done.undoUntil", { date: undoBy })}</p>
      )}

      {failed ? (
        <Banner tone="danger" title={t("import.failed")}>{failed}</Banner>
      ) : null}

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {undone || !result.batchId ? null : (
          <Button variant="secondary" onClick={undo} loading={pending}>
            {t("import.undo")}
          </Button>
        )}
        <Button asChild>
          <Link href={groups ? `/groups?church=${church}` : `/members?church=${church}`}>
            {groups ? t("import.goToGroups") : t("import.goToPeople")}
          </Link>
        </Button>
      </div>
    </section>
  );
}
