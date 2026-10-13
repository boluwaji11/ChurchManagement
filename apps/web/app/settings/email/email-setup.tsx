"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Mail, Server } from "lucide-react";
import {
  Banner, Button, Card, Field, Input, Tooltip, Working,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Sheet, SheetTrigger, SheetContent,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { EmailProvider, PlannedRecord } from "@connectapp/db";
import { usePanelGuard } from "@/components/panel-guard";
import { useAnswered } from "@/components/form-actions";
import { when } from "@/lib/when";
import { Stages } from "@/components/stages";
import {
  connectSmtp, checkRecords, disconnectEmail, type EmailResult,
} from "./actions";

/** The sending domain as the screen reads it, with the date already a string. */
export interface DomainState {
  id: string;
  domain: string;
  state: string;
  records: PlannedRecord[];
  checkedAt: string | null;
  failureReason: string | null;
}

/**
 * HRT-287, R16.1. Connecting the account a church's email leaves through.
 *
 * Not connected, it offers the two ways in. Connected, it says which account
 * and what mail goes out as, and for Resend it holds the three records until
 * they are published.
 */
export function EmailSetup({
  provider,
  domain,
  church,
  registrar,
  console_,
  dkimTaken,
}: {
  provider: EmailProvider | null;
  domain: DomainState | null;
  /** R16.1. What the church already told us, so nothing is asked twice. */
  church: { name: string; email: string };
  /** R22.2. Who answers for the domain, and where its settings are typed. */
  registrar: string | null;
  console_: string | null;
  /** R22.2. Whether something else already signs mail for this domain. */
  dkimTaken: boolean;
}) {
  const router = useRouter();
  /*
   * Which way the church is going, once it has picked. Resend is two things in
   * order and gets a path of its own rather than a panel, because a church
   * that has done the first half should see the second half waiting rather
   * than a screen that looks finished with it.
   */
  const [way, setWay] = React.useState<"resend" | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const act = async (run: () => Promise<EmailResult>, label: string) => {
    setBusy(label);
    setError(null);
    const answer = await run();
    setBusy(null);
    if (answer.error) {
      setError(answer.error);
      return false;
    }
    router.refresh();
    return true;
  };

  return (
    <div className="flex flex-col gap-5">
      <Working open={busy !== null} label={busy ?? ""} />

      {/* R16.1. The vendor's own words. A volunteer whose app password was
          refused needs to read "Username and Password not accepted" rather
          than a sentence of ours that stands in front of it. */}
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {provider ? (
        <Connected
          provider={provider}
          domain={domain}
          dkimTaken={dkimTaken}
          registrar={registrar}
          console_={console_}
          busy={busy !== null}
          onCheck={() => void act(checkRecords, t("email.checking"))}
          onDisconnect={() => void act(disconnectEmail, t("email.saving"))}
        />
      ) : way === "resend" ? (
        <ResendPath
          church={church}
          busy={busy !== null}
          onBack={() => setWay(null)}
        />
      ) : (
        <section className="flex flex-col gap-4">
          {/* R24.6. The screen opens on the question rather than on two cards
              a church has to work out the point of. */}
          <h3 className="m-0 font-display text-[18px] leading-6 text-fg">{t("email.choose")}</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* A church picking between its own mail server and a sending
                service cannot pick without being told the difference, so each
                card says what that option does. */}
            <Choice
              icon={<Server />}
              title={t("email.smtp.title")}
              what={t("email.smtp.what")}
              action={
                <SmtpSheet
                  church={church}
                  busy={busy !== null}
                  onSave={(data) => act(() => connectSmtp(data), t("email.testing"))}
                />
              }
            />
            <Choice
              icon={<Mail />}
              title={t("email.resend.title")}
              what={t("email.resend.what")}
              action={
                <Button onClick={() => setWay("resend")}>{t("email.resend.connect")}</Button>
              }
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Choice({
  icon,
  title,
  what,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  what: string;
  action: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <span className="grid size-9 place-items-center rounded-[10px] bg-sunken text-fg-muted [&_svg]:size-[18px]">
        {icon}
      </span>
      <h3 className="m-0 font-display text-[17px] leading-6 text-fg">{title}</h3>
      <p className="m-0 flex-1 text-fg-muted">{what}</p>
      <div className="flex">{action}</div>
    </Card>
  );
}

function Connected({
  provider,
  domain,
  dkimTaken,
  registrar,
  console_,
  busy,
  onCheck,
  onDisconnect,
}: {
  provider: EmailProvider;
  domain: DomainState | null;
  dkimTaken: boolean;
  registrar: string | null;
  console_: string | null;
  busy: boolean;
  onCheck: () => void;
  onDisconnect: () => void;
}) {
  const verified = domain?.state === "verified";

  return (
    <Card className="flex flex-col gap-5 p-5">
      {/* R24.6. Resend is two things in order, and a church that has done the
          first wants to see that there is one left rather than wonder whether
          the screen is finished with it. The mail server a church already has
          is one thing, so it shows none of this. */}
      {provider.vendor === "resend" ? (
        <div className="mx-auto w-full max-w-[460px] px-6 pb-1 pt-1">
          <Stages
            labels={[t("email.stage.connect"), t("email.stage.records")]}
            at={verified ? 3 : 2}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="inline-flex items-center gap-2 font-display text-[17px] leading-6 text-fg">
            <Check className="size-4 text-primary" aria-hidden />
            {provider.vendor === "smtp"
              ? t("email.connected.smtp", { host: provider.settings?.host ?? "" })
              : t("email.connected.resend")}
          </span>
          <span className="text-fg-muted">
            {t("email.sendingAs")}{" "}
            <span className="font-medium text-fg">
              {provider.fromName
                ? `${provider.fromName} <${provider.fromAddress ?? ""}>`
                : (provider.fromAddress ?? "")}
            </span>
          </span>
        </div>

        <DisconnectDialog vendor={provider.vendor} busy={busy} onConfirm={onDisconnect} />
      </div>

      {domain ? (
        <Records
          domain={domain}
          dkimTaken={dkimTaken}
          registrar={registrar}
          console_={console_}
          busy={busy}
          onCheck={onCheck}
        />
      ) : null}
    </Card>
  );
}

function DisconnectDialog({
  vendor,
  busy,
  onConfirm,
}: {
  vendor: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* A standalone action, so it keeps its words. */}
        <Button variant="ghost" disabled={busy}>
          {t("email.disconnect")}
        </Button>
      </DialogTrigger>
      {/* R24.6. A destructive confirmation earns its title and its buttons.
          The sentence that was under it said what Disconnect plainly does. */}
      <DialogContent
        title={t(`email.disconnect.ask.${vendor === "resend" ? "resend" : "smtp"}` as never)}
        closeLabel={t("common.close")}
      >
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t("email.disconnect")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * R16.1. The three records, and whether they are published.
 *
 * Exactly as Resend generated them. The DKIM key goes at the root, and the
 * sender policy and the return path go on a `send.` subdomain, so the church's
 * own MX, the one its inbox runs on, is never touched. The return path carries
 * bounces and complaints, so it is on the list like the other two.
 */
function Records({
  domain,
  dkimTaken,
  registrar,
  console_,
  busy,
  onCheck,
}: {
  domain: DomainState;
  /** R22.2. Whether something else already signs mail for this domain. */
  dkimTaken: boolean;
  /** R22.2. The company that answers for the domain, where we know it. */
  registrar: string | null;
  /** The page at that company where these are typed in. */
  console_: string | null;
  busy: boolean;
  onCheck: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h4 className="m-0 font-display text-[15px] leading-6 text-fg">{t("email.records")}</h4>
          {/* R22.2. Named, because "your registrar" is a word for somebody
              who already knows which company they are looking for. */}
          {registrar ? (
            <span className="text-fg-muted">{t("email.records.at", { name: registrar })}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {registrar && console_ ? (
            <a
              href={console_}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-2 font-medium text-primary underline-offset-2 hover:underline"
            >
              {t("email.records.open", { name: registrar })}
              <ExternalLink className="size-[14px]" aria-hidden />
            </a>
          ) : null}
          <Button variant="ghost" onClick={onCheck} disabled={busy}>
            {t("email.check")}
          </Button>
        </div>
      </div>

      {/* R22.2. The only line worth keeping from the domain reading, which was
          a panel of four and three of them nothing anybody could act on. */}
      {dkimTaken ? <Banner tone="danger">{t("email.records.taken")}</Banner> : null}

      <Banner tone={domain.state === "verified" ? "success" : "info"}>
        {domain.state === "verified" ? t("email.domain.verified") : t("email.domain.pending")}
        {domain.checkedAt ? ` · ${t("email.checkedAt", { when: when(domain.checkedAt) })}` : ""}
      </Banner>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {domain.records.map((record) => (
          <li
            key={`${record.type}-${record.host}`}
            className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-sunken/40 p-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* The kind, because the registrar's own form asks for it, and
                  nothing else. A line saying what each one is for was three
                  guesses at a provider's own labels, and two of them read the
                  same. */}
              <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-[12px] text-fg-muted">
                {record.type}
              </span>
              {record.priority === undefined ? null : (
                <span className="text-fg-subtle">
                  {t("email.record.priority")} {record.priority}
                </span>
              )}
            </div>
            <Copyable label={t("email.record.host")} value={record.host} />
            <Copyable label={t("email.record.value")} value={record.value ?? ""} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A value somebody retypes into a registrar, which means they copy it. */
function Copyable({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-caption text-fg-subtle">{label}</span>
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-[12px] text-fg outline-none"
      />
      <Tooltip content={copied ? t("joining.copied") : t("joining.copy")}>
        <button
          type="button"
          aria-label={copied ? t("joining.copied") : t("joining.copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
        >
          {copied ? <Check className="text-primary" /> : <Copy />}
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * The two fields both vendors need, asked in the same words in both panels.
 *
 * Filled in from what the church already told us on its own profile, because
 * asking a church its own name twice is asking it to wonder which answer this
 * screen means.
 */
function Sender({ church }: { church: { name: string; email: string } }) {
  return (
    <>
      <Field label={t("email.from.name")}>
        <Input
          name="fromName"
          defaultValue={church.name}
          autoComplete="off"
          placeholder={t("email.from.namePlaceholder")}
        />
      </Field>
      <Field label={t("email.from.address")} required>
        <Input
          name="fromAddress"
          defaultValue={church.email}
          autoComplete="off"
          inputMode="email"
          placeholder={t("email.from.addressPlaceholder")}
        />
      </Field>
    </>
  );
}

function SmtpSheet({
  church,
  busy,
  onSave,
}: {
  church: { name: string; email: string };
  busy: boolean;
  onSave: (data: FormData) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const formId = React.useId();
  const full = useAnswered(formId, open);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setDirty(false);
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>{t("email.smtp.connect")}</Button>
      </SheetTrigger>
      <SheetContent
        title={t("email.smtp.connect")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" form={formId} disabled={busy || !dirty || !full}>
              {t("email.connect")}
            </Button>
          </>
        }
      >
        {guard}

        <form
          id={formId}
          onInput={() => setDirty(true)}
          /*
           * Submitted by hand rather than through the form's `action`, because
           * React empties an uncontrolled form once an action returns. A mail
           * server that refused the password would have left the volunteer
           * retyping the host, the port and the username to change one field.
           */
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void onSave(data).then((ok) => {
              if (ok) close(false);
            });
          }}
          noValidate
          className="flex flex-col gap-4"
        >
          <Sender church={church} />

          <Field label={t("email.smtp.host")} required>
            <Input name="host" autoComplete="off" placeholder={t("email.smtp.hostPlaceholder")} />
          </Field>

          {/* Typed rather than chosen. 587 and 465 cover nearly every church,
              and the ones they do not cover are on 2525 or 2587 because their
              host blocks the usual two, which a list of three would refuse. */}
          <Field label={t("email.smtp.port")} required>
            <Input name="port" defaultValue="587" inputMode="numeric" autoComplete="off" />
          </Field>

          <Field label={t("email.smtp.username")} required>
            <Input
              name="username"
              autoComplete="off"
              placeholder={t("email.smtp.usernamePlaceholder")}
            />
          </Field>

          <Field label={t("email.smtp.password")} required>
            <Input name="password" type="password" autoComplete="new-password" />
          </Field>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/**
 * HRT-288, R16.1. The Resend path, which is two things in order.
 *
 * On the screen rather than in a panel, because the second thing happens
 * somewhere else entirely, at the company that answers for the church's
 * domain, and a church comes back to this screen to finish it. A panel that
 * opened, sent somebody to Resend and was gone when they returned would have
 * told them nothing about where they had got to.
 */
function ResendPath({
  church,
  busy,
  onBack,
}: {
  church: { name: string; email: string };
  busy: boolean;
  onBack: () => void;
}) {
  const [going, setGoing] = React.useState(false);
  const formId = React.useId();
  const full = useAnswered(formId);

  return (
    <Card className="flex flex-col gap-6 p-5">
      <Working open={going} label={t("email.resend.leaving")} />

      {/* Held to the width of the form under it, so the two dots read as a
          pair rather than as one at each end of the card. */}
      <div className="mx-auto w-full max-w-[460px] px-6 pt-1">
        <Stages labels={[t("email.stage.connect"), t("email.stage.records")]} at={1} />
      </div>

      <form
        id={formId}
        /* It leaves the product rather than saving anything, and the whole
           handshake is set up on the server: the browser never holds
           anything Resend would accept. */
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const where = new URL("/api/providers/resend/start", window.location.origin);
          where.searchParams.set("from", String(data.get("fromAddress") ?? ""));
          where.searchParams.set("name", String(data.get("fromName") ?? ""));
          setGoing(true);
          window.location.href = where.toString();
        }}
        noValidate
        className="mx-auto flex w-full max-w-[460px] flex-col gap-4"
      >
        {/* R21.15. What the church is agreeing to, said where the press is
            rather than found out afterwards. */}
        <Banner tone="info">{t("email.resend.access")}</Banner>

        <Sender church={church} />

        <p className="m-0 text-fg-muted">{t("email.resend.free")}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onBack} disabled={going}>
            {t("action.back")}
          </Button>
          <Button type="submit" disabled={busy || going || !full}>
            {going ? t("email.resend.leaving") : t("email.resend.go")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
