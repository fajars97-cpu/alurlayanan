// src/App.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { trackEvent, trackTiming } from "./ga.js";
import { motion, AnimatePresence } from "framer-motion";
import SurveyPopup from "./components/SurveyPopup.jsx";

// === Import data ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS,
} from "./data/services";

// === Floor helpers ===
 function getFloorNumber(lokasi) {
   if (!lokasi) return null;
   const m = String(lokasi).match(/(?:lantai|lt)\s*(\d+)/i);
   return m ? parseInt(m[1], 10) : null;
 }
 function floorBorderClass(lokasi) {
   const n = getFloorNumber(lokasi);
   if (n === 1) return "border-violet-400/60 hover:border-violet-300/80";
   if (n === 2) return "border-sky-400/60 hover:border-sky-300/80";
   if (n === 3) return "border-emerald-400/60 hover:border-emerald-300/80";
   return "border-white/10 hover:border-white/20";
 }

/* ===================== Path helpers ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;
const DIR_INFO = `${BASE}infografis`;

/* ===================== Infografis helpers ===================== */
const resolveInfografis = (service) => {
  const file = (service?.img ?? `${service?.id ?? "missing"}.jpg`).toString();
  if (/^https?:\/\//.test(file)) return file;
  if (file.startsWith("/")) return asset(file);
  return `${DIR_INFO}/${file}`;
};
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = INFO_FALLBACK;
};

