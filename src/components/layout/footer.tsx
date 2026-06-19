import { getTranslations } from "next-intl/server";
import { SITE_NAME } from "@/lib/api/config";
import { FooterLinks } from "./footer-links";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-border bg-background mt-auto border-t">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-6 text-center">
        <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{t("description")}</p>
        <FooterLinks />
        <span className="text-muted text-xs">
          © {new Date().getFullYear()} {SITE_NAME}
        </span>
      </div>
    </footer>
  );
}
