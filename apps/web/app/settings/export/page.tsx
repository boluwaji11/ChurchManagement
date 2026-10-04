import { redirect } from "next/navigation";
import { canArchivePeople } from "@hearth/db";
import { t } from "@hearth/i18n";
import type { MessageKey } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { DownloadRow } from "./download";

export const dynamic = "force-dynamic";

/**
 * R19.8. What can be taken, what is in it, and the name the browser saves it
 * under. The file name is not drawn: a church recognises "People", and
 * "people.csv" is a detail of the download rather than a choice to read.
 */
const ROWS: Array<{ name: MessageKey; what: MessageKey; file: string; only?: string }> = [
  { name: "settings.export.people", what: "settings.export.peopleWhat", file: "people.csv", only: "people" },
  { name: "settings.export.households", what: "settings.export.householdsWhat", file: "households.csv", only: "households" },
  { name: "settings.export.attendance", what: "settings.export.attendanceWhat", file: "attendance.csv", only: "attendance" },
  { name: "settings.export.checkin", what: "settings.export.checkinWhat", file: "checkin.csv", only: "checkin" },
  { name: "settings.export.groups", what: "settings.export.groupsWhat", file: "groups.csv", only: "groups" },
  { name: "settings.export.teams", what: "settings.export.teamsWhat", file: "teams.csv", only: "teams" },
  { name: "settings.export.serving", what: "settings.export.servingWhat", file: "serving.csv", only: "serving" },
  { name: "settings.export.followups", what: "settings.export.followupsWhat", file: "followups.csv", only: "followups" },
  { name: "settings.export.milestones", what: "settings.export.milestonesWhat", file: "milestones.csv", only: "milestones" },
  { name: "settings.export.checks", what: "settings.export.checksWhat", file: "checks.csv", only: "checks" },
  { name: "settings.export.forms", what: "settings.export.formsWhat", file: "forms.csv", only: "forms" },
  { name: "settings.export.everything", what: "settings.export.everythingWhat", file: "hearth-export.zip" },
];

/**
 * R19.8. One click, ungated, always available.
 *
 * The promise that a church can leave is only worth something if they can prove
 * it on a Tuesday afternoon without asking anybody, so this screen asks nothing
 * and checks nothing before it hands the files over.
 */
export default async function ExportPage() {
  const session = await requireSession();
  if (!canArchivePeople(session)) redirect(`/settings/privacy?church=${session.tenantSlug}`);

  return (
    <>
      <SettingsHeading title="settings.tab.export" lede="settings.lede.export" />

      <section className="rounded-[14px] border border-line bg-surface px-5 py-1">
        {ROWS.map((row) => (
          <div
            key={row.file}
            className="flex flex-wrap items-center gap-3 border-b border-sunken py-3 last:border-0"
          >
            <span className="flex-[1_1_220px] leading-[18px]">
              <span className="block font-medium text-fg">{t(row.name)}</span>
              <span className="block text-[12px] text-fg-subtle">{t(row.what)}</span>
            </span>

            <DownloadRow church={session.tenantSlug} only={row.only} file={row.file} />
          </div>
        ))}
      </section>
    </>
  );
}
