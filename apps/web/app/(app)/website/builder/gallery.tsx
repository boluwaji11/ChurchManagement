"use client";

/**
 * HRT-381, R22.2. The six designs, as six websites.
 *
 * The first screen of the website builder, and a church comes back to it to
 * change its mind. Each card holds the design's own home page: its header, its
 * hero, and the start of whatever that design puts next, built from the same
 * function that builds the real thing and rendered by the same components. A
 * church presses a picture of what it is about to get.
 *
 * The stage inside a card is composed at 1280px and scaled down by a
 * transform, so a card shows the desktop composition made small rather than
 * the phone layout. It is `pointer-events: none`, `aria-hidden` and `inert`:
 * the card's own controls carry the words and the keyboard.
 */

import * as React from "react";
import { t, type MessageKey } from "@connectapp/i18n";
import type { SiteDoc } from "@connectapp/db/rules";
import {
  Button, cn, Dialog, DialogClose, DialogContent, DialogFooter,
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@connectapp/ui";
import { SiteFrame, SitePageView } from "@/components/church-site/page-view";
import type { SiteCtx } from "@/components/church-site/kit";
import { docFromTemplate, SITE_TEMPLATES, type TemplateKey } from "@/components/church-site/starter";

const DESK_WIDTH = 1280;
const PHONE_WIDTH = 390;

/** How much of the page a card holds, at stage scale. */
const CARD_HEIGHT = 960;

type Size = { width: number; height: number };

/* One observer for every stage on the screen, rather than one each. */
let observer: ResizeObserver | null = null;
const watchers = new WeakMap<Element, (size: Size) => void>();

function watch(element: Element, report: (size: Size) => void): () => void {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      watchers.get(entry.target)?.({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  watchers.set(element, report);
  observer.observe(element);
  return () => {
    watchers.delete(element);
    observer?.unobserve(element);
  };
}

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, Size] {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watch(element, (next) => {
      setSize((held) =>
        (held.width === next.width && held.height === next.height ? held : next));
    });
  }, []);
  return [ref, size];
}

/*
 * A card builds its design only once it is near enough to be read.
 *
 * Six designs is six whole home pages, around fifty sections between them,
 * and two of them are on screen. The rest wait until the gallery is scrolled
 * to them, and then keep what they drew.
 */
let watcher: IntersectionObserver | null = null;
const comers = new WeakMap<Element, () => void>();

function near(element: Element, arrive: () => void): () => void {
  watcher ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) comers.get(entry.target)?.();
    }
  }, { rootMargin: "600px" });
  comers.set(element, arrive);
  watcher.observe(element);
  return () => {
    comers.delete(element);
    watcher?.unobserve(element);
  };
}

function useNear<T extends HTMLElement>(ref: React.RefObject<T | null>): boolean {
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const element = ref.current;
    if (!element || seen) return;
    return near(element, () => setSeen(true));
  }, [ref, seen]);
  return seen;
}

/**
 * The church, as the sections of a design in this gallery see it.
 *
 * Nothing of the church's own records is bound in: a design is being chosen
 * before any of it is connected, and a preview that showed three events and
 * then two on the real page would be a lie about the design. Each section
 * stands on its starting words.
 */
function siteFor(church: { name: string; slug: string }, doc: SiteDoc): SiteCtx {
  return {
    slug: church.slug,
    name: church.name,
    country: "US",
    timezone: "UTC",
    logo: null,
    email: null,
    phone: null,
    address: { line1: null, line2: null, city: null, region: null, postalCode: null },
    takesGifts: false,
    doc,
    data: { services: [], events: [], groups: [], funds: [], forms: {} },
  };
}

