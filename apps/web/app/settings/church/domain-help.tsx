"use client";

import * as React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import {
  Button, IconButton, Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { CircleHelp } from "lucide-react";
import { t } from "@connectapp/i18n";
import { consoleFor, type DomainFindings } from "@connectapp/db/rules";

/** A record a church would type in, with the three things its form asks for. */
interface DnsRecord {
  type: "TXT";
  name: string;
  value: string;
  /** Whether one is already there under a different value. */
  replacing?: boolean;
}

function Copyable({ text }: { text: string }) {
  const [done, setDone] = React.useState(false);

  return (
    <IconButton
      label={done ? t("domain.help.copied") : t("domain.help.copy")}
      variant="ghost"
      className="size-7 min-h-0 shrink-0 [&_svg]:size-[15px]"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* A browser that refuses the clipboard still shows the record. */
        }
      }}
    >
      {done ? <Check /> : <Copy />}
    </IconButton>
  );
}

function RecordCard({ record }: { record: DnsRecord }) {
  const rows: [string, string][] = [
    [t("domain.help.type"), record.type],
    [t("domain.help.name"), record.name],
  ];

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-sunken p-3">
      <dl className="m-0 flex flex-col gap-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-3">
            <dt className="w-16 shrink-0 text-caption text-fg-subtle">{label}</dt>
            <dd className="m-0 font-mono text-[13px] text-fg">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline gap-3">
          <dt className="w-16 shrink-0 text-caption text-fg-subtle">{t("domain.help.value")}</dt>
          <dd className="m-0 flex min-w-0 flex-1 items-start gap-1">
            <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-fg">
              {record.value}
            </code>
            <Copyable text={record.value} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Step({
  says,
  record,
  registrar,
  consoleUrl,
}: {
  says: string;
  record?: DnsRecord;
  registrar: string | null;
  consoleUrl: string | null;
}) {
  const heading = record
    ? registrar
      ? t(record.replacing ? "domain.help.replace" : "domain.help.add", { provider: registrar })
      : t(record.replacing ? "domain.help.replaceAnywhere" : "domain.help.addAnywhere")
    : t("domain.help.nothingToDo");

  return (
    <section className="flex flex-col gap-2">
      <p className="m-0 text-[length:var(--d-text-body)] leading-6 text-fg-muted">{says}</p>
      <p className="m-0 text-caption font-medium tracking-[0.02em] text-fg-subtle uppercase">
        {heading}
      </p>
      {record ? <RecordCard record={record} /> : null}
      {record && consoleUrl && registrar ? (
        <a
          href={consoleUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-1 text-[length:var(--d-text-body)] font-medium text-primary"
        >
          {t("domain.help.open", { provider: registrar })}
          <ExternalLink className="size-[14px]" aria-hidden />
        </a>
      ) : null}
    </section>
  );
}

/**
 * R22.2. What the two mail rows mean for this church, and what to do about it.
 *
 * Contextual rather than an article. A church with Google Workspace and a
 * published SPF record does not need to read about SPF: it needs to know that
 * half is done and which half is not. A church whose domain sends nothing at
 * all gets the one record that closes it outright.
 *
 * Where a record could break the church's own email, it is not offered. The
 * SPF line for a domain that really sends mail belongs to whoever runs that
 * mail, and guessing it is how a volunteer ends up on the phone explaining why
 * the newsletter bounced. The DMARC ladder is offered in full, because each
 * rung is reversible and the first one changes nothing about delivery.
 */
export function DomainHelp({ found }: { found: DomainFindings }) {
  const [open, setOpen] = React.useState(false);
  const registrar = found.registrar;
  const consoleUrl = consoleFor(registrar);
  const sendsNothing = found.mailHosts.length === 0;

  /* The one safe SPF record: a domain nothing arrives at is a domain nothing
     should leave, and saying so cannot stop mail that does not exist. */
  const spf: { says: string; record?: DnsRecord } = found.spf
    ? { says: t("domain.help.spf.ok") }
    : sendsNothing
      ? {
          says: t("domain.help.spf.silent"),
          record: { type: "TXT", name: found.domain, value: "v=spf1 -all" },
        }
      : {
          says: found.mailProvider
            ? t("domain.help.spf.missing", { provider: found.mailProvider })
            : t("domain.help.spf.missingUnknown"),
        };

  /* One rung at a time, and the first changes nothing about delivery. */
  const dmarc: { says: string; record?: DnsRecord } =
    found.dmarc === "reject"
      ? { says: t("domain.help.dmarc.reject") }
      : {
          says: t(`domain.help.dmarc.${found.dmarc ?? "absent"}` as never),
          record: {
            type: "TXT",
            name: `_dmarc.${found.domain}`,
            value:
              found.dmarc === "none"
                ? "v=DMARC1; p=quarantine;"
                : found.dmarc === "quarantine"
                  ? "v=DMARC1; p=reject;"
                  : "v=DMARC1; p=none;",
            replacing: found.dmarc !== null,
          },
        };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <IconButton
          label={t("domain.help.label")}
          variant="ghost"
          className="size-6 min-h-0 [&_svg]:size-[15px]"
        >
          <CircleHelp />
        </IconButton>
      </SheetTrigger>

      <SheetContent
        title={t("domain.help.title")}
        closeLabel={t("common.close")}
        footer={
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        {t("domain.help.intro")
          .split("\n\n")
          .map((para) => (
            <p key={para} className="m-0 text-[length:var(--d-text-body)] leading-6 text-fg-muted">
              {para}
            </p>
          ))}

        <h3 className="m-0 mt-2 font-display text-[17px] leading-6 text-fg">{t("domain.spf")}</h3>
        <Step says={spf.says} record={spf.record} registrar={registrar} consoleUrl={consoleUrl} />

        <h3 className="m-0 mt-2 font-display text-[17px] leading-6 text-fg">{t("domain.dmarc")}</h3>
        <Step says={dmarc.says} record={dmarc.record} registrar={registrar} consoleUrl={consoleUrl} />
        {dmarc.record ? (
          <p className="m-0 text-caption leading-5 text-fg-subtle">{t("domain.help.order")}</p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
