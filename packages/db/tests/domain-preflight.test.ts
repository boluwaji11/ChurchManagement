/**
 * HRT-283, R22.2. Reading a church's domain before anything is changed.
 *
 * The answers here are what a volunteer is shown on the screen where they
 * decide whether to let us near their DNS, so the checks are about what we
 * would leave alone as much as what we would add. The resolver is answered
 * from a table: these tests say nothing about the network.
 */
import { describe, it, expect } from "vitest";
import {
  readDomain, bareDomain, mailProviderOf, registrarOf,
  spfRecords, dmarcPolicy, plannedRecords, warningsFor, aimedAt,
  isApex, hostLabel, suggestSubdomain, apexOf,
  type Resolver,
} from "../src/domain/preflight";

/** A domain that answers however the test says, and throws for the rest. */
const answering = (answers: {
  mx?: { exchange: string; priority: number }[];
  txt?: Record<string, string[][]>;
  ns?: string[];
  cname?: string[];
}): Resolver => ({
  async mx() {
    if (!answers.mx) throw new Error("ENODATA");
    return answers.mx;
  },
  async txt(host: string) {
    const found = answers.txt?.[host];
    if (!found) throw new Error("ENODATA");
    return found;
  },
  async ns() {
    if (!answers.ns) throw new Error("ENODATA");
    return answers.ns;
  },
  async cname() {
    if (!answers.cname) throw new Error("ENODATA");
    return answers.cname;
  },
});

describe("the name somebody typed", () => {
  it("takes a domain out of whatever was pasted in", () => {
    expect(bareDomain("https://www.fairviewchurch.org/giving")).toBe("fairviewchurch.org");
    expect(bareDomain("  FairviewChurch.ORG. ")).toBe("fairviewchurch.org");
    expect(bareDomain("fairviewchurch.org")).toBe("fairviewchurch.org");
  });

  it("refuses what is not a domain", () => {
    for (const bad of ["", "   ", "localhost", "grace", "http://", "192.168.0.1"]) {
      expect(bareDomain(bad)).toBeNull();
    }
  });
});

describe("naming what we found", () => {
  it("knows the mail hosts a church is actually on", () => {
    expect(mailProviderOf(["aspmx.l.google.com", "alt1.aspmx.l.google.com"]))
      .toBe("Google Workspace");
    expect(mailProviderOf(["fairviewchurch-org.mail.protection.outlook.com"]))
      .toBe("Microsoft 365");
    expect(mailProviderOf(["mx.zoho.com"])).toBe("Zoho Mail");
    expect(mailProviderOf(["mail.someplace.co.uk"])).toBeNull();
  });

  it("knows where somebody has to log in to type a record", () => {
    expect(registrarOf(["ns01.domaincontrol.com", "ns02.domaincontrol.com"])).toBe("GoDaddy");
    expect(registrarOf(["ns1.wixdns.net"])).toBe("Wix");
    expect(registrarOf(["kip.ns.cloudflare.com"])).toBe("Cloudflare");
    expect(registrarOf(["ns-1.awsdns-01.org"])).toBe("Amazon Route 53");
    expect(registrarOf(["ns1.someplace.net"])).toBeNull();
  });

  it("picks SPF out of the other TXT records", () => {
    const txt = [
      "google-site-verification=abc123",
      "v=spf1 include:_spf.google.com ~all",
      "MS=ms12345",
    ];
    expect(spfRecords(txt)).toEqual(["v=spf1 include:_spf.google.com ~all"]);
  });

  it("reads the DMARC policy, and says nothing where there is none", () => {
    expect(dmarcPolicy(["v=DMARC1; p=reject; rua=mailto:d@grace.org"])).toBe("reject");
    expect(dmarcPolicy(["v=DMARC1; p=quarantine"])).toBe("quarantine");
    expect(dmarcPolicy(["v=DMARC1; p=none"])).toBe("none");
    expect(dmarcPolicy(["google-site-verification=abc"])).toBeNull();
  });
});

describe("what we would add", () => {
  it("is three records, and the key goes at the root", () => {
    const plan = plannedRecords("fairviewchurch.org");
    expect(plan).toHaveLength(3);

    const dkim = plan.find((one) => one.purpose === "dkim")!;
    expect(dkim.type).toBe("TXT");
    expect(dkim.host).toBe("resend._domainkey.fairviewchurch.org");
  });

  /*
   * The whole reason a church's inbox survives this. The SPF record and the
   * return path go on a subdomain of their own, so the root MX pointing at
   * Google is never in the picture.
   */
  it("puts SPF and the return path on a subdomain, never at the root", () => {
    const plan = plannedRecords("fairviewchurch.org");
    for (const one of plan.filter((each) => each.purpose !== "dkim")) {
      expect(one.host).toBe("send.fairviewchurch.org");
    }
    expect(plan.some((one) => one.type === "MX" && one.host === "fairviewchurch.org"))
      .toBe(false);
  });
});

