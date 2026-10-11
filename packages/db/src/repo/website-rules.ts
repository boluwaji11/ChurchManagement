import { InvalidInputError } from "../errors";
import type { MessageKey } from "@connectapp/i18n";
import type { WebsiteSection, WebsiteSectionType } from "../schema/tenancy";

export const WEBSITE_SECTION_TYPES: readonly WebsiteSectionType[] = [
  "hero", "story", "banner", "image", "video", "services", "contact",
];

export const DEFAULT_WEBSITE_SECTIONS: WebsiteSection[] = [
  { id: "hero", type: "hero", title: "", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
  { id: "story", type: "story", title: "", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
  { id: "services", type: "services", title: "", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
  { id: "contact", type: "contact", title: "", body: "", imageUrl: null, imageKey: null, videoUrl: null, videoKey: null, alt: "", linkLabel: null, linkUrl: null },
];

function cleanHttpsUrl(value: string | null, key: MessageKey): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new InvalidInputError(key);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new InvalidInputError(key);
  }
  return parsed.toString();
}

export function cleanWebsiteImageUrl(value: string | null): string | null {
  return cleanHttpsUrl(value, "website.error.imageUrl");
}

export function cleanWebsiteVideoUrl(value: string | null): string | null {
  const url = cleanHttpsUrl(value, "website.error.videoUrl");
  if (!url) return null;
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);
  if (youtubeHosts.has(host)) {
    const id = host === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") ??
        parsed.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})$/)?.[1];
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) {
      throw new InvalidInputError("website.error.videoUrl");
    }
    return `https://www.youtube.com/watch?v=${id}`;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com") {
    const id = parsed.pathname.match(/^\/(\d+)\/?$/)?.[1];
    if (id) return `https://vimeo.com/${id}`;
  }
  throw new InvalidInputError("website.error.videoUrl");
}

export function cleanWebsiteLinkUrl(value: string | null): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  if (/^\/(?:f|g|e)\/[a-z0-9-]+\/[A-Za-z0-9_-]+(?:\/register)?\/?$/.test(raw)) {
    return raw;
  }
  return cleanHttpsUrl(raw, "website.error.linkUrl");
}

export function websiteVideoEmbedUrl(value: string | null): string | null {
  const cleaned = cleanWebsiteVideoUrl(value);
  if (!cleaned) return null;
  const url = new URL(cleaned);
  if (url.hostname === "vimeo.com") {
    return `https://player.vimeo.com/video/${url.pathname.slice(1)}`;
  }
  return `https://www.youtube-nocookie.com/embed/${url.searchParams.get("v")}`;
}

export function cleanWebsiteSections(value: unknown): WebsiteSection[] {
  if (!Array.isArray(value) || value.length > 20) {
    throw new InvalidInputError("website.error.sections");
  }
  const ids = new Set<string>();
  return value.map((item): WebsiteSection => {
    if (!item || typeof item !== "object") throw new InvalidInputError("website.error.sections");
    const section = item as Record<string, unknown>;
    const id = typeof section["id"] === "string" ? section["id"] : "";
    const type = section["type"];
    if (
      !/^[A-Za-z0-9_-]{1,64}$/.test(id) ||
      ids.has(id) ||
      typeof type !== "string" ||
      !WEBSITE_SECTION_TYPES.includes(type as WebsiteSectionType)
    ) {
      throw new InvalidInputError("website.error.sections");
    }
    ids.add(id);
    const stringValue = (key: string, max: number): string => {
      const entry = section[key];
      if (entry === undefined || entry === null) return "";
      if (typeof entry !== "string" || entry.length > max) {
        throw new InvalidInputError("website.error.tooLong");
      }
      return entry.trim();
    };
    const imageValue = section["imageUrl"];
    const videoValue = section["videoUrl"];
    const imageKey = section["imageKey"];
    const videoKey = section["videoKey"];
    const linkUrlValue = section["linkUrl"];
    const linkLabelValue = section["linkLabel"];
    if (
      (imageValue !== undefined && imageValue !== null && typeof imageValue !== "string") ||
      (videoValue !== undefined && videoValue !== null && typeof videoValue !== "string") ||
      (imageKey !== undefined && imageKey !== null && typeof imageKey !== "string") ||
      (videoKey !== undefined && videoKey !== null && typeof videoKey !== "string") ||
      (linkUrlValue !== undefined && linkUrlValue !== null && typeof linkUrlValue !== "string") ||
      (linkLabelValue !== undefined && linkLabelValue !== null && typeof linkLabelValue !== "string")
    ) {
      throw new InvalidInputError("website.error.sections");
    }
    const normalizedImageKey = typeof imageKey === "string" ? imageKey.trim() || null : null;
    const normalizedVideoKey = typeof videoKey === "string" ? videoKey.trim() || null : null;
    if (
      (normalizedImageKey && !/^[a-z0-9-]+\/website_media\/[a-f0-9-]+\.(?:png|jpg|webp)$/.test(normalizedImageKey)) ||
      (normalizedVideoKey && !/^[a-z0-9-]+\/website_media\/[a-f0-9-]+\.(?:mp4|webm)$/.test(normalizedVideoKey))
    ) {
      throw new InvalidInputError("website.error.sections");
    }
    const imageUrl = normalizedImageKey ? null : cleanWebsiteImageUrl(
      typeof imageValue === "string" ? imageValue : null,
    );
    const videoUrl = type === "video" && !normalizedVideoKey
      ? cleanWebsiteVideoUrl(typeof videoValue === "string" ? videoValue : null)
      : null;
    const linkUrl = cleanWebsiteLinkUrl(
      typeof linkUrlValue === "string" ? linkUrlValue : null,
    );
    const linkLabel = stringValue("linkLabel", 60);
    if (linkUrl && !linkLabel) throw new InvalidInputError("website.error.linkUrl");
    return {
      id,
      type: type as WebsiteSectionType,
      title: stringValue("title", 120),
      body: stringValue("body", 2000),
      imageUrl,
      imageKey: normalizedImageKey,
      videoUrl,
      videoKey: type === "video" ? normalizedVideoKey : null,
      alt: stringValue("alt", 200),
      linkLabel: linkUrl ? linkLabel : null,
      linkUrl,
    };
  });
}
