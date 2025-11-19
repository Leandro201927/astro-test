import type { Page } from "@/types/clientWebsite";

export default function Layout({ page, children }: { page: Page, children: JSX.Element }) {
  const metaTitle = page.meta_title || page.title;
  const metaDescription = page.meta_description || "";
  const canonical = page.canonical || null;
  const robots = `${page.noindex ? "noindex" : "index"}, ${page.nofollow ? "nofollow" : "follow"}${page.robots_extra ? ", " + page.robots_extra : ""}`;

  const og = page.open_graph || {};
  const ogImage = og.og_image || {};

  const alternates = page.hreflang_alternates || [];

  return (
    <html lang={page.language}>
    <head>
      <title>{metaTitle}</title>
      <meta charSet="UTF-8" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={robots} />
      <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
      {canonical && <link rel="canonical" href={canonical} />}
      {alternates.map((alt) => (
        <link rel="alternate" hrefLang={(alt as any).lang} href={(alt as any).url} />
      ))}
      <meta property="og:type" content={og.og_type || "website"} />
      <meta property="og:title" content={og.og_title || metaTitle} />
      <meta property="og:description" content={og.og_description || metaDescription} />
      {ogImage.src && <meta property="og:image" content={ogImage.src} />}
      {typeof ogImage.width === 'number' && ogImage.width > 0 && (
        <meta property="og:image:width" content={String(ogImage.width)} />
      )}
      {typeof ogImage.height === 'number' && ogImage.height > 0 && (
        <meta property="og:image:height" content={String(ogImage.height)} />
      )}
      <meta name="twitter:card" content={og.twitter_card || "summary"} />
      {Object.keys(page.schema_org || {}).length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(page.schema_org)}
        </script>
      )}
    </head>
    <body>
      {children}
    </body>
  </html>
  );
}