/* ===================== Alur Layanan helpers ===================== */
const resolveFlowImg = (img) => {
  if (!img) return null;
  if (/^https?:\/\//.test(img)) return img;
  const p = img.startsWith("/") ? img.slice(1) : img;
  return asset(p);
};

// --- Auto-link URL di dalam teks (https, http, www., bit.ly) ---
const URL_RE = /((https?:\/\/|www\.)[^\s)]+|bit\.ly\/[^\s)]+)/gi;
function linkify(text) {
  if (!text) return text;
  const lines = String(text).split(/\r?\n/);
  const nodes = [];
  lines.forEach((line, li) => {
    let lastIndex = 0;
    line.replace(URL_RE, (m, url, _proto, idx) => {
      if (idx > lastIndex) nodes.push(line.slice(lastIndex, idx));
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      nodes.push(
        <a
          key={`${li}-${idx}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 underline hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {url}
        </a>
      );
      lastIndex = idx + url.length;
      return url;
    });
    if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
    if (li < lines.length - 1) nodes.push(<br key={`br-${li}`} />);
  });
  return nodes;
}

/* ===================== Flow fallback & audio ===================== */
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FLOW_FALLBACK;
};
function getFlowAudio() {
  if (!window.__flowAudio) {
    const a = new Audio();
    a.preload = "none";
    window.__flowAudio = a;
    window.__flowAudioKey = null;
  }
  return window.__flowAudio;
}
function stopFlowAudio() {
  const a = getFlowAudio();
  try {
    a.pause();
    a.currentTime = 0;
  } catch {}
}

/* ===================== Jadwal helpers (scalable) ===================== */
/**
 * Format dukungan:
 * - Lama: s.jadwal = { Senin: "08:00–16:00", ... }
 * - Baru: s.jadwal = { tz?, weekly: { Senin: ["08:00-12:00","13:00-16:00"], ... }, exceptions: { "YYYY-MM-DD": "Tutup" | ["09:00-12:00"] } }
 * Overnight "22:00-06:00" ditangani otomatis.
 */
const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const RULE_DEFAULT = {
  Senin: "08:00-16:00",
  Selasa: "08:00-16:00",
  Rabu: "08:00-16:00",
  Kamis: "08:00-16:00",
  Jumat: "08:00-16:30",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};
const toMin = (s) => {
  const [h, m] = String(s).trim().split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const fmtMin = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

function normalizeRanges(value) {
  if (value == null) return [];
  const t = String(value).trim().replace(/–|—/g, "-");
  if (!t || /tutup/i.test(t)) return [];
  const parts = Array.isArray(value) ? value : t.split(",").map((r) => r.trim());
  return parts
    .map((r) => {
      const [a, b] = String(r).split("-").map((x) => x.trim());
      if (!a || !b) return null;
      return { from: toMin(a), to: toMin(b) };
    })
    .filter(Boolean);
}
function normalizeSchedule(jadwalLike) {
  if (!jadwalLike || typeof jadwalLike !== "object" || Array.isArray(jadwalLike)) {
    return { tz: "Asia/Jakarta", weekly: { ...RULE_DEFAULT }, exceptions: {} };
  }
  if (jadwalLike.weekly || jadwalLike.exceptions) {
    return {
      tz: jadwalLike.tz || "Asia/Jakarta",
      weekly: { ...RULE_DEFAULT, ...(jadwalLike.weekly || {}) },
      exceptions: { ...(jadwalLike.exceptions || {}) },
    };
  }
  const weekly = { ...RULE_DEFAULT, ...jadwalLike };
  return { tz: "Asia/Jakarta", weekly, exceptions: {} };
}
const dayNameID = (date) => DAY_NAMES_ID[date.getDay()];
function rangesForDate(schedule, date) {
  const { weekly, exceptions } = normalizeSchedule(schedule);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${pad2(m)}-${pad2(d)}`;
  if (exceptions[key] != null) return normalizeRanges(exceptions[key]);
  return normalizeRanges(weekly[dayNameID(date)]);
}
function rangesForToday(schedule, ref = new Date()) {
  const today = new Date(ref);
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);
  const todayRanges = rangesForDate(schedule, today);
  const yRanges = rangesForDate(schedule, yesterday);
  const out = [];
  yRanges.forEach(({ from, to }) => {
    if (to < from) out.push({ from: 0, to });
  });
  todayRanges.forEach(({ from, to }) => {
    if (to >= from) out.push({ from, to });
    else out.push({ from, to: 1440 });
  });
  return out;
}
function getOpenStatus(service, ref = new Date()) {
  const schedule = service?.jadwal || {};
  const ranges = rangesForToday(schedule, ref);
  const now = ref.getHours() * 60 + ref.getMinutes();
  let open = false;
  let nextChange = null;
  // --- sort & scan
  const sorted = [...ranges].sort((a,b) => a.from - b.from);
  for (const r of sorted) {
    if (now >= r.from && now <= r.to) {
      open = true;
      if (nextChange == null || r.to < nextChange) nextChange = r.to;
    } else if (now < r.from) {
      if (nextChange == null || r.from < nextChange) nextChange = r.from;
    }
  }
  if (nextChange == null) {
    const tmr = new Date(ref);
    tmr.setDate(ref.getDate() + 1);
    const tRanges = rangesForToday(schedule, tmr);
    if (tRanges.length) nextChange = tRanges[0].from + 1440;
  }
   // === NEW: deteksi 24 jam penuh (union menutup 0..1440 tanpa jeda)
  let isFullDay = false;
  if (sorted.length) {
    let curFrom = Math.max(0, sorted[0].from);
    let curTo = Math.min(1440, sorted[0].to);
    for (let i = 1; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.from <= curTo) {
        // gabungkan overlap / nempel
        curTo = Math.max(curTo, r.to);
      } else {
        // ada jeda → bukan 24 jam penuh
        break;
      }
    }
    isFullDay = curFrom <= 0 && curTo >= 1440;
  }

  // === NEW: Istirahat Senin–Jumat pukul 12:00–13:00 (kecuali 24 jam)
  const dayName = DAY_NAMES_ID[ref.getDay()];
  const isWeekday = ["Senin","Selasa","Rabu","Kamis","Jumat"].includes(dayName);
  const rest = isWeekday && now >= 720 && now < 780; // 12:00–13:00
  if (rest) {
    open = false;
    // saat istirahat, perubahan terdekat adalah pukul 13:00
    if (nextChange == null || 780 < nextChange) nextChange = 780;
  }

  const minutesUntilChange = nextChange != null ? nextChange - now : null;

  // === NEW: penanda segera buka/tutup (±30 menit)
  let soon = null;
  if (!isFullDay && !rest && minutesUntilChange != null && minutesUntilChange >= 0) {
    if (!open && minutesUntilChange <= 30) soon = "segera-buka";
    if ( open && minutesUntilChange <= 30) soon = "segera-tutup";
  }

  if (isFullDay) {
    return { open: true, rest: false, soon: null, minutesUntilChange: null };
  }
  return { open, rest, soon, minutesUntilChange };
}
export function getEffectiveJadwal(s) {
  const { weekly } = normalizeSchedule(s?.jadwal || {});
  const out = {};
  for (const d of DAY_NAMES_ID) {
    const arr = normalizeRanges(weekly[d]);
    out[d] = arr.length
      ? arr.map((r) => `${fmtMin(r.from)}–${fmtMin(r.to)}`).join(", ")
      : "Tutup";
  }
  return out;
}
export function isOpenNow(s, ref = new Date()) {
  return getOpenStatus(s, ref).open;
}

// === Union status untuk sebuah poli (menggabungkan jadwal poli + semua layanan)
function getOpenStatusForPoli(poli, ref = new Date()) {
  const schedules = [];
  if (poli?.jadwal) schedules.push(poli.jadwal);
  (poli?.layanan || []).forEach((L) => {
    if (L?.jadwal) schedules.push(L.jadwal);
  });

  // kalau tidak ada apa-apa, pakai default rule yang sudah kamu definisikan
  if (schedules.length === 0) return getOpenStatus({ jadwal: {} }, ref);

  // gabungkan semua rentang "hari ini" + overnight
  const ranges = schedules.flatMap((j) => rangesForToday(j, ref));
  if (ranges.length === 0) return getOpenStatus({ jadwal: {} }, ref);

  // --- logika sama seperti getOpenStatus(), tapi langsung dari 'ranges'
  const now = ref.getHours() * 60 + ref.getMinutes();
  let open = false;
  let nextChange = null;

  const sorted = [...ranges].sort((a, b) => a.from - b.from);

  for (const r of sorted) {
    if (now >= r.from && now <= r.to) {
      open = true;
      if (nextChange == null || r.to < nextChange) nextChange = r.to;
    } else if (now < r.from) {
      if (nextChange == null || r.from < nextChange) nextChange = r.from;
    }
  }

  if (nextChange == null) {
    const tmr = new Date(ref);
    tmr.setDate(ref.getDate() + 1);
    const tRanges = schedules.flatMap((j) => rangesForToday(j, tmr));
    if (tRanges.length) nextChange = tRanges.sort((a,b)=>a.from-b.from)[0].from + 1440;
  }

  // deteksi 24 jam penuh (union menutup 0..1440)
  let isFullDay = false;
  if (sorted.length) {
    let curFrom = Math.max(0, sorted[0].from);
    let curTo = Math.min(1440, sorted[0].to);
    for (let i = 1; i < sorted.length; i++) {
      const r = sorted[i];
      if (r.from <= curTo) curTo = Math.max(curTo, r.to);
      else break; // ada jeda → bukan 24h penuh
    }
    isFullDay = curFrom <= 0 && curTo >= 1440;
  }

  // Istirahat 12:00–13:00 (Sen–Jum), kecuali 24 jam
  const dayName = DAY_NAMES_ID[ref.getDay()];
  const isWeekday = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].includes(dayName);
  const rest = !isFullDay && isWeekday && now >= 720 && now < 780;
  if (rest) {
    open = false;
    if (nextChange == null || 780 < nextChange) nextChange = 780;
  }

  const minutesUntilChange = nextChange != null ? nextChange - now : null;
  let soon = null;
  if (!isFullDay && !rest && minutesUntilChange != null && minutesUntilChange >= 0) {
    if (!open && minutesUntilChange <= 30) soon = "segera-buka";
    if ( open && minutesUntilChange <= 30) soon = "segera-tutup";
  }

  if (isFullDay) return { open: true, rest: false, soon: null, minutesUntilChange: null };
  return { open, rest, soon, minutesUntilChange };
}

/* ===== Jadwal aggregator untuk Sidebar (beragam per layanan) ===== */
function schedulesForPoli(poli) {
  const list = [];
  if (poli?.jadwal) list.push({ label: "Poli", jadwal: poli.jadwal });

  (poli?.layanan || []).forEach((L) => {
    if (L.jadwal) list.push({ label: L.nama, jadwal: L.jadwal });
  });
  return list;
}
function weeklyKey(jadwal) {
  const { weekly } = normalizeSchedule(jadwal);
  return JSON.stringify(
    DAY_NAMES_ID.reduce((acc, d) => {
      acc[d] = (normalizeRanges(weekly[d]) || []).map((r) => [r.from, r.to]);
      return acc;
    }, {})
  );
}
function poliOpenAny(poli) {
  if (isOpenNow({ jadwal: poli?.jadwal })) return true;
  return (poli?.layanan || []).some((L) => isOpenNow({ jadwal: L.jadwal }));
}

/* ====== Jadwal helpers untuk kartu layanan ====== */
const TODAY = () => DAY_NAMES_ID[new Date().getDay()];
function summarizeWeekly(jadwalLike) {
  // Ringkas HANYA hari yang buka (lewati "Tutup")
  const eff = getEffectiveJadwal({ jadwal: jadwalLike });
  const short = (d) => d.slice(0, 3);
  // Buat daftar hanya hari buka dalam urutan Minggu..Sabtu
  const openEntries = DAY_NAMES_ID
    .map((d) => [d, eff[d]])
    .filter(([, val]) => val && !/^\s*Tutup\s*$/i.test(val));
  if (openEntries.length === 0) return "Tidak melayani rutin";

  // Kelompokkan hari berurutan yang jamnya sama
  const groups = [];
  let cur = null;
  openEntries.forEach(([d, val]) => {
    if (!cur || cur.val !== val) {
      cur && groups.push(cur);
      cur = { from: d, to: d, val };
    } else {
      // lanjutkan range
      cur.to = d;
    }
  });
  cur && groups.push(cur);

  return groups
    .map((g) =>
      g.from === g.to ? `${short(g.from)} ${g.val}` : `${short(g.from)}–${short(g.to)} ${g.val}`
    )
    .join("; ");
}
function todayText(jadwalLike) {
  const eff = getEffectiveJadwal({ jadwal: jadwalLike });
  return eff[TODAY()];
}

/* ===================== UI kecil ===================== */
const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-slate-200/70 border border-black/10 text-slate-800 whitespace-nowrap dark:bg-white/8 dark:border-white/10 dark:text-white/80">
    {children}
  </span>
);
function Pill({ children, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/30",
    sky: "bg-sky-500/15     text-sky-700     ring-1 ring-sky-600/20     dark:text-sky-300     dark:ring-sky-400/30",
    slate: "bg-slate-200/70   text-slate-800   ring-1 ring-black/10       dark:bg-white/8        dark:text-white/80 dark:ring-white/12",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
function formatTarifID(t) {
  if (t == null) return "Tidak tersedia";
  if (Array.isArray(t) && t.length === 2) {
    const [a, b] = t.map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `Rp ${a.toLocaleString("id-ID")}–${b.toLocaleString("id-ID")}`;
    }
  }
  if (t && typeof t === "object" && "min" in t && "max" in t) {
    const a = Number(t.min), b = Number(t.max);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `Rp ${a.toLocaleString("id-ID")}–${b.toLocaleString("id-ID")}`;
    }
  }
  const n = Number(t);
  if (Number.isFinite(n)) return n === 0 ? "Gratis" : `Rp ${n.toLocaleString("id-ID")}`;
  return String(t);
}
function PricePill({ tarif }) {
  const label = formatTarifID(tarif);
  return label === "Gratis" ? <Pill tone="emerald">Gratis</Pill> : <Pill tone="sky">{label}</Pill>;
}
const StatusPill = ({ open, rest, soon }) => {
  let label = open ? "Buka" : "Tutup";
  let tone  = open
    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
    : "bg-rose-500/10 border-rose-400/30 text-rose-700 dark:text-rose-300";

  if (rest) {
    label = "Istirahat";
    tone  = "bg-slate-500/10 border-slate-400/30 text-slate-700 dark:text-slate-300";
  } else if (soon === "segera-buka") {
    label = "Segera buka";
    tone  = "bg-sky-500/10 border-sky-400/30 text-sky-700 dark:text-sky-300";
  } else if (soon === "segera-tutup") {
    label = "Segera tutup";
    tone  = "bg-amber-500/10 border-amber-400/30 text-amber-700 dark:text-amber-300";
  }

  return (
    <span
      className={`shrink-0 whitespace-nowrap leading-none text-[11px] px-2 py-1 rounded-full border ${tone}`}
    >
      {label}
    </span>
  );
};
/* ===== Sticky Back (reusable) ===== */
function StickyBack({ onClick, label = "Kembali" }) {
  return (
    <div
      className="sticky z-20 px-3 py-2 pointer-events-none"
      style={{ top: "var(--topbar-h, 56px)" }} // offset dinamis mengikuti tinggi header
    >
      <button
        onClick={onClick}
        aria-label="Kembali"
        className="pointer-events-auto inline-flex items-center gap-2
                   px-3.5 py-1.5 rounded-full text-[14px] font-medium
                   bg-slate-900/95 text-white border border-white/20
                   shadow-lg backdrop-blur-sm
                   hover:bg-slate-900 active:scale-95"
      >
        <span className="-rotate-180">➜</span> {label}
      </button>
    </div>
  );
}

/* ===================== Drawer (NEW) ===================== */
function Drawer({ open, onClose, children }) {
  // Lock scroll saat drawer terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay penuh: tap untuk menutup */}
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[9997] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel drawer dengan swipe-left close */}
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 left-0 z-[9998] w-[86%] max-w-[22rem]
                       bg-white/80 dark:bg-slate-950/80 backdrop-blur
                       border-r border-black/10 dark:border-white/10"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            drag="x"
            dragConstraints={{ left: -80, right: 0 }}
            dragElastic={0.04}
            onDragEnd={(_, info) => {
              const swipedFar = info.offset.x <= -80;
              const swipedFast = info.velocity.x < -500;
              if (swipedFar || swipedFast) onClose();
            }}
          >
            {/* handle geser yang lebar di sisi kanan */}
            <div className="absolute right-0 top-0 h-full w-4 cursor-ew-resize touch-pan-x" />
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}


/* ===================== Sidebar ===================== */
function Sidebar({
  facilityName,
  query,
  setQuery,
  services,
  onPick,
  onScrollToServices,
  selected,
  highlightIds = [],
}) {
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (s) => {
    onPick(s);
    setExpandedId((id) => (id === s.id ? null : s.id));
  };
  const searchRef = useRef(null);
  return (
    <aside
      className="
        w-full md:w-80 shrink-0
        bg-white/70 dark:bg-slate-950/70 backdrop-blur
        border-r border-black/5 dark:border-white/10
        flex flex-col
        h-full md:h-[calc(100svh-56px)]
        transition-colors duration-300
        rounded-none
      "
    >
      <div className="p-4 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold truncate text-slate-900 dark:text-white">Jadwal & Tarif</div>
      </div>

      <div className="px-4 pt-3 text-xs text-slate-700 dark:text-white/70">
        Fasilitas: <span className="text-slate-900 font-medium dark:text-white">{facilityName}</span>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-slate-600 dark:text-white/50">Pencarian</label>
         <div className="relative rounded-2xl border border-white/10 bg-slate-900/30 p-4 sm:p-5 overflow-visible">
        <input
         ref={searchRef}
         type="search"
         value={query}
         onChange={(e) => setQuery(e.target.value)}
         onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim()) {
            trackEvent("Search", "submit", query.trim());
          }
          if (e.key === "Escape" && query) {
         setQuery("");
         // opsional: bersihkan pilihan hasil
         // setSelected(null);
         requestAnimationFrame(() => searchRef.current?.focus());
         }
         }}
         enterKeyHint="search"
         placeholder="Cari 'umum', 'imunisasi', 'cabut gigi' …"
         className="w-full h-12 rounded-2xl bg-white/40 dark:bg-white/5 border border-emerald-500/20 focus:border-emerald-500/60 outline-none pr-12 pl-4"
        />
        {query && (
        <button
        type="button"
        onClick={() => {
         setQuery("");
         trackEvent("Search", "clear");
         // opsional: reset pilihan
         // setSelected(null);
         requestAnimationFrame(() => searchRef.current?.focus());
         }}
        aria-label="Hapus pencarian"
        className="absolute inset-y-0 right-2 my-auto h-8 min-w-8 rounded-full
                  bg-slate-900/80 text-white dark:bg-white/10 dark:text-white
                  border border-white/20 shadow-sm backdrop-blur-sm
                  flex items-center justify-center text-base"
        >
        ×
        </button>
        )}
       </div>
      </div>

      <div
        className="
          px-4 pb-2 space-y-2
          overflow-y-auto overscroll-contain
          [scrollbar-width:thin]
          md:max-h-[28rem]
          flex-1
        "
      >
        <div className="text-xs uppercase text-slate-600 dark:text-white/50 mb-2">Daftar Poli</div>

        {services.map((s) => {
          const active = expandedId === s.id;
          const hl = highlightIds.includes(s.id);
          const open = poliOpenAny(s);
          // gunakan status poli untuk label (memunculkan Istirahat/Segera *)
          const { open: openPill, rest, soon } = getOpenStatusForPoli(s);

          const schedList = schedulesForPoli(s);
          const groups = new Map();
          schedList.forEach(({ label, jadwal }) => {
            const k = weeklyKey(jadwal);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push({ label, jadwal });
          });
          const uniqueSchedules = Array.from(groups.values());

          const hasOneService = (s?.layanan || []).length === 1;
          const singleServiceSchedule = hasOneService && s.layanan[0]?.jadwal;

          return (
            <div key={s.id} className="space-y-2">
              <button
                onClick={() => toggle(s)}
                className={`group w-full text-left px-4 py-3.5 rounded-xl border transition
                ${selected?.id === s.id
                ? "bg-emerald-500/15 border-emerald-500/70 ring-2 ring-emerald-400/40"
                : hl
                ? "bg-emerald-400/10 border-emerald-400/50"
                : "bg-slate-100/70 border-black/10 dark:bg-white/5 dark:border-white/10"}
                hover:bg-slate-200/80 dark:hover:bg-white/8`}
                >
                <div className="flex items-center gap-3">
                  <div className="text-lg">{s.ikon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-slate-900 dark:text-white">{s.nama}</div>
                    <div className="text-xs text-slate-600 dark:text-white/60 truncate">{s.klaster}</div>
                  </div>
                  <StatusPill open={openPill} rest={rest} soon={soon} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-xl border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 p-3 text-sm">
                  <div className="text-slate-700 dark:text-white/60 mb-2">Jadwal</div>

                  {/* 1) Tidak ada jadwal khusus sama sekali → tampilkan default */}
                  {uniqueSchedules.length === 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-slate-800 dark:text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-slate-500 dark:text-white/50">{d}</span>
                          <span>{getEffectiveJadwal({})[d]}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 2) Semua sama → tabel ringkas (lama) */}
                  {uniqueSchedules.length === 1 && uniqueSchedules[0].length > 0 && !singleServiceSchedule && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-slate-800 dark:text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-slate-500 dark:text-white/50">{d}</span>
                          <span>
                            {getEffectiveJadwal({ jadwal: uniqueSchedules[0][0].jadwal })[d]}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 3) Poli dengan satu layanan yang punya jadwal khusus → tampilkan tabel layanan itu */}
                  {singleServiceSchedule && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-slate-800 dark:text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-slate-500 dark:text-white/50">{d}</span>
                          <span>{getEffectiveJadwal({ jadwal: singleServiceSchedule })[d]}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 4) Banyak layanan dengan jadwal berbeda → tampilkan notice; klik = scroll ke daftar layanan */}
                  {uniqueSchedules.length > 1 && !singleServiceSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        onPick(s);                 // pastikan poli terpilih
                        onScrollToServices?.(s.id); // trigger scroll di panel kanan
                        trackEvent("Navigation","scroll_to_services", s.id);
                      }}
                      className="w-full text-left text-[12px] text-amber-700 hover:text-amber-600 underline underline-offset-2 dark:text-amber-300 dark:hover:text-amber-200"
                      aria-label={`Jadwal beragam untuk ${s.nama}. Klik untuk menuju daftar layanan.`}
                    >
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
    <button
   onClick={() => {
     trackEvent("Navigation", "select_poli", s.id);
     onPick(s);
   }}
   className={`group relative overflow-hidden rounded-2xl border
   bg-slate-100/70 dark:bg-white/5
   hover:bg-slate-200/80 dark:hover:bg-white/10
   active:scale-[.98] transition text-left touch-manipulation
   ${floorBorderClass(s.lokasi)}`}
 >
      <div className="w-full bg-slate-200/70 dark:bg-slate-900/40 transition-colors duration-300">
        <div className="h-36 sm:h-44 md:h-48 lg:h-52 grid place-items-center p-2 sm:p-3">
          <img
            src={resolveInfografis(s)}
            onError={onInfoError}
            alt={s.nama}
            className="block max-h-full max-w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="text-xl">{s.ikon}</div>
          <div className="font-semibold truncate text-slate-900 dark:text-white">{s.nama}</div>
        </div>
        <div className="text-xs text-slate-600 mt-1 truncate dark:text-white/60">{s.klaster}</div>
      </div>
    </button>
  );
}

