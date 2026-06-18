import { redirect } from "next/navigation";

// The catalog was merged into the home page ("Видео" = home). Keep this path working.
export default async function VideosRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
