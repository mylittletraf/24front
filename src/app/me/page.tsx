import { Container } from "@/components/layout/container";
import { MeDashboard } from "@/components/me/me-dashboard";

const TABS = ["favorites", "liked", "history", "continue", "reports", "settings"] as const;
type Tab = (typeof TABS)[number];

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const initialTab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "favorites";

  return (
    <Container className="desktop:py-6 py-4">
      <MeDashboard initialTab={initialTab} />
    </Container>
  );
}