describe("what a volunteer is warned about", () => {
  it("says nothing when there is nothing to say", () => {
    expect(warningsFor({
      mailHosts: ["aspmx.l.google.com"], spfCount: 1, dkimTaken: false, dmarc: "none",
    })).toEqual([]);
  });

  it("mentions a domain that receives no mail at all", () => {
    const out = warningsFor({ mailHosts: [], spfCount: 0, dkimTaken: false, dmarc: null });
    expect(out.map((one) => one.code)).toContain("noMx");
  });

  it("mentions two SPF records, which is already broken", () => {
    const out = warningsFor({
      mailHosts: ["aspmx.l.google.com"], spfCount: 2, dkimTaken: false, dmarc: null,
    });
    expect(out.map((one) => one.code)).toContain("manySpf");
  });

  it("mentions a key already sitting where ours goes", () => {
    const out = warningsFor({
      mailHosts: ["aspmx.l.google.com"], spfCount: 1, dkimTaken: true, dmarc: null,
    });
    expect(out.map((one) => one.code)).toContain("dkimTaken");
  });

  it("mentions a strict DMARC policy, and carries which one", () => {
    const out = warningsFor({
      mailHosts: ["aspmx.l.google.com"], spfCount: 1, dkimTaken: false, dmarc: "reject",
    });
    expect(out).toContainEqual({ code: "dmarcStrict", detail: "reject" });
  });
});

describe("reading a whole domain", () => {
  const grace = answering({
    mx: [
      { exchange: "alt1.aspmx.l.google.com.", priority: 5 },
      { exchange: "aspmx.l.google.com.", priority: 1 },
    ],
    txt: {
      "fairviewchurch.org": [
        ["google-site-verification=abc123"],
        ["v=spf1 include:_spf.google.com ~all"],
      ],
      "_dmarc.fairviewchurch.org": [["v=DMARC1; p=reject; rua=mailto:d@fairviewchurch.org"]],
    },
    ns: ["ns01.domaincontrol.com", "ns02.domaincontrol.com"],
  });

  it("names the provider, the registrar and the policy", async () => {
    const found = (await readDomain("https://fairviewchurch.org", grace))!;

    expect(found.domain).toBe("fairviewchurch.org");
    expect(found.mailProvider).toBe("Google Workspace");
    expect(found.registrar).toBe("GoDaddy");
    expect(found.dmarc).toBe("reject");
    expect(found.spf).toBe("v=spf1 include:_spf.google.com ~all");
  });

  it("lists their mail hosts in the order mail actually tries them", async () => {
    const found = (await readDomain("fairviewchurch.org", grace))!;
    expect(found.mailHosts[0]).toBe("aspmx.l.google.com");
  });

  it("says their mail, their SPF and their policy are all left where they are", async () => {
    const found = (await readDomain("fairviewchurch.org", grace))!;
    expect(found.leaving).toEqual(["mx", "spf", "dmarc"]);
    expect(found.dkimTaken).toBe(false);
  });

  /* A TXT record over 255 characters arrives in pieces, which is how a real
     DKIM key arrives, and reading only the first piece misses it. */
  it("joins a record that was published in pieces", async () => {
    const split = answering({
      txt: {
        "fairviewchurch.org": [["v=spf1 ", "include:_spf.google.com ~all"]],
      },
    });
    const found = (await readDomain("fairviewchurch.org", split))!;
    expect(found.spf).toBe("v=spf1 include:_spf.google.com ~all");
  });

  it("still answers when a domain publishes almost nothing", async () => {
    const bare = answering({});
    const found = (await readDomain("newchurch.org", bare))!;

    expect(found.mailProvider).toBeNull();
    expect(found.registrar).toBeNull();
    expect(found.leaving).toEqual([]);
    expect(found.adding).toHaveLength(3);
    expect(found.warnings.map((one) => one.code)).toContain("noMx");
  });

  it("refuses a name that is not a domain", async () => {
    expect(await readDomain("not a domain", answering({}))).toBeNull();
  });
});

/*
 * R1.1. The one question the church's own address screen has to answer: has
 * the thing we asked them to do been done.
 */
