import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "profile";
  jsonLd?: object | object[];
  /** Private/tokenized pages: robots noindex,nofollow, no canonical/og:url, no JSON-LD. */
  noindex?: boolean;
}

const SITE = "https://homeguide.casa";

export function Seo({ title, description, path, image, type = "website", jsonLd, noindex = false }: SeoProps) {
  const url = `${SITE}${path}`;
  const img = image || `${SITE}/images/hg-logo.png`;
  const ldArray = !noindex && jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <link rel="canonical" href={url} />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {!noindex && <meta property="og:url" content={url} />}
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
