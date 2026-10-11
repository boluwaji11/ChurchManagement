"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Banner, Button } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { FieldHint } from "@/components/field-hint";
import type { DomainFindings } from "@connectapp/db/rules";

/**
 * HRT-283, R22.2. What we found, written for the person who has to decide.
 *
 * That person is a volunteer who was once told, by somebody, that touching DNS
 * breaks the church email. They are not looking for a record name. They are
 * looking for an answer to "is this going to break our email", and every line
 * on this screen answers that question in words they already use.
 *
 * The record names are here, because whoever actually types them into GoDaddy
 * needs them exactly. They are behind a press, so they are available without
 * being the first thing anybody reads.
 */
function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2">
      <dt className="w-44 shrink-0 text-caption text-fg-subtle">{label}</dt>
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

function Item({ hue, icon, children }: { hue: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5"
        style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
      >
        {icon}
      </span>
      <span className="min-w-0 text-[length:var(--d-text-body)] leading-6 text-fg">{children}</span>
    </li>
  );
}

const WARNING_TONE = {
  noMx: "info",
  manySpf: "danger",
  dkimTaken: "danger",
  lookupFailed: "info",
} as const;

export function DomainReading({
  found,
  /**
   * Whether to show what we would add.
   *
   * The records are for sending mail as the church, and nothing in the
   * product sends mail yet. A church reading a list of changes we would make
   * is a church being offered something it cannot have, so the plan waits for
   * the screen that can act on it (HRT-287). The reading itself stands on its
   * own: it tells a church what its domain is set up with today.
   */
  plan = true,
  fix,
}: {
  found: DomainFindings;
  plan?: boolean;
  /**
   * Where to go when the reading says the address itself looks wrong.
   *
   * The screen owns its own routes, so it hands the link down rather than
   * this component knowing where a church profile lives.
   */
  fix?: React.ReactNode;
}) {
  const [showing, setShowing] = React.useState(false);
  const quiet = <span className="text-fg-subtle">{t("domain.noneFound")}</span>;

  /* R22.2. A policy letter means nothing to a volunteer, so it is read out. */
  const protection = found.dmarc
    ? t(`domain.dmarc.${found.dmarc}` as never)
    : t("domain.dmarc.absent");

  return (
    <div className="flex flex-col gap-5">
      {found.warnings.map((one) => (
        <Banner key={one.code} tone={WARNING_TONE[one.code]}>
          {t(`domain.warn.${one.code}` as never, { detail: one.detail ?? "" })}
          {/* Only this one is about the address being wrong, and it is the one
              worth offering a way out of. */}
          {one.code === "noMx" && fix ? <> {fix}</> : null}
        </Banner>
      ))}

      {/* The name itself, under anything wrong with it. Whoever opened this
          screen already knows which church they are in; what they are checking
          is which address we read. */}
      <p className="m-0 font-mono text-[length:var(--d-text-body)] text-fg">{found.domain}</p>

      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <h3 className="m-0 font-display text-[17px] leading-6 text-fg">{t("domain.reading")}</h3>
          {/* R22.2. What the two mail rows are for. A church meets SPF and
              DMARC once, and the words for them are nobody's words. */}
          <FieldHint about="domain.help" label={t("domain.help.label")} />
        </div>

        <dl className="m-0 flex flex-col divide-y divide-line">
          <Line
            label={t("domain.mail")}
            value={found.mailProvider ?? (found.mailHosts[0] ? t("domain.unknownHost") : quiet)}
          />
          <Line label={t("domain.registrar")} value={found.registrar ?? quiet} />
          {/* R22.2. What the record means, rather than whether there is one.
              "Set up" told a reader nothing, and the absence is the half worth
              knowing: a domain with no SPF is a domain anybody can send as. */}
          <Line
            label={t("domain.spf")}
            value={found.spf ? t("domain.spf.limited") : t("domain.spf.anyone")}
          />
          <Line label={t("domain.dmarc")} value={protection} />
        </dl>
      </section>


      {plan ? (
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* What changes, said as what it does rather than as what it is. */}
        <Panel title={plural("domain.records", found.adding.length)} hue="sky">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {found.adding.map((one) => (
              <Item key={`${one.type}-${one.host}`} hue="sky" icon={<Plus />}>
                {t(`domain.purpose.${one.purpose}` as never)}
              </Item>
            ))}
          </ul>
        </Panel>

        {/* The answer to the question they actually came with. */}
        <Panel title={t("domain.leaving")} hue="fern">
          {found.leaving.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("domain.noneFound")}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {found.leaving.map((one) => (
                <Item key={one} hue="fern" icon={<Check />}>
                  {t(`domain.keep.${one}` as never)}
                </Item>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      ) : null}

      {/* R22.2. For whoever types them in. Behind a press, because the person
          deciding and the person typing are usually not the same person. */}
      {plan ? (
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => setShowing(!showing)}
          aria-expanded={showing}
        >
          {showing ? t("domain.hideRecords") : t("domain.showRecords")}
        </Button>

        {showing ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-sunken p-4">
            <p className="text-caption text-fg-muted">{t("domain.forYourProvider")}</p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {found.adding.map((one) => (
                <li key={`${one.type}-${one.host}`} className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded bg-fg/[0.08] px-1.5 py-px font-mono text-[11px] font-semibold text-fg">
                    {one.type}
                  </span>
                  <code className="min-w-0 break-all font-mono text-[13px] text-fg">
                    {one.host}
                  </code>
                </li>
              ))}
              {found.spf ? (
                <li className="flex flex-wrap items-baseline gap-2 border-t border-line pt-2.5">
                  <span className="text-caption text-fg-subtle">{t("domain.spf")}</span>
                  <code className="min-w-0 break-all font-mono text-[13px] text-fg-muted">
                    {found.spf}
                  </code>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
