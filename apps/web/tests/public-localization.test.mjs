import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// Resolve the application's TS/JSON imports without changing its production aliases.
const src = fileURLToPath(new URL("../src/", import.meta.url));
const apiSeedUrl = new URL("../../api/src/seed/", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    // Keep the API's production .js imports; substitute only local seed-module TS sources in tests.
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
    let target = specifier.startsWith("@/")
      ? path.join(src, specifier.slice(2))
      : null;
    if (
      !target &&
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(pathToFileURL(src).href)
    )
      target = fileURLToPath(new URL(specifier, context.parentURL));
    if (target && !path.extname(target) && existsSync(target + ".ts"))
      target += ".ts";
    return nextResolve(
      target ? pathToFileURL(target).href : specifier,
      context,
    );
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(src).href) && url.endsWith(".json"))
      return {
        format: "module",
        source: `export default ${readFileSync(new URL(url), "utf8")}`,
        shortCircuit: true,
      };
    return nextLoad(url, context);
  },
});
const {
  pick,
  pickList,
  localizeProject,
  localizeService,
  localizeSettings,
  localizeTeamMember,
  localizeDemoUrl,
} = await import("../src/lib/localize.ts");
const { TEMPLATE_PROJECTS } =
  await import("../../api/src/seed/template-projects.ts");
const { DEMO_SLUGS } = await import("../src/demos/config.ts");
const { safeSocialUrl, normalizeSocialLinks, publicContactDetails, mapUrl } =
  await import("../src/lib/business.ts");
const { getDict } = await import("../src/i18n/index.ts");
const { applyBrandDefaults } = await import("../src/lib/brand.ts");
const { categoryLabel, CATEGORIES } = await import("../src/lib/utils.ts");
const defaults = JSON.parse(
  readFileSync(new URL("../src/content/public-defaults.json", import.meta.url)),
);
const team = JSON.parse(
  readFileSync(new URL("../src/content/team.json", import.meta.url)),
);
const projectMedia = { liveUrl: "", coverImage: "", gallery: [] };
const fields = (record) =>
  Object.fromEntries(
    Object.entries(record.en).map(([key, value]) => [`${key}En`, value]),
  );

test("missing or whitespace translations never reveal another locale", () => {
  assert.equal(pick("en", "نص عربي", " ", "دەقی کوردی"), "");
  assert.equal(pick("ckb", "نص عربي", "English"), "");
  assert.equal(pick("ar", "", "English", "کوردی"), "");
  assert.deepEqual(pickList("ckb", ["عربي"], ["English"]), []);
  assert.deepEqual(pickList("en", ["عربي"], ["", "English", " "]), ["English"]);
});

test("every known seed project and service has guarded English and Sorani copy", () => {
  for (const d of defaults.projects) {
    const p = {
      ...projectMedia,
      ...d.source,
      ...fields(d),
      slug: d.key,
      client: d.source.client,
      liveUrl: "https://original.example/preview",
    };
    for (const locale of ["en", "ckb"]) {
      const translated = localizeProject(p, locale);
      for (const key of ["title", "tagline", "description", "client"])
        assert.ok(translated[key], `${d.key}/${locale}/${key}`);
      assert.equal(translated.liveUrl, p.liveUrl);
      if (locale === "en")
        assert.doesNotMatch(
          translated.title + translated.client,
          /[\u0600-\u06ff]/,
        );
    }
  }
  for (const d of defaults.services) {
    for (const locale of ["en", "ckb"]) {
      const translated = localizeService(
        { ...d.source, id: Number(d.key) },
        locale,
      );
      assert.equal(translated.title, d[locale].title);
      assert.equal(translated.description, d[locale].description);
      assert.deepEqual(translated.features, d[locale].features);
    }
  }
});

test("reusing a seed id never replaces edited CMS content with an unrelated translation", () => {
  const d = defaults.projects[0];
  const changed = {
    ...projectMedia,
    ...d.source,
    slug: d.key,
    title: "عنوان مختلف",
    description: "محتوى جديد",
    client: "عميل جديد",
  };
  const translated = localizeProject(changed, "en");
  assert.equal(translated.title, "");
  assert.equal(translated.description, "");
  assert.equal(translated.client, "");
  assert.equal(translated.tagline, d.en.tagline);
  const service = localizeService(
    {
      id: 1,
      title: "خدمة جديدة",
      description: "وصف جديد",
      features: ["ميزة جديدة"],
    },
    "ckb",
  );
  assert.equal(service.title, "");
  assert.equal(service.description, "");
  assert.deepEqual(service.features, []);
  assert.equal(changed.title, "عنوان مختلف");
});

