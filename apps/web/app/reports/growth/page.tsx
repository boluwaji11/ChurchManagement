import { redirect } from "next/navigation";
import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { growthByMonth } from "@hearth/db";
import { Table, Thead, Tr, Th, Td } from "@hearth/ui";
import { ReportFrame, backBy, windowOf } from "../frame";

export const dynamic = "force-dynamic";

/**
 * R18.4. New, lapsed and the net change, month by month.
 *
 * "Lapsed" waits two months before it says so, because a church should not be
 * told it lost somebody who was on holiday.
 */
export default async function GrowthReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const window = windowOf(days);

  const months = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      return growthByMonth(tx, { from: backBy(clock.date, window), to: clock.date });
    },
  );

  return (
    <AppShell session={session} title={t("reports.title")}>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.growth.title")}
        window={window}
        path="growth"
      >
        {months.length === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>{t("reports.month")}</Th>
                  <Th>{t("reports.joined")}</Th>
                  <Th>{t("reports.lapsed")}</Th>
                  <Th>{t("reports.net")}</Th>
                </Tr>
              </Thead>
              <tbody>
                {[...months].reverse().map((one) => (
                  <Tr key={one.month}>
                    <Td className="font-medium text-fg tabular-nums">{one.month}</Td>
                    <Td className="text-fg tabular-nums">{one.joined}</Td>
                    <Td className="text-fg-muted tabular-nums">{one.lapsed}</Td>
                    <Td
                      className="tabular-nums"
                      style={{
                        color:
                          one.net > 0
                            ? "var(--hue-fern-key)"
                            : one.net < 0
                              ? "var(--hue-rose-key)"
                              : undefined,
                      }}
                    >
                      {one.net > 0 ? `+${one.net}` : one.net}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </ReportFrame>
    </AppShell>
  );
}
