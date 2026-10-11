import { createHash } from "node:crypto";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { email as validateEmail } from "@/lib/validate";

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
  const smtpUser = process.env["SUPPORT_SMTP_USER"];
  const smtpPassword = process.env["SUPPORT_SMTP_APP_PASSWORD"];
  const fromEmail = process.env["SUPPORT_FROM_EMAIL"];
  if (
    !redisUrl ||
    !redisToken ||
    !smtpUser ||
    !smtpPassword ||
    !fromEmail ||
    validateEmail(smtpUser) ||
    validateEmail(fromEmail)
  ) {
    console.error("[support] Redis rate-limit or SMTP configuration is missing");
    return errorResponse("service_unavailable", 503);
  }

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
      to: "support@connectapp.church",
      replyTo: senderEmail,
      subject: "ConnectApp support",
      text: [
        ...(senderName ? [`Name: ${senderName}`] : []),
        ...(churchName ? [`Church: ${churchName}`] : []),
        `Reply to: ${senderEmail}`,
        "",
        message,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[support] Email delivery failed", error);
    return errorResponse("delivery_failed", 502);
  }

  return Response.json({ sent: true });
}
