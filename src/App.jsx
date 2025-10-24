// src/App.jsx (compact <1000 lines)
// Catatan: ini versi dirapikan dari baseline Anda, tanpa menghapus fitur.
// - Drawer mobile dengan swipe-left + overlay full
// - Sidebar: pencarian, urut per lantai, highlight hasil, StatusPill
// - Status: Buka/Tutup + Istirahat (Sen–Jum 12:00–13:00) + Segera buka/tutup (±30m)
// - Deteksi 24 jam (union rentang hari + heuristik IGD/24 Jam)
// - Panel kanan: daftar layanan, detail, image fallback, flow, extra info, back sticky
// - Utility: linkify, tarif formatter, floor helpers, jadwal helpers
//
// Jika ada bagian yang ingin tetap seperti gaya lama, beri tahu: saya sesuaikan kembali.

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SurveyPopup from "./components/SurveyPopup.jsx";

// === Data ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS,
} from "./data/services";

/* ===================== Path & Asset helpers ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;
const DIR_INFO = `${BASE}infografis`;
const resolveInfografis = (service) => {
  const file = (service?.img ?? `${service?.id ?? "missing"}.jpg`).toString();
  if (/^https?:\/\//.test(file)) return file;
  if (file.startsWith("/")) return asset(file);
  return `${DIR_INFO}/${file}`;
};
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = INFO_FALLBACK; };
const resolveFlowImg = (img) => { if (!img) return null; if (/^https?:\/\//.test(img)) return img; const p = img.startsWith("/") ? img.slice(1) : img; return asset(p); };

/* ===================== Floor helpers ===================== */
function getFloorNumber(lokasi) { if (!lokasi) return null; const m = String(lokasi).match(/(?:lantai|lt)\s*(\d+)/i); return m ? parseInt(m[1], 10) : null; }
function floorBorderClass(lokasi) {
  const n = getFloorNumber(lokasi);
  if (n === 1) return "border-violet-400/60 hover:border-violet-300/80";
  if (n === 2) return "border-sky-400/60 hover:border-sky-300/80";
  if (n === 3) return "border-emerald-400/60 hover:border-emerald-300/80";
  return "border-white/10 hover:border-white/20";
}

