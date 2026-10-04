"use client";

import * as React from "react";
import {
  Button, Field, Textarea, Banner,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * Messaging somebody from their own page.
 *
 * The form is the design's: how to send it, and what to say. Sending is the
 * part this cannot do, because the church supplies its own Resend, SMTP or
 * Twilio credentials and that whole path is not built. Rather than a button
 * that silently does nothing, it says so.
 */
export function MessageButton({ name }: { name: string }) {
  const [channel, setChannel] = React.useState("email");
  const [text, setText] = React.useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">{t("message.open")}</Button>
      </DialogTrigger>
      <DialogContent title={t("message.title", { name })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
          <Banner tone="info" title={t("message.noProvider.title")}>
            {t("message.noProvider.body")}
          </Banner>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("message.channel")}</span>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger aria-label={t("message.channel")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">{t("message.channel.email")}</SelectItem>
                <SelectItem value="sms">{t("message.channel.sms")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Field label={t("message.text")} required>
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>

          <DialogFooter>
            <Button type="button" disabled>{t("message.send")}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
