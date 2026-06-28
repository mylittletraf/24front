import { screenshotLabel, type ScreenshotSeoContext } from "@/lib/seo/screenshots";

/**
 * Screenshot gallery, server-rendered so the <img> tags (with keyword-rich alt + figcaption)
 * are in the initial HTML and crawlable by Google/Yandex image search — including Yandex,
 * which barely runs JS. Plain <img> (not next/image) so the src in the DOM is the exact
 * canonical /media URL that the ImageObject JSON-LD and sitemap point at.
 */
export function Screenshots({ screens, seo }: { screens: string[]; seo: ScreenshotSeoContext }) {
  if (!screens.length) return null;
  return (
    <ul className="desktop:grid-cols-3 grid grid-cols-2 gap-2">
      {screens.map((src, i) => {
        const label = screenshotLabel(seo, i + 1);
        return (
          <li key={src}>
            <figure className="m-0 flex flex-col gap-1">
              <div className="bg-surface relative aspect-video w-full overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={label}
                  title={label}
                  width={640}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                />
              </div>
              <figcaption className="text-muted truncate text-xs">{label}</figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
