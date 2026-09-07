"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, Check, Sparkles } from "lucide-react";
import type { DemoLang } from "@/demos/config";
import { DemoNav } from "@/demos/shared/DemoNav";
import { DemoForm } from "@/demos/shared/DemoForm";
import { academyContent } from "./content";

export function AcademySite({ lang }: { lang: DemoLang }) {
  const t = academyContent[lang];
  const [filter, setFilter] = useState(0);
  const [selected, setSelected] = useState("");
  const chosen = t.courses.find((course) => course.id === selected);
  return (
    <div id="top">
      <DemoNav site="academy" lang={lang} brand={<span className="flex items-center gap-2 text-2xl font-black tracking-tight"><span className="size-7 rounded-full bg-d-accent" />{t.brand}<span className="text-d-accent">®</span></span>} links={t.nav.map((label, i) => ({ label, href: ["#courses", "#approach", "#contact"][i] }))} className="border-b-2 border-d-fg bg-d-bg" cta={{ href: "#courses", label: t.cta }} ctaClassName="!rounded-none bg-d-fg text-d-bg" panelClassName="bg-d-bg" langClassName="border-d-fg" toggleClassName="border-d-fg" />
      <main>
        <section className="container-d grid gap-12 pt-32 pb-16 lg:grid-cols-2 lg:items-center lg:pt-40 lg:pb-24">
          <div>
            <p className="text-xs font-bold tracking-[.14em]">{t.eyebrow}</p>
            <h1 className="mt-7 text-6xl font-black leading-[1.03] tracking-tight sm:text-8xl lg:text-[7.4rem]">{t.title}<br /><span className="text-d-accent">{t.accent}</span></h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-d-muted">{t.text}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6"><a href="#courses" className="forma-button">{t.cta}<ArrowUpRight className="size-5" /></a><a href="#approach" className="text-sm font-bold underline underline-offset-4">{t.secondary}</a></div>
          </div>
          <div className="forma-poster" aria-label={t.studio}>
            <div className="forma-poster-grid" aria-hidden="true"><div className="forma-arc" /><div className="forma-star"><Sparkles strokeWidth={1} /></div><div className="forma-checker" /><div className="forma-disc" /></div>
            <div className="flex items-end justify-between gap-4 border-t-2 border-d-fg px-6 py-5"><div><p className="text-xs font-bold tracking-widest">{t.studio}</p><p className="mt-2 max-w-48 text-sm">{t.studioText}</p></div><BookOpen className="size-9 shrink-0" strokeWidth={1.5} /></div>
            <span className="forma-stamp">{t.stamp}</span>
          </div>
        </section>
        <section id="courses" className="border-y-2 border-d-fg bg-[#E9E8DF] py-16 sm:py-24">
          <div className="container-d"><div className="max-w-xl"><p className="text-xs font-bold">01 / {t.nav[0]}</p><h2 className="mt-4 text-4xl font-black sm:text-5xl">{t.coursesTitle}</h2><p className="mt-4 leading-relaxed text-d-muted">{t.coursesText}</p></div>
            <div className="my-8 flex flex-wrap gap-2" role="group" aria-label={t.nav[0]}>{t.filters.map((label, i) => <button key={label} onClick={() => setFilter(i)} aria-pressed={filter === i} className={`border-2 border-d-fg px-5 py-2.5 text-sm font-bold ${filter === i ? "bg-d-fg text-d-bg" : "bg-d-bg hover:bg-white"}`}>{label}</button>)}</div>
            <div className="grid gap-6 md:grid-cols-3">{t.courses.filter((course) => !filter || course.category === filter).map((course) => <article key={course.id} className="flex flex-col border-2 border-d-fg bg-d-bg shadow-[5px_5px_0_#20211E]"><div style={{ background: course.color }} className="flex h-32 items-center justify-between border-b-2 border-d-fg px-7"><span className="text-6xl font-black text-[#20211E]" aria-hidden="true">0{course.category}</span><BookOpen className="size-14 text-[#20211E]" strokeWidth={1} /></div><div className="flex flex-1 flex-col p-6"><p className="text-xs font-bold text-d-muted">{course.duration} · {course.level}</p><h3 className="mt-4 text-2xl font-black">{course.title}</h3><p className="mt-3 text-sm leading-relaxed text-d-muted">{course.text}</p><p className="mt-5 flex items-center gap-2 text-xs font-bold"><Check className="size-4" />{course.project}</p><a href="#contact" onClick={() => setSelected(course.id)} className="mt-auto flex items-center justify-between border-t-2 border-d-fg pt-4 text-sm font-bold [margin-top:1.5rem]">{t.explore}<ArrowUpRight className="size-5" /></a></div></article>)}</div>
          </div>
        </section>
        <section id="approach" className="container-d py-16 sm:py-24"><p className="text-xs font-bold">02 / {t.nav[1]}</p><h2 className="mt-4 max-w-xl text-4xl font-black sm:text-5xl">{t.approachTitle}</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{t.approach.map((item, i) => <div key={item.title} className="border-t-2 border-d-fg pt-5"><span className="text-sm font-bold text-d-accent">0{i + 1}</span><h3 className="mt-4 text-xl font-bold">{item.title}</h3><p className="mt-3 leading-relaxed text-d-muted">{item.text}</p></div>)}</div></section>
        <section id="contact" className="bg-[#EFC849] py-16 sm:py-24"><div className="container-d grid gap-12 lg:grid-cols-2"><div><p className="text-xs font-bold">03 / {t.nav[2]}</p><h2 className="mt-4 text-4xl font-black sm:text-5xl">{t.contactTitle}</h2><p className="mt-5">{t.contactText}</p>{chosen && <p className="mt-7 border-s-4 border-d-fg ps-4" role="status"><span className="block text-xs">{t.selected}</span><strong>{chosen.title}</strong></p>}</div><DemoForm key={selected} fields={[{ name: "name", label: t.name }, { name: "email", label: t.email, type: "email" }, { name: "course", label: t.course, type: "select", options: t.courses.map((course) => course.title), defaultValue: chosen?.title }]} submit={t.submit} success={t.success} note={t.note} inputClassName="!rounded-none border-2 border-d-fg bg-d-bg" buttonClassName="!rounded-none bg-d-fg text-d-bg" /></div></section>
      </main>
      <footer className="container-d flex flex-col justify-between gap-4 py-10 pb-28 text-sm sm:flex-row"><strong>{t.brand} / {t.sub}</strong><span>{t.footer}</span></footer>
    </div>
  );
}
