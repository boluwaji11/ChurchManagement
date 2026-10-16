/**
 * HRT-377, R22.2, R1.3. A church's website: the draft, the publish, the
 * revisions, and what a stranger can reach.
 *
 * Against the real database as the real application role, because the things
 * worth testing here are the version check, the gate on publishing and the
 * tenant isolation, and none of those is in TypeScript.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { dropTenants, testTenant } from "./helpers/tenant";
import {
  docFromOldWebsite, publicSite, publishSite, restoreSiteRevision, saveSiteDraft,
  siteMediaIsPublic, siteRevisions, siteState, startSite, unpublishSite,
  SiteConflictError,
} from "../src/repo/church-site";
import { cleanSiteDoc } from "../src/repo/site-doc";
import { cleanSectionContent } from "../src/repo/site-sections";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";

const ONE = "site-one-church";
const TWO = "site-two-church";
const PENDING = "site-pending-church";

let one: string;
let two: string;
let pending: string;

const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);
const actor = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });

const doc = (over: Record<string, unknown> = {}) => cleanSiteDoc({
  template: "gathering",
  homeId: "home",
  pages: [{
    id: "home", title: "Home", slug: "", inNav: true, seo: {},
    sections: [{ id: "hero", type: "hero", variant: "split", content: { title: "Welcome" } }],
  }],
  ...over,
}, cleanSectionContent);

beforeAll(async () => {
  one = await testTenant(ONE, "One Site Church");
  two = await testTenant(TWO, "Two Site Church");
  pending = await testTenant(PENDING, "Pending Site Church", { approved: false });
});

afterAll(async () => {
  await dropTenants(ONE, TWO, PENDING);
  await closeConnections();
});

describe("opening the editor", () => {
  it("says nothing for a church that has never had a website", async () => {
    expect(await run(one, "owner", (tx) => siteState(tx, one))).toBeNull();
  });

  it("holds the document a template started it with", async () => {
    await run(one, "owner", (tx) => startSite(tx, actor(one), doc()));
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    expect(state?.draft.pages).toHaveLength(1);
    expect(state?.live).toBeNull();
    expect(state?.changed).toBe(true);
  });
});

describe("saving the draft", () => {
  it("writes it and hands back the next version", async () => {
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    const result = await run(one, "owner", (tx) => saveSiteDraft(tx, actor(one), {
      doc: { ...state!.draft, template: "heritage" },
      version: state!.draftVersion,
    }));
    expect(result.draftVersion).toBe(state!.draftVersion + 1);
    const after = await run(one, "owner", (tx) => siteState(tx, one));
    expect(after?.draft.template).toBe("heritage");
  });

  it("refuses a save holding a version somebody else has moved past", async () => {
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    await expect(run(one, "owner", (tx) => saveSiteDraft(tx, actor(one), {
      doc: state!.draft,
      version: state!.draftVersion - 1,
    }))).rejects.toBeInstanceOf(SiteConflictError);
  });

  it("refuses a role that cannot manage the website", async () => {
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    await expect(run(one, "member", (tx) => saveSiteDraft(tx, actor(one, "member"), {
      doc: state!.draft,
      version: state!.draftVersion,
    }))).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("publishing", () => {
  it("refuses until the church has been approved", async () => {
    await run(pending, "owner", (tx) => startSite(tx, actor(pending), doc()));
    await expect(run(pending, "owner", (tx) => publishSite(tx, actor(pending))))
      .rejects.toBeInstanceOf(InvalidInputError);
    expect(await publicSite(PENDING)).toBeNull();
  });

  it("puts the draft on the internet and keeps a copy of what went out", async () => {
    await run(one, "owner", (tx) => publishSite(tx, actor(one), "first go"));
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    expect(state?.publishedAt).toBeInstanceOf(Date);
    expect(state?.changed).toBe(false);
    const revisions = await run(one, "owner", (tx) => siteRevisions(tx));
    expect(revisions).toHaveLength(1);
    expect(revisions[0]!.note).toBe("first go");
    expect(revisions[0]!.pages).toBe(1);
  });

  it("leaves the live copy alone while the draft moves on", async () => {
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    await run(one, "owner", (tx) => saveSiteDraft(tx, actor(one), {
      doc: {
        ...state!.draft,
        pages: [
          state!.draft.pages[0],
          { id: "visit", title: "Visit", slug: "visit", inNav: true, seo: {}, sections: [] },
        ],
      },
      version: state!.draftVersion,
    }));
    const after = await run(one, "owner", (tx) => siteState(tx, one));
    expect(after?.draft.pages).toHaveLength(2);
    expect(after?.live?.pages).toHaveLength(1);
    expect(after?.changed).toBe(true);
    const live = await publicSite(ONE);
    expect(live?.doc.pages).toHaveLength(1);
  });

  it("takes the website off the internet, keeping the draft", async () => {
    await run(one, "owner", (tx) => unpublishSite(tx, actor(one)));
    expect(await publicSite(ONE)).toBeNull();
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    expect(state?.draft.pages).toHaveLength(2);
  });

  it("brings an earlier publish back, as the draft and as the live copy", async () => {
    await run(one, "owner", (tx) => publishSite(tx, actor(one), "two pages"));
    const revisions = await run(one, "owner", (tx) => siteRevisions(tx));
    const first = revisions.find((one) => one.note === "first go")!;
    await run(one, "owner", (tx) => restoreSiteRevision(tx, actor(one), first.id));
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    expect(state?.draft.pages).toHaveLength(1);
    expect(state?.live?.pages).toHaveLength(1);
    expect(state?.changed).toBe(false);
  });
});

describe("what a stranger can reach", () => {
  it("reads a published website by the church's own address", async () => {
    const live = await publicSite(ONE);
    expect(live?.church.name).toBe("One Site Church");
    expect(live?.doc.pages[0]!.sections[0]!.type).toBe("hero");
  });

  it("reads nothing for a church that never published", async () => {
    expect(await publicSite(TWO)).toBeNull();
  });

  it("reads nothing for an address shaped like an attack", async () => {
    for (const slug of ["../../etc", "ONE", "a b", ""]) {
      expect(await publicSite(slug), slug).toBeNull();
    }
  });

  it("refuses a stored picture the published website does not point at", async () => {
    const key = `${ONE}/website_media/11111111-2222-3333-4444-555555555555.webp`;
    expect(await siteMediaIsPublic(ONE, key)).toBe(false);
  });

  it("allows a stored picture the published website does point at", async () => {
    const key = `${ONE}/website_media/11111111-2222-3333-4444-555555555555.webp`;
    const state = await run(one, "owner", (tx) => siteState(tx, one));
    const pages = [{
      ...state!.draft.pages[0]!,
      sections: [{
        id: "hero", type: "hero", variant: "split",
        content: { title: "Welcome", image: { key, url: null, alt: "The building" } },
      }],
    }];
    await run(one, "owner", (tx) => saveSiteDraft(tx, actor(one), {
      doc: { ...state!.draft, pages },
      version: state!.draftVersion,
    }));
    await run(one, "owner", (tx) => publishSite(tx, actor(one)));
    expect(await siteMediaIsPublic(ONE, key)).toBe(true);
  });
});

describe("tenant isolation", () => {
  it("shows one church nothing of another's website", async () => {
    await run(two, "owner", (tx) => startSite(tx, actor(two), doc({ template: "vibrant" })));
    const asOne = await run(one, "owner", (tx) => siteState(tx, one));
    const asTwo = await run(two, "owner", (tx) => siteState(tx, two));
    expect(asOne?.draft.template).not.toBe("vibrant");
    expect(asTwo?.draft.template).toBe("vibrant");
  });

  /* Raw cross-tenant reads and writes on every table carrying tenant_id,
     through the ORM and through SQL, are covered once in isolation.test.ts,
     which walks the tables rather than naming them. */
});

