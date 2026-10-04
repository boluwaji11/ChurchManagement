"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import {
  Button, Field, IconButton, Textarea,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

/**
 * Messaging somebody from their own page.
 *
 * The design's form: how to send it, and what to say. The shell is here; the
 * send path waits on a church having its own Resend, SMTP or Twilio set up.
 */
export function MessageButton({ name }: { name: string }) {
  const [channel, setChannel] = React.useState("email");
  const [text, setText] = React.useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconButton label={t("message.open")} variant="secondary">
          <MessageSquare />
        </IconButton>
      </DialogTrigger>
      <DialogContent title={t("message.title", { name })} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-4">
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
            <Button type="button">{t("message.send")}</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
