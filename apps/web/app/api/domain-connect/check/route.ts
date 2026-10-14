import nodemailer from "nodemailer";
import { askEverybody, headline, report } from "@/lib/domain-connect-watch";
import { sendByResend } from "@/lib/email-provider";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * HRT-289, R22.2. The daily question, and the one line that answers it.
 *
 * Nobody can be asked to check seven DNS companies by hand every morning, so
 * this does it and sends what it found. It reads nothing and writes nothing:
 * the worst a wrong call can do is send one email.
 */
const WATCHER = "bolu@connectapp.church";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env["CRON_SECRET"];
  const given = request.headers.get("authorization");
  if (!secret || given !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const answers = await askEverybody();
  const body = report(answers);

  const sent = await post(headline(answers), body);
  if (!sent) return Response.json({ sent: false, answers });

  return Response.json({ sent: true, answers });
}

/**
 * R22.2. The day's answer, through whichever way out is configured.
 *
 * Resend first, because the platform has its own account there and this is
 * the platform writing to itself. The support mailbox's own SMTP is the
 * fallback, so a deployment that has one of the two can send.
 */
async function post(subject: string, text: string): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["PLATFORM_FROM_EMAIL"] ?? process.env["SUPPORT_FROM_EMAIL"];

  if (key && from) {
    const proof = await sendByResend(key, {
      from: `ConnectApp <${from}>`,
      to: WATCHER,
      subject,
      text,
    });
    if (proof.ok) return true;
    console.error("[domain-connect] Resend refused the day's answer", proof.said);
  }

  const user = process.env["SUPPORT_SMTP_USER"];
  const password = process.env["SUPPORT_SMTP_APP_PASSWORD"];
  const smtpFrom = process.env["SUPPORT_FROM_EMAIL"];
  if (!user || !password || !smtpFrom) {
    console.error("[domain-connect] no way to send the day's answer");
    return false;
  }

  try {
    const out = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 10_000,
      auth: { user, pass: password },
    });
    await out.sendMail({ from: `ConnectApp <${smtpFrom}>`, to: WATCHER, subject, text });
    return true;
  } catch (error) {
    console.error("[domain-connect] the day's answer did not send", error);
    return false;
  }
}
