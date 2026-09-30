import { withTenant, listTagsWithCounts, canManageTags, canEditPeople } from "@hearth/db";
import { Banner, EmptyState } from "@hearth/ui";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { TagManager } from "./tag-manager";

export const dynamic = "force-dynamic";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const tags = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listTagsWithCounts(tx),
  );

  const canCreate = canEditPeople(session.role);
  const canManage = canManageTags(session.role);

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title="Tags" lede={session.tenantName} />

        {!canCreate && !canManage ? (
          <Banner tone="info" title="Your role cannot change tags">
            Ask an Owner or an Admin.
          </Banner>
        ) : (
          <TagManager church={session.tenantSlug} tags={tags} canManage={canManage} canCreate={canCreate} />
        )}

        {tags.length === 0 && canCreate ? (
          <div className="mt-8">
            <EmptyState title="No tags yet" body="Choir. Greeter. Needs a ride. Anything the church sorts people by." />
          </div>
        ) : null}
      </main>
    </>
  );
}
