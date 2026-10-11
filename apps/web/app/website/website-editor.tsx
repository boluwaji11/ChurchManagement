"use client";

import * as React from "react";
import {
  BookOpen, Clock3, FileText, ImagePlus, Mail, Megaphone, Plus, Upload, Video,
} from "lucide-react";
import {
  Banner, Button, Checkbox, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, Field, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Sheet, SheetContent, Textarea, Working,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type {
  ChurchWebsite, PublicWebsite, WebsiteLayout, WebsiteSection, WebsiteSectionType,
} from "@connectapp/db";
import {
  DEFAULT_WEBSITE_SECTIONS, WEBSITE_SECTION_TYPES, websiteVideoEmbedUrl,
} from "@connectapp/db/rules";
import { ChurchWebsitePage } from "@/components/church-website";
import { FormActions, formSettled } from "@/components/form-actions";
import { imageLimit } from "@/components/image-limit";
import { saveWebsite } from "./actions";

const FORM_ID = "website-form";
type Service = PublicWebsite["services"][number];

const DESIGN_SECTIONS: Record<WebsiteLayout, WebsiteSectionType[]> = {
  gathering: ["hero", "story", "services", "contact"],
  community: ["hero", "banner", "services", "contact"],
  classic: ["hero", "story", "image", "services", "contact"],
};

const SECTION_ICONS: Record<WebsiteSectionType, React.ComponentType<{ "aria-hidden"?: boolean }>> = {
  hero: BookOpen,
  story: FileText,
  banner: Megaphone,
  image: ImagePlus,
  video: Video,
  services: Clock3,
  contact: Mail,
};

const blankSection = (type: WebsiteSectionType): WebsiteSection => ({
  id: crypto.randomUUID(),
  type,
  title: "",
  body: "",
  imageUrl: null,
  imageKey: null,
  videoUrl: null,
  videoKey: null,
  alt: "",
  linkLabel: null,
  linkUrl: null,
});

const sectionsFor = (layout: WebsiteLayout) =>
  (layout === "gathering" ? DEFAULT_WEBSITE_SECTIONS : DESIGN_SECTIONS[layout].map(blankSection));

const sectionHeadingPlaceholder = (
  type: WebsiteSectionType,
  churchName: string,
): string => {
  if (type === "hero") return churchName;
  if (type === "story") return t("website.aboutHeading");
  return t("website.example.heading");
};

function DesignCard({
  layout,
  onChoose,
}: {
  layout: WebsiteLayout;
  onChoose: (layout: WebsiteLayout) => void;
}) {
  const preview = {
    gathering: (
      <div className="h-full bg-[#faf7f1] text-[#25231f]">
        <div className="flex items-center justify-between border-b border-[#e6dfd3] px-4 py-2">
          <span className="font-display text-[10px] font-semibold">{t("website.preview.church")}</span>
          <span className="flex gap-3 text-[6px] text-[#625f58]">
            <span>{t("website.preview.about")}</span><span>{t("website.preview.services")}</span><span>{t("website.preview.contact")}</span>
          </span>
        </div>
        <div className="grid h-[calc(100%-29px)] grid-cols-[1fr_0.9fr] items-center gap-3 px-5 py-3">
          <div className="flex flex-col items-start gap-2">
            <span className="text-[6px] font-semibold uppercase tracking-[0.18em] text-[#8a5a36]">{t("website.example.heading")}</span>
            <span className="font-display text-[19px] leading-[1.05]">{t("website.preview.gathering.title")}</span>
            <span className="max-w-36 text-[7px] leading-3 text-[#625f58]">{t("website.preview.gathering.body")}</span>
            <span className="rounded bg-[#8a5a36] px-2 py-1 text-[6px] font-semibold text-white">{t("website.example.linkLabel")}</span>
          </div>
          <div className="relative h-full min-h-24 overflow-hidden rounded-xl bg-gradient-to-br from-[#c4d2b5] via-[#91aa84] to-[#4e6c59]">
            <span className="absolute -bottom-8 left-1/4 size-28 rounded-full bg-[#e7c995]/80" />
            <span className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-[#344c40] to-transparent" />
            <span className="absolute bottom-2 left-3 h-8 w-12 -skew-x-6 rounded-t-full bg-[#31483d]/90" />
            <span className="absolute bottom-2 right-2 h-12 w-8 skew-x-6 rounded-t-full bg-[#52664d]/90" />
          </div>
        </div>
      </div>
    ),
    community: (
      <div className="h-full bg-[#f5f4ef] text-[#262b25]">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-[10px] font-semibold">{t("website.preview.church")}</span>
          <span className="flex gap-3 text-[6px] text-[#5f675e]">
            <span>{t("website.preview.community.nav1")}</span><span>{t("website.preview.community.nav2")}</span><span>{t("website.preview.visit")}</span>
          </span>
        </div>
        <div className="mx-2 flex h-[calc(100%-29px)] flex-col items-center justify-center rounded-lg bg-[#354d3c] px-5 text-center text-white">
          <span className="mb-2 text-[6px] font-semibold uppercase tracking-[0.2em] text-[#d7c494]">{t("website.preview.community.eyebrow")}</span>
          <span className="font-display text-[19px] leading-[1.05]">{t("website.preview.community.title")}</span>
          <span className="mt-2 max-w-48 text-[7px] leading-3 text-white/80">{t("website.preview.community.body")}</span>
          <span className="mt-3 rounded bg-[#e1c68c] px-2 py-1 text-[6px] font-semibold text-[#262b25]">{t("website.preview.community.button")}</span>
        </div>
      </div>
    ),
    classic: (
      <div className="h-full bg-[#fffdf8] text-[#292720]">
        <div className="flex items-center justify-between border-b border-[#e5e0d4] px-4 py-2">
          <span className="font-display text-[10px] font-semibold">{t("website.preview.church")}</span>
          <span className="flex gap-3 text-[6px] text-[#625f58]">
            <span>{t("website.preview.welcome")}</span><span>{t("website.preview.whoWeAre")}</span><span>{t("website.preview.visit")}</span>
          </span>
        </div>
        <div className="grid h-[calc(100%-29px)] grid-cols-[0.95fr_1.05fr] gap-3 px-4 py-3">
          <div className="flex flex-col justify-center gap-2">
            <span className="text-[6px] font-semibold uppercase tracking-[0.15em] text-[#6d7155]">{t("website.preview.classic.eyebrow")}</span>
            <span className="font-display text-[18px] leading-[1.05]">{t("website.preview.classic.title")}</span>
            <span className="text-[7px] leading-3 text-[#625f58]">{t("website.preview.classic.body")}</span>
            <span className="w-fit border-b border-[#6d7155] pb-0.5 text-[6px] font-semibold text-[#51583d]">{t("website.preview.services")}</span>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#d7c7a4] via-[#8c9b73] to-[#435c47]">
            <span className="absolute -bottom-10 left-1/3 size-28 rounded-full bg-[#f3dda8]/80" />
            <span className="absolute bottom-0 left-0 h-1/3 w-full bg-gradient-to-t from-[#324735] to-transparent" />
            <span className="absolute bottom-0 left-1/4 h-10 w-14 rounded-t-full bg-[#354b3a]" />
          </div>
        </div>
      </div>
    ),
  }[layout];

  return (
    <button
      type="button"
      onClick={() => onChoose(layout)}
      className="group flex min-h-64 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="block aspect-[16/9] w-full overflow-hidden rounded-lg border border-line shadow-sm"
      >
        {preview}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-semibold text-fg">{t(`website.layout.${layout}` as never)}</span>
        <span className="text-sm text-fg-muted">
          {t(`website.design.${layout}Description` as never)}
        </span>
      </span>
      <span className="mt-auto text-sm font-semibold text-primary">{t("website.startDesign")}</span>
    </button>
  );
}

export function WebsiteEditor({
  churchName,
  country,
  brandHue,
  website,
  services,
  approved,
}: {
  churchName: string;
  country: string;
  brandHue: string;
  website: ChurchWebsite | null;
  services: Service[];
  approved: boolean;
}) {
  const [layout, setLayout] = React.useState<WebsiteLayout>(website?.layout ?? "gathering");
  const [sections, setSections] = React.useState<WebsiteSection[]>(
    website?.sections ?? [],
  );
  const [hasChosenDesign, setHasChosenDesign] = React.useState(Boolean(website));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [published, setPublished] = React.useState(approved && (website?.published ?? false));
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const input = React.useRef<HTMLInputElement>(null);

  const markChanged = () => {
    setError(undefined);
    setSaved(false);
  };

  const chooseDesign = (nextLayout: WebsiteLayout) => {
    markChanged();
    setLayout(nextLayout);
    setSections(sectionsFor(nextLayout));
    setHasChosenDesign(true);
  };

  const updateSection = (id: string, changes: Partial<WebsiteSection>) => {
    markChanged();
    setSections((current) => current.map((section) =>
      section.id === id ? { ...section, ...changes } : section,
    ));
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    markChanged();
    setSections((current) => {
      const next = [...current];
      const [section] = next.splice(from, 1);
      if (section) next.splice(to, 0, section);
      return next;
    });
  };

  const addSection = (type: WebsiteSectionType) => {
    if (sections.length >= 20) return;
    const section = blankSection(type);
    markChanged();
    setSections((current) => [...current, section]);
    setSelectedId(section.id);
    requestAnimationFrame(() => {
      document.querySelector(`[data-website-section="${section.id}"]`)
        ?.scrollIntoView({ block: "center" });
    });
  };

  const removeSection = (id: string) => {
    markChanged();
    setSections((current) => current.filter((section) => section.id !== id));
    setSelectedId(null);
  };

  const uploadMedia = async (file: File, section: WebsiteSection) => {
    setUploading(true);
    setError(undefined);
    const data = new FormData();
    data.set("purpose", "website_media");
    data.set("file", file);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await response.json() as { key?: string; signedUrl?: string; error?: string };
      if (!response.ok || !result.key || !result.signedUrl) {
        setError(result.error ?? t("website.mediaUploadFailed"));
        return;
      }
      markChanged();
      updateSection(section.id, section.type === "video"
        ? { videoKey: result.key, videoUrl: result.signedUrl }
        : { imageKey: result.key, imageUrl: result.signedUrl });
    } catch {
      setError(t("website.mediaUploadFailed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const selected = sections.find((section) => section.id === selectedId) ?? null;
  const linksComplete = sections.every((section) =>
    Boolean(section.linkLabel?.trim()) === Boolean(section.linkUrl?.trim()),
  );

  const previewSections = React.useMemo(() => sections.map((section) => ({
    ...section,
    videoUrl: section.videoKey
      ? section.videoUrl
      : section.type === "video"
        ? (() => {
            try {
              return websiteVideoEmbedUrl(section.videoUrl);
            } catch {
              return null;
            }
          })()
        : null,
  })), [sections]);

  const preview: PublicWebsite = {
    published,
    layout,
    sections: previewSections,
    slug: "",
    churchName,
    country,
    brandHue,
    email: null,
    phone: null,
    services,
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveWebsite(data);
      setError(result.error);
      setSaved(Boolean(result.saved));
      if (result.saved) formSettled(FORM_ID);
    });
  };

  return (
    <div className="-mt-3 flex flex-col gap-5">
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {saved && !error ? <Banner tone="success">{t("website.saved")}</Banner> : null}
      {!approved ? <Banner tone="warning">{t("website.error.approval")}</Banner> : null}

      <form id={FORM_ID} noValidate onSubmit={submit} aria-busy={pending}>
        <input type="hidden" name="layout" value={layout} />
        <input type="hidden" name="published" value={published ? "true" : "false"} />
        <input type="hidden" name="sections" value={JSON.stringify(sections)} />
        <input type="hidden" name="designChosen" value={hasChosenDesign ? "yes" : "no"} />
      </form>

      {!hasChosenDesign ? (
        <section className="flex flex-col gap-5" aria-labelledby="website-design-title">
          <div>
            <h2 id="website-design-title" className="m-0 font-display text-2xl font-normal text-fg">
              {t("website.chooseDesign")}
            </h2>
            <p className="mb-0 mt-2 text-sm text-fg-muted">{t("website.designDescription")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(["gathering", "community", "classic"] as const).map((one) => (
              <DesignCard key={one} layout={one} onChoose={chooseDesign} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="sticky top-[var(--d-topbar)] z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/95 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" disabled={sections.length >= 20}>
                    <Plus aria-hidden /> {t("website.addSection")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {WEBSITE_SECTION_TYPES.map((type) => {
                    const Icon = SECTION_ICONS[type];
                    return (
                      <DropdownMenuItem key={type} onSelect={() => addSection(type)}>
                        <Icon aria-hidden /> {t(`website.add.${type}` as never)}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Field label={t("website.layout")} className="flex-row items-center gap-2">
                <Select value={layout} onValueChange={(value) => {
                  markChanged();
                  setLayout(value as WebsiteLayout);
                }}>
                  <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gathering">{t("website.layout.gathering")}</SelectItem>
                    <SelectItem value="community">{t("website.layout.community")}</SelectItem>
                    <SelectItem value="classic">{t("website.layout.classic")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-fg">
                <Checkbox
                  checked={published && approved}
                  disabled={!approved}
                  onCheckedChange={(checked) => {
                    markChanged();
                    setPublished(checked === true);
                  }}
                />
                {t("website.publish")}
              </label>
              <FormActions
                form={FORM_ID}
                label={t("website.save")}
                pending={pending || uploading}
                disabled={!linksComplete}
              />
            </div>
          </div>

          <section
            aria-label={t("website.preview")}
            className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-sm"
          >
            <div className="border-b border-line px-5 py-3 text-sm font-semibold text-fg-muted">
              {t("website.preview")}
            </div>
            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto">
              <ChurchWebsitePage
                website={preview}
                editor={{
                  selectedId,
                  onSelect: setSelectedId,
                  onMove: moveSection,
                  onDelete: removeSection,
                }}
              />
            </div>
          </section>

          <Sheet
            open={Boolean(selected)}
            onOpenChange={(open) => {
              if (!open) setSelectedId(null);
            }}
          >
            {selected ? (
              <SheetContent
                title={t(`website.section.${selected.type}` as never)}
                closeLabel={t("common.close")}
                footer={
                  <Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>
                    {t("common.close")}
                  </Button>
                }
              >
                {selected.type !== "services" && selected.type !== "contact" ? (
                  <Field label={t("website.section.title")}>
                    <Input
                      form={FORM_ID}
                      value={selected.title}
                      maxLength={120}
                      placeholder={sectionHeadingPlaceholder(selected.type, churchName)}
                      onChange={(event) => updateSection(selected.id, { title: event.target.value })}
                    />
                  </Field>
                ) : null}

                {["hero", "story", "banner"].includes(selected.type) ? (
                  <Field label={t("website.section.body")}>
                    <Textarea
                      form={FORM_ID}
                      rows={5}
                      value={selected.body}
                      maxLength={2000}
                      placeholder={t("website.example.body")}
                      onChange={(event) => updateSection(selected.id, { body: event.target.value })}
                    />
                  </Field>
                ) : null}

                {["hero", "banner", "image"].includes(selected.type) ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={input}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        aria-label={t("website.uploadMedia")}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void uploadMedia(file, selected);
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={uploading || pending}
                        onClick={() => input.current?.click()}
                      >
                        <Upload aria-hidden />
                        {selected.imageKey ? t("website.replaceMedia") : t("website.uploadMedia")}
                      </Button>
                      <span className="text-xs text-fg-muted">
                        {imageLimit("website_media")} · {t("website.mediaLimit")}
                      </span>
                    </div>
                    <Field label={t("website.section.imageUrl")}>
                      <Input
                        form={FORM_ID}
                        type="url"
                        placeholder={t("website.example.imageUrl")}
                        value={selected.imageKey ? "" : selected.imageUrl ?? ""}
                        onChange={(event) => updateSection(selected.id, {
                          imageUrl: event.target.value || null,
                          imageKey: null,
                        })}
                      />
                    </Field>
                    <Field label={t("website.section.alt")}>
                      <Input
                        form={FORM_ID}
                        value={selected.alt}
                        maxLength={200}
                        placeholder={t("website.example.alt")}
                        onChange={(event) => updateSection(selected.id, { alt: event.target.value })}
                      />
                    </Field>
                  </>
                ) : null}

                {selected.type === "video" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={input}
                        type="file"
                        accept="video/mp4,video/webm"
                        className="sr-only"
                        aria-label={t("website.uploadMedia")}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) void uploadMedia(file, selected);
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={uploading || pending}
                        onClick={() => input.current?.click()}
                      >
                        <Upload aria-hidden />
                        {selected.videoKey ? t("website.replaceMedia") : t("website.uploadMedia")}
                      </Button>
                      <span className="text-xs text-fg-muted">{t("website.mediaLimit")}</span>
                    </div>
                    <Field label={t("website.section.videoUrl")}>
                      <Input
                        form={FORM_ID}
                        type="url"
                        placeholder={t("website.example.videoUrl")}
                        value={selected.videoKey ? "" : selected.videoUrl ?? ""}
                        onChange={(event) => updateSection(selected.id, {
                          videoUrl: event.target.value || null,
                          videoKey: null,
                        })}
                      />
                    </Field>
                  </>
                ) : null}

                <Field
                  label={t("website.section.linkLabel")}
                  required={Boolean(selected.linkUrl?.trim())}
                >
                  <Input
                    form={FORM_ID}
                    value={selected.linkLabel ?? ""}
                    maxLength={60}
                    placeholder={t("website.example.linkLabel")}
                    onChange={(event) => updateSection(selected.id, {
                      linkLabel: event.target.value || null,
                    })}
                  />
                </Field>
                <Field
                  label={t("website.section.linkUrl")}
                  required={Boolean(selected.linkLabel?.trim())}
                >
                  <Input
                    form={FORM_ID}
                    type="url"
                    placeholder={t("website.example.linkUrl")}
                    value={selected.linkUrl ?? ""}
                    onChange={(event) => updateSection(selected.id, {
                      linkUrl: event.target.value || null,
                    })}
                  />
                </Field>
              </SheetContent>
            ) : null}
          </Sheet>
        </>
      )}

      <Working open={pending || uploading} label={uploading ? t("website.uploadingMedia") : t("website.saving")} />
    </div>
  );
}
