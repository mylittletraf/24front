import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export async function Footer() {
  const t = await getTranslations("nav");

  const links = [
    { href: "/videos", label: t("videos") },
    { href: "/actors", label: t("actors") },
    { href: "/collections", label: t("collections") },
    { href: "/categories", label: t("categories") },
  ];

  return (
    <footer className="border-border bg-background desktop:block mt-auto hidden border-t">
      <div className="flex w-full items-center justify-between gap-4 px-6 py-6 text-sm">
        <Link href="/" className="text-accent font-bold">
          24front
        </Link>
        <nav className="text-muted flex items-center gap-4">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-muted">© {new Date().getFullYear()} 24front</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
