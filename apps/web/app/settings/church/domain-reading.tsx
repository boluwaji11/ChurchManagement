"use client";

import * as React from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import { Banner, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { DomainFindings } from "@connectapp/db/rules";

/**
 * HRT-283, R22.2. What we found, in the order a volunteer worries about it.
 *
 * Their email first, because that is the thing they are afraid of losing. Then
 * what we would add, then what we would leave exactly where it is. The last of
 * those is the point of the whole screen.
 */
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5">
      <dt className="w-28 shrink-0 text-caption text-fg-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[length:var(--d-text-body)] text-fg">
        {value}
      </dd>
    </div>
  );
}

const WARNING_TONE = {
  noMx: "info",
  manySpf: "danger",
  dkimTaken: "danger",
  dmarcStrict: "info",
  lookupFailed: "info",
} as const;

export function DomainReading({ found }: { found: DomainFindings }) {
  const quiet = <span className="text-fg-subtle">{t("domain.noneFound")}</span>;

  return (
    <div className="flex flex-col gap-4">
      <Separator />

      <dl className="m-0 flex flex-col divide-y divide-line">
        <Line
          label={t("domain.mail")}
          value={
            found.mailProvider
              ?? (found.mailHosts[0] ? t("domain.unknownHost") : quiet)
          }
        />
        <Line label={t("domain.registrar")} value={found.registrar ?? quiet} />
        <Line
          label={t("domain.spf")}
          value={found.spf ? <code className="font-mono text-[13px]">{found.spf}</code> : quiet}
        />
        <Line label={t("domain.dmarc")} value={found.dmarc ?? quiet} />
      </dl>

      {found.warnings.map((one) => (
        <Banner
          key={one.code}
          tone={WARNING_TONE[one.code]}
          title={t("domain.reading")}
        >
          {t(`domain.warn.${one.code}` as never, { detail: one.detail ?? "" })}
        </Banner>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* R22.2. The three records, written the way a registrar's form asks
            for them, so somebody can see the shape before they agree to it. */}
        <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-sunken p-4">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("domain.adding")}
          </h4>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {found.adding.map((one) => (
              <li key={`${one.type}-${one.host}`} className="flex items-start gap-2.5">
                <Plus className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <code className="break-all font-mono text-[13px] text-fg">
                    {one.type} {one.host}
                  </code>
                  <span className="text-caption text-fg-muted">
                    {t(`domain.purpose.${one.purpose}` as never)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* The reassurance, and the reason the records above sit where they
            do. A church reads this column first. */}
        <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-sunken p-4">
          <h4 className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">
            {t("domain.leaving")}
          </h4>
          {found.leaving.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("domain.noneFound")}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {found.leaving.map((one) => (
                <li key={one} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: "var(--hue-fern-key)" }}
                    aria-hidden
                  />
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {t(`domain.keep.${one}` as never)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** The mark beside the warning count, where a reading found something. */
export function WarningMark({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <AlertTriangle
      className="size-4 shrink-0"
      style={{ color: "var(--hue-amber-key)" }}
      aria-hidden
    />
  );
}
