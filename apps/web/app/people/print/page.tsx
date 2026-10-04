import { redirect } from "next/navigation";
import { withTenant, listPeople, canEditPeople } from "@hearth/db";
import { t, plural } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AutoPrint } from "../../checkin/rooms/print/auto-print";

export const dynamic = "force-dynamic";

/**
 * R2.x. Everybody, on paper.
 *
 * The list a church puts on a clipboard: who they are, whose household, and the
 * two ways to reach them. Archived people are not on it.
 */
export default async function PrintPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canEditPeople(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const rows = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => listPeople(tx, { sort: "name" }),
  );

  return (
    <main className="mx-auto max-w-4xl px-10 py-9 text-black print:max-w-none">
      <AutoPrint />
      <style>{"@page { size: auto; margin: 0; }"}</style>

      <div className="text-[13px] font-medium text-neutral-500">{session.tenantName}</div>

      <header className="mt-1 flex items-baseline justify-between gap-6 border-b-2 border-black pb-3">
        <h1 className="font-display text-[34px] leading-[42px]">{t("people.title")}</h1>
        <span className="shrink-0 text-[15px] text-neutral-600">
          {plural("directory.matching", rows.length)}
        </span>
      </header>

      <table className="mt-5 w-full border-collapse text-[15px]">
        <thead>
          <tr className="text-left">
            {[
              t("people.column.person"),
              t("people.column.household"),
              t("people.column.phone"),
              t("people.column.email"),
            ].map((head) => (
              <th key={head} className="border-b border-neutral-300 pb-2.5 pr-4 font-semibold">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((person) => (
            <tr key={person.id} className="break-inside-avoid">
              <td className="border-b border-neutral-200 py-3 pr-4 font-semibold">
                {person.displayName}
              </td>
              <td className="border-b border-neutral-200 py-3 pr-4">
                {person.householdName ?? ""}
              </td>
              <td className="whitespace-nowrap border-b border-neutral-200 py-3 pr-4">
                {person.primaryPhone ?? ""}
              </td>
              <td className="border-b border-neutral-200 py-3">{person.primaryEmail ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
