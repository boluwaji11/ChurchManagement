import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Calendar,
  CalendarCheck,
  ChartColumn,
  CircleDot,
  Download,
  HandCoins,
  ListMusic,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { SiteFooter, SiteHeader, START } from "@/components/site/chrome";
import { CheckinLabels, GiveCard } from "@/components/site/mocks";
import { Art, type Piece } from "@/components/site/art";
import {
  BrowserFrame,
  Eyebrow,
  PhoneFrame,
  SectionTitle,
  Shot,
  SITE_CTA,
  SITE_CTA_QUIET,
  Ticks,
  Tile,
} from "@/components/site/kit";
import { StartDemoButton } from "./demo/start";

export const dynamic = "force-dynamic";

/**
 * The ConnectApp website: the page somebody reads before they are anybody.
 *
 * It is the first half of onboarding a church. A pastor arrives from a search
 * or from another church, reads what the platform holds and what it costs, and
 * leaves either through "Get started free" or through the demo. Everything on
 * the page points at one of those two.
 *
 */

const FEATURES = [
  { icon: <Users />, key: "people" },
  { icon: <CircleDot />, key: "groups" },
  { icon: <Baby />, key: "checkin" },
  { icon: <HandCoins />, key: "giving" },
  { icon: <CalendarCheck />, key: "serving" },
  { icon: <ListMusic />, key: "services" },
  { icon: <Calendar />, key: "events" },
  { icon: <ChartColumn />, key: "reports" },
] as const;

const TRUST = [
  { icon: <Download />, key: "export" },
  { icon: <ShieldCheck />, key: "ai" },
  { icon: <Lock />, key: "private" },
] as const;

const PRICE = ["everything", "fee", "source", "donations"] as const;


/* The drawings in the margins of the four centred sections. Nothing sits beside
   a screen of the product or a grid of cards: those sections are already full. */
const HERO_ART: Piece[] = [
  { name: "family", side: "left", y: 56, size: 220, inset: 0 },
  { name: "sanctuary", side: "right", y: 54, size: 250, inset: 0 },
];

const PURPOSE_ART: Piece[] = [
  { name: "gathering", side: "right", y: 55, size: 250, inset: 4 },
];


const PRICE_ART: Piece[] = [
  { name: "giving", side: "left", y: 56, size: 230, inset: 24 },
];

const TRUST_ART: Piece[] = [
  { name: "safe", side: "right", y: 26, size: 150, inset: 0 },
];

const END_ART: Piece[] = [
  { name: "congregation", side: "left", y: 52, size: 210, inset: 0 },
  { name: "fellowship", side: "right", y: 54, size: 210, inset: 0 },
];




/** "Get started free", at whatever size the section calls for. */
function Start({ className = SITE_CTA, arrow = true }: { className?: string; arrow?: boolean }) {
  return (
    <Button className={className} asChild>
      <Link href={START}>
        {t("site.start")}
        {arrow ? <ArrowRight className="size-[18px]" /> : null}
      </Link>
    </Button>
  );
}

