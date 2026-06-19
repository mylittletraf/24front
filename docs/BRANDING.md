# Branding: site name & logo

## Site name

The brand name and default description are **not hardcoded** — they live in
`src/lib/api/config.ts`:

```ts
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "24front";
export const SITE_DESCRIPTION = process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "Tube site";
```

Override per environment in `.env` (see `.env.example`):

```
NEXT_PUBLIC_SITE_NAME=MyTube
NEXT_PUBLIC_SITE_DESCRIPTION=Best videos online
```

`SITE_NAME` is used in the header (`src/components/layout/header.tsx`), the footer
(`src/components/layout/footer.tsx`), the `<title>` template + `og:site_name`
(`src/app/layout.tsx`). Changing the env var updates all of them.

> Note: the marketing copy in `footer.description` / `advertising` modals lives in the
> i18n files (`src/messages/*.json`) and still mentions the brand literally — update those
> per language if you rename the site.

## Logo (TODO — currently a text wordmark)

The header brand is currently plain text (`{SITE_NAME}` styled with `text-accent`).
To replace it with an image logo:

1. Drop the asset into `public/` (SVG preferred for crispness), e.g. `public/logo.svg`.
2. In `src/components/layout/header.tsx`, replace the text inside the brand `<Link>`:

   ```tsx
   import Image from "next/image";

   <Link href="/" className="shrink-0">
     <Image src="/logo.svg" alt={SITE_NAME} width={120} height={32} priority />
   </Link>
   ```

   Keep `priority` (above the fold) and set width/height to the real aspect ratio.
   For a logo that differs between light/dark themes, render two `<Image>`s and toggle
   with `dark:hidden` / `hidden dark:block`.
3. Optionally swap the footer wordmark the same way.

### Favicon / tab & app icons (separate from the header logo)

Next.js App Router picks these up by filename from `src/app/` — no config needed:

| File                       | Purpose                          |
| -------------------------- | -------------------------------- |
| `src/app/favicon.ico`      | Browser tab (already present)    |
| `src/app/icon.svg` / `.png`| Modern tab icon (overrides .ico) |
| `src/app/apple-icon.png`   | iOS home-screen icon (180×180)   |

Just add the files; Next injects the `<link>` tags automatically.
