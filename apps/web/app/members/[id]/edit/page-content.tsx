import { notFound } from "next/navigation";
import {
  withTenant, getPersonForEdit, listHouseholds, listCustomFields, getCustomValues,
  listTagsWithCounts, listTagsForPerson, listContacts, listAddresses, listCampuses, canEditPeople,
  anniversaryOf,
} from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { requireSession } from "@/lib/session";
import { PersonForm, PersonFormActions } from "../../person-form";
import { toAddress } from "@/lib/address";
import { t } from "@connectapp/i18n";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";
import { memberDirectoryReturnTo } from "@/lib/member-return";
import { MemberPanel } from "../../member-panel";

/** R17.1. What the browser tab says until the record names itself. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("members.title"));
}

type EditPersonPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export async function EditPersonPanelPage({
  params,
  searchParams,
}: {
  params: EditPersonPageProps["params"];
  searchParams: EditPersonPageProps["searchParams"];
}) {
  const { id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = memberDirectoryReturnTo(rawReturnTo);
  const session = await requireSession();

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    // Found by their readable address or by their id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const person = await getPersonForEdit(tx, id);

    // Eight reads that only ever needed the id, in one pass down the connection.
    const [households, customFields, campuses, customValues, tags, assigned, contacts, places, anniversary] =
      await Promise.all([
        listHouseholds(tx),
        listCustomFields(tx, "person"),
        listCampuses(tx),
        person ? getCustomValues(tx, "person", person.id) : {},
        listTagsWithCounts(tx),
        person ? listTagsForPerson(tx, person.id) : [],
        person ? listContacts(tx, person.id) : [],
        person ? listAddresses(tx, person.id) : [],
        person ? anniversaryOf(tx, person.id) : null,
      ]);

    return { person, households, customFields, campuses, customValues, tags, assigned, contacts, places, anniversary };
  });

  // Another church's person is reported exactly like a person who does not exist.
  if (!result.person) notFound();
  const { person, households, customFields, customValues, tags, assigned, campuses, contacts, places, anniversary } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;

  const permitted = canEditPeople(session);
  const form = permitted ? (
        <PersonForm
          church={session.tenantSlug}
          returnTo={returnTo}
          households={households}
          campuses={campuses.map((one) => ({ id: one.id, name: one.name }))}
          customFields={customFields}
          customValues={customValues}
          tags={tags.map((x) => ({ id: x.id, name: x.name }))}
          assignedTags={assigned.map((x) => x.id)}
          contacts={contacts}
          places={places}
          values={{
            id: person.id,
            address: toAddress(person.address as never),
            firstName: person.firstName,
            lastName: person.lastName,
            preferredName: person.preferredName,
            dateOfBirth: person.dateOfBirth,
            campusId: person.campusId,
            maritalStatus: person.maritalStatus,
            anniversary,
            lifecycleStatus: person.lifecycleStatus,
            membershipDate: person.membershipDate,
            firstVisitOn: person.firstVisitOn,
            email: person.email,
            phone: person.phone,
            householdId: person.householdId,
            householdRole: person.householdRole,
          }}
        />
      ) : (
        <Denied role={session.role} action="editPerson" church={session.tenantSlug} />
      );
  const sections = [
    { id: "details", label: t("personForm.section.details") },
    { id: "contact", label: t("personForm.section.contact") },
    { id: "household", label: t("personForm.section.household") },
    { id: "status", label: t("person.churchHistory") },
    ...(tags.length > 0 ? [{ id: "tags", label: t("person.tags") }] : []),
    ...(customFields.length > 0 ? [{ id: "custom", label: t("person.more") }] : []),
  ];

  return (
      <MemberPanel
        title={t("personForm.editHeading", { name: display })}
        sections={sections}
        formId="person-form"
        closeTo={returnTo ?? "/members"}
        footer={permitted ? <PersonFormActions editing /> : undefined}
      >
        {person.archivedAt ? (
          <Banner tone="warning" title={t("personForm.archivedNotice.title")}>
            {t("personForm.archivedNotice.body")}
          </Banner>
        ) : null}
        {form}
      </MemberPanel>
  );
}
