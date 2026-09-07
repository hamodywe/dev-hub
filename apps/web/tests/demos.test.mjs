import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import {
  DEMO_LANGS,
  DEMO_SITES,
  DEMO_SLUGS,
  demoCover,
  demoHref,
  demoLangFromLocale,
  isDemoLang,
  isDemoSlug,
} from "../src/demos/config.ts";
import { companyContent } from "../src/demos/company/content.ts";
import { lawyerContent } from "../src/demos/lawyer/content.ts";
import { photographerContent } from "../src/demos/photographer/content.ts";
import { restaurantContent } from "../src/demos/restaurant/content.ts";
import { clinicContent } from "../src/demos/clinic/content.ts";
import { realestateContent } from "../src/demos/realestate/content.ts";
import { clinicContent as nawaClinicContent } from "../src/demos/clinic-nawa/content.ts";
import {
  realEstateContent as suknRealEstateContent,
  properties,
} from "../src/demos/realestate-sukn/content.ts";
import { gymContent } from "../src/demos/gym/content.ts";
import { appliancesContent } from "../src/demos/appliances/content.ts";
import { phonesContent } from "../src/demos/phones/content.ts";
import "../src/demos/clinic-nawa/clinic.test.mjs";
import { academyContent } from "../src/demos/academy/content.ts";
import { hotelContent } from "../src/demos/hotel/content.ts";
import { architectureContent } from "../src/demos/architecture/content.ts";
import { demosCopy } from "../src/i18n/demos.ts";
import { LOCALES } from "../src/i18n/config.ts";
// API ESM imports use .js in production; read their sibling TypeScript seed files in this source test.
const apiSeedUrl = new URL("../../api/src/seed/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.startsWith(apiSeedUrl) &&
      specifier.startsWith(".") &&
      specifier.endsWith(".js")
    ) {
      const candidate = new URL(
        specifier.replace(/\.js$/, ".ts"),
        context.parentURL,
      );
      if (candidate.href.startsWith(apiSeedUrl) && existsSync(candidate))
        return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { TEMPLATE_PROJECTS, TEMPLATE_SLUGS } =
  await import("../../api/src/seed/template-projects.ts");

const CONTENT = {
  company: companyContent,
  lawyer: lawyerContent,
  photographer: photographerContent,
  restaurant: restaurantContent,
  clinic: clinicContent,
  realestate: realestateContent,
  "clinic-nawa": nawaClinicContent,
  "realestate-sukn": suknRealEstateContent,
  gym: gymContent,
  appliances: appliancesContent,
  phones: phonesContent,
  academy: academyContent,
  hotel: hotelContent,
  architecture: architectureContent,
};

/** Structural shape of a content tree: same keys, same array lengths, same leaf types. */
function shape(value) {
  if (Array.isArray(value))
    return `[${value.length}:${value.map(shape).join("|")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${k}:${shape(value[k])}`)
      .join(",")}}`;
  return typeof value;
}
function leafEntries(value, path = []) {
  if (Array.isArray(value))
    return value.flatMap((nested, i) => leafEntries(nested, [...path, i]));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, nested]) =>
      leafEntries(nested, [...path, key]),
    );
  return [{ path, value }];
}
const machineKeys = new Set([
  "id",
  "key",
  "icon",
  "type",
  "category",
  "mode",
  "day",
  "time",
  "area",
  "src",
  "href",
  "image",
  "visual",
  "color",
  "tone",
  "initials",
]);
const properNames = new Set([
  "Instagram",
  "Behance",
  "Pinterest",
  "Facebook",
  "GitHub",
  "WhatsApp",
  "LinkedIn",
  "USB-C",
  "Wi-Fi",
  "Bluetooth",
  "OLED",
  "AMOLED",
  "GPS",
  "NFC",
  "Qi",
  "5G",
  "4G",
  "iOS",
  "Android",
  "IQD",
  "USD",
]);
function isDisplayCopy({ path, value }) {
  if (typeof value !== "string" || machineKeys.has(path.at(-1))) return false;
  if (/^(?:https?:|\/demos\/|#|[^\s@]+@[^\s@]+\.[^\s@]+$)/.test(value))
    return false;
  // Restaurant badges are enum values translated by its component, not visible labels.
  if (path.at(-1) === "badge" && ["chef", "veg", "spicy"].includes(value))
    return false;
  return /[a-zA-Z\u0600-\u06ff]/.test(value) && !properNames.has(value);
}
function assertNativeCopy(content, context) {
  const display = leafEntries(content).filter(isDisplayCopy);
  assert.ok(display.length > 0, `${context}: no display copy examined`);
  for (const { path, value } of display) {
    if (context.endsWith("/en"))
      assert.doesNotMatch(
        value,
        /[\u0600-\u06ff]/,
        `${context}/${path.join(".")}`,
      );
    else
      assert.match(
        value,
        /[\u0600-\u06ff]/,
        `${context}/${path.join(".")}: untranslated ${value}`,
      );
  }
}

test("every registered template has a page component and content", () => {
  assert.deepEqual(Object.keys(CONTENT).sort(), [...DEMO_SLUGS].sort());
  for (const slug of DEMO_SLUGS) {
    const source = readFileSync(
      new URL(`../src/demos/${slug}/Site.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /export (?:default )?function|export const/,
      `${slug}: page export`,
    );
  }
});

