import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Description } from "@/components/video/description";
import type { Actor } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locales";
import { formatDate } from "@/lib/utils/format";

export async function ActorHero({ actor }: { actor: Actor }) {
  const t = await getTranslations("actor");
  const locale = (await getLocale()) as Locale;

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

  return (
    <section className="relative overflow-hidden rounded-2xl">
      {actor.cover_image ? (
        <>
          <Image
            src={actor.cover_image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="bg-overlay absolute inset-0" />
        </>
      ) : (
        <div className="bg-surface absolute inset-0" />
      )}

      <div className="desktop:flex-row desktop:p-6 relative flex flex-col gap-4 p-4">
        <div className="desktop:w-64 relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl shadow-lg">
          {actor.photo ? (
            <Image
              src={actor.photo}
              alt={actor.name}
              fill
              sizes="(max-width: 1024px) 100vw, 256px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="bg-surface-2 grid h-full w-full place-items-center text-5xl font-semibold">
              {actor.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div
          className={
            actor.cover_image
              ? "flex min-w-0 flex-1 flex-col gap-3 text-white"
              : "flex min-w-0 flex-1 flex-col gap-3"
          }
        >
          <h1 className="text-2xl font-bold">{actor.name}</h1>
          {actor.aliases && actor.aliases.length > 0 ? (
            <p className="text-sm opacity-90">
              {t("aliases")}: {actor.aliases.join(", ")}
            </p>
          ) : null}

          {rows.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between gap-2 border-b border-white/10 py-1"
                >
                  <dt className="opacity-80">{row.label}</dt>
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
