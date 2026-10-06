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
import {
  Book, Bread, Candle, Cross, Cup, Doodles, Dove, Fish, Olive, Water, Wheat,
} from "@/components/site/doodles";
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
 * While the platform is pre-release the pilot band shows above the last call to
 * action, which is the one thing on the page that changes at launch.
 */
const PRE_RELEASE = true;

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

/* The marks behind the four sections with room for them. Nothing sits behind a
   screen of the product or a grid of cards: those sections are already full. */
const HERO_MARKS = [
  { mark: Dove, x: 9, y: 26, size: 150, turn: -8 },
  { mark: Wheat, x: 91, y: 22, size: 120, turn: 10 },
  { mark: Olive, x: 16, y: 80, size: 118, turn: 6 },
  { mark: Cross, x: 86, y: 78, size: 96, turn: -10 },
] as const;

const PURPOSE_MARKS = [
  { mark: Book, x: 11, y: 34, size: 132, turn: -6 },
  { mark: Candle, x: 89, y: 66, size: 118, turn: 8 },
] as const;

const PRICE_MARKS = [
  { mark: Bread, x: 12, y: 40, size: 130, turn: -5 },
  { mark: Cup, x: 88, y: 58, size: 126, turn: 7 },
] as const;

const END_MARKS = [
  { mark: Fish, x: 10, y: 30, size: 138, turn: -9 },
  { mark: Water, x: 90, y: 68, size: 136, turn: 5 },
  { mark: Dove, x: 78, y: 20, size: 100, turn: 14 },
] as const;

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
    <div data-theme="light" className="flex min-h-dvh flex-col bg-canvas text-fg">
      <SiteHeader />

      <main id="top" className="flex-1">
        {/* The first screen. One claim, one line under it, two ways on. */}
        <section className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 pb-14 pt-24 text-center">
          <Doodles spots={[...HERO_MARKS]} />
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
          <Doodles spots={[...PURPOSE_MARKS]} />
          <div className="relative mx-auto flex w-full max-w-[880px] flex-col items-center gap-5 px-6 py-24 text-center">
            <h2 className="m-0 text-balance font-display text-[clamp(36px,5vw,56px)] font-normal leading-[1.08] text-fg">
              {t("site.purpose.title")}
            </h2>
            <p className="m-0 max-w-[44ch] text-balance text-[19px] leading-[30px] text-fg-muted">
              {t("site.purpose.body")}
            </p>
          </div>
        </section>

        {/* The product, full width, opening the demo. */}
        <section id="product" className="mx-auto w-full max-w-[1280px] px-6 pb-[104px] pt-24">
          <StartDemoButton className="block h-auto min-h-0 w-full rounded-2xl border-0 bg-transparent p-0 shadow-none hover:bg-transparent active:scale-100">
            <BrowserFrame>
              <Shot src="/marketing/office.png" />
            </BrowserFrame>
          </StartDemoButton>
        </section>

        {/* Everything it holds, named once each. */}
        <section id="features" className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 py-[104px]">
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-14 px-6 py-[104px]">
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-14 px-6 py-[104px]">
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-14 px-6 py-[104px]">
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-row-reverse flex-wrap items-center gap-14 px-6 py-[104px]">
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
          <Doodles spots={[...PRICE_MARKS]} />
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-10 px-6 py-[104px]">
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
        <section id="trust" className="border-t border-line bg-surface">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 py-[104px]">
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

        {PRE_RELEASE ? (
          <section className="border-t border-line">
            <div className="mx-auto w-full max-w-[1200px] px-6 py-[72px]">
              <div className="flex flex-wrap items-center gap-5 rounded-[18px] bg-primary-soft px-7 py-6">
                <span className="flex-[1_1_300px] text-[18px] font-semibold text-ink-800">
                  {t("site.pilot.title")}
                </span>
                <Button className="min-h-11 flex-none gap-2 rounded-xl px-[18px] text-[14px] font-semibold shadow-none active:scale-100" asChild>
                  <Link href={START}>
                    {t("site.pilot.apply")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="relative border-t border-line bg-surface">
          <Doodles spots={[...END_MARKS]} />
          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 py-[120px] text-center">
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
