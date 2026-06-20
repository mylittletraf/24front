import { ADULT_CONTENT } from "@/lib/api/config";

/**
 * Raw `<meta property>` tags that Next's metadata API can't emit (it only produces `name=`).
 * Yandex Video reads `og:`/`ya:` *property* tags, and the age-restriction tags need `property=`
 * too. React 19 hoists these into `<head>` even though they're rendered in the page body.
 * Adult/age flags are gated behind `ADULT_CONTENT` (NEXT_PUBLIC_ADULT_CONTENT).
 */
export function VideoRawMeta({
  durationSeconds,
  uploadDate,
}: {
  durationSeconds?: number;
  uploadDate?: string | null;
}) {
  const tags: { property?: string; name?: string; content: string }[] = [];
  if (typeof durationSeconds === "number" && durationSeconds > 0)
    tags.push({ property: "video:duration", content: String(Math.round(durationSeconds)) });
  if (uploadDate) tags.push({ property: "ya:ovs:upload_date", content: uploadDate });
  if (ADULT_CONTENT) {
    tags.push({ property: "ya:ovs:adult", content: "true" });
    tags.push({ property: "og:restrictions:age", content: "18+" });
    tags.push({ name: "rating", content: "adult" });
  }
  return (
    <>
      {tags.map((t) => (
        <meta key={t.property ?? t.name} {...t} />
      ))}
    </>
  );
}