/* SubServiceCard */
function SubServiceCard({ item, onPick, parentJadwal }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  const tarifText = `Tarif Umum: ${formatTarifID(item.tarif)}`;

  const jadwalLayanan = item.jadwal || null;
  const { open, rest, soon } = getOpenStatus({ jadwal: jadwalLayanan || parentJadwal });
  const today = jadwalLayanan ? todayText(jadwalLayanan) : null;
  const weekly = jadwalLayanan ? summarizeWeekly(jadwalLayanan) : null;

  return (
    <button
      onClick={() => onPick(item)}
      className="relative w-full text-left rounded-2xl border
      border-black/10 dark:border-white/10
      bg-slate-100/70 dark:bg-white/5
      hover:bg-slate-200/80 dark:hover:bg-white/8
      ring-0 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/15
      transition-all shadow-sm hover:shadow active:scale-[.99]
      focus:outline-none focus:ring-2 focus:ring-emerald-500 overflow-visible"
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
          <StatusPill open={open} rest={rest} soon={soon} />
        </div>
        <div className="text-[12px] sm:text-[13px] text-slate-700 dark:text-white/70">{tarifText}</div>
        <div className="h-px bg-black/10 dark:bg-white/10" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl sm:text-2xl shrink-0">{item.ikon ?? "🧩"}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] sm:text-[16px] leading-snug text-slate-900 dark:text-white">
              {item.nama}
            </div>
            {item.ket && (
              <div className="text-[13px] sm:text-sm text-slate-600 dark:text-white/70 mt-1 line-clamp-3">
                {item.ket}
              </div>
            )}
            {/* Jadwal ringkas per layanan */}
            <div className="mt-2 text-[12px] sm:text-[13px] leading-snug">
              {jadwalLayanan ? (
                <>
                  <div className="text-slate-700 dark:text-white/70">
                    <span className="text-slate-600 dark:text-white/50">Hari Ini:</span> {today}
                  </div>
                  <div className="break-words text-slate-700 dark:text-white/70">
                    <span className="text-slate-600 dark:text-white/50">Jadwal Buka:</span> {weekly}
                  </div>
                </>
              ) : (
                <div className="italic text-slate-600 dark:text-white/60">Ikuti jadwal default poli</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================== Flow Card (pakai FLOW_STEPS) ===================== */
function FlowCard({ step, index }) {
  const src = resolveFlowImg(step?.img);
  let lastTap = 0;
  const playNarration = () => {
    const file = step?.audio;
    if (!file) return;
    const player = getFlowAudio();
    const key = step.id;
    const url = asset(file);
    const now = Date.now();
    const isDoubleTap = now - lastTap < 400;
    lastTap = now;

    if (window.__flowAudioKey === key && isDoubleTap) {
      try {
        player.pause();
        player.currentTime = 0;
        player.play();
      } catch {}
      trackEvent("Flow","restart_audio", key);
      return;
    }
    try {
      player.pause();
      player.currentTime = 0;
      if (window.__flowAudioKey !== key || player.src !== new URL(url, location.href).href)
        player.src = url;
      window.__flowAudioKey = key;
      player.play().catch(() => {});
      trackEvent("Flow","play_audio", key);
    } catch (e) {
      console.warn("Gagal memutar audio:", e);
    }
  };

  return (
    <button
      type="button"
      onClick={playNarration}
      className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 overflow-hidden text-left hover:bg-slate-200/80 dark:hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Langkah ${index + 1} — ketuk untuk narasi, ketuk cepat 2x untuk ulang`}
    >
      <div className="px-3 pt-2 text-[11px] text-slate-600 dark:text-white/50">Langkah {index + 1}</div>
      <div className="p-2 sm:p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowError}
            alt={step?.name || `Langkah ${index + 1}`}
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-slate-400 dark:text-white/30 text-sm">—</div>
        )}
      </div>
      {(step?.name || step?.description) && (
        <div className="px-3 pb-3">
          {step?.name && <div className="text-sm font-semibold text-slate-900 dark:text-white">{step.name}</div>}
          {step?.description && <p className="text-xs text-slate-700 dark:text-white/70 mt-1">{step.description}</p>}
        </div>
      )}
    </button>
  );
}

/* ===================== Info Card ===================== */
function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 p-4 sm:p-5 transition-colors duration-300">
      <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-white/60 mb-2">{title}</div>
      <div className="prose max-w-none text-slate-800 dark:prose-invert dark:text-slate-300 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/* ===================== Right Panel ===================== */
function RightPanel({
  selected,
  setSelected,
  filtered,
  subMatches,
  onPickSub,
  jump,
  setJump,
  searchQuery,
  scrollReq,
}) {
  const [sub, setSub] = useState(null);

  // === Trap tombol Back (satu-trap deterministik) ===
const EXIT_WINDOW_MS = 2000;
const [showBackHint, setShowBackHint] = useState(false);

const backStateRef = useRef({
  seeded: false,
  lock: false,
  exitArmedAt: 0,
  listenersAttached: false,
});

const getLevel = () => (sub ? 2 : selected ? 1 : 0);

const seedEntryAndTrap = () => {
  if (typeof window === "undefined") return;
  const S = backStateRef.current;
  try {
    // Tandai entry (gantikan current) lalu pasang satu TRAP
    if (!history.state || !history.state.__ENTRY) {
      history.replaceState({ __ENTRY: true }, "");
    }
    history.pushState({ __TRAP: true, t: Date.now() }, "");
    S.seeded = true;
  } catch {}
};

useEffect(() => {
  if (typeof window === "undefined") return;

  const S = backStateRef.current;

  const reTrapSync = () => {
    if (typeof window === "undefined") return;
    try {
      // Pasang lagi 1 TRAP sinkron di awal handler agar back cepat tetap tertahan
      history.pushState({ __TRAP: true, t: Date.now() }, "");
    } catch {}
  };

  const handleBack = () => {
    if (S.lock) return;
    S.lock = true;

    // Kunci: pasang lagi TRAP sinkron di awal
    reTrapSync();

    const level = getLevel();

    // 1) SUBSERVICE → kembali ke POLI
    if (level === 2) {
      try { if (typeof stopFlowAudio === "function") stopFlowAudio(); } catch {}
      setSub(null);
      S.lock = false;
      return;
    }
    // 2) POLI → kembali ke BERANDA
    if (level === 1) {
      try { if (typeof stopFlowAudio === "function") stopFlowAudio(); } catch {}
      setSelected(null);
      S.lock = false;
      return;
    }
    // 3) BERANDA → double-back untuk keluar
    const now = Date.now();
    if (now - S.exitArmedAt <= EXIT_WINDOW_MS) {
      // Lepas listener supaya lompatan keluar tidak di-intercept lagi
      if (S.listenersAttached) {
        window.removeEventListener("popstate", onPop);
        window.removeEventListener("hashchange", onHash);
        window.removeEventListener("pageshow", onPageShow);
        document.removeEventListener("visibilitychange", onVis);
        S.listenersAttached = false;
      }
      // Loncat melewati TRAP & ENTRY → benar-benar keluar dari situs
      try { history.go(-2); } catch { try { history.back(); } catch {} }
      S.lock = false;
      return;
    }

    // Tap pertama di beranda → tampilkan toast + arm exit
    S.exitArmedAt = now;
    setShowBackHint(true);
    setTimeout(() => setShowBackHint(false), 1800);
    S.lock = false;
  };

  const onPop = () => handleBack();
  const onHash = () => handleBack();

  const onPageShow = (e) => {
    // Termasuk navigasi back-forward cache (bfcache)
    // Setiap halaman jadi aktif → seed ulang ENTRY+TRAP
    seedEntryAndTrap();
  };

  const onVis = () => {
    if (document.hidden) return;
    // Saat kembali fokus → pastikan ada ENTRY+TRAP
    seedEntryAndTrap();
  };

  // Seed saat mount pertama
  seedEntryAndTrap();

  // Pasang listener sekali saja
  if (!S.listenersAttached) {
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVis);
    S.listenersAttached = true;
  }

  return () => {
    window.removeEventListener("popstate", onPop);
    window.removeEventListener("hashchange", onHash);
    window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVis);
    S.listenersAttached = false;
  };
// tergantung posisi (agar mundur level bekerja)
}, [selected, sub]);

  // === Dwell-time: lama lihat detail layanan (kirim saat ganti/keluar)
  useEffect(() => {
    let t0 = performance.now();
    return () => {
      const ms = Math.round(performance.now() - t0);
      if (sub) trackTiming("view_service_ms", ms, { label: sub?.nama });
    };
  }, [sub]);
  const servicesGridRef = useRef(null);

  useEffect(() => setSub(null), [selected]);
  useEffect(() => {
    if (jump && selected && selected.id === jump.poliId) {
      setSub(selected.layanan?.[jump.idx] ?? null);
      setJump(null);
    }
  }, [jump, selected, setJump]);

  const scenarios = useMemo(() => {
    const A = sub?.alur;
    if (!A) return {};
    if (Array.isArray(A)) return { standar: A };
    return A;
  }, [sub]);

  const scenarioKeys = Object.keys(scenarios);
  const [scenarioKey, setScenarioKey] = useState(null);
  useEffect(() => {
    setScenarioKey(scenarioKeys[0] ?? null);
  }, [sub, JSON.stringify(scenarioKeys)]);

  const flowSteps = useMemo(() => {
    return (scenarios[scenarioKey] || []).map((id) => FLOW_STEPS[id]).filter(Boolean);
  }, [scenarios, scenarioKey]);

  const showSearchResults = searchQuery?.trim()?.length > 0 && subMatches?.length > 0;

  // Scroll request dari Sidebar (klik notice jadwal beragam)
  useEffect(() => {
    if (!scrollReq || !selected || sub) return;
    if (selected.id !== scrollReq.poliId) return;
    try {
      servicesGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {}
  }, [scrollReq, selected, sub]);

  if (!selected || showSearchResults) {
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="grid-poli-or-search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {showSearchResults ? (
              <section className="mb-6">
                <div className="mb-2 text-slate-700 dark:text-white/70">Hasil Pelayanan</div>
                <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subMatches.map(({ poli, item, index }) => (
                    <SubServiceCard
                      key={poli.id + "#" + index}
                      item={{ ...item, nama: `${item.nama} — ${poli.nama}` }}
                      onPick={() => onPickSub(poli.id, index)}
                      parentJadwal={poli.jadwal}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <>
                <div className="mb-3 text-slate-700 dark:text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((s) => (
                    <ServiceCard key={s.id} s={s} onPick={setSelected} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
        {/* Sticky back untuk halaman daftar layanan poli */}
        <StickyBack onClick={() => { stopFlowAudio(); setSelected(null); trackEvent("Navigation","back_from_poli"); }} />

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">{selected.nama}</h2>
        </div>

        <div className="mb-1 text-slate-700 dark:text-white/70">Jenis Layanan — {selected.nama}</div>
        <div
          ref={servicesGridRef}
          className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {list.length > 0 ? (
            list.map((it, i) => (
              <SubServiceCard key={i} item={it} onPick={setSub} parentJadwal={selected.jadwal} />
            ))
          ) : (
            <div className="text-slate-600 dark:text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
      {/* Sticky back untuk halaman detail layanan */}
      <StickyBack onClick={() => { stopFlowAudio(); setSub(null); trackEvent("Navigation","back_from_service"); }} />

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">
          {selected.nama} — {sub.nama}
        </h2>
      </div>

      <div className="text-slate-700 dark:text-white/70">
        Alur layanan untuk: <span className="font-medium">{sub.nama}</span>
      </div>

      {Object.keys(scenarios).length > 1 && (
        <div className="flex flex-wrap gap-2 -mt-1">
          {Object.keys(scenarios).map((key) => (
            <button
              key={key}
              onClick={() => {
                stopFlowAudio();
                setScenarioKey(key);
                trackEvent("Flow","select_scenario", key);
              }}
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                key === scenarioKey
                  ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-200/70 border-black/10 text-slate-800 hover:bg-slate-200/90 dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
              }`}
              aria-pressed={key === scenarioKey}
            >
              {key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {flowSteps.map((step, i) => (
          <FlowCard key={step.id ?? i} step={step} index={i} />
        ))}
      </div>

      <div className="mt-4 sm:mt-6">
        <InfoCard title="Petugas Penanggung Jawab">
          <div className="font-semibold text-slate-900 dark:text-white mb-1">
            {DOCTORS_BY_POLI[selected.id] ?? "—"}
          </div>
          <div className="text-slate-700 dark:text-white/70">
            <p className="mb-2">
              <strong>Detail layanan:</strong> {sub.nama}
            </p>
            {(() => {
 
 // Urutan prioritas:
  // 1) sub.info (jika hardcoded di data)
  // 2) EXTRA_INFO[<nama layanan>]
  // 3) EXTRA_INFO[<nama poli>]
  // 4) EXTRA_INFO[<id poli>]  (jika kamu pernah menyimpan pakai id)
  // 5) EXTRA_INFO["Laboratorium"] dst (alias opsional)
  const pickExtra = () => {
    if (sub?.info) return sub.info;

    const tryKeys = [
      sub?.nama,               // "Darah Lengkap"
      selected?.nama,          // "Laboratorium"
      selected?.id,            // "laboratorium"
      // alias opsional — tambahkan jika kamu punya pola kunci lain
      `${selected?.nama} - ${sub?.nama}`,
      `${selected?.nama}: ${sub?.nama}`,
    ].filter(Boolean);

    for (const k of tryKeys) {
      if (EXTRA_INFO && Object.prototype.hasOwnProperty.call(EXTRA_INFO, k)) {
        return EXTRA_INFO[k];
      }
    }
    return null;
  };

  const extra = pickExtra();

  const toSrc = (p) => {
    if (!p) return null;
    if (/^https?:\/\//.test(p)) return p;
    const clean = String(p).replace(/^\/+/, "");
    return asset(clean);
  };

  if (!extra) {
    return (
      <>
        <p>Informasi tambahan belum tersedia. Silakan lengkapi sesuai ketentuan layanan.</p>
        <p className="mt-2">
          Informasi ini bersifat contoh/dummy. Silakan ganti dengan persyaratan atau
          instruksi khusus untuk layanan <em>{sub.nama}</em>.
        </p>
      </>
    );
  }

  if (typeof extra === "string") {
    return <p>{linkify(extra)}</p>;
  }

  if (Array.isArray(extra)) {
    return (
      <div className="space-y-3">
        {extra.map((item, i) => {
          if (typeof item === "string") return <p key={`txt-${i}`}>{linkify(item)}</p>;
          if (item && typeof item === "object" && item.img) {
            return (
              <div key={`img-${i}`} className="space-y-1">
                <img
                  src={toSrc(item.img)}
                  alt={item.alt || sub.nama}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10"
                  onError={onInfoError}
                  loading="lazy"
                />
                {item.alt && (
                  <div className="text-[12px] text-slate-600 dark:text-white/60 leading-snug">
                    {item.alt}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  if (extra && typeof extra === "object") {
    const { text, images } = extra;
    return (
      <div className="space-y-3">
        {text ? <p>{linkify(text)}</p> : null}
        {Array.isArray(images) && images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {images.map((src, i) => (
              <img
                key={`img2-${i}`}
                src={toSrc(src)}
                alt={sub.nama}
                className="w-full rounded-xl border border-black/10 dark:border-white/10"
                onError={onInfoError}
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
})()}

          </div>
        </InfoCard>
      </div>

    {/* Toast "tekan lagi untuk keluar" */}
      {showBackHint && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-max max-w-[90%] px-3 py-2 rounded-full
                        bg-black/80 text-white text-xs sm:text-sm shadow-lg">
          Tekan sekali lagi untuk keluar
        </div>
      )}
    </div>
  );
}

/* ===================== Hook kecil untuk deteksi tema (animated) ===================== */
function useThemeKey() {
  const get = () =>
    (typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
      ? "dark"
      : "light";
  const [key, setKey] = useState(get());

  useEffect(() => {
    // Amati perubahan class pada <html>
    const obs = new MutationObserver(() => setKey(get()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Storage (kalau tab lain mengganti tema)
    const onStorage = (e) => {
      if (e.key === "theme") setKey(get());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      obs.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return key;
}

/* ===================== App Root ===================== */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [facility, setFacility] = useState("pkm-jagakarsa");
  const [navOpen, setNavOpen] = useState(false);
  const [scrollReq, setScrollReq] = useState(null); // { poliId, ts }
  const [jump, setJump] = useState(null);
  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  const facilityName = FACILITIES.find((f) => f.id === facility)?.name || "-";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const swipeRef = useRef({ x0: 0, x: 0, t0: 0 });
  function onDrawerTouchStart(e) {
    const x = e.touches?.[0]?.clientX ?? 0;
    swipeRef.current = { x0: x, x, t0: Date.now() };
  }
  function onDrawerTouchMove(e) {
    const x = e.touches?.[0]?.clientX ?? 0;
    swipeRef.current.x = x;
  }
  function onDrawerTouchEnd() {
    const { x0, x, t0 } = swipeRef.current;
    const dx = x - x0;          // negatif = geser ke kiri
    const dt = Math.max(1, Date.now() - t0);
    const v = dx / dt;          // px per ms
    const farEnough = dx <= -60;   // jarak minimal 60px ke kiri
    const fastEnough = v < -0.5;   // atau cukup cepat
    if (farEnough || fastEnough) setNavOpen(false);
  }
  const headerRef = useRef(null);
  useEffect(() => {
    const apply = () => {
      try {
        const h = (headerRef.current && headerRef.current.offsetHeight) || 56; // fallback
        document.documentElement?.style?.setProperty?.("--topbar-h", `${h}px`);
      } catch {}
    };
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", apply, { once: true });
    } else {
      apply();
    }
    let ro = null;
    try {
      if ("ResizeObserver" in window) {
        ro = new ResizeObserver(apply);
        if (headerRef.current) ro.observe(headerRef.current);
      }
    } catch {}
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      try { ro && ro.disconnect && ro.disconnect(); } catch {}
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      setSelected(null);
      stopFlowAudio();
    }
  }, [query]);

  const filtered = useMemo(() => {
   const q = query.trim().toLowerCase();
   const list = SERVICES_CURRENT.filter(
     (s) => !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q)
   );
   // Urutkan: lantai (asc) → nama
   return list.slice().sort((a, b) => {
     const fa = getFloorNumber(a.lokasi) ?? 999;
     const fb = getFloorNumber(b.lokasi) ?? 999;
     if (fa !== fb) return fa - fb;
     return a.nama.localeCompare(b.nama, "id");
   });
 }, [query, SERVICES_CURRENT]);

  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    SERVICES_CURRENT.forEach((p) =>
      (p.layanan || []).forEach((item, idx) => {
        const hay = `${(item.nama || "").toLowerCase()} ${(item.ket || "").toLowerCase()}`;
        if (hay.includes(q)) rows.push({ poli: p, item, index: idx });
      })
    );
    return rows;
  }, [query, SERVICES_CURRENT]);

  const matchPoliIds = useMemo(
    () => Array.from(new Set(subResults.map((r) => r.poli.id))),
    [subResults]
  );
  const sidebarList = useMemo(
    () =>
      filtered.length === 0 && query && subResults.length > 0 ? SERVICES_CURRENT : filtered,
    [filtered, query, subResults, SERVICES_CURRENT]
  );

  function handlePickSub(poliId, idx) {
    const p = SERVICES_CURRENT.find((x) => x.id === poliId);
    if (!p) return;
    setQuery("");
    setSelected(p);
    setJump({ poliId, idx });
    setNavOpen(false);
    trackEvent("Navigation", "select_service", `${poliId}#${idx}`);
  }

  useEffect(() => {
    stopFlowAudio();
    setSelected(null);
    setQuery("");
  }, [facility]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="
          min-h-screen
          text-slate-900 dark:text-white
          bg-gradient-to-b
          from-white via-slate-50 to-slate-100
          dark:from-slate-900 dark:via-slate-950 dark:to-black
          transition-colors duration-300
        "
      >
        <header ref={headerRef} className="
          sticky top-0 z-30 backdrop-blur
          bg-white/70 dark:bg-slate-900/70
          border-b border-black/5 dark:border-white/10
          transition-colors duration-300
        ">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
            <button
              className="md:hidden inline-flex items-center justify-center size-9 rounded-xl
              border border-black/10 dark:border-white/10
              bg-white/60 dark:bg-white/5
              hover:bg-slate-200/80 dark:hover:bg-white/10"
              aria-label="Buka menu"
              onClick={() => { setNavOpen(true); trackEvent("Drawer","open"); }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center">🏥</div>
              <div className="font-semibold">Informasi Layanan Puskesmas Jagakarsa</div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-white/60 hidden sm:block">Fasilitas</label>
              <select
                value={facility}
                onChange={(e) => {
                  const v = e.target.value;
                  setFacility(v);
                  trackEvent("Facility", "change", v);
                }}
                className="
                  h-9 rounded-lg px-2 text-sm outline-none
                  bg-white text-slate-900 border border-black/10
                  dark:bg-slate-800 dark:text-white dark:border-white/10
                  focus:ring-2 focus:ring-emerald-500
                  appearance-none
                "
              >
                {FACILITIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-0 md:px-4 grid md:grid-cols-[24rem_1fr]">
          {navOpen && (
            <button
              aria-label="Tutup menu"
              onClick={() => { setNavOpen(false); trackEvent("Drawer","close","overlay"); }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            />
          )}

          <div
            className={`fixed z-50 inset-y-0 left-0 w-80 md:w-auto md:static md:z-auto
              transition-transform md:transition-none
              ${navOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
              h-[100svh] overflow-y-auto overscroll-contain`}
            role="dialog"
            aria-modal="true"
            onTouchStart={onDrawerTouchStart}
            onTouchMove={onDrawerTouchMove}
            onTouchEnd={(e) => { onDrawerTouchEnd(e); trackEvent("Drawer","close","swipe"); }}
          >
            {/* NEW: area handle di tepi kanan agar mudah diseret/geser */}
            <div
              className="absolute right-0 top-0 h-full w-4 md:hidden touch-pan-x"
              onTouchStart={onDrawerTouchStart}
              onTouchMove={onDrawerTouchMove}
              onTouchEnd={onDrawerTouchEnd}
              aria-hidden="true"
            />

            <Sidebar
              facilityName={facilityName}
              query={query}
              setQuery={setQuery}
              services={sidebarList}
              onPick={(s) => {
                setSelected(s);
                setNavOpen(false);
              }}
              onScrollToServices={(poliId) => {
                setScrollReq({ poliId, ts: Date.now() }); // trigger scroll
                setNavOpen(false);                         // tutup drawer (mobile)
              }}
              selected={selected}
              highlightIds={matchPoliIds}
            />
          </div>

          <RightPanel
            selected={selected}
            setSelected={setSelected}
            filtered={filtered}
            subMatches={subResults}
            onPickSub={handlePickSub}
            jump={jump}
            setJump={setJump}
            searchQuery={query}
            scrollReq={scrollReq}
          />
        </div>

        <SurveyPopup
          formUrl="https://forms.gle/72k85XkYQTQZRfq38"
          delayMs={60000}
          cooldownDays={7}
        />

        <footer className="py-6 text-center text-slate-600 dark:text-white/50 text-sm">
          © {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.
        </footer>
      </div>
  );
}
