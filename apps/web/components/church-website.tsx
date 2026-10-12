"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Mail, Phone } from "lucide-react";
import {
  Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@connectapp/ui";
import { localeFor, t } from "@connectapp/i18n";
import type { PublicWebsite, WebsiteSection } from "@connectapp/db";
import { cleanWebsiteLinkUrl } from "@connectapp/db/rules";

const dayName = (day: number, country: string) =>
  new Intl.DateTimeFormat(localeFor(country), { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2024, 0, 7 + day)));

const timeLabel = (time: string, country: string) => {
  const [hour, minute] = time.split(":").map(Number);
  if (hour === undefined || minute === undefined) return time;
  return new Intl.DateTimeFormat(localeFor(country), {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, hour, minute)));
};

function SectionContent({
  section,
  website,
  editing = false,
}: {
  section: WebsiteSection;
  website: PublicWebsite;
  editing?: boolean;
}) {
  let linkUrl: string | null = null;
  try {
    linkUrl = cleanWebsiteLinkUrl(section.linkUrl ?? null);
  } catch {
    linkUrl = null;
  }
  const action = section.linkLabel && linkUrl ? (
    <Button asChild>
      <Link
        href={linkUrl}
        target={linkUrl.startsWith("/") ? undefined : "_blank"}
        rel={linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
      >
        {section.linkLabel}<ArrowRight className="size-4" aria-hidden />
      </Link>
    </Button>
  ) : null;
  switch (section.type) {
    case "hero":
      return (
        <section className={`mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-20 ${website.layout === "community" ? "text-center lg:grid-cols-1" : "lg:grid-cols-[1fr_1fr]"}`}>
          <div className={`flex flex-col gap-6 ${website.layout === "community" ? "mx-auto max-w-3xl items-center" : "max-w-2xl"}`}>
            {/* The eyebrow names the church above the heading. With no heading
                of its own the heading is the church's name too, and the name
                read twice, stacked, in two sizes. */}
            {section.title ? (
              <p className="m-0 text-sm font-semibold uppercase tracking-[0.16em] text-primary">{website.churchName}</p>
            ) : null}
            <h1 className="m-0 text-balance font-display text-[clamp(42px,7vw,78px)] font-normal leading-[1.02] tracking-[-0.025em]">
              {section.title || website.churchName}
            </h1>
            {section.body ? <p className="m-0 max-w-[54ch] whitespace-pre-line text-pretty text-lg leading-8 text-fg-muted">{section.body}</p> : null}
            <div className="flex flex-wrap gap-3">
              {action}
              <Button asChild>
                <Link href="/join">{t("website.join")}<ArrowRight className="size-4" aria-hidden /></Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/sign-in">{t("website.signIn")}</Link>
              </Button>
            </div>
          </div>
          {section.imageUrl ? (
            <img
              src={section.imageUrl}
              alt={section.alt || website.churchName}
              className={`max-h-[560px] min-h-64 w-full rounded-[28px] object-cover shadow-lg ${website.layout === "classic" ? "lg:rounded-none" : ""}`}
            />
          ) : (
            <div
              aria-hidden
              className={`grid min-h-64 place-items-center overflow-hidden rounded-[28px] bg-primary-soft p-10 text-primary ${website.layout === "classic" ? "lg:rounded-none" : ""}`}
            >
              <span className="font-display text-5xl">{website.churchName}</span>
            </div>
          )}
        </section>
      );
    case "story":
      return (
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-14 sm:px-8 sm:py-20">
          <h2 className="m-0 font-display text-4xl font-normal">
            {section.title || t("website.aboutHeading")}
          </h2>
          {section.body ? <p className="m-0 max-w-[68ch] whitespace-pre-line text-lg leading-8 text-fg-muted">{section.body}</p> : null}
          {action}
        </section>
      );
    case "banner":
      return (
        <section className="bg-primary px-5 py-12 text-primary-fg sm:px-8 sm:py-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            {section.imageUrl ? <img src={section.imageUrl} alt={section.alt} className="max-h-[420px] w-full rounded-[20px] object-cover" /> : null}
            {section.title ? <h2 className="m-0 font-display text-4xl font-normal">{section.title}</h2> : null}
            {section.body ? <p className="m-0 max-w-3xl whitespace-pre-line text-lg leading-8">{section.body}</p> : null}
            {action}
          </div>
        </section>
      );
    case "image":
      return section.imageUrl || editing ? (
        <figure className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-10 sm:px-8">
          {section.imageUrl ? (
            <img src={section.imageUrl} alt={section.alt} className="max-h-[680px] w-full rounded-[24px] object-cover" />
          ) : (
            <div className="grid aspect-[16/7] place-items-center rounded-[24px] bg-primary-soft font-medium text-primary">
              {t("website.emptyImage")}
            </div>
          )}
          {section.title ? <figcaption className="text-center text-sm text-fg-muted">{section.title}</figcaption> : null}
          <div className="flex justify-center">{action}</div>
        </figure>
      ) : null;
    case "video":
      return section.videoUrl || editing ? (
        <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
          {section.title ? <h2 className="mb-4 mt-0 font-display text-3xl font-normal">{section.title}</h2> : null}
          <div className="aspect-video overflow-hidden rounded-[20px] bg-sunken">
            {section.videoKey && section.videoUrl ? (
              <video src={section.videoUrl} controls playsInline className="size-full" />
            ) : section.videoUrl ? (
              <iframe
                src={section.videoUrl}
                title={section.title || t("website.videoTitle", {
                  church: website.churchName,
                  title: t("website.video"),
                })}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="size-full border-0"
              />
            ) : (
              <div className="grid size-full place-items-center font-medium text-fg-muted">
                {t("website.emptyVideo")}
              </div>
            )}
          </div>
          {action ? <div className="mt-4">{action}</div> : null}
        </section>
      ) : null;
    case "services":
      /*
       * A church that has not entered its service times yet has nothing to say
       * here, and the line explaining that is written for whoever is building
       * the page. A visitor met "Service times will appear here when the church
       * adds them." on a live church website. Empty, it stands down, the same
       * way an image and a video section already do.
       */
      if (!website.services.length && !editing) return null;
      return (
        <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
          <div className="rounded-[24px] border border-line bg-surface p-6 shadow-sm sm:p-8">
            <h2 className="m-0 font-display text-3xl font-normal">
              {section.title || t("website.services")}
            </h2>
            {website.services.length ? (
              <ul className="m-0 mt-6 flex list-none flex-col gap-4 p-0 sm:grid sm:grid-cols-2">
                {website.services.map((service, index) => (
                  <li key={`${service.name}-${service.dayOfWeek}-${service.startsAt}-${index}`} className="flex items-start gap-3">
                    <Clock3 className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                    <span className="flex flex-col">
                      <span className="font-semibold">{service.name}</span>
                      <span className="text-fg-muted">{t("website.serviceTime", {
                        day: dayName(service.dayOfWeek, website.country),
                        time: timeLabel(service.startsAt, website.country),
                      })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="mb-0 mt-4 text-fg-muted">{t("website.noServices")}</p>}
            {action ? <div className="mt-6">{action}</div> : null}
          </div>
        </section>
      );
    case "contact":
      return website.email || website.phone || action ? (
        <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <h2 className="m-0 font-display text-3xl font-normal">{section.title || t("website.contact")}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {website.email ? <a className="flex items-center gap-2 text-primary underline underline-offset-4" href={`mailto:${website.email}`}><Mail className="size-4" aria-hidden />{website.email}</a> : null}
              {website.phone ? <a className="flex items-center gap-2 text-primary underline underline-offset-4" href={`tel:${website.phone}`}><Phone className="size-4" aria-hidden />{website.phone}</a> : null}
            </div>
            {action}
          </div>
        </section>
      ) : null;
  }
}

export interface WebsitePageEditor {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (id: string) => void;
}

export function ChurchWebsitePage({
  website,
  editor,
}: {
  website: PublicWebsite;
  editor?: WebsitePageEditor;
}) {
  const dragging = React.useRef<number | null>(null);
  /*
   * The page is the real homepage on a church's own address and a preview
   * inside the Website editor. Only the first is the page's main landmark: in
   * the editor it sits inside the shell's own main, and two main landmarks on
   * one screen leave a screen reader with no answer to "take me to the page".
   */
  const Frame = editor ? "div" : "main";
  return (
    <Frame className="min-h-dvh bg-canvas text-fg" data-brand-hue={website.brandHue}>
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md font-display text-xl font-semibold">
          <span className="truncate">{website.churchName}</span>
        </Link>
        <nav aria-label={website.churchName} className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{t("website.signIn")}</Link>
          </Button>
          <Button asChild>
            <Link href="/join">
              {t("website.join")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </nav>
      </header>
      <div aria-hidden className="h-1" style={{ background: `var(--hue-${website.brandHue}-500)` }} />

      {website.sections.map((section, index) => (
        <div
          key={section.id}
          data-website-section={section.id}
          {...(editor ? {
            role: "group",
            tabIndex: 0,
            "aria-label": t("website.selectSection", {
              section: t(`website.section.${section.type}` as never),
            }),
            draggable: true,
            onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
              if ((event.target as HTMLElement).closest("a")) event.preventDefault();
            },
            onClick: () => editor.onSelect(section.id),
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                editor.onSelect(section.id);
              }
            },
            onDragStart: (event: React.DragEvent<HTMLDivElement>) => {
              dragging.current = index;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", section.id);
            },
            onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            },
            onDrop: (event: React.DragEvent<HTMLDivElement>) => {
              event.preventDefault();
              const from = dragging.current;
              if (from !== null && from !== index) editor.onMove(from, index);
              dragging.current = null;
            },
            onDragEnd: () => { dragging.current = null; },
            className: [
              "relative outline-none",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              editor.selectedId === section.id ? "z-10 ring-2 ring-primary ring-inset" : "hover:ring-1 hover:ring-primary/60",
            ].join(" "),
          } : {})}
        >
          {editor && editor.selectedId === section.id ? (
            <div className="absolute right-4 top-3 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" className="shadow-md">
                    {t("website.sectionOptions")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem disabled={index === 0} onSelect={() => editor.onMove(index, index - 1)}>
                    {t("website.moveUp")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={index === website.sections.length - 1}
                    onSelect={() => editor.onMove(index, index + 1)}
                  >
                    {t("website.moveDown")}
                  </DropdownMenuItem>
                  <DropdownMenuItem tone="danger" onSelect={() => editor.onDelete(section.id)}>
                    {t("website.removeSection")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
          <SectionContent section={section} website={website} editing={Boolean(editor)} />
        </div>
      ))}

      <footer className="border-t border-line px-5 py-6 text-center text-sm text-fg-muted">
        {website.churchName}
      </footer>
    </Frame>
  );
}
