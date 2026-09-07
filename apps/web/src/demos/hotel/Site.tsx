"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Coffee, MapPin, Moon, Sparkles } from "lucide-react";
import type { DemoLang } from "@/demos/config";
import { DemoNav } from "@/demos/shared/DemoNav";
import { hotelContent } from "./content";
import "./hotel.css";

/** Original architectural illustration, bundled with the template. */
function CourtyardArt({ label }: { label: string }) {
  const id = useId().replaceAll(":", "");
  return <svg viewBox="0 0 640 730" role="img" aria-label={label} className="saha-courtyard">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#c0bcad"/><stop offset="1" stopColor="#eed8b6"/></linearGradient>
      <linearGradient id={`${id}-stone`} x2="1" y2="0.8"><stop stopColor="#d7b797"/><stop offset="1" stopColor="#9d725a"/></linearGradient>
      <linearGradient id={`${id}-water`} x2="0.6" y2="1"><stop stopColor="#4d7370"/><stop offset="1" stopColor="#274749"/></linearGradient>
      <pattern id={`${id}-floor`} width="70" height="38" patternUnits="userSpaceOnUse"><path d="M0 0H70V38H0Z" fill="none" stroke="#ac9277" strokeWidth="1"/></pattern>
    </defs>
    <rect width="640" height="730" fill={`url(#${id}-sky)`}/>
    <circle cx="470" cy="123" r="58" fill="#f9e9bb" opacity=".8"/>
    <path d="M0 102H140V265H640V564H0Z" fill={`url(#${id}-stone)`}/>
    <path d="M0 83H157V105H0ZM0 129H140V146H0ZM124 251H640V273H124Z" fill="#ead1ae"/>
    <path d="M510 181H640V567H510Z" fill="#b08b70"/>
    <path d="M498 172H640V192H498Z" fill="#efd7b5"/>
    {[24, 177, 330, 483].map((x) => <g key={x}>
      <path d={`M${x} 565V371A61 61 0 0 1 ${x+122} 371V565Z`} fill="#71513f"/>
      <path d={`M${x+10} 565V374A51 51 0 0 1 ${x+112} 374V565Z`} fill="#402b2c"/>
      <path d={`M${x+28} 565V382A33 33 0 0 1 ${x+94} 382V565Z`} fill="#8b7458"/>
      <path d={`M${x+61} 350V565M${x+28} 422H${x+94}`} stroke="#b79765" strokeWidth="3"/>
      <path d={`M${x+1} 390H${x+13}V560H${x+1}ZM${x+109} 390H${x+121}V560H${x+109}Z`} fill="#d6b48c"/>
    </g>)}
    <path d="M0 557H640V730H0Z" fill="#dac1a0"/><path d="M0 557H640V730H0Z" fill={`url(#${id}-floor)`}/>
    <path d="M220 584H421L541 730H92Z" fill="#eee0c5"/>
    <path d="M239 597H402L505 730H125Z" fill={`url(#${id}-water)`}/>
    {[618, 641, 672, 708].map(y => <path key={y} d={`M${270-(y-600)/1.15} ${y}H${370+(y-600)/1.15}`} stroke="#a0b7a0" opacity=".4"/>)}
    <path d="M551 593C544 446 566 329 568 256" stroke="#5d4f33" strokeWidth="10" fill="none"/>
    {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`rotate(${i*25-50} 568 256)`}><path d="M568 256Q619 202 660 258Q612 241 568 256" fill="#3d5743"/><path d="M568 256Q520 188 465 236Q521 224 568 256" fill="#3d5743"/></g>)}
    <path d="M30 730L0 603V468Q43 449 62 505L93 730" fill="#213e34"/>
    <path d="M13 662Q74 584 94 632Q65 651 13 662M7 631Q50 548 75 586Q61 618 7 631M25 702Q91 642 113 684Q75 704 25 702" fill="#3c5943"/>
    <rect x="12" y="12" width="616" height="706" fill="none" stroke="#f8e6bc" opacity=".45"/>
  </svg>;
}