test("custom untranslated optional content is omitted while same-language content survives", () => {
  const translated = localizeSettings(
    {
      heroTitle: "عنوان",
      heroSubtitle: "وصف",
      bio: "نبذة",
      location: "عنوان خاص",
      team: [],
      clients: ["عميل جديد"],
      stats: [
        { label: "مخصص", value: "1" },
        { label: "مشروع منجز", value: "2" },
      ],
      testimonials: [
        { name: "أحمد", role: "مدير", text: "رأي" },
        {
          name: "سارة",
          nameEn: "Sara",
          role: "مديرة",
          roleEn: "Director",
          text: "رأي آخر",
          textEn: "Our own approved review.",
        },
      ],
    },
    "en",
  );
  assert.equal(translated.heroTitle, "");
  assert.equal(translated.bio, "");
  assert.equal(translated.location, "");
  assert.deepEqual(translated.clients, []);
  assert.deepEqual(
    translated.stats.map((s) => s.label),
    ["Projects delivered"],
  );
  assert.deepEqual(
    translated.testimonials.map((t) => t.text),
    ["Our own approved review."],
  );
});

test("known client names and founder identities match the selected language", () => {
  for (const locale of ["en", "ckb"]) {
    const translated = localizeSettings(
      { clients: defaults.clients.map((c) => c.source) },
      locale,
    );
    assert.deepEqual(
      translated.clients,
      defaults.clients.map((c) => c[locale]),
    );
  }
  for (const member of team) {
    const { nameAr, nameEn, nameCkb, github, ...legacy } = member;
    assert.equal(localizeTeamMember(legacy, "ar").name, nameAr);
    assert.equal(localizeTeamMember(legacy, "en").name, nameEn);
    assert.equal(localizeTeamMember(legacy, "ckb").name, nameCkb);
    assert.equal(localizeTeamMember(legacy, "en").github, github);
    assert.equal(
      localizeTeamMember({ ...legacy, name: "A different person" }, "ar").name,
      "",
    );
  }
  assert.equal(
    localizeTeamMember(team[0], "ar").github,
    "https://github.com/HostX0",
  );
  assert.equal(
    localizeTeamMember(team[1], "ckb").github,
    "https://github.com/hamodywe",
  );
});

test("social profiles honor enabled state, explicit deletion, safe URLs and legacy Facebook", () => {
  const socials = {
    github: "https://github.com/HostX0",
    facebook: "https://www.facebook.com/devshub",
  };
  assert.equal(normalizeSocialLinks({ socials }).length, 2);
  assert.deepEqual(normalizeSocialLinks({ socials, socialLinks: [] }), []);
  const entries = [
    {
      id: "enabled",
      platform: "facebook",
      label: "Facebook",
      url: socials.facebook,
      enabled: true,
    },
    {
      id: "disabled",
      platform: "github",
      label: "GitHub",
      url: socials.github,
      enabled: false,
    },
    {
      id: "bad",
      platform: "custom",
      label: "Bad",
      url: "javascript:alert(1)",
      enabled: true,
    },
    {
      id: "credentials",
      platform: "custom",
      label: "Bad",
      url: "https://user:secret@example.com",
      enabled: true,
    },
  ];
  assert.deepEqual(
    normalizeSocialLinks({ socials, socialLinks: entries }).map((l) => l.id),
    ["enabled"],
  );
  for (const url of [
    "data:text/html,test",
    "javascript:alert(1)",
    "//example.com",
    "not a link",
    "",
  ])
    assert.equal(safeSocialUrl(url), "");
});

test("public banners and statuses have complete copy in all three dictionaries", () => {
  const english = getDict("en");
  for (const locale of ["ar", "ckb"]) {
    const dict = getDict(locale);
    assert.deepEqual(Object.keys(dict.brand), Object.keys(english.brand));
    for (const [key, text] of Object.entries(dict.brand)) {
      assert.ok(text.trim(), `${locale}/${key}`);
      assert.notEqual(text, english.brand[key], `${locale}/${key}`);
    }
    assert.notEqual(dict.footer.built, "BUILD BETTER TOGETHER");
  }
});

test("custom untranslated locations and unknown categories cannot reveal unrelated copy", () => {
  const settings = applyBrandDefaults({
    location: "عنوان جديد خاص",
    locationEn: "",
    locationCkb: "",
    whatsapp: "",
  });
  assert.equal(settings.locationEn, "");
  assert.equal(settings.locationCkb, "");
  for (const locale of ["ar", "en", "ckb"]) {
    assert.equal(
      categoryLabel("A category without translations", locale),
      CATEGORIES.other[locale],
    );
  }
});

test("explicitly cleared seed translations and locale lists are authoritative", () => {
  const project = defaults.projects[0];
  const clearedProject = localizeProject(
    {
      ...projectMedia,
      ...project.source,
      slug: project.key,
      titleEn: "",
      taglineEn: "",
      descriptionEn: "",
      clientEn: "",
    },
    "en",
  );
  for (const key of ["title", "tagline", "description", "client"])
    assert.equal(clearedProject[key], "");
  const service = defaults.services[0];
  const clearedService = localizeService(
    {
      ...service.source,
      id: Number(service.key),
      titleCkb: "",
      descriptionCkb: "",
      featuresCkb: [],
    },
    "ckb",
  );
  assert.equal(clearedService.title, "");
  assert.equal(clearedService.description, "");
  assert.deepEqual(clearedService.features, []);
  const testimonial = defaults.testimonials[0];
  const settings = localizeSettings(
    {
      clients: defaults.clients.map((c) => c.source),
      clientsEn: [],
      team: [{ ...team[0], nameEn: "", github: "" }],
      stats: [{ ...defaults.stats[0].source, value: "1", labelEn: "" }],
      testimonials: [{ ...testimonial.source, nameEn: "", textEn: "" }],
    },
    "en",
  );
  assert.deepEqual(settings.clients, []);
  assert.deepEqual(settings.team, []);
  assert.deepEqual(settings.stats, []);
  assert.deepEqual(settings.testimonials, []);
  assert.equal(localizeTeamMember({ ...team[0], github: "" }, "en").github, "");
});

