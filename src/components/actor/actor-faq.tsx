import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { Accordion } from "@/components/ui/accordion";
import type { Actor } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { faqPageJsonLd } from "@/lib/seo/structured-data";
import { formatDate } from "@/lib/utils/format";

/**
 * Actor FAQ built from the attributes we already have (height, weight, country, etc.). Emits a
 * visible `<details>` accordion + `FAQPage` JSON-LD. Questions are phrased gender-neutrally so
 * the same templates work across locales. Renders nothing when fewer than 2 facts are known.
 */
export async function ActorFaq({ actor }: { actor: Actor }) {
  const t = await getTranslations("actor");
  const tf = await getTranslations("actorFaq");
  const locale = (await getLocale()) as Locale;
  const name = actor.name;

  const qa: { question: string; answer: string }[] = [];
  if (actor.height)
    qa.push({ question: tf("height", { name }), answer: `${actor.height} ${t("cm")}` });
  if (actor.weight)
    qa.push({ question: tf("weight", { name }), answer: `${actor.weight} ${t("kg")}` });
  if (actor.country) qa.push({ question: tf("country", { name }), answer: actor.country.name });
  if (actor.hair_color)
    qa.push({ question: tf("hairColor", { name }), answer: actor.hair_color.name });
  if (actor.eye_color)
    qa.push({ question: tf("eyeColor", { name }), answer: actor.eye_color.name });
  if (actor.birth_date)
    qa.push({ question: tf("birthDate", { name }), answer: formatDate(actor.birth_date, locale) });
  if (actor.aliases && actor.aliases.length)
    qa.push({ question: tf("aliases", { name }), answer: actor.aliases.join(", ") });
  if (actor.videos_count > 0)
    qa.push({ question: tf("videos", { name }), answer: String(actor.videos_count) });

  if (qa.length < 2) return null;

  return (
    <section className="flex flex-col gap-3">
      <JsonLd data={faqPageJsonLd(qa)} />
      <h2 className="text-lg font-semibold">{tf("title", { name })}</h2>
      <Accordion items={qa} />
    </section>
  );
}