describe("whether the name reaches us yet", () => {
  it("matches however the provider wrote the target", () => {
    expect(aimedAt(["connectapp.church."], "connectapp.church")).toBe(true);
    expect(aimedAt(["ConnectApp.Church"], "connectapp.church")).toBe(true);
    // A host carrying a port, which is what a laptop hands us.
    expect(aimedAt(["localhost"], "localhost:4488")).toBe(true);
  });

  it("says no when it points somewhere else, or nowhere", () => {
    expect(aimedAt(["ghs.googlehosted.com"], "connectapp.church")).toBe(false);
    expect(aimedAt([], "connectapp.church")).toBe(false);
    expect(aimedAt(["connectapp.church"], "   ")).toBe(false);
  });

  it("answers on a whole reading, and stays quiet when nothing was asked", async () => {
    const pointed = answering({ cname: ["connectapp.church."] });
    const live = await readDomain("members.grace.org", pointed, "connectapp.church");
    expect(live!.pointsHere).toBe(true);

    const elsewhere = await readDomain("members.grace.org", answering({}), "connectapp.church");
    expect(elsewhere!.pointsHere).toBe(false);

    const unasked = await readDomain("members.grace.org", pointed);
    expect(unasked!.pointsHere).toBeNull();
  });
});

/*
 * R1.1. The rule that stops us handing a church a record that breaks its mail.
 * A CNAME cannot sit on the domain itself, so knowing which name is the domain
 * itself decides what the screen is allowed to say.
 */
describe("the domain itself, against a name under it", () => {
  it("knows an ordinary apex", () => {
    expect(isApex("onefamilychurch.com")).toBe(true);
    expect(isApex("grace.org")).toBe(true);
    expect(isApex("members.grace.org")).toBe(false);
    expect(isApex("my.members.grace.org")).toBe(false);
  });

  /* Counting dots would call this a subdomain and be wrong. */
  it("knows an apex under a two-part suffix", () => {
    expect(isApex("grace.co.uk")).toBe(true);
    expect(isApex("grace.org.uk")).toBe(true);
    expect(isApex("grace.com.au")).toBe(true);
    expect(isApex("members.grace.co.uk")).toBe(false);
  });

  it("gives the provider's Name box what it actually wants", () => {
    expect(hostLabel("members.grace.org")).toBe("members");
    expect(hostLabel("my.members.grace.org")).toBe("my.members");
    expect(hostLabel("members.grace.co.uk")).toBe("members");
    // The domain itself, which providers write as @.
    expect(hostLabel("grace.org")).toBe("@");
    expect(hostLabel("grace.co.uk")).toBe("@");
  });

  it("offers a name under the church's own domain", () => {
    expect(suggestSubdomain("grace.org")).toBe("members.grace.org");
    expect(suggestSubdomain("grace.co.uk", "my")).toBe("my.grace.co.uk");
  });
});

/*
 * R1.1. The bug this exists to stop coming back: a church plainly at GoDaddy
 * came back with no provider named, because the nameservers were looked for on
 * the subdomain they had typed rather than on their domain.
 */
describe("reading a name under the church's domain", () => {
  it("finds the domain itself from any name under it", () => {
    expect(apexOf("members.grace.org")).toBe("grace.org");
    expect(apexOf("my.members.grace.org")).toBe("grace.org");
    expect(apexOf("grace.org")).toBe("grace.org");
    expect(apexOf("members.grace.co.uk")).toBe("grace.co.uk");
    expect(apexOf("grace.co.uk")).toBe("grace.co.uk");
  });

  it("names the provider and the mail from the domain, not from the subdomain", async () => {
    const resolver: Resolver = {
      async mx(host) {
        if (host !== "grace.org") throw new Error("ENODATA");
        return [{ exchange: "aspmx.l.google.com.", priority: 1 }];
      },
      async txt(host) {
        if (host !== "grace.org") throw new Error("ENODATA");
        return [["v=spf1 include:_spf.google.com ~all"]];
      },
      async ns(host) {
        if (host !== "grace.org") throw new Error("ENODATA");
        return ["ns01.domaincontrol.com"];
      },
      async cname(host) {
        if (host !== "members.grace.org") throw new Error("ENODATA");
        return ["connectapp.church."];
      },
    };

    const found = (await readDomain("members.grace.org", resolver, "connectapp.church"))!;

    expect(found.domain).toBe("members.grace.org");
    expect(found.mailProvider).toBe("Google Workspace");
    expect(found.registrar).toBe("GoDaddy");
    expect(found.spf).toContain("v=spf1");
    // And where the typed name points is still read on the typed name.
    expect(found.pointsHere).toBe(true);
  });

  it("puts the sending records on the domain rather than on the subdomain", async () => {
    const quiet: Resolver = {
      async mx() { throw new Error("ENODATA"); },
      async txt() { throw new Error("ENODATA"); },
      async ns() { throw new Error("ENODATA"); },
      async cname() { throw new Error("ENODATA"); },
    };
    const found = (await readDomain("members.grace.org", quiet))!;
    expect(found.adding.every((one) => one.host.endsWith("grace.org"))).toBe(true);
    expect(found.adding.some((one) => one.host.includes("members.grace.org"))).toBe(false);
  });
});
