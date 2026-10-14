"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import {
  Banner, Button, Card, Combobox, Field, Input, Working,
  Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { RichText } from "@/components/rich-text";
import { when } from "@/lib/when";
import { countAudience, sendEmail, type SendResult } from "./actions";

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

const EVERYONE = "everyone";

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
  const [who, setWho] = React.useState(EVERYONE);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [reach, setReach] = React.useState<{ count: number; sample: string[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  const chosen = React.useMemo(() => {
    if (who === EVERYONE) return { audience: "everyone" as const, id: null, name: null };
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
    void countAudience(chosen.audience, chosen.id).then((n) => {
      if (current) setReach(n);
    });
    return () => {
      current = false;
    };
  }, [chosen.audience, chosen.id]);

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
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <Working open={busy} label={t("send.sending")} />

      {error ? <Banner tone="danger">{error}</Banner> : null}
      {done ? <Banner tone="success">{done}</Banner> : null}

      <Card className="flex flex-col gap-4 p-5">
        <Field label={t("send.who")}>
          <Combobox
            options={[
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
          <RichText name="body" defaultValue="" onChange={setBody} minHeight={220} />
        </Field>

        <div className="flex items-center justify-end">
          <Button disabled={!full || busy} onClick={() => setAsking(true)}>
            <Send aria-hidden /> {t("send.send")}
          </Button>
        </div>
      </Card>

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

      <section className="flex flex-col gap-2">
        <h3 className="m-0 font-display text-[17px] leading-6 text-fg">{t("send.history")}</h3>
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
    </div>
  );
}
