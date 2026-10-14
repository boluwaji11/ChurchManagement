"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import {
  Banner, Button, Card, Combobox, Field, IconButton, Input, Working,
  Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { RichText } from "@/components/rich-text";
import { when } from "@/lib/when";
import { countAudience, findRecipients, sendEmail, type SendResult } from "./actions";

export interface Named {
  id: string;
  name: string;
}

export interface Sent {
  id: string;
  subject: string;
  delivered: number;
  failed: number;
  sentAt: string | null;
}

/**
 * R16.4. The marks a message can carry, as a church reads them.
 *
 * The same three the letter offers that make sense in an email. A letter's
 * address and today's date belong on paper; a church's own phone and website
 * are in the signature a church writes once rather than a mark it inserts.
 */
const FIELDS = [
  { mark: "first", label: "post.field.first" },
  { mark: "name", label: "post.field.name" },
  { mark: "church", label: "post.field.church" },
] as const;

const EVERYONE = "everyone";
const PEOPLE = "people";

interface Chosen {
  id: string;
  name: string;
  address: string;
}

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
  sent,
  withdrawn,
}: {
  lists: Named[];
  groups: Named[];
  sent: Sent[];
  /** R16.8. How many have asked to be left alone, said plainly. */
  withdrawn: number;
}) {
  const router = useRouter();
  /* R24.6. Writing one and reading what went are two jobs, so they are two
     tabs rather than one screen a church scrolls through. */
  const [doing, setDoing] = React.useState<"write" | "sent">("write");
  const [who, setWho] = React.useState(EVERYONE);
  /* R16.4. The people picked one by one, when that is how they were picked. */
  const [picked, setPicked] = React.useState<Chosen[]>([]);
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
    void countAudience(chosen.audience, chosen.id, picked.map((one) => one.id)).then((n) => {
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
      data.set("memberIds", picked.map((one) => one.id).join(","));
    }

    const answer: SendResult = await sendEmail(data);
    setBusy(false);

    if (answer.error) {
      setError(answer.error);
      return;
    }

    setDone(
      answer.failed
        ? t("send.sentSome", { delivered: answer.delivered ?? 0, failed: answer.failed })
        : t("send.sent", { count: answer.delivered ?? 0 }),
    );
    setSubject("");
    setBody("");
    setPicked([]);
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
              { value: EVERYONE, label: t("send.who.everyone") },
              { value: PEOPLE, label: t("send.who.people") },
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
                    key={one.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken py-0.5 pl-3 pr-0.5 text-[13px] text-fg"
                  >
                    {one.name}
                    <IconButton
                      label={t("send.remove", { name: one.name })}
                      variant="ghost"
                      onClick={() => setPicked((was) => was.filter((x) => x.id !== one.id))}
                    >
                      <X />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : null}

            <Input
              value={typed}
              onChange={(e) => setTyped(e.currentTarget.value)}
              placeholder={t("send.find")}
              autoComplete="off"
              aria-label={t("send.find")}
            />

            {typed.trim() ? (
              <ul className="m-0 flex max-h-56 list-none flex-col overflow-auto rounded-[12px] border border-line p-0">
                {hits.filter((one) => !picked.some((x) => x.id === one.id)).length === 0 ? (
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
          {withdrawn > 0 ? ` · ${t("send.withdrawn", { count: withdrawn })}` : ""}
        </p>

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
            name="body"
            defaultValue=""
            onChange={setBody}
            minHeight={220}
            insert={(put) => { write.current = put; }}
          />
        </Field>

        {/* R16.4. Each one says what it means and writes its own mark in
            wherever the cursor is, the same as the letter. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-label text-fg">{t("post.fields")}:</span>
          {FIELDS.map((one) => (
            <button
              key={one.mark}
              type="button"
              onClick={() => write.current?.(`{${one.mark}}`)}
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-fg hover:bg-sunken"
            >
              {t(one.label as never)}
              <span className="font-mono text-[11px] text-fg-subtle">{`{${one.mark}}`}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <Button disabled={!full || busy} onClick={() => setAsking(true)}>
            <Send aria-hidden /> {t("send.send")}
          </Button>
        </div>
      </Card>
      ) : (
      <section className="flex flex-col gap-2">
        {sent.length === 0 ? (
          <p className="m-0 text-fg-muted">{t("send.history.none")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-[12px] border border-line p-0">
            {sent.map((one) => (
              <li key={one.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{one.subject}</span>
                <span className="text-fg-muted">
                  {one.failed
                    ? t("send.sentSome", { delivered: one.delivered, failed: one.failed })
                    : t("send.sent", { count: one.delivered })}
                </span>
                {one.sentAt ? (
                  <span className="text-caption text-fg-subtle">{when(one.sentAt)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {/* R16.6. A send cannot be taken back, so it is confirmed, and the thing
          worth confirming is how many people it reaches. */}
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent
          title={t("send.ask", { count: reach?.count ?? 0 })}
          closeLabel={t("common.close")}
        >
          {/* R16.4. A few of the addresses, because the mistake worth catching
              is the right message going to the wrong list, and a number alone
              does not catch it. */}
          {reach?.sample.length ? (
            <p className="m-0 text-fg-muted">
              {t("send.ask.sample", { names: reach.sample.join(", ") })}
            </p>
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
