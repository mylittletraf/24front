import { Film, Zap } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Description } from "@/components/video/description";
import type { Actor } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { countryDisplay } from "@/lib/utils/country";
import { ageFromBirthDate, formatDate } from "@/lib/utils/format";
import { Measurements } from "./measurements";

type AttrRow = { label: string; value: ReactNode };

/** Capitalize the first letter of every word (aliases are often stored lowercase). */
function titleCase(s: string): string {
  return s.replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

export async function ActorHero({ actor, subscribe }: { actor: Actor; subscribe?: ReactNode }) {
  const t = await getTranslations("actor");
  const locale = (await getLocale()) as Locale;
  const shortsCount = actor.shorts_count ?? 0;

  const birthYear = actor.birth_date ? new Date(actor.birth_date).getFullYear() : null;
  const currentAge = ageFromBirthDate(actor.birth_date); // exact, month/day-aware

  // Personal: identity / biography facts (anything not about the body).
  const personal: AttrRow[] = [];
  if (actor.country) {
    // If the country is stored as an ISO code (RU/US/…), show flag + localized name.
    const cd = countryDisplay(actor.country, locale);
    personal.push({
      label: t("country"),
      value: cd ? `${cd.flag} ${cd.name}` : actor.country.name,
    });
  }
  if (actor.ethnicity) personal.push({ label: t("ethnicity"), value: actor.ethnicity.name });
  if (actor.birth_date)
    personal.push({
      label: t("birthDate"),
      value:
        currentAge != null
          ? `${formatDate(actor.birth_date, locale)} (${t("yearsOld", { count: currentAge })})`
          : formatDate(actor.birth_date, locale),
    });
  if (actor.birth_place) personal.push({ label: t("birthPlace"), value: actor.birth_place });
  if (actor.career_start_year) {
    personal.push({
      label: t("career"),
      value: actor.career_end_year
        ? `${actor.career_start_year}–${actor.career_end_year}`
        : `${actor.career_start_year} – ${t("careerPresent")}`,
    });
    // Age on set — needs both birth year and career start
    if (birthYear) {
      const fromAge = actor.career_start_year - birthYear;
      personal.push({
        label: t("ageOnSet"),
        value: actor.career_end_year
          ? t("ageOnSetRange", { from: fromAge, to: actor.career_end_year - birthYear })
          : t("ageOnSetFrom", { from: fromAge }),
      });
    }
  }

  // Body: physical attributes.
  const body: AttrRow[] = [];
  if (actor.body_type) body.push({ label: t("bodyType"), value: actor.body_type.name });
  if (actor.height) body.push({ label: t("height"), value: `${actor.height} ${t("cm")}` });
  if (actor.weight) body.push({ label: t("weight"), value: `${actor.weight} ${t("kg")}` });
  if (actor.hair_color) body.push({ label: t("hairColor"), value: actor.hair_color.name });
  if (actor.eye_color) body.push({ label: t("eyeColor"), value: actor.eye_color.name });
  if (actor.bra_size) body.push({ label: t("braSize"), value: actor.bra_size.name });
  if (actor.boobs_type) body.push({ label: t("boobsType"), value: actor.boobs_type.name });
  if (actor.measurements)
    body.push({ label: t("measurements"), value: <Measurements value={actor.measurements} /> });
  if (actor.piercings) body.push({ label: t("piercings"), value: actor.piercings });
  if (actor.has_tattoos) body.push({ label: t("tattoos"), value: t("yes") });

  const groups: { title: string; rows: AttrRow[] }[] = [
    { title: t("personalGroup"), rows: personal },
    { title: t("bodyGroup"), rows: body },
  ].filter((g) => g.rows.length > 0);

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
          {/* Stacked video / shorts counters over the cover (videos = total − verticals). */}
          <div className="absolute bottom-2 left-2 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
              <Film size={13} />
              {t("videosCount", { count: Math.max(0, actor.videos_count - shortsCount) })}
            </span>
            {shortsCount > 0 ? (
              <span className="flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                <Zap size={13} />
                {t("shortsCount", { count: shortsCount })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-bold">{actor.name}</h1>
          {actor.aliases && actor.aliases.length > 0 ? (
            <p className="text-muted text-sm">
              {t("aliases")}: {actor.aliases.map(titleCase).join(", ")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {subscribe}
            {typeof actor.subscribers_count === "number" ? (
              <span className="text-muted text-sm">
                {t("subscribersCount", { count: actor.subscribers_count })}
              </span>
            ) : null}
          </div>

          {groups.length > 0 ? (
            <div className="flex max-w-2xl flex-col gap-4">
              {groups.map((group) => (
                <section key={group.title} className="flex flex-col gap-1">
                  <h2 className="text-foreground border-border mb-1 border-b pb-1 text-lg font-bold">
                    {group.title}
                  </h2>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {group.rows.map((row) => (
                      <div key={row.label} className="border-border flex gap-3 border-b py-1">
                        <dt className="text-muted w-32 shrink-0">{row.label}</dt>
                        <dd className="font-medium">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
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