function RoomArt({ index, label }: { index: number; label: string }) {
  const tones = ["#b7bdac", "#c8af96", "#bba291"];
  return <svg viewBox="0 0 480 360" role="img" aria-label={label} className="saha-room-art">
    <rect width="480" height="360" fill={tones[index]}/><path d="M0 287H480V360H0Z" fill="#8c7560"/>
    <path d="M30 283V105A76 76 0 0 1 182 105V283Z" fill="#efe2c6"/>
    <path d="M42 283V108A64 64 0 0 1 170 108V283Z" fill="#556c63"/>
    <path d="M49 238L151 154V277H49" fill="#a8b4a0"/><path d="M106 48V283M42 152H170" stroke="#d8bc8a" strokeWidth="6"/>
    <path d="M32 36H59V287H19ZM161 36H185L192 287H161Z" fill="#f1e7d2" opacity=".8"/>
    <path d="M229 279V164Q328 101 428 164V279Z" fill={index===2?"#624147":"#67564d"}/>
    <path d="M218 235H440L476 333H184Z" fill="#f1e7d6"/><path d="M184 318H476V350H184Z" fill="#d8c6ad"/>
    <path d="M234 209H322V246H223ZM335 209H423L434 246H335Z" fill="#fff8e8"/>
    <path d="M212 271H453L465 302H199Z" fill={index===1?"#95794b":"#875b55"}/>
    <path d="M438 179H466V281H438Z" fill="#756149"/><path d="M452 179V133M441 167H464" stroke="#c6a66d" strokeWidth="3"/>
    <path d="M432 128H471L463 104H440Z" fill="#f0d5a2"/>
    <circle cx="332" cy="59" r="29" fill="none" stroke="#917343" strokeWidth="3"/><path d="M309 78L353 37M305 68L342 32" stroke="#dbc6a2" opacity=".5"/>
  </svg>;
}

