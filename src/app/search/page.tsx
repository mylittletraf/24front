import { Container } from "@/components/layout/container";
import { SearchView } from "@/components/search/search-view";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  return (
    <Container className="desktop:py-6 py-4">
      <SearchView q={q} />
    </Container>
  );
}
