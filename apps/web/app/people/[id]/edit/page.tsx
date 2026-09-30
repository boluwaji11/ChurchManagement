import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { withTenant, getPersonForEdit, listHouseholds, canEditPeople } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "../../person-form";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => ({
    person: await getPersonForEdit(tx, id),
    households: await listHouseholds(tx),
  }));

  // Another church's person is reported exactly like a person who does not exist.
  if (!result.person) notFound();
  const { person, households } = result;
  const display = `${person.preferredName ?? person.firstName} ${person.lastName}`;

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/people/${id}?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {display}
        </Link>

        <PageTitle title={`Edit ${display}`} lede={session.tenantName} />

        {person.archivedAt ? (
          <Banner tone="warning" title="Archived" className="mb-6">
            Out of every list until restored. Nothing was deleted.
          </Banner>
        ) : null}

        {canEditPeople(session.role) ? (
          <PersonForm
            church={session.tenantSlug}
            households={households}
            values={{
              id: person.id,
              firstName: person.firstName,
              lastName: person.lastName,
              preferredName: person.preferredName,
              dateOfBirth: person.dateOfBirth,
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
          <Banner tone="info" title="Your role cannot edit people">
            Ask an Owner or an Admin.
          </Banner>
        )}
      </main>
    </>
  );
}
