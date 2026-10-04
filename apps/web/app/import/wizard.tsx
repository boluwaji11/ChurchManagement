"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw, FileSpreadsheet } from "lucide-react";
import {
  Button, Card, CardTitle, Separator, Banner, Badge, Table, Thead, Th, Tr, Td,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  RadioGroup, RadioItem, Spinner,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { inspectFile, previewImport, runImport, type Inspection, type Preview, type ImportResult } from "./actions";

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

const OUTCOME_TONE = {
  create: "success",
  update: "info",
  skip: "neutral",
  fail: "danger",
} as const;

export function ImportWizard({ church }: { church: string }) {
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

      {error ? <Banner tone="danger" title={t("import.failed")}>{error}</Banner> : null}

      {step === "file" ? <ChooseFile busy={busy} onFile={onFile} /> : null}

      {step === "map" && inspection ? (
        <MapColumns
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
        <Done church={church} result={result} groups={inspection?.groups} onAgain={reset} />
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
                      : "var(--color-sunken)",
                  color: done || now ? "white" : "var(--color-fg-subtle)",
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
        className={`flex flex-col items-center gap-2.5 rounded-lg border-2 border-dashed bg-surface px-6 py-12 text-fg-muted ${
          over ? "border-primary" : "border-line-strong"
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
  inspection,
  mapping,
  setMapping,
  strategy,
  setStrategy,
  busy,
  onBack,
  onNext,
}: {
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

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("import.step.map")}</CardTitle>
          <span className="flex flex-wrap items-center gap-2">
            {/* R19.5. Naming the system it came from is the whole of a dedicated
                importer: the columns are already matched, and this says why. */}
            {inspection.source ? (
              <Badge tone="info">{t("import.detected", { name: inspection.source })}</Badge>
            ) : null}
            <span className="text-caption text-fg-muted">
              {plural("import.rowsFound", inspection.rowCount ?? 0)}
            </span>
          </span>
        </div>
        <Separator className="my-4" />

        <Table>
          <Thead>
            <Tr>
              <Th>{t("import.column")}</Th>
              <Th>{t("import.sample")}</Th>
              <Th>{t("import.field")}</Th>
            </Tr>
          </Thead>
          <tbody>
            {(inspection.headers ?? []).map((header) => {
              const current = mapping[header] ?? IGNORE;
              return (
                <Tr key={header}>
                  <Td>{header}</Td>
                  <Td className="text-fg-muted">{inspection.samples?.[header] || ""}</Td>
                  <Td>
                    <Select
                      value={current === IGNORE ? IGNORE_VALUE : current}
                      onValueChange={(v) =>
                        setMapping({ ...mapping, [header]: v === IGNORE_VALUE ? IGNORE : v })
                      }
                    >
                      <SelectTrigger>
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
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

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

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNext} loading={busy}>
          {t("import.preview")} <ArrowRight />
        </Button>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> {t("import.startOver")}
        </Button>
      </div>
    </>
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

  return (
    <>
      <Card>
        <CardTitle>{t("import.step.preview")}</CardTitle>
        <Separator className="my-4" />
        <ul className="flex flex-col gap-1.5">
          {preview.newGroups ? (
            <>
              <li className="text-[length:var(--d-text-body)] text-fg">
                {plural("import.group.joining", totals.create)}
              </li>
              <li className="text-[length:var(--d-text-body)] text-fg">
                {plural("import.group.newGroups", preview.newGroups.length)}
                {preview.newGroups.length > 0 ? `: ${preview.newGroups.join(", ")}` : ""}
              </li>
            </>
          ) : (
            <>
              <li className="text-[length:var(--d-text-body)] text-fg">{plural("import.willCreate", totals.create)}</li>
              <li className="text-[length:var(--d-text-body)] text-fg">{plural("import.willUpdate", totals.update)}</li>
            </>
          )}
          <li className="text-[length:var(--d-text-body)] text-fg-muted">{plural("import.willSkip", totals.skip)}</li>
          {totals.fail > 0 ? (
            <li className="text-[length:var(--d-text-body)] text-danger-text">{plural("import.willFail", totals.fail)}</li>
          ) : null}
        </ul>
      </Card>

      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th>{t("import.line")}</Th>
              <Th>{t("people.column.person")}</Th>
              <Th>{t("people.column.status")}</Th>
              <Th />
            </Tr>
          </Thead>
          <tbody>
            {(preview.rows ?? []).map((row) => (
              <Tr key={row.lineNumber}>
                <Td data-numeric className="text-fg-muted">{row.lineNumber}</Td>
                <Td>{row.name}</Td>
                <Td>
                  <Badge tone={OUTCOME_TONE[row.outcome]}>{t(`import.outcome.${row.outcome}`)}</Badge>
                </Td>
                <Td className="text-fg-muted">{row.detail}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onConfirm} loading={busy} disabled={willWrite === 0}>
          <Upload /> {t("import.commit", { count: willWrite })}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> {t("import.back")}
        </Button>
      </div>

      {willWrite === 0 ? (
        <Banner tone="info" title={t("import.nothingToDo")} />
      ) : null}
    </>
  );
}

function Done({
  church,
  result,
  groups,
  onAgain,
}: {
  church: string;
  result: ImportResult;
  groups?: boolean;
  onAgain: () => void;
}) {
  return (
    <>
      <Banner tone="success" title={t("import.done.title")}>
        {groups
          ? t("import.group.done", {
              joined: result.created ?? 0,
              created: result.updated ?? 0,
              skipped: result.skipped ?? 0,
              failed: result.failed ?? 0,
            })
          : t("import.done.body", {
              created: result.created ?? 0,
              updated: result.updated ?? 0,
              skipped: result.skipped ?? 0,
              failed: result.failed ?? 0,
            })}
      </Banner>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href={groups ? `/groups?church=${church}` : `/people?church=${church}`}>
            <CheckCircle2 /> {groups ? t("groups.title") : t("people.title")}
          </Link>
        </Button>
        <Button variant="ghost" onClick={onAgain}>
          <RotateCcw /> {t("import.startOver")}
        </Button>
      </div>
    </>
  );
}
