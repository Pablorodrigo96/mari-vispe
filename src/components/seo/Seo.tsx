import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}

const SITE = "https://mari.vispe.com.br";
const DEFAULT_OG = "https://storage.googleapis.com/gpt-engineer-file-uploads/XO9FlPdyZUOIrdzCAPaYmgLnROR2/social-images/social-1777934628738-logo_horizontal.webp";

export function Seo({ title, description, path, ogImage = DEFAULT_OG }: SeoProps) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
