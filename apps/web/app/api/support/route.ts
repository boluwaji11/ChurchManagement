import { createHash } from "node:crypto";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { email as validateEmail } from "@/lib/validate";
import { sendByResend } from "@/lib/email-provider";

/** R22.1. Where a church writing to us is answered. */
const SUPPORT = "support@connectapp.church";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGE_LENGTH = 5_000;
const MAX_CONTACT_FIELD_LENGTH = 150;

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    forwarded;
  return candidate && isIP(candidate) ? candidate : undefined;
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse("message_too_large", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) return errorResponse("invalid_request", 400);
  const chunks: Uint8Array[] = [];
  let bodySize = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bodySize += value.byteLength;
    if (bodySize > MAX_BODY_BYTES) {
      await reader.cancel();
      return errorResponse("message_too_large", 413);
    }
    chunks.push(value);
  }
  const bodyBytes = new Uint8Array(bodySize);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const bodyText = new TextDecoder().decode(bodyBytes);

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return errorResponse("invalid_request", 400);
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("email" in payload) ||
    !("message" in payload) ||
    typeof payload.email !== "string" ||
    typeof payload.message !== "string" ||
    ("name" in payload && typeof payload.name !== "string") ||
    ("churchName" in payload && typeof payload.churchName !== "string")
  ) {
    return errorResponse("invalid_request", 400);
  }

  const senderName = "name" in payload && typeof payload.name === "string" ? payload.name.trim() : "";
  const churchName =
    "churchName" in payload && typeof payload.churchName === "string" ? payload.churchName.trim() : "";
  const senderEmail = payload.email.trim();
  const message = payload.message.trim();
  if (
    senderName.length > MAX_CONTACT_FIELD_LENGTH ||
    senderName.includes("\n") ||
    senderName.includes("\r") ||
    churchName.length > MAX_CONTACT_FIELD_LENGTH ||
    churchName.includes("\n") ||
    churchName.includes("\r") ||
    senderEmail.length > 254 ||
    validateEmail(senderEmail) ||
    message.length === 0 ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return errorResponse("invalid_request", 400);
  }

  const redisUrl = process.env["UPSTASH_REDIS_REST_URL"];
  const redisToken = process.env["UPSTASH_REDIS_REST_TOKEN"];

  /*
   * R22.1. Two ways out, and the platform's own account leads.
   *
   * Resend is what the rest of the platform sends through, and it is one key
   * rather than a mailbox with an app password. The support mailbox's own SMTP
   * stays as the fallback, so a deployment holding either one can answer.
   */
  const resendKey = process.env["RESEND_API_KEY"];
  const smtpUser = process.env["SUPPORT_SMTP_USER"];
  const smtpPassword = process.env["SUPPORT_SMTP_APP_PASSWORD"];
  const fromEmail = process.env["PLATFORM_FROM_EMAIL"] ?? process.env["SUPPORT_FROM_EMAIL"];

  const canSend =
    !!fromEmail && !validateEmail(fromEmail) &&
    (!!resendKey || (!!smtpUser && !!smtpPassword && !validateEmail(smtpUser)));

  if (!canSend) {
    console.error("[support] No way to send is configured");
    return errorResponse("service_unavailable", 503);
  }

  /*
   * R21.x. This address takes a message from anybody, so it is rate limited.
   *
   * Deployed, that is not optional: an open form with no limiter is a way to
   * send mail through us. On a laptop there is no Redis and nobody to abuse
   * it, and refusing to run there means the form can never be tested at all.
   */
  const deployed = !!process.env["VERCEL"];
  const limited = !!redisUrl && !!redisToken;

  if (deployed && !limited) {
    console.error("[support] Rate limiting is not configured");
    return errorResponse("service_unavailable", 503);
  }

  if (limited) {
    const ip = clientIp(request);
    if (!ip) return errorResponse("client_address_unavailable", 503);

    try {
      const limiter = new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(3, "10 m"),
        prefix: "connectapp:support",
      });
      const identifier = createHash("sha256").update(ip).digest("hex");
      const limit = await limiter.limit(identifier);
      if (!limit.success) return errorResponse("rate_limited", 429);
    } catch (error) {
      console.error("[support] Rate limiting could not be applied", error);
      return errorResponse("service_unavailable", 503);
    }
  }

  const body = [
    ...(senderName ? [`Name: ${senderName}`] : []),
    ...(churchName ? [`Church: ${churchName}`] : []),
    `Reply to: ${senderEmail}`,
    "",
    message,
  ].join("\n");

  const sent = resendKey
    ? await sendByResend(resendKey, {
        from: `ConnectApp Support <${fromEmail}>`,
        to: SUPPORT,
        subject: "ConnectApp support",
        text: body,
        replyTo: senderEmail,
      })
    : { ok: false as const, said: "no key" };

  if (!sent.ok) {
    if (resendKey) console.error("[support] Resend refused the message", sent.said);

    if (!smtpUser || !smtpPassword) return errorResponse("delivery_failed", 502);

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        auth: { user: smtpUser, pass: smtpPassword },
      });
      await transporter.sendMail({
        from: `ConnectApp Support <${fromEmail}>`,
        to: SUPPORT,
        replyTo: senderEmail,
        subject: "ConnectApp support",
        text: body,
      });
    } catch (error) {
      console.error("[support] Email delivery failed", error);
      return errorResponse("delivery_failed", 502);
    }
  }

  return Response.json({ sent: true });
}
