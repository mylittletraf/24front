import { ADULT_CONTENT } from "@/lib/api/config";

/** Canonical RTA "Restricted To Adults" label — respected by parental-control filters/browsers. */
const RTA_LABEL = "RTA-5042-1996-1400-1577-RTA";

export interface VideoStats {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
}

/**
 * Raw `<meta property>` tags that Next's metadata API can't emit (it only produces `name=`).
 * Yandex Video reads `og:`/`ya:` *property* tags. React 19 hoists these into `<head>` even though
 * they're rendered in the page body. Adult/age flags are gated behind `ADULT_CONTENT`.
 */
export function VideoRawMeta({
  durationSeconds,
  uploadDate,
  tags = [],
  embedUrl,
  stats,
}: {
  durationSeconds?: number;
  uploadDate?: string | null;
  /** Tag names → one `video:tag` each. */
  tags?: string[];
  /** Absolute embed-player URL → Yandex OVS inline-play tags. */
  embedUrl?: string;
  /** View/like/dislike/comment counts → Yandex OVS stats tags. */
  stats?: VideoStats;
}) {
  const tagList: { property?: string; name?: string; content: string }[] = [];

  if (typeof durationSeconds === "number" && durationSeconds > 0)
    tagList.push({ property: "video:duration", content: String(Math.round(durationSeconds)) });
  if (uploadDate) tagList.push({ property: "ya:ovs:upload_date", content: uploadDate });

  for (const tag of tags) tagList.push({ property: "video:tag", content: tag });

  // Yandex OVS: allow the embed player to render inline in Yandex Video / search results.
  if (embedUrl) {
    tagList.push({ property: "ya:ovs:allow_embed", content: "true" });
    tagList.push({ property: "ya:ovs:embed_url", content: embedUrl });
    tagList.push({
      property: "ya:ovs:embed_html",
      content: `<iframe width="100%" height="100%" frameborder="0" src="${embedUrl}"></iframe>`,
    });
  }

  // Yandex OVS reads engagement stats from these meta tags (not from JSON-LD).
  if (stats) {
    tagList.push({ property: "ya:ovs:views_total", content: String(stats.views) });
    tagList.push({ property: "ya:ovs:likes", content: String(stats.likes) });
    tagList.push({ property: "ya:ovs:dislikes", content: String(stats.dislikes) });
    tagList.push({ property: "ya:ovs:comments", content: String(stats.comments) });
  }

  if (ADULT_CONTENT) {
    tagList.push({ property: "ya:ovs:adult", content: "true" });
    tagList.push({ property: "og:restrictions:age", content: "18+" });
    tagList.push({ name: "rating", content: RTA_LABEL });
  }

  return (
    <>
      {tagList.map((t, i) => (
        <meta key={`${t.property ?? t.name}-${i}`} {...t} />
      ))}
    </>
  );
}