export function HotelSite({ lang }: { lang: DemoLang }) {
  const t = hotelContent[lang];
  const [roomId, setRoomId] = useState(t.rooms[0].id);
  const [nights, setNights] = useState("2");
  const [done, setDone] = useState(false);
  const room = t.rooms.find(item => item.id === roomId) ?? t.rooms[0];
  const validNights = /^\d+$/.test(nights) && Number(nights) >= 1 && Number(nights) <= 30;
  const format = (value: number) => new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ").format(value);
  const successRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLSelectElement>(null);
  const icons = [Coffee, MapPin, Moon];
  const chooseRoom = (id: string) => {
    setRoomId(id); setDone(false);
    requestAnimationFrame(() => {
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
      roomRef.current?.focus({ preventScroll: true });
    });
  };
  return <div id="top" className="saha-site">
    <a href="#hotel-main" className="saha-skip">{t.skip}</a>
    <DemoNav site="hotel" lang={lang} brand={<span className="saha-brand"><Sparkles size={20} strokeWidth={1}/><span>{t.brand}<small>{t.brandSub}</small></span></span>}
      links={["#rooms", "#experiences", "#booking"].map((href,i) => ({href,label:t.nav[i]}))}
      cta={{href:"#booking",label:t.reserve}} className="saha-nav" scrolledClassName="shadow-sm" ctaClassName="saha-nav-cta" panelClassName="saha-panel" langClassName="border-current/20" toggleClassName="border-current/20"/>
    <main id="hotel-main">
      <section className="saha-hero container-d">
        <div className="saha-hero-copy"><p className="saha-eyebrow">{t.eyebrow}</p><div className="saha-deco" aria-hidden="true">◇</div>
          <h1>{t.title}<em>{t.titleAccent}</em></h1><p className="saha-intro">{t.intro}</p>
          <a href="#rooms" className="saha-button">{t.explore}<ArrowDown size={16}/></a>
          <div className="saha-hero-foot"><span className="saha-sun" aria-hidden="true">✺</span><p>{t.heroCaption}</p></div>
        </div>
        <figure className="saha-hero-art"><CourtyardArt label={t.artLabel}/><figcaption>{t.heroNote}</figcaption></figure>
      </section>
      <section className="saha-welcome container-d"><p className="saha-eyebrow">{t.brandSub}</p><h2>{t.welcome}</h2><p>{t.welcomeText}</p><ul>{t.signatures.map(item=><li key={item}><Check size={14}/>{item}</li>)}</ul></section>
      <section id="rooms" className="saha-rooms container-d"><div className="saha-section-head"><div><p className="saha-eyebrow">{t.roomsEyebrow}</p><h2>{t.roomsTitle}</h2></div><p>{t.roomsText}</p></div>
        <div className="saha-room-grid">{t.rooms.map((item,i)=><article key={item.id} className={roomId===item.id?"saha-room saha-room-selected":"saha-room"}>
          <div className="saha-room-image"><RoomArt index={i} label={t.roomArt}/><span>{format(i+1).padStart(lang==="ar"?1:2,"0")}</span></div>
          <div className="saha-room-copy"><p className="saha-room-size">{item.size}</p><h3>{item.name}</h3><p>{item.description}</p><p className="saha-room-feature">{item.feature}</p>
          <div className="saha-room-price"><strong>{format(item.price)} <small>{t.currency}</small></strong><span>{t.perNight}</span></div>
          <button type="button" className="saha-room-button" onClick={()=>chooseRoom(item.id)} aria-pressed={roomId===item.id}>{roomId===item.id?t.selected:t.choose}{roomId===item.id?<Check size={15}/>:<ArrowDown size={15}/>}</button></div>
        </article>)}</div>
      </section>
      <section id="experiences" className="saha-experiences"><div className="container-d"><div className="saha-section-head"><div><p className="saha-eyebrow">{t.experiencesEyebrow}</p><h2>{t.experiencesTitle}</h2></div><span className="saha-experience-star" aria-hidden="true">✺</span></div>
        <div className="saha-experience-grid">{t.experiences.map((item,i)=>{const Icon=icons[i];return <article key={item.title}><Icon size={28} strokeWidth={1}/><p className="saha-eyebrow">{item.detail}</p><h3>{item.title}</h3><p>{item.text}</p></article>;})}</div>
      </div></section>
      <section id="booking" className="saha-booking container-d"><div><p className="saha-eyebrow">{t.bookingEyebrow}</p><h2>{t.bookingTitle}</h2><p className="saha-booking-intro">{t.bookingText}</p><div className="saha-booking-seal" aria-hidden="true"><Sparkles size={30} strokeWidth={1}/><span>{t.brand}</span></div></div>
        <div className="saha-booking-card">{done?<div ref={successRef} role="status" tabIndex={-1} className="saha-success"><Check size={38}/><h3>{t.successTitle}</h3><p>{room.name} · {format(Number(nights))} {t.nightsLabel}</p><strong>{format(room.price*Number(nights))} {t.currency}</strong><p>{t.successText}</p><button className="saha-button" type="button" onClick={()=>{setDone(false);requestAnimationFrame(()=>roomRef.current?.focus());}}>{t.again}</button></div>:
          <form onSubmit={event=>{event.preventDefault();if(!validNights)return;setDone(true);requestAnimationFrame(()=>successRef.current?.focus());}}>
            <div className="saha-fields"><label className="saha-wide">{t.roomLabel}<select ref={roomRef} value={roomId} onChange={e=>setRoomId(e.target.value)}>{t.rooms.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>{t.arrivalLabel}<input type="date" name="arrival" required min={new Date().toLocaleDateString("en-CA")}/></label>
              <label>{t.nightsLabel}<input type="number" name="nights" required min={1} max={30} step={1} value={nights} onChange={e=>setNights(e.target.value)}/></label>
              <label>{t.nameLabel}<input name="name" autoComplete="name" required maxLength={100}/></label><label>{t.emailLabel}<input type="email" name="email" autoComplete="email" required maxLength={200}/></label>
            </div>
            <div className="saha-total" aria-live="polite"><span>{t.estimate}</span><output>{validNights?format(room.price*Number(nights)):"—"} <small>{t.currency}</small></output><p>{t.includes}</p></div>
            <button type="submit" className="saha-button saha-submit">{t.submit}<ArrowDown size={16}/></button><p className="saha-form-note">{t.demoNote}</p>
          </form>}
        </div>
      </section>
    </main>
    <footer className="saha-footer"><div className="container-d"><div className="saha-footer-top"><span className="saha-footer-brand">{t.brand}</span><p>{t.footerLine}</p><a href="#top" aria-label={t.top}><ArrowUp size={20}/></a></div><div className="saha-footer-bottom"><p>{t.location}</p><p>{t.footerNote}</p></div></div></footer>
  </div>;
}
