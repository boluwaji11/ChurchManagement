import { describe, expect, it } from "vitest";
import { InvalidInputError } from "../src/errors";
import { ONE_MIB, UPLOAD_RULES } from "../src/repo/storage-rules";
import {
  cleanWebsiteImageUrl, cleanWebsiteLinkUrl, cleanWebsiteSections, cleanWebsiteVideoUrl,
  websiteVideoEmbedUrl,
} from "../src/repo/website-rules";

describe("public website media URLs", () => {
  it("accepts secure image URLs", () => {
    expect(cleanWebsiteImageUrl("https://images.example.org/church.jpg"))
      .toBe("https://images.example.org/church.jpg");
  });

  it("rejects insecure image URLs", () => {
    expect(() => cleanWebsiteImageUrl("http://images.example.org/church.jpg"))
      .toThrow(InvalidInputError);
  });

  it("accepts YouTube and emits a privacy-enhanced embed URL", () => {
    expect(cleanWebsiteVideoUrl("https://youtu.be/dQw4w9WgXcQ"))
      .toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(websiteVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("accepts Vimeo and emits its player URL", () => {
    expect(websiteVideoEmbedUrl("https://vimeo.com/123456789"))
      .toBe("https://player.vimeo.com/video/123456789");
  });

  it("rejects untrusted video hosts", () => {
    expect(() => cleanWebsiteVideoUrl("https://example.org/watch?v=dQw4w9WgXcQ"))
      .toThrow(InvalidInputError);
  });

  it("accepts secure external links and known public ConnectApp destinations", () => {
    expect(cleanWebsiteLinkUrl("https://youtube.com/@connectapp"))
      .toBe("https://youtube.com/@connectapp");
    expect(cleanWebsiteLinkUrl("/f/river-church/new-here")).toBe("/f/river-church/new-here");
    expect(cleanWebsiteLinkUrl("/g/river-church/community-group"))
      .toBe("/g/river-church/community-group");
    expect(cleanWebsiteLinkUrl("/e/river-church/summer-gathering/register"))
      .toBe("/e/river-church/summer-gathering/register");
    expect(() => cleanWebsiteLinkUrl("javascript:alert(1)")).toThrow(InvalidInputError);
    expect(() => cleanWebsiteLinkUrl("/settings/roles")).toThrow(InvalidInputError);
  });

  it("validates uploaded media key formats and shared upload limits", () => {
    const sections = cleanWebsiteSections([
      {
        id: "photo",
        type: "image",
        title: "",
        body: "",
        imageUrl: null,
        imageKey: "river-church/website_media/0f5d6b92-9f1a-4a2d-99fb-68626d7024d4.webp",
        videoUrl: null,
        alt: "",
      },
      {
        id: "clip",
        type: "video",
        title: "",
        body: "",
        imageUrl: null,
        videoUrl: null,
        videoKey: "river-church/website_media/0f5d6b92-9f1a-4a2d-99fb-68626d7024d4.mp4",
        alt: "",
      },
    ]);
    expect(sections[0]?.imageKey).toContain("/website_media/");
    expect(sections[1]?.videoKey).toContain("/website_media/");
    expect(UPLOAD_RULES.website_media.types).toEqual([
      "image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm",
    ]);
    expect(UPLOAD_RULES.website_media.maxBytes).toBe(10 * ONE_MIB);
    expect(() => cleanWebsiteSections([{
      id: "photo",
      type: "image",
      title: "",
      body: "",
      imageUrl: null,
      imageKey: "another-church/website_media/photo.webp",
      videoUrl: null,
      alt: "",
    }])).toThrow(InvalidInputError);
  });

  it("preserves valid section order and rejects invalid section data", () => {
    const sections = cleanWebsiteSections([
      { id: "hero", type: "hero", title: "Welcome", body: "", imageUrl: null, videoUrl: null, alt: "" },
      { id: "story", type: "story", title: "About", body: "A community church.", imageUrl: null, videoUrl: null, alt: "" },
    ]);
    expect(sections.map((section) => section.id)).toEqual(["hero", "story"]);
    expect(sections[0]?.linkUrl).toBeNull();
    expect(cleanWebsiteSections([{
      id: "cta",
      type: "hero",
      title: "Welcome",
      body: "",
      imageUrl: null,
      videoUrl: null,
      alt: "",
      linkLabel: "Watch on YouTube",
      linkUrl: "https://youtube.com/@riverchurch",
    }])[0]?.linkUrl).toBe("https://youtube.com/@riverchurch");
    expect(() => cleanWebsiteSections([{
      id: "cta",
      type: "hero",
      title: "Welcome",
      body: "",
      imageUrl: null,
      videoUrl: null,
      alt: "",
      linkLabel: "",
      linkUrl: "/f/river-church/new-here",
    }])).toThrow(InvalidInputError);
    expect(() => cleanWebsiteSections([
      { id: "one", type: "story", title: "", body: "", imageUrl: null, videoUrl: null, alt: "" },
      { id: "one", type: "story", title: "", body: "", imageUrl: null, videoUrl: null, alt: "" },
    ])).toThrow(InvalidInputError);
    expect(() => cleanWebsiteSections("invalid")).toThrow(InvalidInputError);
  });
});
