import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { FeedDashboard } from "@/components/feed/feed-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function FeedPage() {
  return (
    <Container className="desktop:py-6 py-4">
      <FeedDashboard />
    </Container>
  );
}
