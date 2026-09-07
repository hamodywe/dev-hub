import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import {
  DEMO_LANGS,
  DEMO_SLUGS,
  demoDir,
  getDemoSite,
  isDemoLang,
  isDemoSlug,
  type DemoLang,
  type DemoSlug,
} from "@/demos/config";
import { demoFontVars } from "@/demos/fonts";
import { DemoBadge } from "@/demos/shared/DemoBadge";
import { SITE_URL } from "@/lib/seo";
import "@/app/demos/demos.css";

type Params = Promise<{ site: string; lang: string }>;

// Every registered template is fully static in Arabic and English.
export const dynamicParams = false;
export function generateStaticParams() {
  return DEMO_SLUGS.flatMap((site) =>
    DEMO_LANGS.map((lang) => ({ site, lang })),
  );
}

const THEME_COLOR: Record<DemoSlug, string> = {
  company: "#10233f",
  lawyer: "#0b1220",
  photographer: "#111111",
  restaurant: "#b4532a",
  clinic: "#0e7490",
  realestate: "#141414",
  "clinic-nawa": "#19756b",
  "realestate-sukn": "#173d32",
  gym: "#101715",
  appliances: "#224d3d",
  phones: "#6550c7",
  academy: "#f7f4e8",
  hotel: "#44242b",
  architecture: "#f4f3ef",
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { site, lang } = await params;
  if (!isDemoSlug(site) || !isDemoLang(lang)) return {};
  const demo = getDemoSite(site);
  const title = `${demo.name[lang]} · ${demo.kind[lang]}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: demo.tagline[lang],
    // Fictional showcase content: keep it out of search results, the gallery page is indexable.
    robots: { index: false, follow: false },
    alternates: {
      canonical: `/demos/${site}/${lang}`,
      languages: Object.fromEntries(
        DEMO_LANGS.map((l) => [l, `/demos/${site}/${l}`]),
      ),
    },
    openGraph: {
      title,
      description: demo.tagline[lang],
      images: [`/demos/covers/${site}-${lang}.jpg`],
    },
  };
}

export async function generateViewport({
  params,
}: {
  params: Params;
}): Promise<Viewport> {
  const { site } = await params;
  return {
    themeColor: isDemoSlug(site) ? THEME_COLOR[site] : "#111111",
    colorScheme: site === "lawyer" || site === "gym" ? "dark" : "light",
  };
}

export default async function DemoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { site, lang } = await params;
  if (!isDemoSlug(site) || !isDemoLang(lang)) notFound();
  return (
    <html
      lang={lang}
      dir={demoDir(lang as DemoLang)}
      data-demo={site}
      className={`${demoFontVars[site]} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <DemoBadge site={site} lang={lang} />
      </body>
    </html>
  );
}
