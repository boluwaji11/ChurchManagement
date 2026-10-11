import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, listHouseholds, listCustomFields, listCampuses, canEditPeople,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PersonForm, PersonFormActions } from "../person-form";
import { t } from "@connectapp/i18n";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { MemberPanel } from "../member-panel";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("personForm.addTitle"));
}

type NewPersonPageProps = {
  searchParams: Promise<{ }>;
};

async function renderNewPersonPage({
  searchParams,
  presentation,
}: {
  searchParams: NewPersonPageProps["searchParams"];
  presentation: "page" | "panel";
}) {
  const {} = await searchParams;
  const session = await requireSession();

  // The form is hidden from a role that cannot use it. The refusal that matters
  // is in the repository, which rejects the write even if this page is bypassed.
  const permitted = canEditPeople(session);

  const data = permitted
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => ({
        households: await listHouseholds(tx),
        customFields: await listCustomFields(tx, "person"),
        campuses: await listCampuses(tx),
      }))
    : { households: [], customFields: [], campuses: [] };

  const form = permitted ? (
        <PersonForm
          church={session.tenantSlug}
          households={data.households}
          customFields={data.customFields}
          campuses={data.campuses.map((one) => ({ id: one.id, name: one.name }))}
        />
      ) : (
        <Denied role={session.role} action="addPerson" church={session.tenantSlug} />
      );
  const sections = [
    { id: "details", label: t("personForm.section.details") },
    { id: "household", label: t("personForm.section.household") },
    { id: "status", label: t("personForm.section.status") },
    ...(data.customFields.length > 0 ? [{ id: "custom", label: t("person.more") }] : []),
  ];

  if (presentation === "panel") {
    return (
      <MemberPanel
        title={t("personForm.addTitle")}
        sections={sections}
        formId="person-form"
        footer={permitted ? <PersonFormActions editing={false} /> : undefined}
      >
        {form}
      </MemberPanel>
    );
  }

  return (
    <AppShell session={session} tab={t("personForm.addTitle")} max="max-w-[1080px]">
      <Link
        href={"/members"}
        className="-my-1.5 inline-flex min-h-8 items-center gap-1.5 self-start py-1.5 font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("members.title")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] leading-[28px] text-fg">
          {t("personForm.addHeading")}
        </h1>
        {permitted ? <PersonFormActions editing={false} /> : null}
      </div>
      {form}
    </AppShell>
  );
}

export default function NewPersonPage(props: NewPersonPageProps) {
  return renderNewPersonPage({ ...props, presentation: "page" });
}

export function NewPersonPanelPage(props: NewPersonPageProps) {
  return renderNewPersonPage({ ...props, presentation: "panel" });
}
