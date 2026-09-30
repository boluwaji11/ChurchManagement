import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withTenant, listHouseholds, canEditPeople } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { PersonForm } from "../person-form";

export const dynamic = "force-dynamic";

export default async function NewPersonPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // The form is hidden from a role that cannot use it. The refusal that matters
  // is in the repository, which rejects the write even if this page is bypassed.
  const permitted = canEditPeople(session.role);

  const households = permitted
    ? await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) => listHouseholds(tx))
    : [];

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/people?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Directory
        </Link>

        <PageTitle
          title="Add someone"
          lede="First name and surname are all that is needed. Everything else can wait until you know it."
        />

        {permitted ? (
          <PersonForm church={session.tenantSlug} households={households} />
        ) : (
          <Banner tone="info" title="Your role cannot add people">
            The {session.role} role can read the directory. Ask an Owner or an Admin to add someone.
          </Banner>
        )}
      </main>
    </>
  );
}
