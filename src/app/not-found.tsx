import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container } from "@/components/layout/container";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <Container className="grid flex-1 place-items-center py-24 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="text-muted">{t("pageNotFound")}</p>
        <Link href="/" className="text-link hover:underline">
          {t("backHome")}
        </Link>
      </div>
    </Container>
  );
}
