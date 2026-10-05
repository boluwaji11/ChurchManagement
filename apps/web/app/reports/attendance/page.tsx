import { redirect } from "next/navigation";
import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { attendanceByService, attendanceByName } from "@hearth/db";
import { Table, Thead, Tr, Th, Td } from "@hearth/ui";
import { shortDate } from "@/lib/dates";
import { ReportFrame, backBy, windowOf } from "../frame";

export const dynamic = "force-dynamic";

/**
 * R18.2. How many came, service by service.
 *
 * Two readings of the same record: every service in order, and each kind of
 * service averaged. A church with a nine o'clock and an eleven o'clock wants
 * to know which one is growing, and a single line across both cannot say.
 */
export default async function AttendanceReport({
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

  const { services, byName } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      const range = { from: backBy(clock.date, window), to: clock.date };
      return {
        services: await attendanceByService(tx, range),
        byName: await attendanceByName(tx, range),
      };
    },
  );

  return (
    <AppShell session={session} title={t("reports.title")}>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.attendance.title")}
        window={window}
        path="attendance"
      >
        {byName.length === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>{t("reports.service")}</Th>
                    <Th>{t("reports.held")}</Th>
                    <Th>{t("reports.average")}</Th>
                    <Th>{t("reports.best")}</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {byName.map((one) => (
                    <Tr key={one.name}>
                      <Td className="font-medium text-fg">{one.name}</Td>
                      <Td className="text-fg-muted tabular-nums">{one.held}</Td>
                      <Td className="text-fg tabular-nums">{one.average}</Td>
                      <Td className="text-fg-muted tabular-nums">{one.best}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>{t("reports.month")}</Th>
                    <Th>{t("reports.service")}</Th>
                    <Th>{t("reports.people")}</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {[...services].reverse().map((one) => (
                    <Tr key={one.occurrenceId}>
                      <Td className="text-fg-muted tabular-nums">{shortDate(one.occursOn)}</Td>
                      <Td className="font-medium text-fg">{one.name}</Td>
                      <Td className="text-fg tabular-nums">{one.present}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
