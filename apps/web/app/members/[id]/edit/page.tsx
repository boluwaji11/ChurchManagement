import EditPersonPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function EditPersonRoutePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ }>;
}) {
  return <EditPersonPage {...props} />;
}
