/**
 * HRT-74. Which service the station opens on (R8.2).
 *
 * A church with a 09:00 and an 11:00 has a desk standing in front of both all
 * morning. Opening on the first of the day means that at 11:15 a volunteer is
 * writing children into a service that finished two hours ago, and nothing on
 * the screen says so.
 */
import { describe, it, expect } from "vitest";
import { serviceNow } from "../src/repo/which-service";

const first = { id: "first", startsAt: "09:00" };
const second = { id: "second", startsAt: "11:00" };
const evening = { id: "evening", startsAt: "19:00" };
const sunday = [first, second, evening];

describe("the service happening now", () => {
  it("takes the one that has started most recently", () => {
    expect(serviceNow(sunday, "09:05")).toBe("first");
    expect(serviceNow(sunday, "10:30")).toBe("first");
    // Eleven fifteen is the second service, not the first one running late.
    expect(serviceNow(sunday, "11:15")).toBe("second");
    expect(serviceNow(sunday, "19:40")).toBe("evening");
  });

  it("takes the next one before the day starts", () => {
    expect(serviceNow(sunday, "08:00")).toBe("first");
    expect(serviceNow(sunday, "08:59")).toBe("first");
  });

  it("lets go of one that finished hours ago", () => {
    // Half past four is nearer the evening service than this morning's.
    expect(serviceNow(sunday, "16:30")).toBe("evening");
  });

  it("still answers at a time no service is near", () => {
    expect(serviceNow(sunday, "03:00")).toBe("first");
    expect(serviceNow(sunday, "23:30")).toBe("evening");
  });

  it("has nothing to say about an empty day", () => {
    expect(serviceNow([], "09:00")).toBe("");
  });

  it("takes the only one there is", () => {
    expect(serviceNow([second], "07:00")).toBe("second");
  });
});
