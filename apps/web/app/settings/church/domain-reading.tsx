"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Banner, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { DomainFindings } from "@connectapp/db/rules";

/**
 * HRT-283, R22.2. What we found, in the order a volunteer worries about it.
 *
 * Their email first, because that is the thing they are afraid of losing. Then
 * what we would add, then what we would leave exactly where it is. The last of
 * those is the point of the whole screen, so it is the side that carries the
 * colour.
 */
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2">
      <dt className="w-24 shrink-0 text-caption text-fg-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-[length:var(--d-text-body)] text-fg">
        {value}
      </dd>
    </div>
  );
}

function Panel({
  title,
  hue,
  children,
}: {
  title: string;
  hue: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-surface">
      <h4
        className="px-4 py-2.5 text-caption font-semibold"
        style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
      >
        {title}
      </h4>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </section>
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
    <div className="flex flex-col gap-5">
      <Separator />

      <section className="flex flex-col gap-1">
        <h3 className="font-display text-[17px] leading-6 text-fg">{t("domain.reading")}</h3>

        <dl className="m-0 flex flex-col divide-y divide-line">
          <Line
            label={t("domain.mail")}
            value={found.mailProvider ?? (found.mailHosts[0] ? t("domain.unknownHost") : quiet)}
          />
          <Line label={t("domain.registrar")} value={found.registrar ?? quiet} />
          <Line
            label={t("domain.spf")}
            value={
              found.spf ? (
                <code className="break-all font-mono text-[13px]">{found.spf}</code>
              ) : (
                quiet
              )
            }
          />
          <Line label={t("domain.dmarc")} value={found.dmarc ?? quiet} />
        </dl>
      </section>

      {found.warnings.map((one) => (
        <Banner key={one.code} tone={WARNING_TONE[one.code]}>
          {t(`domain.warn.${one.code}` as never, { detail: one.detail ?? "" })}
        </Banner>
      ))}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* R22.2. The three records, written the way a registrar's form asks
            for them, so somebody sees the shape before agreeing to it. */}
        <Panel title={`${t("domain.adding")} · ${found.adding.length} ${t("domain.records")}`} hue="sky">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {found.adding.map((one) => (
              <li key={`${one.type}-${one.host}`} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5"
                  style={{ background: "var(--hue-sky-tint)", color: "var(--hue-sky-key)" }}
                >
                  <Plus />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span
                      className="rounded px-1.5 py-px font-mono text-[11px] font-semibold"
                      style={{ background: "var(--hue-sky-tint)", color: "var(--hue-sky-key)" }}
                    >
                      {one.type}
                    </span>
                    <code className="min-w-0 break-all font-mono text-[13px] text-fg">
                      {one.host}
                    </code>
                  </span>
                  <span className="text-caption text-fg-muted">
                    {t(`domain.purpose.${one.purpose}` as never)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* The reassurance, and the reason the records opposite sit where they
            do. A church reads this side first. */}
        <Panel title={t("domain.leaving")} hue="fern">
          {found.leaving.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("domain.noneFound")}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {found.leaving.map((one) => (
                <li key={one} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5"
                    style={{ background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }}
                  >
                    <Check />
                  </span>
                  <span className="text-[length:var(--d-text-body)] text-fg">
                    {t(`domain.keep.${one}` as never)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
