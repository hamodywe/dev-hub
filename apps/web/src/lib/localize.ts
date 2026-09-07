import type { Locale } from "@/i18n/config";
import { demoLangFromLocale, isDemoLang, isDemoSlug } from "@/demos/config";
import type { Project, Service, SiteSettings, TeamMember } from "./types";
import { previewUrl } from "./preview-url";
import defaults from "@/content/public-defaults.json";
import defaultTeam from "@/content/team.json";

/** A missing translation stays empty. Public copy never falls back to another language. */
export const pick = (
  locale: Locale,
  ar?: string | null,
  en?: string | null,
  ckb?: string | null,
) => (locale === "en" ? en : locale === "ckb" ? ckb : ar)?.trim() || "";

export const pickList = (
  locale: Locale,
  ar?: string[] | null,
  en?: string[] | null,
  ckb?: string[] | null,
) =>
  (locale === "en" ? en : locale === "ckb" ? ckb : ar)?.filter(
    (item) => typeof item === "string" && item.trim(),
  ) || [];

/** Only bundled demo routes/covers change language; original external previews remain untouched. */
export function localizeDemoUrl(url: string, locale: Locale) {
  if (typeof url !== "string" || !url) return url;
  const lang = demoLangFromLocale(locale);
  const page = url.match(/^\/demos\/([^/]+)\/([^/?#]+)(\/?)([?#].*)?$/);
  if (page && isDemoSlug(page[1]) && isDemoLang(page[2]))
    return `/demos/${page[1]}/${lang}${page[3]}${page[4] || ""}`;
  const cover = url.match(/^\/demos\/covers\/([^/]+)-(ar|en)\.jpg([?#].*)?$/);
  if (cover && isDemoSlug(cover[1]))
    return `/demos/covers/${cover[1]}-${lang}.jpg${cover[3] || ""}`;
  return url;
}

const known = (source: unknown, original: unknown, translation?: string) =>
  source !== undefined && source === original ? translation : undefined;
const explicitOrKnown = (
  value: string | null | undefined,
  source: unknown,
  original: unknown,
  translation?: string,
) => (value === undefined ? known(source, original, translation) : value);

export function localizeClient(
  source: string,
  locale: Locale,
  en?: string,
  ckb?: string,
) {
  const d = defaults.clients.find((entry) => entry.source === source);
  return pick(
    locale,
    source,
    en === undefined ? d?.en : en,
    ckb === undefined ? d?.ckb : ckb,
  );
}

export function localizeProject(p: Project, locale: Locale): Project {
  const d = defaults.projects.find((entry) => entry.key === p.slug);
  return {
    ...p,
    liveUrl: localizeDemoUrl(previewUrl(p.liveUrl), locale),
    coverImage: localizeDemoUrl(p.coverImage, locale),
    gallery: p.gallery
      ? [...new Set(p.gallery.map((image) => localizeDemoUrl(image, locale)))]
      : p.gallery,
    title: pick(
      locale,
      p.title,
      explicitOrKnown(p.titleEn, p.title, d?.source.title, d?.en.title),
      explicitOrKnown(p.titleCkb, p.title, d?.source.title, d?.ckb.title),
    ),
    tagline: pick(
      locale,
      p.tagline,
      explicitOrKnown(p.taglineEn, p.tagline, d?.source.tagline, d?.en.tagline),
      explicitOrKnown(
        p.taglineCkb,
        p.tagline,
        d?.source.tagline,
        d?.ckb.tagline,
      ),
    ),
    description: pick(
      locale,
      p.description,
      explicitOrKnown(
        p.descriptionEn,
        p.description,
        d?.source.description,
        d?.en.description,
      ),
      explicitOrKnown(
        p.descriptionCkb,
        p.description,
        d?.source.description,
        d?.ckb.description,
      ),
    ),
    client: localizeClient(p.client, locale, p.clientEn, p.clientCkb),
  };
}

export function localizeService(s: Service, locale: Locale): Service {
  const d = defaults.services.find((entry) => entry.key === String(s.id));
  const originalFeatures =
    JSON.stringify(s.features) === JSON.stringify(d?.source.features);
  return {
    ...s,
    title: pick(
      locale,
      s.title,
      explicitOrKnown(s.titleEn, s.title, d?.source.title, d?.en.title),
      explicitOrKnown(s.titleCkb, s.title, d?.source.title, d?.ckb.title),
    ),
    description: pick(
      locale,
      s.description,
      explicitOrKnown(
        s.descriptionEn,
        s.description,
        d?.source.description,
        d?.en.description,
      ),
      explicitOrKnown(
        s.descriptionCkb,
        s.description,
        d?.source.description,
        d?.ckb.description,
      ),
    ),
    features: pickList(
      locale,
      s.features,
      s.featuresEn === undefined
        ? originalFeatures
          ? d?.en.features
          : []
        : s.featuresEn,
      s.featuresCkb === undefined
        ? originalFeatures
          ? d?.ckb.features
          : []
        : s.featuresCkb,
    ),
  };
}

export function localizeTeamMember(
  member: TeamMember,
  locale: Locale,
): TeamMember {
  // A matching id alone must not replace a renamed CMS member with a seed identity.
  const d = defaultTeam.find(
    (entry) =>
      entry.id === member.id &&
      [entry.name, entry.nameAr, entry.nameEn, entry.nameCkb].includes(
        member.name,
      ),
  );
  return {
    ...member,
    name: pick(
      locale,
      member.nameAr === undefined ? d?.nameAr : member.nameAr,
      member.nameEn === undefined ? d?.nameEn : member.nameEn,
      member.nameCkb === undefined ? d?.nameCkb : member.nameCkb,
    ),
    role: pick(
      locale,
      member.role,
      explicitOrKnown(member.roleEn, member.role, d?.role, d?.roleEn),
      explicitOrKnown(member.roleCkb, member.role, d?.role, d?.roleCkb),
    ),
    focus: pick(
      locale,
      member.focus,
      explicitOrKnown(member.focusEn, member.focus, d?.focus, d?.focusEn),
      explicitOrKnown(member.focusCkb, member.focus, d?.focus, d?.focusCkb),
    ),
    github: member.github ?? d?.github ?? "",
  };
}

export function localizeSettings(
  s: SiteSettings,
  locale: Locale,
): SiteSettings {
  const translatedClients = locale === "en" ? s.clientsEn : s.clientsCkb;
  const clients =
    locale === "ar"
      ? s.clients
      : translatedClients !== undefined
        ? pickList(locale, [], s.clientsEn, s.clientsCkb)
        : (s.clients ?? [])
            .map((client) => localizeClient(client, locale))
            .filter(Boolean);
  return {
    ...s,
    team: (s.team ?? [])
      .map((member) => localizeTeamMember(member, locale))
      .filter((member) => member.name),
    heroTitle: pick(locale, s.heroTitle, s.heroTitleEn, s.heroTitleCkb),
    heroSubtitle: pick(
      locale,
      s.heroSubtitle,
      s.heroSubtitleEn,
      s.heroSubtitleCkb,
    ),
    bio: pick(locale, s.bio, s.bioEn, s.bioCkb),
    location: pick(locale, s.location, s.locationEn, s.locationCkb),
    clients: (clients ?? []).filter(Boolean),
    stats: (s.stats ?? [])
      .map((st) => {
        const d = defaults.stats.find(
          (entry) => entry.source.label === st.label,
        );
        return {
          ...st,
          label: pick(
            locale,
            st.label,
            st.labelEn === undefined ? d?.en.label : st.labelEn,
            st.labelCkb === undefined ? d?.ckb.label : st.labelCkb,
          ),
        };
      })
      .filter((st) => st.label),
    testimonials: (s.testimonials ?? [])
      .map((t) => {
        const d = defaults.testimonials.find(
          (entry) => entry.source.text === t.text,
        );
        return {
          ...t,
          name: pick(
            locale,
            t.name,
            explicitOrKnown(t.nameEn, t.name, d?.source.name, d?.en.name),
            explicitOrKnown(t.nameCkb, t.name, d?.source.name, d?.ckb.name),
          ),
          role: pick(
            locale,
            t.role,
            explicitOrKnown(t.roleEn, t.role, d?.source.role, d?.en.role),
            explicitOrKnown(t.roleCkb, t.role, d?.source.role, d?.ckb.role),
          ),
          text: pick(
            locale,
            t.text,
            t.textEn === undefined ? d?.en.text : t.textEn,
            t.textCkb === undefined ? d?.ckb.text : t.textCkb,
          ),
        };
      })
      .filter((t) => t.name && t.text),
  };
}
