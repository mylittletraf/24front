import { Film, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Description } from "@/components/video/description";
import type { Actor } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { formatDate } from "@/lib/utils/format";

export async function ActorHero({ actor, subscribe }: { actor: Actor; subscribe?: ReactNode }) {
  const t = await getTranslations("actor");
  const locale = (await getLocale()) as Locale;
  const shortsCount = actor.shorts_count ?? 0;

  const rows: { label: string; value: string }[] = [];
  if (actor.country) rows.push({ label: t("country"), value: actor.country.name });
  if (actor.body_type) rows.push({ label: t("bodyType"), value: actor.body_type.name });
  if (actor.bra_size) rows.push({ label: t("braSize"), value: actor.bra_size.name });
  if (actor.boobs_type) rows.push({ label: t("boobsType"), value: actor.boobs_type.name });
  if (actor.height) rows.push({ label: t("height"), value: `${actor.height} ${t("cm")}` });
  if (actor.weight) rows.push({ label: t("weight"), value: `${actor.weight} ${t("kg")}` });
  if (actor.hair_color) rows.push({ label: t("hairColor"), value: actor.hair_color.name });
  if (actor.eye_color) rows.push({ label: t("eyeColor"), value: actor.eye_color.name });
  if (actor.birth_date)
    rows.push({ label: t("birthDate"), value: formatDate(actor.birth_date, locale) });
  if (actor.birth_place) rows.push({ label: t("birthPlace"), value: actor.birth_place });
  if (actor.career_start_year)
    rows.push({
      label: t("career"),
      value: actor.career_end_year
        ? `${actor.career_start_year}–${actor.career_end_year}`
        : `${actor.career_start_year}`,
    });

  return (
    <section className="bg-surface relative overflow-hidden rounded-2xl">
      {/* Cover sits on the right (desktop only) and fades into the info area via a gradient mask,
          so it decorates the block instead of dimming the whole header. */}
      {actor.cover_image ? (
        <div aria-hidden className="desktop:block absolute inset-y-0 right-0 hidden w-3/5">
          <SafeImage
            src={actor.cover_image}
            alt=""
            fill
            sizes="60vw"
            className="object-cover object-right"
            priority
          />
          <div className="from-surface via-surface/85 absolute inset-0 bg-gradient-to-r to-transparent" />
        </div>
      ) : null}

      <div className="desktop:flex-row desktop:p-6 relative flex flex-col gap-4 p-4">
        <div className="desktop:w-56 relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl shadow-lg">
          <SafeImage
            src={actor.photo}
            alt={actor.name}
            fill
            sizes="(max-width: 1024px) 100vw, 224px"
            className="object-cover"
            priority
            fallback={
              <div className="bg-surface-2 grid h-full w-full place-items-center text-5xl font-semibold">
                {actor.name.charAt(0).toUpperCase()}
              </div>
            }
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-bold">{actor.name}</h1>
          {actor.aliases && actor.aliases.length > 0 ? (
            <p className="text-muted text-sm">
              {t("aliases")}: {actor.aliases.join(", ")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {subscribe}
            <div className="text-muted flex flex-col gap-0.5 text-sm">
              {/* `videos_count` includes verticals, so plain videos = total − shorts. */}
              <span className="flex items-center gap-1.5">
                <Film size={15} />
                {t("videosCount", { count: Math.max(0, actor.videos_count - shortsCount) })}
              </span>
              {shortsCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Zap size={15} />
                  {t("shortsCount", { count: shortsCount })}
                </span>
              ) : null}
              {typeof actor.subscribers_count === "number" ? (
                <span>{t("subscribersCount", { count: actor.subscribers_count })}</span>
              ) : null}
            </div>
          </div>

          {rows.length > 0 ? (
            <dl className="grid max-w-md grid-cols-1 gap-y-1 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="border-border flex gap-3 border-b py-1">
                  <dt className="text-muted w-32 shrink-0">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {actor.bio ? (
            <div className="text-foreground">
              <Description text={actor.bio} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
