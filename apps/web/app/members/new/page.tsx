import NewPersonPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function NewPersonRoutePage(props: {
  searchParams: Promise<{ }>;
}) {
  return <NewPersonPage {...props} />;
}
