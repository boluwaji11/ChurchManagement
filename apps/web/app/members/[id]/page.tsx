import PersonPage, { generateMetadata } from "./page-content";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default function PersonRoutePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ }>;
}) {
  return <PersonPage {...props} />;
}