describe("the old homepage, brought forward", () => {
  it("turns each old section into the nearest new kind", () => {
    const brought = docFromOldWebsite({
      layout: "classic",
      sections: [
        { id: "hero", type: "hero", title: "Welcome", body: "Come and see.", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: "Visit", linkUrl: "https://example.org/visit" },
        { id: "story", type: "story", title: "Our story", body: "We began in 1974.", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
        { id: "services", type: "services", title: "Services", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
      ],
    });
    expect(brought.template).toBe("heritage");
    expect(brought.pages).toHaveLength(1);
    expect(brought.pages[0]!.sections.map((one) => one.type))
      .toEqual(["hero", "intro", "times"]);
    expect(brought.pages[0]!.sections[0]!.content["title"]).toBe("Welcome");
    expect(brought.pages[0]!.sections[2]!.bind).toEqual({ source: "serviceTimes" });
  });

  it("is read back by the editor for a church that had one", async () => {
    await owner()`
      insert into church_websites (tenant_id, published, layout, sections)
      values (${two}, true, 'gathering', ${JSON.stringify([
        { id: "hero", type: "hero", title: "Two", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
      ])}::jsonb)
      on conflict (tenant_id) do update set sections = excluded.sections, published = true`;
    await owner()`delete from church_sites where tenant_id = ${two}`;
    const state = await run(two, "owner", (tx) => siteState(tx, two));
    expect(state?.draft.pages[0]!.sections[0]!.content["title"]).toBe("Two");
    expect(state?.live).not.toBeNull();
    expect(await publicSite(TWO)).not.toBeNull();
  });
});