test("template registry is complete and trilingual for the gallery", () => {
  assert.deepEqual(
    DEMO_SITES.map((s) => s.slug),
    [...DEMO_SLUGS],
  );
  assert.equal(new Set(DEMO_SLUGS).size, DEMO_SLUGS.length);
  for (const site of DEMO_SITES) {
    for (const locale of LOCALES) {
      assert.ok(site.name[locale].trim(), `${site.slug}/${locale}: name`);
      assert.ok(site.kind[locale].trim(), `${site.slug}/${locale}: kind`);
      assert.ok(
        site.tagline[locale].length > 30,
        `${site.slug}/${locale}: tagline`,
      );
      assert.equal(
        site.features[locale].length,
        4,
        `${site.slug}/${locale}: features`,
      );
    }
    assert.equal(site.palette.length, 3);
    for (const c of [...site.palette, site.accent])
      assert.match(c, /^#[0-9a-f]{6}$/i);
  }
});

test("every template has Arabic and English content with an identical structure", () => {
  assert.deepEqual(
    Object.keys(CONTENT).sort(),
    [...DEMO_SLUGS].sort(),
    "every routable demo must be registered in content tests",
  );
  for (const [slug, content] of Object.entries(CONTENT)) {
    assert.deepEqual(Object.keys(content).sort(), [...DEMO_LANGS].sort());
    assert.equal(
      shape(content.ar),
      shape(content.en),
      `${slug}: ar/en shape differs`,
    );
    for (const lang of DEMO_LANGS) {
      const empty = leafEntries(content[lang]).filter(
        ({ path, value }) =>
          typeof value === "string" && !value.trim() && path.at(-1) !== "badge",
      );
      assert.equal(empty.length, 0, `${slug}/${lang}: empty strings`);
    }
    assertNativeCopy(content.ar, `${slug}/ar`);
    assertNativeCopy(content.en, `${slug}/en`);
  }
});

test("artwork referenced by the templates is bundled", () => {
  const refs = new Set();
  for (const content of Object.values(CONTENT))
    for (const { value } of leafEntries(content))
      if (typeof value === "string" && value.startsWith("/demos/art/"))
        refs.add(value);
  // Some hero paths live directly in the page rather than in translated content.
  for (const slug of DEMO_SLUGS) {
    const source = readFileSync(
      new URL(`../src/demos/${slug}/Site.tsx`, import.meta.url),
      "utf8",
    );
    for (const match of source.matchAll(
      /["'`](\/demos\/art\/[^"'`$]+\.(?:svg|png))["'`]/g,
    ))
      refs.add(match[1]);
  }
  for (const slug of ["clinic", "realestate", "gym", "appliances", "phones"])
    refs.add(`/demos/art/${slug}-hero.png`);
  // Photographer and restaurant galleries build their paths from ids.
  for (let i = 1; i <= 12; i++)
    refs.add(`/demos/art/photo-${String(i).padStart(2, "0")}.svg`);
  for (let i = 1; i <= 6; i++) refs.add(`/demos/art/dish-0${i}.svg`);
  for (const p of [
    "portrait-lawyer",
    "portrait-photographer",
    "portrait-chef",
    "re-hero",
    "clinic-hero",
  ])
    refs.add(`/demos/art/${p}.svg`);
  assert.ok(refs.size >= 43);
  for (const ref of refs) {
    const image = readFileSync(new URL(`../public${ref}`, import.meta.url));
    if (ref.endsWith(".png")) {
      assert.equal(
        image.subarray(0, 8).toString("hex"),
        "89504e470d0a1a0a",
        `${ref}: PNG signature`,
      );
      assert.equal(
        image.toString("ascii", 12, 16),
        "IHDR",
        `${ref}: PNG header`,
      );
      assert.ok(
        image.readUInt32BE(16) >= 640 && image.readUInt32BE(20) >= 400,
        `${ref}: useful hero dimensions`,
      );
      assert.ok(image.length > 10_000, `${ref}: image is not empty`);
    } else assert.match(image.toString("utf8"), /^<svg\b/, ref);
  }
});

test("gallery covers exist for every template and demo language", () => {
  for (const slug of DEMO_SLUGS)
    for (const lang of DEMO_LANGS) {
      const file = readFileSync(
        new URL(`../public${demoCover(slug, lang)}`, import.meta.url),
      );
      assert.equal(
        file.subarray(0, 2).toString("hex"),
        "ffd8",
        `${slug}-${lang} is a JPEG`,
      );
      assert.ok(file.length > 10_000, `${slug}-${lang} is not empty`);
    }
});

test("routing helpers map main-site locales onto the bilingual demos", () => {
  assert.equal(demoLangFromLocale("ckb"), "ar");
  assert.equal(demoLangFromLocale("en"), "en");
  assert.equal(demoCover("lawyer", "ckb"), "/demos/covers/lawyer-ar.jpg");
  assert.equal(
    demoHref("restaurant", "en", "#menu"),
    "/demos/restaurant/en#menu",
  );
  assert.ok(isDemoSlug("company") && !isDemoSlug("shop"));
  assert.ok(isDemoLang("ar") && !isDemoLang("ckb"));
  for (const locale of LOCALES) {
    assert.ok(demosCopy[locale].nav.trim());
    assert.equal(demosCopy[locale].how.length, 3);
  }
});

test("gallery copy remains complete in each main-site language", () => {
  for (const locale of LOCALES) {
    assert.equal(
      shape(demosCopy[locale]),
      shape(demosCopy.en),
      `${locale}: gallery shape`,
    );
    assertNativeCopy(demosCopy[locale], `gallery/${locale}`);
  }
});

test("retail product identifiers, prices and categories stay consistent across languages", () => {
  for (const [slug, content] of [
    ["appliances", appliancesContent],
    ["phones", phonesContent],
  ]) {
    const canonical = content.en.products.map(
      ({ id, category, price, visual, color }) => ({
        id,
        category,
        price,
        visual,
        color,
      }),
    );
    assert.ok(canonical.length >= 6, `${slug}: useful catalogue`);
    assert.equal(
      new Set(canonical.map((product) => product.id)).size,
      canonical.length,
      `${slug}: unique product IDs`,
    );
    for (const lang of DEMO_LANGS) {
      const t = content[lang];
      assert.deepEqual(
        t.products.map(({ id, category, price, visual, color }) => ({
          id,
          category,
          price,
          visual,
          color,
        })),
        canonical,
        `${slug}/${lang}: selections and totals must refer to the same product`,
      );
      const categories = new Set(t.categories.map(({ id }) => id));
      for (const product of t.products) {
        assert.ok(
          categories.has(product.category),
          `${slug}/${product.id}: valid filter category`,
        );
        assert.ok(
          Number.isFinite(product.price) && product.price > 0,
          `${slug}/${product.id}: valid illustrative price`,
        );
        assert.ok(
          product.specs.length >= 3,
          `${slug}/${product.id}: comparison details`,
        );
      }
      assert.ok(
        t.cart.note &&
          t.cart.doneText &&
          t.contact.note &&
          t.contact.success.text,
        `${slug}/${lang}: local-only demo disclosures`,
      );
    }
  }
});

test("gym filters use valid shared session IDs and cover an empty result", () => {
  const canonical = gymContent.en.schedule.sessions.map(
    ({ id, day, type, time, minutes }) => ({ id, day, type, time, minutes }),
  );
  assert.equal(
    new Set(canonical.map((session) => session.id)).size,
    canonical.length,
  );
  for (const lang of DEMO_LANGS) {
    const t = gymContent[lang];
    assert.deepEqual(
      t.schedule.sessions.map(({ id, day, type, time, minutes }) => ({
        id,
        day,
        type,
        time,
        minutes,
      })),
      canonical,
    );
    assert.ok(
      t.schedule.sessions.every(
        (session) =>
          t.schedule.days.some((day) => day.id === session.day) &&
          t.schedule.types.some((type) => type.id === session.type),
      ),
    );
    assert.ok(
      t.schedule.sessions.some(
        (session) => session.day === "sat" && session.type === "strength",
      ),
    );
    assert.equal(
      t.schedule.sessions.filter(
        (session) => session.day === "sat" && session.type === "mobility",
      ).length,
      0,
    );
    assert.equal(
      new Set(t.plans.items.map((plan) => plan.id)).size,
      t.plans.items.length,
    );
    assert.ok(t.schedule.empty && t.form.note && t.form.success.text);
  }
});

test("property cards and detail records keep both native-language descriptions", () => {
  assert.ok(properties.length >= 4);
  assert.equal(
    new Set(properties.map((property) => property.id)).size,
    properties.length,
  );
  for (const property of properties)
    for (const lang of DEMO_LANGS) {
      assert.ok(
        property.copy[lang].name &&
          property.copy[lang].description &&
          property.copy[lang].features.length,
      );
      assertNativeCopy(property.copy[lang], `property-${property.id}/${lang}`);
    }
});

test("self-hosted font declarations reference valid bundled WOFF faces", () => {
  const declarations = ["../src/app/fonts.ts", "../src/demos/fonts.local.ts"];
  const refs = new Set();
  for (const file of declarations) {
    const sourceUrl = new URL(file, import.meta.url);
    const source = readFileSync(sourceUrl, "utf8");
    assert.doesNotMatch(source, /from ["']next\/font\/google["']/);
    const paths = [...source.matchAll(/path:\s*["']([^"']+\.woff2?)["']/g)];
    assert.ok(paths.length > 0, `${file}: local font paths`);
    for (const [, path] of paths) refs.add(new URL(path, sourceUrl).href);
  }
  assert.ok(refs.size >= 35, "all template families are bundled");
  for (const ref of refs) {
    const data = readFileSync(new URL(ref));
    assert.ok(
      ["wOFF", "wOF2"].includes(data.toString("ascii", 0, 4)),
      `${ref}: font signature`,
    );
    assert.equal(
      data.readUInt32BE(8),
      data.length,
      `${ref}: complete font file`,
    );
    assert.ok(data.length > 1000, `${ref}: nonempty font face`);
  }
});

test("portfolio template seeds reference registered demos and localized covers", () => {
  assert.deepEqual(
    TEMPLATE_PROJECTS.map(({ slug }) => slug),
    TEMPLATE_SLUGS,
  );
  assert.equal(new Set(TEMPLATE_SLUGS).size, TEMPLATE_SLUGS.length);
  assert.deepEqual(
    TEMPLATE_SLUGS.map((slug) => slug.replace(/^template-/, "")).sort(),
    [...DEMO_SLUGS].sort(),
    "each registered demo has a portfolio entry",
  );
  for (const project of TEMPLATE_PROJECTS) {
    const slug = project.slug.replace(/^template-/, "");
    assert.ok(isDemoSlug(slug), `${project.slug}: registered demo`);
    assert.equal(project.liveUrl, demoHref(slug, "ar"));
    assert.equal(project.coverImage, demoCover(slug, "ar"));
    assert.deepEqual(
      project.gallery,
      DEMO_LANGS.map((lang) => demoCover(slug, lang)),
    );
    for (const suffix of ["", "En", "Ckb"]) {
      for (const field of ["title", "tagline", "description", "client"]) {
        const value = project[field + suffix];
        assert.ok(
          typeof value === "string" && value.trim(),
          `${project.slug}: ${field + suffix}`,
        );
        assertNativeCopy(
          { [field]: value },
          `${project.slug}/${suffix === "En" ? "en" : suffix === "Ckb" ? "ckb" : "ar"}`,
        );
      }
    }
  }
});
