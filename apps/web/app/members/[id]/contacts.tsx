"use client";

import * as React from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import {
  Banner, Button, IconButton, Input, Spinner,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { LABELS_FOR, type ContactLabel, type PersonContact, type ContactKind } from "@connectapp/db/rules";
import { formatPhone } from "@/components/phone-input";
import { addOne, removeOne, leadWithOne } from "./contact-actions";

/**
 * R2.4. Every way a church has of reaching somebody, with a way to add one.
 *
 * A list rather than one box. The storage always held many and the screens
 * showed one, so a second address a merge brought across sat in the record
 * unseen and an edit could overwrite the primary with no sign of it.
 *
 * The one marked Main is where a letter or a call goes first. The one somebody
 * signs in with says so and cannot be taken away here: removing it would read
 * as closing their account and would not.
 */
export function Contacts({
  church,
  memberId,
  kind,
  contacts,
  canEdit,
}: {
  church: string;
  memberId: string;
  kind: ContactKind;
  contacts: PersonContact[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [label, setLabel] = React.useState<string>(kind === "email" ? "home" : "mobile");
  const [error, setError] = React.useState<string>();
  const [pending, run] = React.useTransition();
  /* Which row's action is running, so one icon spins rather than the lot. */
  const [doing, setDoing] = React.useState<string>();

  React.useEffect(() => {
    if (!pending) setDoing(undefined);
  }, [pending]);

  const mine = contacts.filter((one) => one.kind === kind);

  /*
   * R2.4. "Mobile" is a phone and nothing else, and an email is personal
   * rather than at home. The stored labels are shared; what is offered and
   * what it is called are not.
   */
  const named = (one: ContactLabel) =>
    kind === "email" && one === "home" ? t("contact.personal") : t(`contactLabel.${one}` as never);

  const act = (key: string, work: () => Promise<{ error?: string }>) => {
    setDoing(key);
    run(async () => setError((await work()).error));
  };

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("personForm.failed")}>{error}</Banner> : null}

      {mine.map((one) => (
        <span key={one.id} className="group flex items-center gap-2">
          <a
            href={kind === "email"
              ? `mailto:${one.value}`
              : `tel:${one.value.replace(/[^+\d]/g, "")}`}
            className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
          >
            {kind === "phone" ? formatPhone(one.value) : one.value}
          </a>

          {/* A column of its own, so Main and Mobile line up down the card
              rather than sitting wherever the value above them ended. */}
          <span className="w-20 shrink-0 text-right text-caption text-fg-subtle">
            {one.isSignIn
              ? t("contact.signIn")
              : one.isPrimary
                ? t("contact.primary")
                : named(one.label)}
          </span>

          {canEdit ? (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              {one.isPrimary ? null : (
                <IconButton
                  label={t("contact.makePrimary")}
                  disabled={pending}
                  onClick={() =>
                    act(`primary:${one.id}`, () => leadWithOne(one.id, memberId, church))
                  }
                  className="size-7 min-h-0 [&_svg]:size-3.5"
                >
                  {doing === `primary:${one.id}` ? (
                    <Spinner label={t("contact.makePrimary")} />
                  ) : (
                    <Star />
                  )}
                </IconButton>
              )}
              {one.isSignIn ? null : (
                <IconButton
                  label={t("contact.remove", { value: one.value })}
                  disabled={pending}
                  onClick={() =>
                    act(`remove:${one.id}`, () => removeOne(one.id, memberId, church))
                  }
                  className="size-7 min-h-0 [&_svg]:size-3.5"
                >
                  {doing === `remove:${one.id}` ? (
                    <Spinner label={t("contact.remove", { value: one.value })} />
                  ) : (
                    <Trash2 />
                  )}
                </IconButton>
              )}
            </span>
          ) : null}
        </span>
      ))}

      {mine.length === 0 && !adding ? (
        <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />
      ) : null}

      {canEdit && adding ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={value}
            onChange={(e) =>
              setValue(kind === "phone" ? formatPhone(e.target.value) : e.target.value)}
            type={kind === "email" ? "email" : "tel"}
            autoFocus
            className="h-9 min-h-0 min-w-[160px] flex-1 text-[13px]"
          />
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger className="h-9 min-h-0 w-auto min-w-[104px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LABELS_FOR[kind].map((one) => (
                <SelectItem key={one} value={one}>
                  {named(one)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Typed, because this sits inside the form that saves the record
              and an untyped button submits it. */}
          <Button
            type="button"
            loading={pending}
            disabled={pending || !value.trim()}
            className="h-9 min-h-0 px-3 text-[13px]"
            onClick={() =>
              act("add", async () => {
                const result = await addOne({ memberId, kind, label, value }, church);
                if (!result.error) {
                  setValue("");
                  setAdding(false);
                }
                return result;
              })}
          >
            {t("contact.add")}
          </Button>
        </div>
      ) : null}

      {canEdit && !adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex cursor-pointer items-center gap-1.5 self-start text-caption font-medium text-primary"
        >
          <Plus className="size-3.5" aria-hidden />
          {kind === "email" ? t("contact.addEmail") : t("contact.addPhone")}
        </button>
      ) : null}
    </div>
  );
}