export default function Site() {
  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col text-fg">
      <SiteHeader />

      <main id="top" className="flex-1">
        {/* The first screen. One claim, one line under it, two ways on. */}
        <section className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 pb-10 pt-20 text-center">
          <Art pieces={HERO_ART} />
          <h1 className="m-0 max-w-[14ch] text-balance font-display text-[clamp(44px,6.4vw,76px)] font-normal leading-[1.04] tracking-[-0.015em]">
            {t("site.hero.title")}
          </h1>
          <p className="m-0 max-w-[40ch] text-balance text-[19px] leading-[30px] text-fg-muted">
            {t("site.hero.sub")}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Start />
            <StartDemoButton className={SITE_CTA_QUIET} />
          </div>
        </section>

        {/* Why a church would want this at all, before any feature is named. */}
        <section className="relative border-t border-line bg-primary-soft">
          <Art pieces={PURPOSE_ART} />
          <div className="relative mx-auto flex w-full max-w-[880px] flex-col items-center gap-5 px-6 py-16 text-center">
            <h2 className="m-0 text-balance font-display text-[clamp(36px,5vw,56px)] font-normal leading-[1.08] text-fg">
              {t("site.purpose.title")}
            </h2>
            <p className="m-0 max-w-[44ch] text-balance text-[19px] leading-[30px] text-fg-muted">
              {t("site.purpose.body")}
            </p>
          </div>
        </section>


        {/* R22.x. The argument, where somebody weighing this up can read it,
            and before the product rather than after: a church is deciding who
            to trust with its records, and the reason a thing is free is the
            first question anybody sensible asks. */}
        <section id="why" className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-16">
            <div className="flex max-w-[640px] flex-col gap-3">
              <Eyebrow>{t("site.why.eyebrow")}</Eyebrow>
              <SectionTitle>{t("site.why.title")}</SectionTitle>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
              <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 text-[17px] leading-[28px] text-fg-muted">
                <p className="m-0">{t("site.why.hours")}</p>
                <p className="m-0">
                  {/* The sentence is one line in the catalogue so a translator
                      reads it whole. Only the figure carries weight. */}
                  {t("site.why.money")
                    .split("{cost}")
                    .flatMap((part, i) =>
                      i === 0
                        ? [part]
                        : [
                            <strong key="cost" className="font-semibold text-fg">
                              {t("site.why.cost")}
                            </strong>,
                            part,
                          ],
                    )}
                </p>
              </div>
              <img
                src="/art/connecting.svg"
                alt=""
                aria-hidden
                className="hidden w-[280px] shrink-0 self-center lg:block"
              />
              <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 text-[17px] leading-[28px] text-fg-muted">
                <p className="m-0">{t("site.why.gave")}</p>
                <p className="m-0">{t("site.why.ours")}</p>
              </div>
            </div>

            <blockquote className="m-0 flex flex-col items-center gap-2 text-center">
              <p className="m-0 max-w-[760px] text-balance font-display text-[24px] leading-[36px] text-fg">
                {t("site.why.quote")}
              </p>
              <cite className="text-[15px] not-italic text-fg-subtle">{t("site.why.cite")}</cite>
              <span aria-hidden className="mt-4 h-0.5 w-24 rounded-full bg-primary" />
            </blockquote>
          </div>
        </section>

        {/* The product, full width. A picture of it, which is all it is: the
            demo is a button in the hero and another at the foot. */}
        <section id="product" className="mx-auto w-full max-w-[1280px] px-6 py-14">
          <BrowserFrame>
            <Shot src="/marketing/office.png" />
          </BrowserFrame>
        </section>


        {/* Everything it holds, named once each. */}
        <section id="features" className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-16">
            <div className="flex max-w-[640px] flex-col gap-3">
              <SectionTitle>{t("site.features.title")}</SectionTitle>
              <p className="m-0 text-[18px] text-fg-muted">{t("site.features.sub")}</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
              {FEATURES.map((f) => (
                <Tile
                  key={f.key}
                  icon={f.icon}
                  title={t(`site.features.${f.key}` as never)}
                  body={t(`site.features.${f.key}.body` as never)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* People, on the left, with the office screen beside it. */}
        <section id="members" className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-12 px-6 py-16">
            <div className="flex flex-[1_1_360px] flex-col gap-5">
              <Eyebrow>{t("site.people.eyebrow")}</Eyebrow>
              <SectionTitle>{t("site.people.title")}</SectionTitle>
              <Ticks
                items={[
                  t("site.people.households"),
                  t("site.people.followups"),
                  t("site.people.fields"),
                  t("site.people.export"),
                ]}
              />
            </div>
            <div className="min-w-0 flex-[1.4_1_440px]">
              <BrowserFrame>
                <Shot src="/marketing/people.png" />
              </BrowserFrame>
            </div>
          </div>
        </section>

        {/* The member app, on the left, the claims on the right. */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-12 px-6 py-16">
            <div className="flex flex-[1_1_360px] flex-col gap-5">
              <Eyebrow>{t("site.app.eyebrow")}</Eyebrow>
              <SectionTitle>{t("site.app.title")}</SectionTitle>
              <Ticks
                items={[
                  t("site.app.give"),
                  t("site.app.join"),
                  t("site.app.serve"),
                  t("site.app.kids"),
                ]}
              />
            </div>
            <div className="min-w-0 flex-[1.4_1_440px]">
              <PhoneFrame>
                <Shot src="/marketing/member.png" />
              </PhoneFrame>
            </div>
          </div>
        </section>

        {/* Giving, with the form a member actually sees. */}
        <section id="giving" className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-12 px-6 py-16">
            <div className="flex min-w-0 flex-[1.4_1_440px] justify-center rounded-[20px] bg-sunken px-6 py-12">
              <GiveCard />
            </div>
            <div className="flex flex-[1_1_360px] flex-col gap-5">
              <Eyebrow>{t("site.giving.eyebrow")}</Eyebrow>
              <SectionTitle>{t("site.giving.title")}</SectionTitle>
              <Ticks
                items={[
                  t("site.giving.taps"),
                  t("site.giving.recurring"),
                  t("site.giving.statements"),
                  t("site.giving.fee"),
                ]}
              />
            </div>
          </div>
        </section>

        {/* Check-in, with the label pair. */}
        <section id="checkin" className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-12 px-6 py-16">
            <div className="flex flex-[1_1_360px] flex-col gap-5">
              <Eyebrow>{t("site.checkin.eyebrow")}</Eyebrow>
              <SectionTitle>{t("site.checkin.title")}</SectionTitle>
              <Ticks
                items={[
                  t("site.checkin.codes"),
                  t("site.checkin.allergies"),
                  t("site.checkin.offline"),
                  t("site.checkin.printers"),
                ]}
              />
            </div>
            <div className="min-w-0 flex-[1.4_1_440px]">
              <CheckinLabels />
            </div>
          </div>
        </section>

        {/* The entire pricing table. */}
        <section id="pricing" className="relative border-t border-line">
          <Art pieces={PRICE_ART} />
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 px-6 py-16">
            <SectionTitle className="text-center">{t("site.price.title")}</SectionTitle>
            <div className="flex w-[min(480px,100%)] flex-col gap-7 rounded-[20px] border border-stone-300 bg-canvas p-10">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-[88px] font-normal leading-none text-fg">
                  {t("site.price.amount")}
                </span>
                <span className="text-[17px] text-fg-muted">{t("site.price.period")}</span>
              </div>
              <Ticks items={PRICE.map((key) => t(`site.price.${key}` as never))} />
              <Start className={`${SITE_CTA} justify-center`} arrow={false} />
            </div>
          </div>
        </section>

        {/* R21.12. What we will and will not do with a congregation's records. */}
        <section id="trust" className="relative border-t border-line bg-surface">
          <Art pieces={TRUST_ART} />
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-16">
            <SectionTitle className="text-center">{t("site.trust.title")}</SectionTitle>
            <div className="mx-auto grid w-full max-w-[960px] grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
              {TRUST.map((item) => (
                <Tile
                  key={item.key}
                  icon={item.icon}
                  title={t(`site.trust.${item.key}` as never)}
                  body={t(`site.trust.${item.key}.body` as never)}
                />
              ))}
            </div>
          </div>
        </section>


        <section className="relative border-t border-line bg-surface">
          <Art pieces={END_ART} />
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 py-20 text-center">
            <h2 className="m-0 font-display text-[clamp(40px,5.4vw,64px)] font-normal leading-[1.05] text-fg">
              {t("site.end.title")}
            </h2>
            <p className="m-0 text-[18px] text-fg-muted">{t("site.end.sub")}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Start />
              <StartDemoButton className={SITE_CTA_QUIET} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
