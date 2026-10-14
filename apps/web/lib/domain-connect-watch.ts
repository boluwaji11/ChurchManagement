import "server-only";
import { dnsResolver } from "@connectapp/db";
import { discover, settingsFor, holdsOurTemplate, holdsTemplate } from "@/lib/domain-connect";

/**
 * HRT-289, R22.2. Who has picked up our template, asked every day.
 *
 * Domain Connect publishes no schedule. A DNS company pulls the template
 * repository when it chooses and loads what it chooses, so the only way to
 * know is to ask, and the only honest answer on any given day is what the
 * asking returned.
 *
 * Each company is asked through its own domain rather than through a list of
 * endpoints we keep, which is the same path a church's screen takes. An
 * endpoint that moves is then followed rather than reported as broken.
 */

/** A DNS company, and a domain of its own that announces its endpoint. */
const COMPANIES: readonly { name: string; probe: string }[] = [
  { name: "IONOS", probe: "ionos.com" },
  { name: "GoDaddy", probe: "coolexample.com" },
  { name: "Cloudflare", probe: "cloudflare.com" },
  { name: "Vercel", probe: "nextjs.org" },
  { name: "WordPress.com", probe: "wordpress.com" },
  { name: "Domain Chief", probe: "chief.app" },
  { name: "Glauca Digital", probe: "glauca.digital" },
];

/** The template every implementation is expected to hold, used as the control. */
const CONTROL = { providerId: "exampleservice.domainconnect.org", serviceId: "template1" };

export type Verdict = "holds" | "live" | "silent";

export interface Answer {
  name: string;
  verdict: Verdict;
  /** Where it was asked, so a wrong answer can be checked by hand. */
  at: string | null;
}

/**
 * R22.2. One company's answer today.
 *
 * Three outcomes, and the difference between the last two is the whole point
 * of the control: "live" means the company answers for the standard's own
 * example and not for us, which is a template we are waiting on. "silent"
 * means it does not serve that question at all, which is a company we will
 * never hear from and should stop counting.
 */
async function ask(company: { name: string; probe: string }): Promise<Answer> {
  const host = await discover(company.probe, dnsResolver()).catch(() => null);
  if (!host) return { name: company.name, verdict: "silent", at: null };

  const urlAPI = (await settingsFor(host, company.probe))?.urlAPI ?? `https://${host}`;

  if (await holdsOurTemplate(urlAPI)) return { name: company.name, verdict: "holds", at: urlAPI };
  return {
    name: company.name,
    verdict: (await holdsTemplate(urlAPI, CONTROL.providerId, CONTROL.serviceId))
      ? "live"
      : "silent",
    at: urlAPI,
  };
}

export async function askEverybody(): Promise<Answer[]> {
  return Promise.all(COMPANIES.map(ask));
}

/** R22.2. The day's answer, as a line somebody reads on a phone. */
export function headline(answers: readonly Answer[]): string {
  const holding = answers.filter((one) => one.verdict === "holds").map((one) => one.name);
  if (holding.length === 0) return "Domain Connect: still nobody";
  return `Domain Connect: ${holding.join(", ")}`;
}

export function report(answers: readonly Answer[]): string {
  const say = (one: Answer) =>
    one.verdict === "holds"
      ? `${one.name}: holds our template. Churches there get the one press.`
      : one.verdict === "live"
        ? `${one.name}: answers, without our template yet.`
        : `${one.name}: does not answer this question at all.`;

  return [
    headline(answers),
    "",
    ...answers.map(say),
    "",
    "Asked at " + new Date().toISOString(),
  ].join("\n");
}
