import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const paragraphs = t("body").split("\n\n");

  return (
    <Container className="py-10">
      <article className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="text-muted flex flex-col gap-3 text-sm leading-relaxed">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </Container>
  );
}