/* ===================== Text helpers ===================== */
const URL_RE = /((https?:\/\/|www\.)[^\s)]+|bit\.ly\/[^^\s)]+)/gi;
function linkify(text) {
  if (!text) return text;
  const lines = String(text).split(/\r?\n/);
  const nodes = [];
  lines.forEach((line, li) => {
    let lastIndex = 0;
    line.replace(URL_RE, (m, url, _proto, idx) => {
      if (idx > lastIndex) nodes.push(line.slice(lastIndex, idx));
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      nodes.push(<a key={`lnk-${li}-${idx}`} href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-sky-700 dark:text-sky-300">{url}</a>);
      lastIndex = idx + m.length;
      return m;
    });
    if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
    if (li < lines.length - 1) nodes.push(<br key={`br-${li}`} />);
  });
  return <>{nodes}</>;
}
const formatTarifID = (n) => {
  if (n == null || isNaN(+n)) return "-";
  return new Intl.NumberFormat("id-ID").format(+n).replace(/,/g, ".");
};

/* ===================== Jadwal & Status helpers ===================== */
const DAY_NAMES_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
function parseRangeStr(str) { // "08:00-15:00"
  const m = String(str).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const from = +m[1] * 60 + +m[2];
  const to = +m[3] * 60 + +m[4];
  return { from, to };
}
function normalizeWeekly(weekly) {
  const out = {};
  DAY_NAMES_ID.forEach((d) => {
    const raw = weekly?.[d];
    if (!raw) return;
    const arr = Array.isArray(raw) ? raw : [raw];
    out[d] = arr.map(parseRangeStr).filter(Boolean).map((r) => ({ from: Math.max(0, r.from), to: Math.min(1440, r.to) })).filter((r) => r.from < r.to);
  });
  return out;
}
function rangesForToday(jadwal, ref = new Date()) {
  const weekly = normalizeWeekly(jadwal?.weekly || {});
  const today = DAY_NAMES_ID[ref.getDay()];
  return weekly[today] || [];
}
function getEffectiveJadwal({ jadwal }) {
  const weekly = normalizeWeekly(jadwal?.weekly || {});
  const fmt = (m) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
  const out = {};
  DAY_NAMES_ID.forEach((d) => { out[d] = (weekly[d] || []).map((r) => `${fmt(r.from)}–${fmt(r.to)}`).join(", ") || "–"; });
  return out;
}
function isOpenNow({ jadwal }, ref = new Date()) {
  const now = ref.getHours()*60 + ref.getMinutes();
  return rangesForToday(jadwal, ref).some((r) => now >= r.from && now < r.to);
}
function getOpenStatus(service, ref = new Date()) {
  const schedule = service?.jadwal || {};
  const ranges = rangesForToday(schedule, ref);
  const now = ref.getHours()*60 + ref.getMinutes();
  let open = false; let nextChange = null;
  const sorted = [...ranges].sort((a,b)=>a.from-b.from);
  for (const r of sorted) {
    if (now >= r.from && now < r.to) { open = true; if (nextChange==null || r.to<nextChange) nextChange=r.to; }
    else if (now < r.from) { if (nextChange==null || r.from<nextChange) nextChange=r.from; }
  }
  if (nextChange==null) { const tmr = new Date(ref); tmr.setDate(ref.getDate()+1); const tRanges = rangesForToday(schedule, tmr); if (tRanges.length) nextChange = tRanges[0].from + 1440; }
  // Full-day detection (00:00–24:00) via merging
  let isFullDay=false; if (sorted.length){ let curFrom=Math.max(0,sorted[0].from), curTo=Math.min(1440,sorted[0].to); for(let i=1;i<sorted.length;i++){const r=sorted[i]; if(r.from<=curTo) curTo=Math.max(curTo,r.to); else break;} isFullDay = curFrom<=0 && curTo>=1440; }
  // Heuristic for IGD/24 Jam when data is missing
  if (!isFullDay) { const nm = `${service?.nama??""} ${service?.klaster??""}`.toLowerCase(); const looks24 = /(\bigd\b|\bugd\b|24\s*jam)/i.test(nm); const id24 = /^(igd|pelayanan[-\s]*24[-\s]*jam)$/i.test(String(service?.id??"")); if (looks24 || id24) isFullDay = true; }
  // Rest (Mon–Fri 12:00–13:00) except 24h
  const dayName = DAY_NAMES_ID[ref.getDay()];
  const isWeekday = ["Senin","Selasa","Rabu","Kamis","Jumat"].includes(dayName);
  const rest = !isFullDay && isWeekday && now >= 720 && now < 780; // 12:00–13:00
  if (rest) { open=false; if (nextChange==null || 780<nextChange) nextChange = 780; }
  const minutesUntilChange = nextChange!=null ? nextChange-now : null;
  let soon=null; if (!isFullDay && !rest && minutesUntilChange!=null && minutesUntilChange>=0){ if(!open && minutesUntilChange<=30) soon="segera-buka"; if(open && minutesUntilChange<=30) soon="segera-tutup"; }
  if (isFullDay) return { open:true, rest:false, soon:null, minutesUntilChange:null };
  return { open, rest, soon, minutesUntilChange };
}
function todayText(jadwal, ref=new Date()){ const d=DAY_NAMES_ID[ref.getDay()]; const eff=getEffectiveJadwal({jadwal}); return `Hari Ini: ${eff[d]||"–"}`; }
function summarizeWeekly(jadwal){ const eff=getEffectiveJadwal({jadwal}); const days=["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]; return `Jadwal Buka: ${days.map(d=>`${d} ${eff[d]}`).join(" ")}`; }
function poliOpenAny(p){ if (!p) return false; if (isOpenNow({ jadwal: p.jadwal })) return true; return (p.layanan||[]).some((it)=>isOpenNow({ jadwal: it.jadwal || p.jadwal })); }

/* ===================== UI Atoms ===================== */
const Pill = ({ className="", children }) => (
  <span className={`text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1 ${className}`}>{children}</span>
);
const StatusPill = ({ open, rest, soon }) => {
  let label = open ? "Buka" : "Tutup";
  let tone = open
    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
    : "bg-rose-500/10 border-rose-400/30 text-rose-700 dark:text-rose-300";
  if (rest) { label = "Istirahat"; tone = "bg-slate-500/10 border-slate-400/30 text-slate-700 dark:text-slate-300"; }
  else if (soon === "segera-buka") { label = "Segera tutup"; /* fallback if mis-sent */ }
  if (soon === "segera-buka") { label = "Segera buka"; tone = "bg-sky-500/10 border-sky-400/30 text-sky-700 dark:text-sky-300"; }
  if (soon === "segera-tutup") { label = "Segera tutup"; tone = "bg-amber-500/10 border-amber-400/30 text-amber-700 dark:text-amber-300"; }
  return <Pill className={tone}>{label}</Pill>;
};

/* ===================== Drawer (mobile) ===================== */
function Drawer({ open, onClose, children }) {
  useEffect(() => { if (!open) return; const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="overlay" className="fixed inset-0 z-[9997] bg-black/50" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
          <motion.aside key="drawer" className="fixed inset-y-0 left-0 z-[9998] w-[86%] max-w-[22rem] bg-white/80 dark:bg-slate-950/80 backdrop-blur border-r border-black/10 dark:border-white/10" initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}} transition={{type:"tween",duration:0.22}} drag="x" dragConstraints={{left:-80,right:0}} dragElastic={0.04} onDragEnd={(_,info)=>{const far=info.offset.x<=-80; const fast=info.velocity.x<-500; if(far||fast) onClose();}}>
            <div className="absolute right-0 top-0 h-full w-4 cursor-ew-resize touch-pan-x" />
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ===================== Sidebar ===================== */
function Sidebar({ facilityName, query, setQuery, services, onPick, onScrollToServices, selected, highlightIds=[] }) {
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (s) => { onPick(s); setExpandedId((id) => (id === s.id ? null : s.id)); };
  return (
    <aside className="w-full md:w-80 shrink-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur border-r border-black/5 dark:border-white/10 flex flex-col h-full md:h-[calc(100svh-56px)] transition-colors duration-300 rounded-none">
      <div className="p-4 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold truncate text-slate-900 dark:text-white">Jadwal & Tarif</div>
      </div>
      <div className="px-4 pt-3 text-xs text-slate-700 dark:text-white/70">Fasilitas: <span className="text-slate-900 font-medium dark:text-white">{facilityName}</span></div>
      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-slate-600 dark:text-white/50">Pencarian</label>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari 'umum', 'imunisasi', 'cabut gigi' ..." className="w-full h-11 px-3 rounded-xl bg-white text-slate-900 border border-black/10 dark:bg-white/5 dark:text-white dark:border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]" />
      </div>
      <div className="px-4 pb-2 space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:thin] md:max-h-[28rem] flex-1">
        <div className="text-xs uppercase text-slate-600 dark:text-white/50 mb-2">Daftar Poli</div>
        {services.map((s) => {
          const active = expandedId === s.id; const hl = highlightIds.includes(s.id);
          const openAny = poliOpenAny(s);
          const { open, rest, soon } = getOpenStatus({ jadwal: s.jadwal, id: s.id, nama: s.nama, klaster: s.klaster });
          const uniqueSchedules = Array.from(new Set([JSON.stringify(s.jadwal||{}), ...(s.layanan||[]).map((x)=>JSON.stringify(x.jadwal||{}))]));
          const singleServiceSchedule = uniqueSchedules.length===1 ? s.jadwal : null;
          return (
            <div key={s.id} className={`rounded-2xl border p-3 transition ${hl?"ring-1 ring-emerald-400/50":""} ${floorBorderClass(s.lokasi)} ${active?"bg-white/60 dark:bg-white/5":"bg-white/40 dark:bg-white/5"}`}>
              <button type="button" onClick={()=>toggle(s)} className="w-full flex items-center gap-3 text-left">
                <div className="text-2xl shrink-0">{s.ikon}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{s.nama}</div>
                  <div className="text-xs text-slate-600 dark:text-white/60 truncate">{s.klaster}</div>
                </div>
                <StatusPill open={open} rest={rest} soon={soon} />
              </button>
              {active && (
                <div className="pt-3 space-y-2 text-sm">
                  {/* 1) Jadwal hari ini */}
                  <div className="text-[12px] text-slate-600 dark:text-white/60">{todayText(s.jadwal)}</div>
                  {/* 2) Jika semua layanan jadwalnya sama → tampilkan ringkasan mingguan */}
                  {singleServiceSchedule && (
                    <div className="text-[12px] grid grid-cols-2 gap-y-1">
                      {Object.keys(getEffectiveJadwal({ jadwal: singleServiceSchedule })).map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-slate-500 dark:text-white/50">{d}</span>
                          <span>{getEffectiveJadwal({ jadwal: singleServiceSchedule })[d]}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {/* 3) Banyak layanan jadwal berbeda → notice scroll ke layanan */}
                  {uniqueSchedules.length>1 && !singleServiceSchedule && (
                    <button type="button" onClick={()=>{ onPick(s); onScrollToServices?.(s.id); }} className="w-full text-left text-[12px] text-amber-700 hover:text-amber-600 underline underline-offset-2 dark:text-amber-300 dark:hover:text-amber-200">
                      Jadwal beragam — <span className="font-semibold">cek tiap layanan untuk jadwal</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ===================== Cards ===================== */
function ServiceCard({ s, onPick }) {
  return (
    <button onClick={()=>onPick(s)} className={`group relative overflow-hidden rounded-2xl border bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 active:scale-[.98] transition text-left touch-manipulation ${floorBorderClass(s.lokasi)}`}>
      <div className="w-full bg-slate-200/70 dark:bg-slate-900/40 transition-colors duration-300">
        <div className="h-36 sm:h-44 md:h-48 lg:h-52 grid place-items-center p-2 sm:p-3">
          <img src={resolveInfografis(s)} onError={onInfoError} alt={s.nama} className="block max-h-full max-w-full object-contain" loading="lazy" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2"><div className="text-xl">{s.ikon}</div><div className="font-semibold truncate text-slate-900 dark:text-white">{s.nama}</div></div>
        <div className="text-xs text-slate-600 mt-1 truncate dark:text-white/60">{s.klaster}</div>
      </div>
    </button>
  );
}

function SubServiceCard({ item, onPick, parentJadwal }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  const tarifText = `Tarif Umum: ${formatTarifID(item.tarif)}`;
  const jadwalLayanan = item.jadwal || null;
  const { open, rest, soon } = getOpenStatus({ jadwal: jadwalLayanan || parentJadwal });
  const today = jadwalLayanan ? todayText(jadwalLayanan) : null;
  const weekly = jadwalLayanan ? summarizeWeekly(jadwalLayanan) : null;
  return (
    <button onClick={()=>onPick(item)} className="relative w-full text-left rounded-2xl border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/8 ring-0 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/15 transition-all shadow-sm hover:shadow active:scale-[.99]">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="text-xl mt-0.5">{item.ikon || "🍀"}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-white">{item.nama}</div>
            {item.ket && <div className="text-sm text-slate-600 dark:text-white/60">{item.ket}</div>}
            <div className="text-xs text-slate-600 dark:text-white/60 mt-1 flex flex-wrap gap-3 items-center">
              <span className={bpjsClass}>{bpjsText}</span>
              <span>{tarifText}</span>
              <span className="ml-auto"><StatusPill open={open} rest={rest} soon={soon} /></span>
            </div>
            {today && <div className="text-[12px] text-slate-600 dark:text-white/60 mt-1">{today}</div>}
            {weekly && <div className="text-[12px] text-slate-600 dark:text-white/60">{weekly}</div>}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================== Info & Detail Panel ===================== */
const InfoCard = ({ title, children }) => (
  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3 shadow-sm">{title && <div className="font-semibold mb-2">{title}</div>}{children}</div>
);

function RightPanel({ selected, setSelected, filtered, subMatches, onPickSub, jump, setJump, searchQuery, scrollReq }) {
  const services = selected ? [selected] : filtered;
  const doctors = selected ? (DOCTORS_BY_POLI[selected.id] || []) : [];
  const back = () => setSelected(null);

  useEffect(()=>{ if(jump?.poliId && typeof jump.idx==="number"){ const el = document.querySelector(`[data-subof="${jump.poliId}"][data-subidx="${jump.idx}"]`); if(el) el.scrollIntoView({behavior:"smooth", block:"center"}); setJump(null);} },[jump,setJump]);
  useEffect(()=>{ if(scrollReq?.poliId){ const el = document.querySelector(`[data-poli="${scrollReq.poliId}"]`); if(el) el.scrollIntoView({behavior:"smooth", block:"start"}); } },[scrollReq]);

  return (
    <main className="flex-1 min-w-0">
      {/* Sticky header with Back when in detail */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-black/5 dark:border-white/10 px-3 py-2 flex items-center gap-2">
        {selected ? (
          <button onClick={back} className="flex items-center gap-1 text-sm text-slate-700 dark:text-white hover:opacity-80"><span className="inline-block rotate-180">➜</span> Kembali</button>
        ) : (
          <div className="text-sm text-slate-600 dark:text-white/60">Pilih poli untuk melihat jenis layanannya.</div>
        )}
        <div className="ml-auto text-xs text-slate-500 dark:text-white/50">{searchQuery ? `Hasil untuk: “${searchQuery}”` : null}</div>
      </div>

      <div className="p-4 space-y-4">
        {!selected && subMatches.length>0 && (
          <InfoCard>
            <div className="text-sm mb-2">Hasil terkait layanan:</div>
            <div className="grid gap-2">
              {subMatches.map((r,i)=> (
                <button key={`subm-${i}`} onClick={()=>onPickSub(r.poli.id, r.index)} className="text-left rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/5">
                  <div className="text-[13px]">{r.item.nama}</div>
                  <div className="text-[12px] text-slate-600 dark:text-white/60">{r.poli.nama}</div>
                </button>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Services list or selected detail */}
        {services.map((s) => (
          <section key={s.id} data-poli={s.id} className="space-y-3">
            <ServiceCard s={s} onPick={setSelected} />

            {/* Doctors */}
            {doctors.length>0 && selected && selected.id===s.id && (
              <InfoCard title="Dokter">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map((d, i) => (
                    <div key={`doc-${i}`} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                      <div className="font-medium">{d.nama}</div>
                      <div className="text-[12px] text-slate-600 dark:text-white/60">{d.spesialis}</div>
                      {d.jadwal && <div className="text-[12px] text-slate-600 dark:text-white/60 mt-1">{linkify(d.jadwal)}</div>}
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Layanan */}
            {Array.isArray(s.layanan) && s.layanan.length>0 && (
              <div className="grid gap-3">
                <div className="text-sm font-semibold">Layanan</div>
                {s.layanan.map((item, idx) => (
                  <div key={`${s.id}-${idx}`} data-subof={s.id} data-subidx={idx}>
                    <SubServiceCard item={item} onPick={()=>{}} parentJadwal={s.jadwal} />
                    {/* Extra info per sub service */}
                    {(() => {
                      const info = EXTRA_INFO?.[s.id]?.[idx];
                      if (!info) return null;
                      const { extra, flow, alt } = info;
                      if (flow && Array.isArray(flow) && flow.length>0) {
                        return (
                          <InfoCard title="Alur Layanan">
                            <ol className="list-decimal ml-5 space-y-1">
                              {flow.map((step, i) => (
                                <li key={`flow-${i}`}>{linkify(step)}</li>
                              ))}
                            </ol>
                            {FLOW_STEPS?.[s.id]?.[idx]?.images?.length>0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                {FLOW_STEPS[s.id][idx].images.map((img, i) => (
                                  <img key={`flimg-${i}`} src={resolveFlowImg(img)} alt="Alur" className="w-full rounded-xl border border-black/10 dark:border-white/10" onError={onInfoError} loading="lazy" />
                                ))}
                              </div>
                            )}
                            {alt && <div className="text-[12px] text-slate-600 dark:text-white/60 leading-snug mt-2">{alt}</div>}
                          </InfoCard>
                        );
                      }
                      if (alt) return <InfoCard><div className="text-[12px] text-slate-600 dark:text-white/60 leading-snug">{alt}</div></InfoCard>;
                      if (extra && typeof extra === "object") {
                        const { text, images } = extra;
                        return (
                          <InfoCard>
                            {text ? <p>{linkify(text)}</p> : null}
                            {Array.isArray(images) && images.length>0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {images.map((src,i)=>(
                                  <img key={`img2-${i}`} src={resolveFlowImg(src)} alt={item.nama} className="w-full rounded-xl border border-black/10 dark:border-white/10" onError={onInfoError} loading="lazy" />
                                ))}
                              </div>
                            )}
                          </InfoCard>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

/* ===================== Theme hook ===================== */
function useThemeKey(){
  const get=()=> (typeof document!=="undefined" && document.documentElement.classList.contains("dark"))?"dark":"light";
  const [key,setKey]=useState(get());
  useEffect(()=>{ const obs=new MutationObserver(()=>setKey(get())); obs.observe(document.documentElement,{attributes:true,attributeFilter:["class"]}); const onStorage=(e)=>{ if(e.key==="theme") setKey(get()); }; window.addEventListener("storage",onStorage); return ()=>{obs.disconnect(); window.removeEventListener("storage",onStorage);}; },[]);
  return key;
}

/* ===================== App Root ===================== */
export default function App() {
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(null);
  const [facility,setFacility]=useState("pkm-jagakarsa");
  const [navOpen,setNavOpen]=useState(false);
  const [scrollReq,setScrollReq]=useState(null); // {poliId, ts}
  const [jump,setJump]=useState(null);
  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  const facilityName = FACILITIES.find((f)=>f.id===facility)?.name || "-";

  useEffect(()=>{ if(query.trim().length>0){ setSelected(null); stopFlowAudio(); } },[query]);
  useEffect(()=>{ stopFlowAudio(); setSelected(null); setQuery(""); },[facility]);
  useEffect(()=>{ const onKey=(e)=>{ if(e.key==="Escape") setNavOpen(false); }; window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey); },[]);

  const filtered = useMemo(()=>{ const q=query.trim().toLowerCase(); const list=SERVICES_CURRENT.filter((s)=> !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q)); return list.slice().sort((a,b)=>{ const fa=getFloorNumber(a.lokasi)??999; const fb=getFloorNumber(b.lokasi)??999; if(fa!==fb) return fa-fb; return a.nama.localeCompare(b.nama,"id"); }); },[query,SERVICES_CURRENT]);
  const subResults = useMemo(()=>{ const q=query.trim().toLowerCase(); if(!q) return []; const rows=[]; SERVICES_CURRENT.forEach((p)=> (p.layanan||[]).forEach((item,idx)=>{ const hay=`${(item.nama||"").toLowerCase()} ${(item.ket||"").toLowerCase()}`; if(hay.includes(q)) rows.push({poli:p,item,index:idx}); })); return rows; },[query,SERVICES_CURRENT]);
  const matchPoliIds = useMemo(()=> Array.from(new Set(subResults.map((r)=>r.poli.id))),[subResults]);
  const sidebarList = useMemo(()=> filtered.length===0 && query && subResults.length>0 ? SERVICES_CURRENT : filtered,[filtered,query,subResults,SERVICES_CURRENT]);

  function handlePickSub(poliId, idx){ const p=SERVICES_CURRENT.find((x)=>x.id===poliId); if(!p) return; setQuery(""); setSelected(p); setJump({poliId,idx}); setNavOpen(false); }

  // dummy stopFlowAudio agar kompatibel dengan baseline
  function stopFlowAudio(){}

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-900/40 to-slate-900/20 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-3 h-14 flex items-center gap-2">
          <button onClick={()=>setNavOpen(true)} className="md:hidden rounded-xl p-2 hover:bg-white/40 dark:hover:bg-white/10" aria-label="Buka menu">☰</button>
          <div className="flex items-center gap-2">
            <div className="text-2xl">🏥</div>
            <div className="leading-tight">
              <div className="font-semibold">Informasi Layanan</div>
              <div className="text-xs text-slate-600 dark:text-white/60">Puskesmas Jagakarsa</div>
            </div>
          </div>
          <div className="ml-auto">
            <select value={facility} onChange={(e)=>setFacility(e.target.value)} className="h-9 rounded-xl bg-transparent border border-black/10 dark:border-white/10 px-2">
              {FACILITIES.map((f)=>(<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-[20rem,1fr] gap-3 px-3 py-3">
        {/* Drawer (mobile) */}
        <Drawer open={navOpen} onClose={()=>setNavOpen(false)}>
          <Sidebar facilityName={facilityName} query={query} setQuery={setQuery} services={sidebarList} onPick={(s)=>{ setSelected(s); setNavOpen(false); }} onScrollToServices={(poliId)=>{ setScrollReq({poliId,ts:Date.now()}); setNavOpen(false); }} selected={selected} highlightIds={matchPoliIds} />
        </Drawer>

        {/* Sidebar desktop */}
        <aside className="hidden md:block">
          <Sidebar facilityName={facilityName} query={query} setQuery={setQuery} services={sidebarList} onPick={setSelected} onScrollToServices={(p)=>setScrollReq({poliId:p,ts:Date.now()})} selected={selected} highlightIds={matchPoliIds} />
        </aside>

        {/* Right Panel */}
        <RightPanel selected={selected} setSelected={setSelected} filtered={filtered} subMatches={subResults} onPickSub={handlePickSub} jump={jump} setJump={setJump} searchQuery={query} scrollReq={scrollReq} />
      </div>

      <SurveyPopup formUrl="https://forms.gle/72k85XkYQTQZRfq38" delayMs={40000} cooldownDays={14} />
      <footer className="py-6 text-center text-slate-600 dark:text-white/50 text-sm">© {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.</footer>
    </div>
  );
}