test("public contacts stay hidden when cleared and maps follow a custom address", () => {
  assert.deepEqual(
    publicContactDetails({
      email: "",
      phone: " ",
      whatsapp: "",
      location: " ",
    }),
    { email: "", phone: "", whatsapp: "", location: "" },
  );
  assert.equal(mapUrl(" "), "");
  const address = "A new office, Baghdad";
  assert.equal(new URL(mapUrl(address)).searchParams.get("query"), address);
});

test("all registered portfolio demo destinations localize with matching covers and no duplicate gallery images", () => {
  assert.deepEqual(
    TEMPLATE_PROJECTS.map(({ slug }) => slug.replace(/^template-/, "")).sort(),
    [...DEMO_SLUGS].sort(),
  );
  const destinations = new Set();
  for (const project of TEMPLATE_PROJECTS) {
    const original = structuredClone(project);
    const slug = project.slug.replace(/^template-/, "");
    for (const locale of ["ar", "en", "ckb"]) {
      const lang = locale === "en" ? "en" : "ar";
      const localized = localizeProject(project, locale);
      const liveUrl = `/demos/${slug}/${lang}`;
      const cover = `/demos/covers/${slug}-${lang}.jpg`;
      destinations.add(localized.liveUrl);
      assert.equal(localized.liveUrl, liveUrl, `${slug}/${locale}: preview`);
      assert.equal(localized.coverImage, cover, `${slug}/${locale}: cover`);
      assert.deepEqual(
        localized.gallery,
        [cover],
        `${slug}/${locale}: deduplicated gallery`,
      );
      for (const field of ["title", "tagline", "description", "client"]) {
        const suffix = locale === "en" ? "En" : locale === "ckb" ? "Ckb" : "";
        assert.equal(
          localized[field],
          project[field + suffix],
          `${slug}/${locale}: ${field}`,
        );
      }
    }
    assert.deepEqual(
      project,
      original,
      `${slug}: localization cannot mutate saved content`,
    );
  }
  assert.equal(destinations.size, TEMPLATE_PROJECTS.length * 2);
});

test("bundled preview URLs retain exact queries, anchors and trailing slashes", () => {
  for (const [source, expected] of [
    [
      "/demos/gym/ar?plan=flow&return=%2Fen#membership",
      "/demos/gym/en?plan=flow&return=%2Fen#membership",
    ],
    ["/demos/clinic-nawa/ar/#booking", "/demos/clinic-nawa/en/#booking"],
    [
      "/demos/realestate-sukn/ar#properties",
      "/demos/realestate-sukn/en#properties",
    ],
    [
      "/demos/covers/phones-ar.jpg?v=3#preview",
      "/demos/covers/phones-en.jpg?v=3#preview",
    ],
  ])
    assert.equal(localizeDemoUrl(source, "en"), expected);
  assert.equal(
    localizeDemoUrl("/demos/gym/en?plan=base#membership", "ckb"),
    "/demos/gym/ar?plan=base#membership",
  );
});

test("external and unregistered previews remain byte-for-byte unchanged in every locale", () => {
  const originals = [
    "https://example.com",
    "https://original.example/preview?demo=ar%2Fen#case-study",
    "https://devshub.cc/demos/gym/ar?plan=flow#membership",
    "https://cdn.example.com/demos/covers/company-ar.jpg?v=2",
    "//preview.example.com/demos/company/ar",
    "/demos/custom-client/ar?preview=1#top",
    "/demos/company/fr",
    "/demos/company/ar/case-study",
    "/demos/covers/custom-client-ar.jpg",
    "/uploads/original-project.svg",
    "",
  ];
  for (const locale of ["ar", "en", "ckb"]) {
    for (const url of originals)
      assert.equal(localizeDemoUrl(url, locale), url);
    const project = {
      ...projectMedia,
      slug: "custom-case-study",
      liveUrl: originals[1],
      coverImage: originals[3],
      gallery: [originals[3], originals[9]],
      title: "",
      titleEn: "",
      titleCkb: "",
      description: "",
      descriptionEn: "",
      descriptionCkb: "",
      client: "",
      clientEn: "",
      clientCkb: "",
    };
    const localized = localizeProject(project, locale);
    assert.equal(localized.liveUrl, project.liveUrl);
    assert.equal(localized.coverImage, project.coverImage);
    assert.deepEqual(localized.gallery, project.gallery);
  }
});
