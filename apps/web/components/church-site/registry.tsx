/**
 * HRT-379, R22.2. The table that turns a kind of section into a component.
 *
 * The editor, the preview and the published page all draw a section by looking
 * it up here, so there is one implementation of each kind rather than three.
 * The shape of each kind's content, and the layouts it can take, are in
 * `packages/db/src/repo/site-sections.ts`, which this file does not repeat: it
 * adds what only a screen needs, which is the component and the words.
 */

import * as React from "react";
import {
  CalendarDays, Church, Clock3, Columns2, FileText, Grid2x2, HandCoins, Hash,
  HeartHandshake, Image as ImageIcon, LayoutPanelTop, Mail, MapPin, Megaphone,
  MessageSquareQuote, Minus, Quote, Share2, Users, Video as VideoIcon,
} from "lucide-react";
import { t, type MessageKey } from "@connectapp/i18n";
import { SECTION_CATEGORIES, SITE_SECTIONS } from "@connectapp/db/rules";
import type { SectionViewProps } from "./section-props";

import { HeroSection } from "./sections/hero";
import { IntroSection } from "./sections/intro";
import { TextImageSection } from "./sections/text-image";
import { ValuesSection } from "./sections/values";
import { PeopleSection } from "./sections/people";
import { StatsSection } from "./sections/stats";
import { QuoteSection } from "./sections/quote";
import { TimesSection } from "./sections/times";
import { VisitSection } from "./sections/visit";
import { LocationSection } from "./sections/location";
import { MinistriesSection } from "./sections/ministries";
import { EventsSection } from "./sections/events";
import { GallerySection } from "./sections/gallery";
import { VideoSection } from "./sections/video";
import { GiveSection } from "./sections/give";
import { ContactSection } from "./sections/contact";
import { FormSection } from "./sections/form";
import { SocialSection } from "./sections/social";
import { CtaSection } from "./sections/cta";
import { FaqSection } from "./sections/faq";
import { CardsSection } from "./sections/cards";
import { RuleSection } from "./sections/rule";

type View = (props: SectionViewProps) => React.ReactNode;

export const SECTION_VIEWS: Record<string, View> = {
  hero: HeroSection,
  intro: IntroSection,
  textImage: TextImageSection,
  values: ValuesSection,
  people: PeopleSection,
  stats: StatsSection,
  quote: QuoteSection,
  times: TimesSection,
  visit: VisitSection,
  location: LocationSection,
  ministries: MinistriesSection,
  events: EventsSection,
  gallery: GallerySection,
  video: VideoSection,
  give: GiveSection,
  contact: ContactSection,
  form: FormSection,
  social: SocialSection,
  cta: CtaSection,
  faq: FaqSection,
  cards: CardsSection,
  rule: RuleSection,
};

const ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  hero: LayoutPanelTop,
  intro: FileText,
  textImage: Columns2,
  values: HeartHandshake,
  people: Users,
  stats: Hash,
  quote: Quote,
  times: Clock3,
  visit: Church,
  location: MapPin,
  ministries: Users,
  events: CalendarDays,
  gallery: ImageIcon,
  video: VideoIcon,
  give: HandCoins,
  contact: Mail,
  form: MessageSquareQuote,
  social: Share2,
  cta: Megaphone,
  faq: Grid2x2,
  cards: Grid2x2,
  rule: Minus,
};

export interface SectionKindForUi {
  type: string;
  category: (typeof SECTION_CATEGORIES)[number];
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  variants: { key: string; label: string }[];
  /** Whether it can read from the church rather than from its own content. */
  binds: readonly string[];
}

/** Every kind, with the words a church reads, grouped the way the library is. */
export const SECTION_KINDS: SectionKindForUi[] = Object.entries(SITE_SECTIONS)
  .map(([type, kind]) => ({
    type,
    category: kind.category,
    label: t(`website.kind.${type}` as MessageKey),
    icon: ICONS[type] ?? LayoutPanelTop,
    variants: kind.variants.map((key) => ({
      key,
      label: t(`website.variant.${type}.${key}` as MessageKey),
    })),
    binds: kind.binds ?? [],
  }));

export const kindOf = (type: string): SectionKindForUi | undefined =>
  SECTION_KINDS.find((one) => one.type === type);

export const categoryLabel = (category: string): string =>
  t(`website.cat.${category}` as MessageKey);
