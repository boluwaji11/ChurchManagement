"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, FileText, RotateCcw, Send, X } from "lucide-react";
import {
  Banner, Button, Card, Combobox, Field, IconButton, Input, Working,
  Dialog, DialogContent, DialogFooter, Sheet, SheetContent,
  DatePicker, TimePicker, Switch,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { RichText } from "@/components/rich-text";
import { DynamicFields } from "@/components/dynamic-fields";
import { when } from "@/lib/when";
import { dateAndTime } from "@/lib/dates";
import { DATE_LABELS } from "@/lib/date-labels";
import { readingLocale } from "@/lib/reading-locale";
import {
  callOffSend, countAudience, findRecipients, openSend, putBack, sendEmail, sentPage,
  withdrawnPage,
  type SendResult,
} from "./actions";
import { Pages } from "@/components/pages";

export interface Named {
  id: string;
  name: string;
}

export interface Sent {
  id: string;
  subject: string;
  state: string;
  total: number;
  done: number;
  delivered: number;
  failed: number;
  sentAt: string | null;
  sendAt: string | null;
}

/** HRT-291. A message this church wrote once and sends again. */
export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

/** R16.8. Somebody who has asked this church to stop. */
export interface Out {
  id: string;
  address: string;
  name: string | null;
  withdrawnAt: string | null;
}

/** R16.6. How many sends a page of the Sent list holds. */
const PER = 10;

/** R16.6. Still stoppable: queued, and its hour has not come. */
const waiting = (one: { state: string; sendAt: string | null }): boolean =>
  one.state === "queued" && one.sendAt !== null && new Date(one.sendAt) > new Date();

/**
 * R16.6. What a row says about itself.
 *
 * Three different states read as three different sentences: one waiting for
 * its hour, one on its way with how far it has got, and one that is done.
 */
function tally(one: Sent): string {
  if (one.state === "cancelled") return t("send.cancelled");
  if (one.state === "queued" && one.sendAt && new Date(one.sendAt) > new Date()) {
    return t("send.scheduled", { when: dateAndTime(one.sendAt) });
  }
  if (one.state === "queued" || one.state === "sending") {
    return plural("send.inflight", one.done, { total: one.total });
  }
  return one.failed
    ? t("send.sentSome", { delivered: one.delivered, failed: one.failed })
    : plural("send.sent", one.delivered);
}

const EVERYONE = "everyone";
const PEOPLE = "people";

interface Chosen {
  /** Null for an address typed in that belongs to nobody on the list. */
  id: string | null;
  name: string;
  address: string;
}

/** Enough to tell an address from a half-typed name. */
const SHAPE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * HRT-139, R16.4. Writing one message and sending it.
 *
 * Who it goes to is asked first, because it changes what the writer says. A
 * subject and a message, and the count under the audience so nobody presses
 * send wondering whether it is four people or four hundred.
 */
export function Composer({
  lists,
  groups,
  preset,
  templates,
  sent,
  sends,
  out,
  outs,
  withdrawn,
}: {
  lists: Named[];
  groups: Named[];
  /** HRT-341. People ticked in the directory, which this screen opens with. */
  preset: Chosen[];
  /** HRT-291. What this church has written once and sends again. */
  templates: Template[];
  sent: Sent[];
  /** R16.6. How many sends there are in all, which the pager needs. */
  sends: number;
  /** R16.8. The list of who has asked to be left alone, kept where it can be read. */
  out: Out[];
  /** R16.8. How many there are in all, which the pager needs. */
  outs: number;
  /** R16.8. How many have asked to be left alone, said plainly. */
  withdrawn: number;
}) {
  const router = useRouter();
  /* R24.6. Writing one and reading what went are two jobs, so they are two
     tabs rather than one screen a church scrolls through. */
  const [doing, setDoing] = React.useState<"write" | "sent" | "out">("write");
  /* R16.4. Choosing people is where a composer opens. Everyone is a press
     away and cannot be taken back, so it is never where somebody starts. */
  const [who, setWho] = React.useState(PEOPLE);
  /* R16.4. The people picked one by one, when that is how they were picked. */
  const [picked, setPicked] = React.useState<Chosen[]>(preset);
  const [typed, setTyped] = React.useState("");
  /* The editor hands back a way to write at the cursor, which the marks use. */
  const write = React.useRef<((text: string) => void) | null>(null);
  const [hits, setHits] = React.useState<Chosen[]>([]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [reach, setReach] = React.useState<{ count: number; sample: string[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  /* R16.6. The one being read back, which is a send rather than a draft. */
  const [reading, setReading] = React.useState<Awaited<ReturnType<typeof openSend>>>(null);
  /* R16.6. Cancelling a scheduled send that has not left yet. It is the only
     control on this panel that changes state. */
  const [callingOff, setCallingOff] = React.useState(false);
  /* R16.6. A send that waits for its hour. Off until somebody asks for it. */
  /* HRT-291. Choosing a written-once message to put in, and the ask before it
     replaces anything already typed. */
  const [inserting, setInserting] = React.useState(false);
  /*
   * HRT-291. What the editor was last filled with.
   *
   * The box owns its own contents once it is written into, so new words can
   * only reach it by mounting it again. This is the seed and the count that
   * forces that, and it changes when a template goes in or a send clears the
   * form, never on a keystroke.
   */
  const [seed, setSeed] = React.useState({ text: "", at: 0 });
  const [chosenTemplate, setChosenTemplate] = React.useState("");
  const [starting, setStarting] = React.useState<Template | null>(null);
  const [later, setLater] = React.useState(false);
  const [day, setDay] = React.useState("");
  const [hour, setHour] = React.useState("");
  /* R16.6. The page of the Sent list on screen, read a page at a time rather
     than all of it, because a church that has been here three years has sent
     a great many. */
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<Sent[]>(sent);

  /* A send refreshes the screen, which hands back a fresh first page. */
  React.useEffect(() => {
    setRows(sent);
    setPage(1);
  }, [sent]);

  /*
   * R16.6. While anything is on its way, the page asks again.
   *
   * A church watching four hundred go out wants the number to move. It stops
   * the moment nothing is in flight, so a screen left open overnight is not
   * asking the server a question every two seconds until morning.
   */
  const moving = rows.some((one) => one.state === "sending" || one.state === "queued");
  React.useEffect(() => {
    if (!moving || doing !== "sent") return;
    const tick = setInterval(() => {
      void sentPage(page).then(setRows);
    }, 2500);
    return () => clearInterval(tick);
  }, [moving, doing, page]);

  /*
   * R16.6. The earliest selectable hour today, so a send cannot be scheduled
   * for a time that has passed. The date picker already refuses past dates;
   * without this the time list would still offer 09:00 at half past twelve.
   */
  const today = new Date().toISOString().slice(0, 10);
  const soonest = React.useMemo(() => {
    if (day !== today) return undefined;
    const now = new Date();
    /* The next quarter hour, because the list runs in quarters and offering
       the one somebody is standing in is offering a minute to press it. */
    const at = new Date(now.getTime() + 15 * 60 * 1000);
    const minutes = Math.ceil(at.getMinutes() / 15) * 15;
    const when = new Date(at);
    when.setMinutes(minutes === 60 ? 0 : minutes, 0, 0);
    if (minutes === 60) when.setHours(when.getHours() + 1);
    return `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
  }, [day, today]);

  /* An hour that was fine yesterday is not fine for today, so it goes. */
  React.useEffect(() => {
    if (soonest && hour !== "" && hour < soonest) setHour("");
  }, [soonest, hour]);

  /** HRT-291. A template into the form, editor included. */
  const fill = (one: Template) => {
    setSubject(one.subject);
    setBody(one.body);
    setSeed({ text: one.body, at: Date.now() });
  };

  const chosen = React.useMemo(() => {
    if (who === EVERYONE) return { audience: "everyone" as const, id: null, name: null };
    if (who === PEOPLE) return { audience: "people" as const, id: null, name: null };
    const [kind, id] = who.split(":");
    const from = kind === "list" ? lists : groups;
    return {
      audience: (kind === "list" ? "list" : "group") as "list" | "group",
      id: id ?? null,
      name: from.find((one) => one.id === id)?.name ?? null,
    };
  }, [who, lists, groups]);

  /*
   * R16.4. The count, asked again whenever the audience changes.
   *
   * It is the number that decides whether somebody presses send, so it is on
   * the screen before the press rather than in the confirmation after it.
   */
  React.useEffect(() => {
    let current = true;
    setReach(null);
    void countAudience(
      chosen.audience,
      chosen.id,
      picked.map((one) => one.id).filter((one): one is string => one !== null),
      picked.filter((one) => one.id === null).map((one) => one.address),
    ).then((n) => {
      if (current) setReach(n);
    });
    return () => {
      current = false;
    };
  }, [chosen.audience, chosen.id, picked]);

  /*
   * R16.4. Names as they are typed, newest answer wins.
   *
   * An answer that arrives after a later one was asked for is dropped, so a
   * slow lookup for "jo" cannot overwrite the list for "jonah".
   */
  const ticket = React.useRef(0);
  React.useEffect(() => {
    if (who !== PEOPLE) return;
    const mine = ++ticket.current;
    const timer = window.setTimeout(() => {
      void findRecipients(typed).then((found) => {
        if (mine === ticket.current) setHits(found);
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [typed, who]);

  const full = subject.trim() !== "" && body.trim() !== "" && (reach?.count ?? 0) > 0;

  const send = async () => {
    setAsking(false);
    setBusy(true);
    setError(null);
    setDone(null);

    const data = new FormData();
    data.set("subject", subject);
    data.set("body", body);
    data.set("audience", chosen.audience);
    if (chosen.id) data.set("audienceId", chosen.id);
    if (chosen.name) data.set("audienceName", chosen.name);
    if (chosen.audience === "people") {
      data.set("memberIds", picked.map((one) => one.id).filter(Boolean).join(","));
      data.set(
        "addresses",
        picked.filter((one) => one.id === null).map((one) => one.address).join(","),
      );
    }

    if (later && day && hour) data.set("sendAt", new Date(`${day}T${hour}`).toISOString());

    const answer: SendResult = await sendEmail(data);
    setBusy(false);

    if (answer.error) {
      setError(answer.error);
      return;
    }

    setDone(plural("send.queued", answer.queued ?? 0));
    setSubject("");
    setBody("");
    setSeed({ text: "", at: Date.now() });
    setPicked([]);
    setLater(false);
    setDay("");
    setHour("");
    setDoing("sent");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <Working open={busy} label={t("send.sending")} />

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {done ? <Banner tone="success">{done}</Banner> : null}

      <div
        role="tablist"
        aria-label={t("send.title")}
        className="flex w-fit gap-1 rounded-full border border-line bg-sunken p-1"
      >
        {([
          { key: "write", label: t("send.tab.write") },
          { key: "sent", label: t("send.tab.sent") },
          { key: "out", label: t("send.tab.out") },
        ] as const).map((one) => (
          <button
            key={one.key}
            type="button"
            role="tab"
            aria-selected={doing === one.key}
            onClick={() => setDoing(one.key)}
            className={`flex min-h-9 cursor-pointer items-center rounded-full px-4 text-[13px] font-medium ${
              doing === one.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg"
            }`}
          >
            {one.label}
          </button>
        ))}
      </div>

      {doing === "write" ? (
      <Card className="flex flex-col gap-4 p-5">
        <Field label={t("send.who")}>
          <Combobox
            options={[
              /* R16.4. Choosing people leads, because the audience somebody
                 has in mind is nearly always a few of them, and everyone is
                 the one that cannot be taken back. */
              { value: PEOPLE, label: t("send.who.people") },
              { value: EVERYONE, label: t("send.who.everyone") },
              ...lists.map((one) => ({
                value: `list:${one.id}`,
                label: t("send.who.list", { name: one.name }),
              })),
              ...groups.map((one) => ({
                value: `group:${one.id}`,
                label: t("send.who.group", { name: one.name }),
              })),
            ]}
            value={who}
            onChange={(next) => setWho(next || EVERYONE)}
            clearable={false}
            aria-label={t("send.who")}
            emptyLabel={t("lists.noneFound")}
            clearLabel={t("common.close")}
          />
        </Field>

        {who === PEOPLE ? (
          <div className="flex flex-col gap-2">
            {picked.length > 0 ? (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {picked.map((one) => (
                  <li
                    key={one.id ?? one.address}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken py-0.5 pl-3 pr-0.5 text-[13px] text-fg"
                  >
                    {one.name}
                    <IconButton
                      label={t("send.remove", { name: one.name })}
                      variant="ghost"
                      onClick={() =>
                        setPicked((was) => was.filter((x) => x.address !== one.address))
                      }
                    >
                      <X />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* R24.6. The asterisk is a contract: nothing goes until somebody
                is in the list, and Send stays dark until one is. */}
            <Field label={t("send.who.people")} required>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                placeholder={t("send.find")}
                autoComplete="off"
                aria-label={t("send.find")}
              />
            </Field>

            {typed.trim() ? (
              <ul className="m-0 flex max-h-56 list-none flex-col overflow-auto rounded-[12px] border border-line p-0">
                {/* R16.8. An address nobody on the list has. A church writes
                    to a roofer, a county office, a visiting speaker, and
                    having to add them as a member first is absurd. */}
                {SHAPE.test(typed.trim()) &&
                !picked.some((x) => x.address === typed.trim().toLowerCase()) &&
                !hits.some((one) => one.address === typed.trim().toLowerCase()) ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        const address = typed.trim().toLowerCase();
                        setPicked((was) => [...was, { id: null, name: address, address }]);
                        setTyped("");
                      }}
                      className="flex w-full cursor-pointer items-baseline gap-2 px-3 py-2 text-left hover:bg-sunken"
                    >
                      <span className="font-medium text-fg">
                        {t("send.find.loose", { address: typed.trim() })}
                      </span>
                    </button>
                  </li>
                ) : null}

                {hits.filter((one) => !picked.some((x) => x.id === one.id)).length === 0 &&
                !SHAPE.test(typed.trim()) ? (
                  <li className="px-3 py-2 text-fg-muted">{t("send.find.none")}</li>
                ) : (
                  hits
                    .filter((one) => !picked.some((x) => x.id === one.id))
                    .map((one) => (
                      <li key={one.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPicked((was) => [...was, one]);
                            setTyped("");
                          }}
                          className="flex w-full cursor-pointer items-baseline gap-2 px-3 py-2 text-left hover:bg-sunken"
                        >
                          <span className="font-medium text-fg">{one.name}</span>
                          <span className="min-w-0 truncate text-fg-muted">{one.address}</span>
                        </button>
                      </li>
                    ))
                )}
              </ul>
            ) : null}
          </div>
        ) : null}

        <p className="m-0 text-fg-muted">
          {reach === null ? t("common.searching") : plural("send.reaches", reach.count)}
          {withdrawn > 0 ? ` · ${plural("send.withdrawn", withdrawn)}` : ""}
        </p>

        {templates.length > 0 ? (
          <Button variant="secondary" className="self-start" onClick={() => setInserting(true)}>
            <FileText aria-hidden /> {t("mailTemplate.insert")}
          </Button>
        ) : null}

        <Field label={t("send.subject")} required>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.currentTarget.value)}
            placeholder={t("send.subjectPlaceholder")}
            autoComplete="off"
          />
        </Field>

        <Field label={t("send.body")} required>
          <RichText
            key={seed.at}
            name="body"
            defaultValue={seed.text}
            onChange={setBody}
            minHeight={220}
            insert={(put) => { write.current = put; }}
          />
        </Field>

        {/* R16.4. Each one says what it means and writes its own mark in
            wherever the cursor is, the same as the letter. */}
        <DynamicFields onInsert={(text) => write.current?.(text)} />

        {/* R16.6. A church writes on Tuesday evening for Friday morning. */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px] text-fg">
            <Switch checked={later} onCheckedChange={setLater} />
            {t("send.later")}
          </label>

          {later ? (
            <>
              <Field label={t("send.later.date")} className="min-w-[180px]">
                <DatePicker
                  value={day}
                  onChange={(next) => setDay(next ?? "")}
                  min={today}
                  locale={readingLocale()}
                  labels={DATE_LABELS()}
                />
              </Field>
              <Field label={t("send.later.time")} className="min-w-[140px]">
                <TimePicker
                  value={hour}
                  onChange={setHour}
                  min={soonest}
                  locale={readingLocale()}
                  placeholder={t("send.later.pick")}
                  labels={{ open: t("date.open"), clear: t("date.clear") }}
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end">
          <Button disabled={!full || busy || (later && (!day || !hour))} onClick={() => setAsking(true)}>
            <Send aria-hidden /> {t("send.send")}
          </Button>
        </div>
      </Card>
      ) : doing === "sent" ? (
      <section className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="m-0 text-fg-muted">{t("send.history.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line p-0">
            {rows.map((one) => (
              <li key={one.id}>
                <button
                  type="button"
                  onClick={() => void openSend(one.id).then(setReading)}
                  aria-label={t("send.read.open", { subject: one.subject })}
                  className="flex w-full flex-wrap items-baseline gap-x-3 px-4 py-2.5 text-left cursor-pointer hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{one.subject}</span>
                  <span className="text-fg-muted">{tally(one)}</span>
                  {one.sentAt ? (
                    <span className="text-caption text-fg-subtle">{when(one.sentAt)}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        {sends > PER ? (
          <Pages
            page={page}
            last={Math.ceil(sends / PER)}
            onPage={(next) => {
              setPage(next);
              void sentPage(next).then(setRows);
            }}
          />
        ) : null}
      </section>
      ) : (
      <Withdrawn out={out} total={outs} />
      )}

      {/* R16.6. What went out, read back. Nothing here can be changed: a send
          is a thing that happened, so it is read rather than opened. */}
      <Sheet open={reading !== null} onOpenChange={(next) => !next && setReading(null)}>
        {reading ? (
          <SheetContent
            title={reading.subject}
            closeLabel={t("common.close")}
            width="560px"
            footer={
              waiting(reading) ? (
                <Button
                  variant="ghost"
                  className="mr-auto text-danger-text"
                  disabled={busy}
                  onClick={() => setCallingOff(true)}
                >
                  <Ban aria-hidden /> {t("send.callOff")}
                </Button>
              ) : undefined
            }
          >
            <Dialog open={callingOff} onOpenChange={setCallingOff}>
              <DialogContent alert title={t("send.callOff.title")}>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCallingOff(false)}>
                    {t("send.callOff.keep")}
                  </Button>
                  <Button
                    variant="danger"
                    loading={busy}
                    onClick={() => {
                      setBusy(true);
                      void callOffSend(reading.id).then(() => {
                        setBusy(false);
                        setCallingOff(false);
                        setReading(null);
                        router.refresh();
                      });
                    }}
                  >
                    {t("send.callOff.do")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-baseline gap-x-3 text-fg-muted">
                {/* R16.6. One still waiting for its hour says when, not how
                    many it reached: it has reached nobody yet. */}
                {reading.state === "cancelled" ? (
                  <span>{t("send.cancelled.read")}</span>
                ) : waiting(reading) ? (
                  <span>{t("send.scheduled", { when: dateAndTime(reading.sendAt ?? "") })}</span>
                ) : (
                  <>
                    <span>
                      {reading.failed
                        ? t("send.sentSome", {
                            delivered: reading.delivered,
                            failed: reading.failed,
                          })
                        : plural("send.sent", reading.delivered)}
                    </span>
                    {reading.sentAt ? (
                      <span className="text-caption text-fg-subtle">
                        {t("send.read.when", { when: when(reading.sentAt) })}
                      </span>
                    ) : null}
                  </>
                )}
              </div>

              <div
                className={
                  "rounded-[12px] border border-line bg-surface px-4 py-3 text-fg " +
                  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 " +
                  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_strong]:font-semibold"
                }
                dangerouslySetInnerHTML={{ __html: reading.html }}
              />

              {reading.recipients.length ? (
                <section className="flex flex-col gap-2">
                  <h3 className="m-0 text-caption font-semibold tracking-wide text-fg-subtle uppercase">
                    {t("send.read.recipients")}
                  </h3>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {reading.recipients.map((one) => (
                      <li
                        key={one.address}
                        className="flex flex-wrap items-baseline gap-x-2 text-fg-muted"
                      >
                        <span className="min-w-0 flex-1 truncate">{one.address}</span>
                        {one.state === "bounced" ? (
                          <span className="text-caption text-danger-text">
                            {t("contact.bounced")}
                          </span>
                        ) : one.state === "failed" ? (
                          <span className="text-caption text-danger">
                            {one.said ?? t("send.read.failed")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      {/* HRT-291, R24.6. Which written-once message to put in, and the way to
          the screen where they are kept, because somebody who opened this and
          found nothing they wanted is one press from writing it. */}
      <Dialog open={inserting} onOpenChange={setInserting}>
        <DialogContent
          title={t("mailTemplate.insert")}
          closeLabel={t("common.close")}
          actions={
            <Link
              href="/settings/email-templates"
              className="text-label font-medium text-primary underline underline-offset-4"
            >
              {t("mailTemplate.manage")}
            </Link>
          }
        >
          <Field label={t("mailTemplate.which")}>
            <Select value={chosenTemplate} onValueChange={setChosenTemplate}>
              <SelectTrigger>
                <SelectValue placeholder={t("mailTemplate.pick")} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((one) => (
                  <SelectItem key={one.id} value={one.id}>
                    {one.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setInserting(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              disabled={chosenTemplate === ""}
              onClick={() => {
                const one = templates.find((x) => x.id === chosenTemplate);
                if (!one) return;
                setInserting(false);
                if (subject.trim() || body.trim()) {
                  setStarting(one);
                  return;
                }
                fill(one);
              }}
            >
              {t("mailTemplate.insertIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HRT-291. Putting a template over something already written is the one
          press here that loses work, so it asks. */}
      <Dialog open={starting !== null} onOpenChange={(next) => !next && setStarting(null)}>
        <DialogContent alert title={t("mailTemplate.replace")}>
          <p className="m-0 text-fg-muted">{t("mailTemplate.replaceBody")}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setStarting(null)}>
              {t("action.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (starting) fill(starting);
                setStarting(null);
              }}
            >
              {t("mailTemplate.insertIt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* R16.6. A send cannot be taken back, so it is confirmed, and the thing
          worth confirming is how many people it reaches. */}
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent
          title={plural("send.ask", reach?.count ?? 0)}
          closeLabel={t("common.close")}
        >
          {/* R16.4. A few of the addresses, because the mistake worth catching
              is the right message going to the wrong list, and a number alone
              does not catch it. */}
          {reach?.sample.length ? (
            <p className="m-0 text-fg-muted">{reach.sample.join(", ")}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="button" onClick={() => void send()}>
              {t("send.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/**
 * HRT-143, R16.8. Who has asked this church to stop, and the way back.
 *
 * Both kinds are here: people on the list, and addresses belonging to nobody
 * on it, because both may ask and both have to be honoured. Putting somebody
 * back is a press rather than a form, since the church has already been told
 * by the person in front of them.
 */
function Withdrawn({ out, total }: { out: Out[]; total: number }) {
  const [back, setBack] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<Out[]>(out);
  const [count, setCount] = React.useState(total);

  /*
   * R16.8. Read again whenever this tab is opened.
   *
   * Somebody unsubscribes from their own inbox, in their own browser, and the
   * church's screen knows nothing about it. Reading on open is what makes the
   * list true, rather than true as of whenever the screen was loaded.
   */
  React.useEffect(() => {
    void withdrawnPage(1).then((fresh) => {
      setRows(fresh.rows);
      setCount(fresh.total);
      setPage(1);
    });
  }, []);

  if (rows.length === 0) {
    return <p className="m-0 text-fg-muted">{t("send.out.none")}</p>;
  }

  return (
    <section className="flex flex-col gap-3">
    <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line p-0">
      {rows.map((one) => {
        const name = one.name ?? one.address;
        return (
          <li key={one.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-fg">{name}</span>
              {one.name ? (
                <span className="truncate text-caption text-fg-subtle">{one.address}</span>
              ) : null}
            </span>
            {one.withdrawnAt ? (
              <span className="text-caption text-fg-subtle">
                {t("send.out.when", { when: when(one.withdrawnAt) })}
              </span>
            ) : null}
            {back.has(one.id) ? (
              <span className="text-caption text-fg-muted">
                {t("send.out.backDone")}
              </span>
            ) : (
              <IconButton
                label={t("send.out.back")}
                variant="ghost"
                disabled={busy === one.id}
                onClick={() => {
                  setBusy(one.id);
                  void putBack(one.id).then((ok) => {
                    if (ok) setBack((was) => new Set(was).add(one.id));
                    setBusy(null);
                  });
                }}
              >
                <RotateCcw />
              </IconButton>
            )}
          </li>
        );
      })}
    </ul>

    {count > PER ? (
      <Pages
        page={page}
        last={Math.ceil(count / PER)}
        onPage={(next) => {
          setPage(next);
          void withdrawnPage(next).then((fresh) => {
            setRows(fresh.rows);
            setCount(fresh.total);
          });
        }}
      />
    ) : null}
    </section>
  );
}