/** The top of a design's home page, scaled into a card. */
function CardStage({ site }: { site: SiteCtx }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const seen = useNear(ref);
  const scale = size.width > 0 ? size.width / DESK_WIDTH : 0;
  const home = site.doc.pages[0]!;
  return (
    <div ref={ref} className="relative aspect-[4/3] w-full overflow-hidden bg-sunken">
      <div
        aria-hidden
        inert
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: DESK_WIDTH,
          height: CARD_HEIGHT,
          transform: `scale(${scale})`,
          pointerEvents: "none",
          contain: "content",
          visibility: scale > 0 && seen ? "visible" : "hidden",
        }}
      >
        {seen ? (
          <SiteFrame doc={site.doc} className="min-h-full">
            <SitePageView page={home} site={site} />
          </SiteFrame>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The whole page, at one width, scrollable.
 *
 * The stage keeps its natural height and the spacer behind it carries that
 * height multiplied by the scale, which is what gives the scroll bar a
 * distance to run that matches what is on screen.
 */
function FullStage({ site, width, className }: {
  site: SiteCtx;
  width: number;
  className?: string;
}) {
  const [box, boxSize] = useSize<HTMLDivElement>();
  const [stage, stageSize] = useSize<HTMLDivElement>();
  const scale = boxSize.width > 0 ? Math.min(1, boxSize.width / width) : 0;
  const home = site.doc.pages[0]!;
  return (
    <div
      ref={box}
      className={cn("scroll-quiet relative w-full overflow-y-auto overflow-x-hidden", className)}
    >
      <div style={{ height: stageSize.height * scale }}>
        <div
          ref={stage}
          aria-hidden
          inert
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width,
            transform: `scale(${scale})`,
            pointerEvents: "none",
            contain: "content",
            visibility: scale > 0 ? "visible" : "hidden",
          }}
        >
          <SiteFrame doc={site.doc} className="min-h-full">
            <SitePageView page={home} site={site} />
          </SiteFrame>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- the gallery --- */

export function Gallery({
  church,
  onChoose,
  current,
  onClose,
}: {
  church: { name: string; slug: string };
  onChoose: (template: string) => void;
  /** The design the church is already on, when it has one. */
  current?: string;
  onClose?: () => void;
}) {
  /* Six whole documents, built once for this church rather than once per
     render: each one is a home page of eight sections. */
  const { name, slug } = church;
  const designs = React.useMemo(
    () => SITE_TEMPLATES.map((key) => ({
      key,
      site: siteFor({ name, slug }, docFromTemplate(key, { name })),
      name: t(`website.template.${key}` as MessageKey),
      body: t(`website.template.${key}.body` as MessageKey),
    })),
    /* On the name and the address rather than on the object the caller passed,
       which is written fresh on every render of the screen above. */
    [name, slug],
  );

  const [shown, setShown] = React.useState<TemplateKey | null>(null);
  const [asking, setAsking] = React.useState<TemplateKey | null>(null);

  const showing = designs.find((one) => one.key === shown);
  const asked = designs.find((one) => one.key === asking);

  const press = (key: TemplateKey) => {
    if (current) setAsking(key);
    else onChoose(key);
  };

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {designs.map((design) => {
          const here = design.key === current;
          const headingId = `design-${design.key}`;
          return (
            <li key={design.key} className="flex flex-col gap-3">
              <div
                aria-current={here ? "true" : undefined}
                className={cn(
                  "overflow-hidden rounded-xl border bg-surface shadow-sm",
                  here ? "border-accent ring-2 ring-accent" : "border-line",
                )}
              >
                <CardStage site={design.site} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 id={headingId} className="font-display text-heading font-normal text-fg">
                  {design.name}
                </h3>
                <p className="text-caption text-fg-muted">{design.body}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  aria-describedby={headingId}
                  onClick={() => setShown(design.key)}
                >
                  {t("website.gallery.preview")}
                </Button>
                {here ? null : (
                  <Button aria-describedby={headingId} onClick={() => press(design.key)}>
                    {t("website.gallery.use")}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {onClose ? (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>{t("action.cancel")}</Button>
        </div>
      ) : null}

      {/* Only the design being looked at is mounted, so the full-size preview
          costs one more page rather than six. */}
      <Dialog
        open={showing !== undefined}
        onOpenChange={(open) => { if (!open) setShown(null); }}
      >
        {showing ? (
          <DialogContent
            title={showing.name}
            closeLabel={t("website.gallery.closePreview")}
            className="max-w-[1180px]"
          >
            <Tabs defaultValue="desk">
              <TabsList>
                <TabsTrigger value="desk">{t("website.device.desk")}</TabsTrigger>
                <TabsTrigger value="phone">{t("website.device.phone")}</TabsTrigger>
              </TabsList>
              <TabsContent value="desk">
                <FullStage
                  site={showing.site}
                  width={DESK_WIDTH}
                  className="h-[70vh] rounded-lg border border-line"
                />
              </TabsContent>
              <TabsContent value="phone">
                <div className="mx-auto w-[390px] max-w-full">
                  <FullStage
                    site={showing.site}
                    width={PHONE_WIDTH}
                    className="h-[70vh] rounded-2xl border border-line"
                  />
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{t("website.gallery.closePreview")}</Button>
              </DialogClose>
              {showing.key === current ? null : (
                <Button
                  onClick={() => {
                    const key = showing.key;
                    setShown(null);
                    press(key);
                  }}
                >
                  {t("website.gallery.use")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={asked !== undefined}
        onOpenChange={(open) => { if (!open) setAsking(null); }}
      >
        {asked ? (
          <DialogContent
            alert
            title={t("website.gallery.changeAsk", { design: asked.name })}
          >
            <p className="text-body text-fg">{t("website.gallery.changeBody")}</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" data-dismiss>{t("action.cancel")}</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  const key = asked.key;
                  setAsking(null);
                  onChoose(key);
                }}
              >
                {t("website.gallery.use")}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
