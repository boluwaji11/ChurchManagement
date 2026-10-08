import {
  withTenant, labelsFor, getLabelLayout, canCheckIn, type LabelPair,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { LabelSheet } from "../sheet";
import { LocalLabels } from "../local";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("labels.title"), church);
}

/**
 * R8.6, R8.11. The label pair, on its own page so it can be printed.
 *
 * A page of its own rather than a panel inside the desk, because printing a
 * region of a screen means fighting the browser over what to leave out, and
 * what gets left out by accident here is a child's room or their code.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; service?: string; members?: string;
    local?: string; printer?: string; test?: string;
  }>;
}) {
  const { church, service, members, local, printer, test } = await searchParams;

  // R8.24. A station with no network prints what it wrote down itself.
  if (local) return <LocalLabels printer={printer} />;

  const session = await requireSession(church);

  /*
   * R8.6. A pair carries a child's name, their room, what they are allergic to
   * and the code the pair is matched on at pickup. Whoever is running check-in
   * prints it; nobody else asks for it.
   */
  if (!canCheckIn(session)) {
    return (
      <main id="main" className="mx-auto min-h-dvh max-w-lg px-4 py-8">
        <Denied role={session.role} action="checkIn" church={session.tenantSlug} />
      </main>
    );
  }

  // R8.11. A test label: the layout on the stock, with nobody's name on it.
  const sample: LabelPair[] = [
    {
      memberId: "sample",
      childName: t("labels.sample.name"),
      roomName: t("labels.sample.room"),
      roomHue: "teal",
      serviceName: t("labels.sample.service"),
      churchName: session.tenantName,
      code: t("labels.sample.code"),
      allergy: t("labels.sample.allergy"),
      bag: false,
    },
  ];

  const personIds = (members ?? "").split(",").filter(Boolean);
  const { labels, layout } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      labels: test
        ? sample
        : service
          ? await labelsFor(tx, { role: session.role }, service, personIds, session.tenantName)
          : [],
      layout: await getLabelLayout(tx, session.tenantId),
    }),
  );

  return <LabelSheet labels={labels} printer={printer} layout={layout} />;
}
