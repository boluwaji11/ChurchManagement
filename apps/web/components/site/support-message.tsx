"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button, Field, IconButton, Input, Textarea, Working } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { email as validateEmail } from "@/lib/validate";

export function SupportMessage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [churchName, setChurchName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string }>();
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const emailError = email.trim() ? validateEmail(email) : undefined;
  const canSend = Boolean(email.trim() && !emailError && message.trim() && message.length <= 5000);

  useEffect(() => {
    if (open) emailInput.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panel.current?.contains(event.target) || launcher.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend || sending) return;

    setSending(true);
    setFeedback(undefined);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          churchName: churchName.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      if (response.ok) {
        setFeedback({ kind: "success", text: t("site.support.sent") });
        setName("");
        setChurchName("");
        setEmail("");
        setMessage("");
      } else if (response.status === 429) {
        setFeedback({ kind: "error", text: t("site.support.rateLimit") });
      } else {
        setFeedback({ kind: "error", text: t("site.support.failure") });
      }
    } catch {
      setFeedback({ kind: "error", text: t("site.support.failure") });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40">
      <Working open={sending} label={t("site.support.sending")} />
      {open ? (
        <section
          ref={panel}
          role="dialog"
          aria-label={t("site.support.title")}
          className="absolute bottom-16 right-0 flex max-h-[min(560px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-lg sm:p-5"
        >
          <header className="flex items-center justify-between gap-3">
            <h2 className="m-0 font-display text-heading text-fg">{t("site.support.title")}</h2>
            <IconButton
              label={t("site.support.close")}
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <X />
            </IconButton>
          </header>
          <form noValidate onSubmit={sendMessage} className="flex flex-col gap-4">
            <Field label={t("site.support.name")}>
              <Input
                autoComplete="name"
                value={name}
                maxLength={150}
                disabled={sending}
                onChange={(event) => {
                  setName(event.target.value);
                  setFeedback(undefined);
                }}
              />
            </Field>
            <Field label={t("site.support.church")}>
              <Input
                autoComplete="organization"
                value={churchName}
                maxLength={150}
                disabled={sending}
                onChange={(event) => {
                  setChurchName(event.target.value);
                  setFeedback(undefined);
                }}
              />
            </Field>
            <Field label={t("site.support.email")} error={emailError} required>
              <Input
                ref={emailInput}
                type="email"
                autoComplete="email"
                placeholder="e.g. you@church.org"
                value={email}
                maxLength={254}
                disabled={sending}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFeedback(undefined);
                }}
              />
            </Field>
            <Field label={t("site.support.message")} required>
              <Textarea
                rows={4}
                value={message}
                maxLength={5000}
                disabled={sending}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setFeedback(undefined);
                }}
              />
            </Field>
            {feedback ? (
              <p
                role="status"
                aria-live="polite"
                className={feedback.kind === "error" ? "m-0 text-danger-text" : "m-0 text-fg"}
              >
                {feedback.text}
              </p>
            ) : null}
            <Button type="submit" full disabled={!canSend || sending}>
              <MessageSquare /> {t("site.support.send")}
            </Button>
          </form>
        </section>
      ) : null}
      <IconButton
        ref={launcher}
        label={t("site.support.open")}
        variant="primary"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className="size-14 rounded-full shadow-lg [&_svg]:size-6"
      >
        <MessageSquare />
      </IconButton>
    </div>
  );
}
