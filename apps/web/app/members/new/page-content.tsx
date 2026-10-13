import {
  withTenant, listHouseholds, listCustomFields, listCampuses, listTagsWithCounts, canEditPeople,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { PersonForm, PersonFormActions } from "../person-form";
import { t } from "@connectapp/i18n";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { memberDirectoryReturnTo } from "@/lib/member-return";
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
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export async function NewPersonPanelPage({
  searchParams,
}: {
  searchParams: NewPersonPageProps["searchParams"];
}) {
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = memberDirectoryReturnTo(rawReturnTo);
  const session = await requireSession();

  // The form is hidden from a role that cannot use it. The refusal that matters
  // is in the repository, which rejects the write even if this page is bypassed.
  const permitted = canEditPeople(session);

  const data = permitted
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => ({
        households: await listHouseholds(tx),
        customFields: await listCustomFields(tx, "person"),
        campuses: await listCampuses(tx),
        tags: await listTagsWithCounts(tx),
      }))
    : { households: [], customFields: [], campuses: [], tags: [] };

  const form = permitted ? (
        <PersonForm
          church={session.tenantSlug}
          returnTo={returnTo}
          households={data.households}
          customFields={data.customFields}
          campuses={data.campuses.map((one) => ({ id: one.id, name: one.name }))}
          tags={data.tags.map((tag) => ({ id: tag.id, name: tag.name }))}
        />
      ) : (
        <Denied role={session.role} action="addPerson" church={session.tenantSlug} />
      );
  const sections = [
    { id: "details", label: t("personForm.section.details") },
    { id: "contact", label: t("personForm.section.contact") },
    { id: "household", label: t("personForm.section.household") },
    { id: "status", label: t("person.churchHistory") },
    ...(data.tags.length > 0 ? [{ id: "tags", label: t("person.tags") }] : []),
    ...(data.customFields.length > 0 ? [{ id: "custom", label: t("person.more") }] : []),
  ];

  return (
      <MemberPanel
        title={t("personForm.addTitle")}
        sections={sections}
        formId="person-form"
        closeTo={returnTo ?? "/members"}
        footer={permitted ? <PersonFormActions editing={false} /> : undefined}
      >
        {form}
      </MemberPanel>
  );
}
