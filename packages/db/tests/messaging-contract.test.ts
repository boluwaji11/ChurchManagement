/**
 * HRT-286, HRT-287, HRT-123, R16.2, R16.8, R21.15.
 *
 * The rules a church's messaging hangs off, before any vendor exists to obey
 * them. Nothing here touches a database or a network.
 *
 * The two that matter: a registration cannot be submitted with nothing to put
 * on the carrier's form, and an imported contact has not agreed to anything.
 */
import { describe, it, expect } from "vitest";
import {
  canMoveTo, isWaiting, readyToSubmit, mayContact,
  REGISTRATION_STATES, VENDOR_CHANNEL,
} from "../src/messaging/contract";
import { maskCredential } from "../src/crypto";

describe("how a registration moves", () => {
  it("goes out, waits, and comes back one way or the other", () => {
    expect(canMoveTo("draft", "submitted")).toBe(true);
    expect(canMoveTo("submitted", "in_review")).toBe(true);
    expect(canMoveTo("in_review", "approved")).toBe(true);
    expect(canMoveTo("in_review", "rejected")).toBe(true);
  });

  /* The state the narrative version of this product does not have, and the
     one a church actually sits in for three days. */
  it("knows which states are a church waiting rather than acting", () => {
    expect(isWaiting("submitted")).toBe(true);
    expect(isWaiting("in_review")).toBe(true);
    expect(isWaiting("draft")).toBe(false);
    expect(isWaiting("rejected")).toBe(false);
    expect(isWaiting("approved")).toBe(false);
  });

  it("lets a refused registration be fixed and sent again", () => {
    expect(canMoveTo("rejected", "draft")).toBe(true);
  });

  it("never skips the submission", () => {
    expect(canMoveTo("draft", "approved")).toBe(false);
    expect(canMoveTo("draft", "in_review")).toBe(false);
  });

  it("treats an approval as final", () => {
    for (const state of REGISTRATION_STATES) {
      expect(canMoveTo("approved", state)).toBe(false);
    }
  });
});

describe("whether a registration can honestly be submitted", () => {
  const church = {
    legalName: "Fairview Church",
    taxId: "12-3456789",
    hasAddress: true,
    consented: 40,
    brandApproved: true,
  };

  it("is ready when the church's own details are on its record", () => {
    expect(readyToSubmit({ ...church, kind: "brand" }).ready).toBe(true);
  });

  it("names each thing the carrier's form would be short of", () => {
    const out = readyToSubmit({
      ...church, kind: "brand", legalName: "  ", taxId: null, hasAddress: false,
    });
    expect(out.ready).toBe(false);
    expect(out.missing).toEqual([
      "messaging.missing.legalName",
      "messaging.missing.taxId",
      "messaging.missing.address",
    ]);
  });

  /*
   * R16.8. The reason consent is built before the registration rather than
   * after it. The carrier asks how people opted in, and a church that has
   * recorded nothing has no answer worth writing down.
   */
  it("refuses a campaign when nobody has agreed to be texted", () => {
    const out = readyToSubmit({ ...church, kind: "campaign", consented: 0 });
    expect(out.ready).toBe(false);
    expect(out.missing).toContain("messaging.missing.consent");
  });

  it("refuses a campaign before its brand is approved", () => {
    const out = readyToSubmit({ ...church, kind: "campaign", brandApproved: false });
    expect(out.missing).toContain("messaging.missing.brand");
  });

  it("asks a brand for neither of those", () => {
    const out = readyToSubmit({
      ...church, kind: "brand", consented: 0, brandApproved: false,
    });
    expect(out.ready).toBe(true);
  });
});

describe("whether somebody may be contacted", () => {
  const base = { channel: "email" as const, source: "form" as const, transactional: false };

  it("needs consent actually given before anything goes out", () => {
    expect(mayContact({ ...base, state: "granted" })).toBe(true);
    expect(mayContact({ ...base, state: "unknown" })).toBe(false);
  });

  /* Somebody who asked to be left alone has asked to be left alone, and a
     receipt is not an exception to that. */
  it("stops everything once somebody has withdrawn", () => {
    expect(mayContact({ ...base, state: "withdrawn" })).toBe(false);
    expect(mayContact({ ...base, state: "withdrawn", transactional: true })).toBe(false);
  });

  it("still sends what the church owes somebody it has not asked", () => {
    expect(mayContact({ ...base, state: "unknown", transactional: true })).toBe(true);
  });

  /*
   * Four hundred rows from a spreadsheet are four hundred people nobody asked.
   * Enough for a statement they are owed, never enough to put them on a list.
   */
  it("refuses to text somebody who arrived in an import", () => {
    expect(mayContact({
      channel: "sms", state: "granted", source: "import", transactional: false,
    })).toBe(false);

    expect(mayContact({
      channel: "email", state: "granted", source: "import", transactional: false,
    })).toBe(true);

    expect(mayContact({
      channel: "sms", state: "granted", source: "form", transactional: false,
    })).toBe(true);
  });
});

describe("a credential", () => {
  it("is never written down, not even its first characters", () => {
    expect(maskCredential("ACzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")).toBe("set");
    expect(maskCredential(null)).toBe("not set");
    expect(maskCredential("   ")).toBe("not set");
  });
});

describe("the vendors", () => {
  it("each carry one channel, so a screen never has to ask", () => {
    expect(VENDOR_CHANNEL.resend).toBe("email");
    expect(VENDOR_CHANNEL.smtp).toBe("email");
    expect(VENDOR_CHANNEL.twilio).toBe("sms");
  });
});
