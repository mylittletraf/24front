import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { SearchView } from "@/components/search/search-view";

// Search result pages are thin/duplicate — keep them out of the index but let crawlers follow.
export const metadata: Metadata = { robots: { index: false, follow: true } };

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
