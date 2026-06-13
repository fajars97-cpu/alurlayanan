// src/App.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { trackEvent, trackTiming, gaEvent } from "./ga.js";
import { motion, AnimatePresence } from "framer-motion";
import SurveyPopup from "./components/SurveyPopup.jsx";
import PsychologySchedule from "./components/PsychologySchedule.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { mapEmbedSrc, reviewLink } from "./utils/facilityMaps";
import {
  DAY_NAMES_ID,
  getEffectiveJadwal,
  getOpenStatus,
  getOpenStatusForPoli,
  schedulesForPoli,
  todayText,
  weeklyKey,
} from "./utils/schedule";

const MotionDiv = motion.div;

// Scroll ke bagian atas halaman (handle fallback kalau browser tidak support smooth)
const scrollToTopSmooth = () => {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
};

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
   if (n === 1) return "border-slate-200 hover:border-emerald-200 dark:border-white/10 dark:hover:border-emerald-400/30";
   if (n === 2) return "border-slate-200 hover:border-sky-200 dark:border-white/10 dark:hover:border-sky-400/30";
   if (n === 3) return "border-slate-200 hover:border-teal-200 dark:border-white/10 dark:hover:border-teal-400/30";
   return "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20";
 }

/* ===================== Path helpers ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;
const DIR_INFO = `${BASE}infografis`;
const PUSKESMAS_LOGO_SRC = asset("icons/logo-puskesmas.jpg");

function PuskesmasLogo({ className = "size-9" }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-lg border border-black/10 bg-white p-1 shadow-sm dark:border-white/10 ${className}`}
    >
      <img
        src={PUSKESMAS_LOGO_SRC}
        alt="Logo Puskesmas"
        className="h-full w-full rounded-md object-contain"
      />
    </div>
  );
}

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

const SPUTUM_COLLECTION_REEL_URL =
  "https://www.instagram.com/reel/DZcHDxHquo1/?utm_source=ig_embed&utm_campaign=loading";
const FASTING_LAB_REEL_URL =
  "https://www.instagram.com/reel/DZcIDwBKijA/?utm_source=ig_embed&utm_campaign=loading";
const COMPLETE_URINE_TEST_REEL_URL =
  "https://www.instagram.com/reel/DZcHXS7qS-0/?utm_source=ig_embed&utm_campaign=loading";

function ensureInstagramEmbedScript(onReady) {
  if (typeof window === "undefined") return;

  const processEmbed = () => {
    try {
      window.instgrm?.Embeds?.process?.();
    } catch {
      // Instagram embeds are optional; keep the fallback link visible.
    }
    onReady?.();
  };

  if (window.instgrm?.Embeds?.process) {
    processEmbed();
    return;
  }

  const existing = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
  if (existing) {
    existing.addEventListener("load", processEmbed, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.instagram.com/embed.js";
  script.onload = processEmbed;
  document.body.appendChild(script);
}

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
  } catch { /* noop */ }
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

function formatClockFromMinutes(minutesFromNow) {
  if (minutesFromNow == null || !Number.isFinite(minutesFromNow)) return null;

  const target = new Date();
  target.setMinutes(target.getMinutes() + minutesFromNow);
  return target.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function describeServiceStatus(status, fallbackSchedule = null) {
  const time = formatClockFromMinutes(status?.minutesUntilChange);
  const nextDay = (status?.minutesUntilChange ?? 0) >= 24 * 60;
  const dayPrefix = nextDay ? "besok " : "";

  if (status?.rest) {
    return time ? `Istirahat, buka lagi ${dayPrefix}${time}` : "Sedang istirahat";
  }

  if (status?.open) {
    if (status?.minutesUntilChange == null) return "Buka 24 jam";
    return time ? `Buka sampai ${dayPrefix}${time}` : "Sedang buka";
  }

  if (time) return `Tutup, buka ${dayPrefix}${time}`;
  return fallbackSchedule ? `Tutup hari ini (${fallbackSchedule})` : "Tutup hari ini";
}

const QUICK_ACCESS_DEFS = [
  { id: "igd", label: "IGD" },
  { id: "pendaftaran_online", label: "Pendaftaran Online" },
  { id: "laboratorium", label: "Laboratorium" },
  { id: "farmasi", label: "Farmasi" },
  { id: "poli-gigi", label: "Poli Gigi", aliases: ["gigi"] },
  { id: "ruang-bersalin", label: "Ruang Bersalin", aliases: ["bersalin"] },
];

function findQuickAccessServices(services) {
  return QUICK_ACCESS_DEFS.map((item) => {
    const service = services.find((candidate) => {
      const haystack = `${candidate.id || ""} ${candidate.nama || ""}`.toLowerCase();
      return (
        haystack.includes(item.id.replace(/_/g, "-")) ||
        haystack.includes(item.id) ||
        item.aliases?.some((alias) => haystack.includes(alias))
      );
    });

    return service ? { ...item, service } : null;
  }).filter(Boolean);
}

const STATUS_FILTERS = {
  all: "Semua",
  open: "Buka",
  rest: "Istirahat",
  closed: "Tutup",
};

function getPoliStatusKey(service) {
  const status = getOpenStatusForPoli(service);
  if (status.open) return "open";
  if (status.rest) return "rest";
  return "closed";
}

function StatTile({ label, value, tone = "slate", active = false, onClick }) {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300",
    slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-left transition
        hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60
        ${tones[tone]}
        ${active ? "ring-2 ring-emerald-500/45 shadow-sm shadow-emerald-900/10" : ""}`}
    >
      <div className="text-[11px] uppercase text-slate-500 dark:text-white/45">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-950 dark:text-white">{value}</div>
    </button>
  );
}

function ServicesOverview({
  facilityName,
  services,
  searchQuery,
  subMatchesCount,
  statusFilter,
  onStatusFilterChange,
}) {
  const summary = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        const statusKey = getPoliStatusKey(service);
        if (statusKey === "open") acc.open += 1;
        else if (statusKey === "rest") acc.rest += 1;
        else acc.closed += 1;
        return acc;
      },
      { open: 0, rest: 0, closed: 0 }
    );
  }, [services]);

  const hasSearch = Boolean(searchQuery?.trim());
  const activeLabel = STATUS_FILTERS[statusFilter] ?? STATUS_FILTERS.all;
  const toggleStatus = (nextStatus) => {
    onStatusFilterChange?.(statusFilter === nextStatus ? "all" : nextStatus);
  };

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/65 dark:shadow-none">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
            Direktori jadwal layanan
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            {hasSearch ? "Hasil pencarian layanan" : "Pilih poli layanan"}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
            {facilityName} - {hasSearch ? `${subMatchesCount} hasil layanan ditemukan.` : "Status dan jadwal hari ini ditampilkan di setiap kartu."}
            {statusFilter !== "all" ? ` Filter aktif: ${activeLabel}.` : ""}
          </p>
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => onStatusFilterChange?.("all")}
              className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Tampilkan semua
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[22rem]">
          <StatTile
            label="Buka"
            value={summary.open}
            tone="emerald"
            active={statusFilter === "open"}
            onClick={() => toggleStatus("open")}
          />
          <StatTile
            label="Istirahat"
            value={summary.rest}
            tone="sky"
            active={statusFilter === "rest"}
            onClick={() => toggleStatus("rest")}
          />
          <StatTile
            label="Tutup"
            value={summary.closed}
            tone="rose"
            active={statusFilter === "closed"}
            onClick={() => toggleStatus("closed")}
          />
        </div>
      </div>
    </section>
  );
}

function QuickAccessBar({ services, onPick }) {
  const quickServices = useMemo(() => findQuickAccessServices(services), [services]);
  if (!quickServices.length) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
          Akses cepat
        </div>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {quickServices.map(({ id, label, service }) => {
          const status = getOpenStatusForPoli(service);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(service)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/70 dark:border-white/10 dark:bg-white/5 dark:text-white dark:shadow-none dark:hover:border-emerald-400/30 dark:hover:bg-emerald-500/10"
            >
              <span className="text-base">{service.ikon}</span>
              <span>{label}</span>
              <span
                className={`size-2 rounded-full ${
                  status.open
                    ? "bg-emerald-500"
                    : status.rest
                      ? "bg-sky-500"
                      : "bg-rose-500"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Sign Puasa
const PuasaPill = () => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-300">
    Diharuskan Puasa 10-12 Jam
  </span>
);

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
                   bg-white/90 text-slate-700 border border-slate-200
                   shadow-sm shadow-slate-200/60 backdrop-blur-sm
                   hover:bg-white hover:text-slate-950 hover:border-slate-300
                   dark:bg-white/5 dark:text-white dark:border-white/15
                   dark:shadow-none dark:hover:bg-white/10 dark:hover:border-white/25
                   active:scale-95"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="shrink-0">
          <path
            d="M19 12H5m0 0 5-5m-5 5 5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </button>
    </div>
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
  onSearchSubmit,
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
      bg-white/90 dark:bg-slate-950/90 backdrop-blur
        border-r border-slate-200 dark:border-white/10
        flex flex-col
        /* === Tinggi: mobile full-screen (dvh), desktop sisakan tinggi header === */
        min-h-[100dvh] h-[100dvh]
        md:h-[calc(100dvh-var(--topbar-h,56px))]
        md:sticky md:top-[var(--topbar-h,56px)]
        /* === Tempel ke header (hilangkan gap & border atas) === */
        md:-mt-px md:rounded-t-none md:border-t-0
        /* Stabilkan tata letak saat scrollbar muncul */
        [scrollbar-gutter:stable]
        transition-colors duration-300
        rounded-none
      "
    >
      <div className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-white/10">
        <PuskesmasLogo className="size-9" />
        <div className="min-w-0">
          <div className="font-semibold truncate text-slate-900 dark:text-white">Jadwal Layanan</div>
          <div className="text-xs text-slate-500 dark:text-white/45 truncate">{facilityName}</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
  Pencarian
</label>

<div className="relative overflow-visible">
  <input
    ref={searchRef}
    type="text" // ganti dari "search" → hilangkan tombol clear bawaan browser
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter" && query.trim()) {
        onSearchSubmit?.(query.trim());
      }
      if (e.key === "Escape" && query) {
        setQuery("");
        trackEvent("Search", "clear_esc");
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }}
    enterKeyHint="search"
    placeholder="Cari 'umum', 'imunisasi', 'cabut gigi' …"
    className="w-full h-11 rounded-lg bg-white/80 dark:bg-white/5
                      border border-slate-200 dark:border-white/10 focus:border-emerald-500/60
              outline-none pr-10 pl-4 text-sm sm:text-[15px]
              placeholder:text-slate-400 dark:placeholder:text-white/35"
  />

  {query && (
  <button
    type="button"
    onClick={() => {
      setQuery("");
      trackEvent("Search", "clear_click");
      requestAnimationFrame(() => searchRef.current?.focus());
    }}
    aria-label="Hapus kata pencarian"
    className="absolute right-2.5 top-1/2 -translate-y-1/2
               h-6 w-6 rounded-full
               bg-slate-200 text-slate-600
               hover:bg-slate-300 hover:text-slate-900
               dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15 dark:hover:text-white
               active:scale-95 transition-all
               flex items-center justify-center"
  >
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6v8m4-8v8M6 7h12l-1 12H7L6 7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
  )}
</div>
      </div>

      <div
        className="
          px-4 pb-2 space-y-2
          overflow-y-auto overscroll-contain
          [scrollbar-width:thin]
          flex-1
        "
      >
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
          <span>Daftar Poli</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600 dark:bg-white/8 dark:text-white/50">{services.length}</span>
        </div>

        {services.map((s) => {
          const active = expandedId === s.id;
          const hl = highlightIds.includes(s.id);
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
                className={`group w-full text-left px-3.5 py-3 rounded-lg border transition
                ${selected?.id === s.id
                ? "bg-emerald-500/12 border-emerald-500/70 ring-2 ring-emerald-400/30"
                : hl
                ? "bg-emerald-400/10 border-emerald-400/50"
                : "bg-white/75 border-slate-200 dark:bg-white/5 dark:border-white/10"}
                hover:bg-white dark:hover:bg-white/8`}
                >
                <div className="flex items-center gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-base dark:bg-white/8">{s.ikon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-slate-900 dark:text-white">{s.nama}</div>
                    <div className="text-xs text-slate-600 dark:text-white/60 truncate">{s.klaster}</div>
                  </div>
                  <StatusPill open={openPill} rest={rest} soon={soon} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-lg border border-slate-200 bg-white/80 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-white/45">Jadwal</div>

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
  const name = s.nama || "";
  const status = getOpenStatusForPoli(s);
  const serviceCount = (s.layanan || []).length;
  const todaySchedule = s.jadwal ? todayText(s.jadwal) : "Cek jadwal tiap layanan";
  const statusDetail = describeServiceStatus(status, todaySchedule);
  // anggap nama panjang kalau lebih dari 18 karakter
  const isLongName = name.length > 18;
  const nameClass = isLongName
    ? "font-semibold text-[13px] sm:text-[14px] leading-snug"
    : "font-semibold text-sm sm:text-base";

  return (
    <button
      onClick={() => onPick(s)}
      className={`group relative overflow-hidden rounded-lg border
        bg-white shadow-sm shadow-slate-200/60 dark:bg-white/5 dark:shadow-none
        hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:shadow-slate-200/80 dark:hover:bg-white/8
        active:scale-[.99] transition text-left touch-manipulation
        ${floorBorderClass(s.lokasi)}`}
    >
      <div className="absolute left-3 top-3 z-10">
        <StatusPill open={status.open} rest={status.rest} soon={status.soon} />
      </div>
      {/* Gambar: tinggi tetap per breakpoint, gambar tidak dipotong (contain) */}
      <div className="w-full bg-slate-50 dark:bg-slate-900/40 transition-colors duration-300">
        <div className="relative p-2 sm:p-3">
          {/* container tinggi tetap agar desktop tidak mengecil, mobile tidak terpotong */}
          <div className="relative h-40 sm:h-48 md:h-56 lg:h-60 xl:h-64">
            <img
              src={resolveInfografis(s)}
              onError={onInfoError}
              alt={name}
              className="absolute inset-0 w-full h-full object-contain"
              loading="lazy"
            />
            {/* Gradient bawah saja (±40% tinggi) agar teks kontras tanpa menutup gambar */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 sm:h-16 md:h-14 bg-gradient-to-t from-black/45 via-black/12 to-transparent" />
          </div>
        </div>
      </div>

      {/* Teks & ikon: bar bawah dengan latar gelap tipis */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 sm:py-3 bg-black/32 backdrop-blur-[1px]">
        <div className="flex items-center gap-2 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-tight">
          <div className="text-xl shrink-0">{s.ikon}</div>
          {/* Nama poli: tidak di-truncate, font mengecil jika terlalu panjang, boleh 2 baris */}
          <div className={`${nameClass} whitespace-normal break-words`}>
            {name}
          </div>
        </div>
        {/* Klaster: boleh dibatasi maksimal 2 baris agar tidak terlalu tinggi */}
        <div className="text-[11px] sm:text-[12px] opacity-90 line-clamp-2">
          {s.klaster}
        </div>
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 border-t border-white/15 pt-2 text-[11px] text-white/85">
          <span className="text-white/55">Hari ini</span>
          <span className="truncate">{todaySchedule}</span>
          <span className="text-white/55">Status</span>
          <span className="truncate">{statusDetail}</span>
          <span className="text-white/55">Layanan</span>
          <span>{serviceCount}</span>
        </div>
      </div>
    </button>
  );
}

/* SubServiceCard */
function SubServiceCard({ item, onPick, parentJadwal, poliId, facilityId, facilityName }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400";
  const tarifText = `Tarif Umum: ${formatTarifID(item.tarif)}`;

  const jadwalLayanan = item.jadwal || null;
  const serviceStatus = getOpenStatus({ jadwal: jadwalLayanan || parentJadwal });
  const { open, rest, soon } = serviceStatus;
  const today = jadwalLayanan ? todayText(jadwalLayanan) : null;
  const statusDetail = describeServiceStatus(serviceStatus, today || "jadwal default poli");
  const renderCompactSchedule = (jadwal) => {
    if (!jadwal?.weekly && !Object.keys(jadwal || {}).length) return null;
    const eff = getEffectiveJadwal({ jadwal });
    const openDays = Object.entries(eff).filter(([, jam]) => jam && !/tutup/i.test(jam));
    if (!openDays.length) return null;
    return (
      <div className="mt-1 space-y-0.5 text-[12px] sm:text-[13px] text-slate-700 dark:text-white/70">
        {openDays.map(([hari, jam]) => (
          <div key={hari} className="flex justify-between">
            <span className="text-slate-500 dark:text-white/50">{hari}</span>
            <span>{jam}</span>
          </div>
        ))}
     </div>
    );
  };
  const pj = item.penanggungJawab || item.pj || (DOCTORS_BY_POLI && poliId ? DOCTORS_BY_POLI[poliId] : null);

  return (
    <button
      onClick={() => {
        // Hit layanan saat MASUK ke detail
        trackEvent("Navigation", "select_service", `${poliId}#${item?.nama || ""}`);
        gaEvent("select_service", {
          poli_id: poliId,
          service_name: item?.nama,
          facility_id: facilityId,
          facility_name: facilityName,
        });
        onPick(item);
      }}
      className="relative w-full text-left rounded-lg border
      border-slate-200 dark:border-white/10
      bg-white dark:bg-white/5
      hover:bg-white dark:hover:bg-white/8
      ring-0 hover:ring-1 hover:ring-slate-200 dark:hover:ring-white/15
      transition-all shadow-sm shadow-slate-200/50 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/70 dark:shadow-none active:scale-[.99]
      focus:outline-none focus:ring-2 focus:ring-emerald-500 overflow-visible"
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
          <StatusPill open={open} rest={rest} soon={soon} />
        </div>
        <div className="grid gap-1 text-[12px] sm:text-[13px] text-slate-700 dark:text-white/70">
          <div>{tarifText}</div>
          <div>
            <span className="text-slate-500 dark:text-white/50">Status:</span> {statusDetail}
          </div>
        </div>
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
          </div>
        </div>
        {/* NEW: Penanggung jawab (layanan > poli) */}
             {pj && (
             <div className="mt-2 text-[12px] sm:text-[13px] text-slate-600 dark:text-white/60">
                <span className="text-slate-500 dark:text-white/50">Penanggung jawab:</span> {pj}
              </div>
            )}

        {/* ===== Jadwal ringkas dipindah ke BAWAH ikon (full-width) ===== */}
        <div className="mt-2 text-[12px] sm:text-[13px] leading-snug">
          {jadwalLayanan ? (
            <>
              <div className="text-slate-700 dark:text-white/70">
                <span className="text-slate-600 dark:text-white/50">Hari Ini:</span> {today}
              </div>
              <div className="text-slate-700 dark:text-white/70">
                <div className="font-semibold mt-1 text-slate-600 dark:text-white/50">Jadwal Buka</div>
                {renderCompactSchedule(jadwalLayanan)}
              </div>
            </>
          ) : (
            <div className="italic text-slate-600 dark:text-white/60">Ikuti jadwal default poli</div>
          )}
        </div>

        {/* Sign Harus Puasa – tetap mengikuti jadwal */}
        {item?.puasa && (
          <div className="mt-2">
            <PuasaPill />
          </div>
        )}
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
      } catch { /* noop */ }
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
          {step?.description && <p className="text-sm text-slate-700 dark:text-white/70 mt-1">{step.description}</p>}
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

function InstagramEmbedCard({ permalink, title, description, cta = "Buka video edukasi di Instagram" }) {
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    ensureInstagramEmbedScript(() => setScriptReady(true));
  }, [permalink]);

  useEffect(() => {
    if (scriptReady) {
      try {
        window.instgrm?.Embeds?.process?.();
      } catch {
        // Keep the fallback link visible if Instagram cannot process embeds.
      }
    }
  }, [scriptReady]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-4">
      <div className="mb-3">
        <div className="text-sm uppercase tracking-wide text-slate-600 dark:text-white/60">
          Edukasi Video
        </div>
        <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-white/60">
            {description}
          </p>
        )}
      </div>

      <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-950/40 sm:p-2">
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={permalink}
          data-instgrm-version="14"
          style={{
            background: "#fff",
            border: 0,
            borderRadius: 8,
            boxShadow: "none",
            margin: 0,
            maxWidth: 540,
            minWidth: 0,
            padding: 0,
            width: "100%",
          }}
        >
          <div style={{ padding: 16 }}>
            <a
              href={permalink}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-sky-700 hover:bg-slate-50"
            >
              {cta}
            </a>
          </div>
        </blockquote>
      </div>
    </section>
  );
}

function shouldShowSputumEducation(selected, sub) {
  const haystack = `${selected?.id || ""} ${selected?.nama || ""} ${sub?.nama || ""} ${sub?.ket || ""}`.toLowerCase();

  return (
    selected?.id === "pm" ||
    haystack.includes("tb") ||
    haystack.includes("dahak") ||
    haystack.includes("sputum") ||
    haystack.includes("bta")
  );
}

function shouldShowFastingLabEducation(selected, sub) {
  return selected?.id === "laboratorium" && Boolean(sub?.puasa);
}

function shouldShowCompleteUrineEducation(selected, sub) {
  if (selected?.id !== "laboratorium") return false;

  const serviceName = `${sub?.nama || ""} ${sub?.ket || ""}`.toLowerCase();
  return serviceName.includes("urine lengkap") || serviceName.includes("urin lengkap");
}

/* ===================== Right Panel ===================== */
function RightPanel({
  selected,
  setSelected,
  filtered,
  overviewServices,
  subMatches,
  onPickSub,
  jump,
  setJump,
  searchQuery,
  statusFilter,
  setStatusFilter,
  scrollReq,
  onPickPoli,
  facilityId,
  facilityName,
}) {
  const [sub, setSub] = useState(null);
  const [catOpen, setCatOpen] = useState("anak"); // panel kategori yang dibuka (anak/dewasa/lainnya/null)

  // Jika user memilih salah satu layanan (sub), auto scroll ke atas
  useEffect(() => {
    if (sub) {
      scrollToTopSmooth();
    }
  }, [sub]);

  // === Trap tombol Back (satu-trap deterministik) ===
const EXIT_WINDOW_MS = 2000;
const [showBackHint, setShowBackHint] = useState(false);

const backStateRef = useRef({
  seeded: false,
  lock: false,
  exitArmedAt: 0,
  listenersAttached: false,
});

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
  } catch { /* noop */ }
};

useEffect(() => {
  if (typeof window === "undefined") return;

  const S = backStateRef.current;

  const reTrapSync = () => {
    if (typeof window === "undefined") return;
    try {
      // Pasang lagi 1 TRAP sinkron di awal handler agar back cepat tetap tertahan
      history.pushState({ __TRAP: true, t: Date.now() }, "");
    } catch { /* noop */ }
  };

  const handleBack = () => {
    if (S.lock) return;
    S.lock = true;

    // Kunci: pasang lagi TRAP sinkron di awal
    reTrapSync();

    const level = sub ? 2 : selected ? 1 : 0;

    // 1) SUBSERVICE → kembali ke POLI
    if (level === 2) {
      try { if (typeof stopFlowAudio === "function") stopFlowAudio(); } catch { /* noop */ }
      setSub(null);
      S.lock = false;
      return;
    }
    // 2) POLI → kembali ke BERANDA
    if (level === 1) {
      try { if (typeof stopFlowAudio === "function") stopFlowAudio(); } catch { /* noop */ }
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
      try { history.go(-2); } catch { try { history.back(); } catch { /* noop */ } }
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

  const onPageShow = () => {
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
}, [selected, setSelected, sub]);

  // === Dwell-time: lama lihat detail layanan (kirim saat ganti/keluar)
  useEffect(() => {
    if (!sub) return;

    const t0 = performance.now();

    return () => {
      const ms = Math.round(performance.now() - t0);
      // "view_service_ms" sekarang mengirim parameter view_ms (diatur di trackTiming)
      trackTiming("view_service_ms", ms, {
        label: sub.nama,
        poli_id: selected?.id,
        poli_name: selected?.nama,
        service_name: sub.nama,
        facility_id: facilityId,        // 👈 ini kunci: kirim facility
        facility_name: facilityName,    // 👈 nama fasilitas yang dibaca user
      });
    };
  }, [sub, selected, facilityId, facilityName]);
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

  const scenarioKeys = useMemo(() => Object.keys(scenarios), [scenarios]);
  const [scenarioKey, setScenarioKey] = useState(null);
  useEffect(() => {
    setScenarioKey(scenarioKeys[0] ?? null);
  }, [scenarioKeys]);

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
    } catch { /* noop */ }
  }, [scrollReq, selected, sub]);

  if (!selected || showSearchResults) {
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6">
        <ServicesOverview
          facilityName={facilityName}
          services={overviewServices}
          searchQuery={searchQuery}
          subMatchesCount={subMatches?.length ?? 0}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        {!searchQuery?.trim() && (
          <QuickAccessBar services={overviewServices} onPick={onPickPoli} />
        )}
        <AnimatePresence mode="wait">
          <MotionDiv
            key="grid-poli-or-search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {showSearchResults ? (
              <section className="mb-6">
                <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subMatches.map(({ poli, item, index }) => (
                    <SubServiceCard
                      key={poli.id + "#" + index}
                      item={{ ...item, nama: `${item.nama} — ${poli.nama}` }}
                      onPick={() => onPickSub(poli.id, index)}
                      parentJadwal={poli.jadwal}
                      poliId={poli.id}
                      facilityId={facilityId}
                      facilityName={facilityName}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <>
                {filtered.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((s) => (
                      <ServiceCard key={s.id} s={s} onPick={onPickPoli} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-white/60">
                    Tidak ada layanan dengan filter ini.
                  </div>
                )}
              </>
            )}
          </MotionDiv>
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

{(() => {
  const items = Array.isArray(list) ? list : [];
  const norm = (v) => (v || "").toString().trim().toLowerCase();
  const hasKategori = items.some((it) => {
    const k = norm(it.kategori);
    return k === "anak" || k === "dewasa";
  });

  // === Fallback: tidak ada kategori → tampil flat seperti semula
  if (!hasKategori) {
    return (
      <div
        ref={servicesGridRef}
        className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {items.length > 0 ? (
          items.map((it, i) => (
            <SubServiceCard
              key={i}
              item={it}
              onPick={setSub}
              parentJadwal={selected.jadwal}
              poliId={selected.id}
              facilityId={facilityId}
              facilityName={facilityName}
            />
          ))
        ) : (
          <div className="text-slate-600 dark:text-white/60">Belum ada jenis layanan terdaftar.</div>
        )}
      </div>
    );
  }

  // === Ada kategori → tampil accordion per grup
  const anak = items.filter((it) => norm(it.kategori) === "anak");
  const dewasa = items.filter((it) => norm(it.kategori) === "dewasa");
  const lainnya = items.filter((it) => {
    const k = norm(it.kategori);
    return k !== "anak" && k !== "dewasa";
  });

  const Panel = ({ id, title, count, children }) => {
  const open = catOpen === id;
  const onToggle = () => setCatOpen(open ? null : id);
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 dark:bg-white/10 overflow-hidden">
      {/* Header: jelas bisa diklik */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={onKey}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="group w-full px-4 py-3.5 cursor-pointer select-none
                   flex items-center gap-3 justify-between
                   hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-semibold truncate">{title}</span>
          {/* badge jumlah layanan */}
          <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full
                           bg-slate-200/70 text-slate-800 border border-black/10
                           dark:bg-white/10 dark:text-white/80 dark:border-white/15">
            {count}
          </span>
        </div>
        {/* chevron dengan rotasi saat terbuka */}
        <svg
          className={`shrink-0 transition-transform duration-200 opacity-80 group-hover:opacity-100
                      ${open ? "rotate-180" : ""}`}
          width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Body: animasi sederhana agar terasa dropdown */}
      <AnimatePresence initial={false}>
        {open && (
          <MotionDiv
            id={`${id}-panel`}
            key={`${id}-content`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-4 pt-3"
          >
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

  return (
    <div ref={servicesGridRef} className="space-y-3">
      {anak.length > 0 && (
        <Panel id="anak" title="🧒 Layanan Anak-Anak" count={anak.length}>
          {anak.map((it, i) => (
            <SubServiceCard
              key={`anak-${i}`}
              item={it}
              onPick={setSub}
              parentJadwal={selected.jadwal}
              poliId={selected.id}
              facilityId={facilityId}
              facilityName={facilityName}
            />
          ))}
        </Panel>
      )}

      {dewasa.length > 0 && (
        <Panel id="dewasa" title="👨‍🦰 Layanan Dewasa" count={dewasa.length}>
          {dewasa.map((it, i) => (
            <SubServiceCard
              key={`dewasa-${i}`}
              item={it}
              onPick={setSub}
              parentJadwal={selected.jadwal}
              poliId={selected.id}
              facilityId={facilityId}
              facilityName={facilityName}
            />
          ))}
        </Panel>
      )}

      {lainnya.length > 0 && (
        <Panel id="lainnya" title="Umum" count={lainnya.length}>
          {lainnya.map((it, i) => (
            <SubServiceCard
              key={`lain-${i}`}
              item={it}
              onPick={setSub}
              parentJadwal={selected.jadwal}
              poliId={selected.id}
              facilityId={facilityId}
              facilityName={facilityName}
            />
          ))}
        </Panel>
      )}
    </div>
  );
})()}
      </div>
    );
  }

  const detailStatus = getOpenStatus({ jadwal: sub.jadwal || selected.jadwal });
  const detailScheduleToday = todayText(sub.jadwal || selected.jadwal || {});
  const detailStatusText = describeServiceStatus(detailStatus, detailScheduleToday);
  const detailBpjsText = sub.bpjs ? "BPJS tercakup" : "BPJS tidak tercakup";
  const detailLocation = selected.lokasi || selected.klaster || "-";

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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                open={detailStatus.open}
                rest={detailStatus.rest}
                soon={detailStatus.soon}
              />
              {sub?.puasa && <PuasaPill />}
            </div>
            <div className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
              {detailStatusText}
            </div>
            {sub.ket && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                {sub.ket}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-[20rem]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[11px] uppercase text-slate-500 dark:text-white/45">Tarif</div>
              <div className="mt-1 font-semibold text-slate-950 dark:text-white">{formatTarifID(sub.tarif)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[11px] uppercase text-slate-500 dark:text-white/45">BPJS</div>
              <div className={`mt-1 font-semibold ${sub.bpjs ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                {detailBpjsText}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[11px] uppercase text-slate-500 dark:text-white/45">Lokasi</div>
              <div className="mt-1 font-semibold text-slate-950 dark:text-white">{detailLocation}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-[11px] uppercase text-slate-500 dark:text-white/45">Hari ini</div>
              <div className="mt-1 font-semibold text-slate-950 dark:text-white">{detailScheduleToday}</div>
            </div>
          </div>
        </div>
      </section>

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

      {shouldShowSputumEducation(selected, sub) && (
        <div className="mt-4 sm:mt-6">
          <InstagramEmbedCard
            permalink={SPUTUM_COLLECTION_REEL_URL}
            title="Cara Mengeluarkan Dahak untuk Pemeriksaan"
            description="Tonton edukasi singkat dari Puskesmas Jagakarsa sebelum pengambilan atau pengumpulan sampel dahak."
            cta="Buka video edukasi dahak di Instagram"
          />
        </div>
      )}

      {shouldShowFastingLabEducation(selected, sub) && (
        <div className="mt-4 sm:mt-6">
          <InstagramEmbedCard
            permalink={FASTING_LAB_REEL_URL}
            title="Persiapan Puasa Sebelum Pemeriksaan Laboratorium"
            description="Tonton edukasi singkat dari Puskesmas Jagakarsa untuk layanan laboratorium yang mewajibkan puasa."
            cta="Buka video edukasi puasa di Instagram"
          />
        </div>
      )}

      {shouldShowCompleteUrineEducation(selected, sub) && (
        <div className="mt-4 sm:mt-6">
          <InstagramEmbedCard
            permalink={COMPLETE_URINE_TEST_REEL_URL}
            title="Persiapan Pemeriksaan Urine Lengkap"
            description="Tonton edukasi singkat dari Puskesmas Jagakarsa sebelum melakukan pemeriksaan urine lengkap."
            cta="Buka video edukasi pemeriksaan urine di Instagram"
          />
        </div>
      )}

         {/* Kalender Jadwal Konseling Psikologi – fitur khusus poli Konseling Psikologi */}
      {selected?.id === "konseling_psikologi" && (
        <div className="mt-4 sm:mt-6">
          <PsychologySchedule />
        </div>
      )}

      <div className="mt-4 sm:mt-6">
  <InfoCard title="Petugas Penanggung Jawab">
    {(() => {
      // === 1) Resolve Penanggung Jawab: layanan > poli
      const pjResolved =
        sub?.penanggungJawab ||
        sub?.pj ||
        (DOCTORS_BY_POLI?.[selected.id] ?? null);

      // === 2) Resolve Extra Info: layanan > EXTRA_INFO
      //    Mendukung: sub.extraInfo (string/array/obj), sub.info (legacy),
      //    dan kunci khusus sub.extraKey; jika tidak ada → cari di EXTRA_INFO.
      const pickExtra = () => {
        if (sub?.extraInfo !== undefined) return sub.extraInfo;
        if (sub?.info !== undefined) return sub.info; // legacy
        const key = sub?.extraKey || sub?.nama;
        const tryKeys = [
          key,
          selected?.nama,
          selected?.id,
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

      return (
        <>
          <div className="font-semibold text-slate-900 dark:text-white mb-1">
            {pjResolved ?? "—"}
          </div>
          <div className="text-slate-700 dark:text-white/70">
            <p className="mb-2">
              <strong>Detail layanan:</strong> {sub.nama}
            </p>
            {!extra ? (
              <>
                <p>Informasi tambahan belum tersedia. Silakan lengkapi sesuai ketentuan layanan.</p>
                <p className="mt-2">
                  Informasi ini bersifat contoh/dummy. Silakan ganti dengan persyaratan atau
                  instruksi khusus untuk layanan <em>{sub.nama}</em>.
                </p>
              </>
            ) : typeof extra === "string" ? (
              <p>{linkify(extra)}</p>
            ) : Array.isArray(extra) ? (
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
            ) : (
              // object: { text?, images? }
              (() => {
                const { text, images } = extra || {};
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
              })()
            )}
          </div>
        </>
      );
    })()}
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

/* ===================== App Root ===================== */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [facility, setFacility] = useState("pkm-jagakarsa");
  const [navOpen, setNavOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [scrollReq, setScrollReq] = useState(null); // { poliId, ts }
  const [jump, setJump] = useState(null);
  const lastQueryRef = useRef(null);
  const searchStartRef = useRef(0);
  const onSearchSubmit = (q) => {
  trackEvent("Search", "submit", q);                 // legacy (laporan lama tetap jalan)
  lastQueryRef.current = q;                          // simpan query terakhir
  searchStartRef.current = performance.now();        // start timer TTFI
  gaEvent("search_query", { query: q });             // GA4 native
};
// === Handler pilih POLI (klik kartu poli) ===
const onPickPoli = (s) => {
  const poliName = s.nama || s.label || s.title || "(tanpa nama)";

  // Legacy (Universal)
  trackEvent("Navigation", "select_poli", poliName);

  // GA4 – tambahkan facility
  gaEvent("select_poli", {
    poli_id: s.id ?? "unknown_id",
    poli_name: poliName,
    facility_id: facility,
    facility_name: facilityName,
  });

  if (lastQueryRef.current && searchStartRef.current > 0) {
    const ms = Math.round(performance.now() - searchStartRef.current);
    gaEvent("time_to_find_ms", {
      query: lastQueryRef.current,
      ms,
      poli_id: s.id,
      poli_name: s.nama,
      facility_id: facility,
      facility_name: facilityName,
    });
    lastQueryRef.current = null;
    searchStartRef.current = 0;
  }

  setSelected(s);
  scrollToTopSmooth();
};

  const SERVICES_CURRENT = useMemo(
    () => SERVICES_BY_FACILITY[facility] || [],
    [facility]
  );
  const facilityName = FACILITIES.find((f) => f.id === facility)?.name || "-";
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
      } catch { /* noop */ }
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
    } catch { /* noop */ }
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      try { ro && ro.disconnect && ro.disconnect(); } catch { /* noop */ }
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  // Register service worker (offline cache ringan)
useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(asset("sw.js")).catch(() => {
      // Offline cache is optional.
    });
  }
}, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      setSelected(null);
      stopFlowAudio();
    }
  }, [query]);

  const filteredByQuery = useMemo(() => {
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

  const filtered = useMemo(() => {
    if (statusFilter === "all") return filteredByQuery;
    return filteredByQuery.filter((service) => getPoliStatusKey(service) === statusFilter);
  }, [filteredByQuery, statusFilter]);

  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    filteredByQuery.forEach((p) => {
      if (statusFilter !== "all" && getPoliStatusKey(p) !== statusFilter) return;
      (p.layanan || []).forEach((item, idx) => {
        const hay = `${(item.nama || "").toLowerCase()} ${(item.ket || "").toLowerCase()}`;
        if (hay.includes(q)) rows.push({ poli: p, item, index: idx });
      });
    });
    return rows;
  }, [query, filteredByQuery, statusFilter]);

  const matchPoliIds = useMemo(
    () => Array.from(new Set(subResults.map((r) => r.poli.id))),
    [subResults]
  );
  const sidebarList = useMemo(
    () =>
      filtered.length === 0 && query && subResults.length > 0
        ? SERVICES_CURRENT.filter((service) =>
            statusFilter === "all" ? true : getPoliStatusKey(service) === statusFilter
          )
        : filtered,
    [filtered, query, subResults, SERVICES_CURRENT, statusFilter]
  );

  function handlePickSub(poliId, idx) {
  const p = SERVICES_CURRENT.find((x) => x.id === poliId);
  if (!p) return;
  const svc = p.layanan?.[idx];

  setQuery("");
  setSelected(p);
  setJump({ poliId, idx });
  setNavOpen(false);

  trackEvent("Navigation", "select_service", `${poliId}#${idx}`);

  const baseParams = {
    poli_id: p.id,
    poli_name: p.nama,
    service_name: svc?.nama,
    facility_id: facility,
    facility_name: facilityName,
  };

  gaEvent("select_service", baseParams);

  if (lastQueryRef.current) {
    gaEvent("search_result_click", {
      query: lastQueryRef.current,
      ...baseParams,
    });

    if (searchStartRef.current) {
      const ms = Math.round(performance.now() - searchStartRef.current);
      gaEvent("search_ttfi_ms", {
        query: lastQueryRef.current,
        ...baseParams,
        value: ms,
      });
    }
    searchStartRef.current = 0;
  }

  scrollToTopSmooth();
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
    <>
    <div className="
          min-h-screen
          text-slate-900 dark:text-white
          bg-slate-50
          dark:bg-slate-950
          transition-colors duration-300
        "
      >
        <header
  ref={headerRef}
  className="
    sticky top-0 z-30 backdrop-blur
    bg-white/90 text-inherit shadow-sm shadow-slate-200/50
    dark:bg-slate-950/90
    border-b border-black/10 dark:border-white/10
    transition-colors duration-300
  "
>
  {/* === MOBILE: 2 baris === */}
  <div className="md:hidden max-w-7xl mx-auto px-3 sm:px-4 py-2 space-y-2">
    {/* Baris 1: Ikon + Judul full */}
    <div className="flex items-center gap-2">
      <PuskesmasLogo className="size-9" />
      <div className="leading-tight">
        <div className="text-[11px] font-medium opacity-90">INFORMASI LAYANAN</div>
        <div className="text-[14px] font-semibold">PUSKESMAS JAGAKARSA</div>
      </div>
    </div>

    {/* Baris 2: Burger + Select (w-full) */}
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <button
        className="inline-grid place-items-center size-11 rounded-lg border border-black/10 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        aria-label="Buka menu"
        onClick={() => { setNavOpen(true); trackEvent('Drawer','open'); }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="relative">
        <select
  value={facility}
  onChange={(e) => {
    const v = e.target.value;
    setFacility(v);
    trackEvent('Facility','change', v);

    const fac = FACILITIES.find((f) => f.id === v);
    gaEvent("change_facility", {
      facility_id: v,
      facility_name: fac?.name ?? "(unknown)",
    });
  }}
  className="w-full h-11 rounded-xl pl-3 pr-8 text-[14px] outline-none
             bg-white text-slate-900 border border-black/10
             dark:bg-slate-800 dark:text-white dark:border-white/10
             focus:ring-2 focus:ring-emerald-500 appearance-none"
>
  {FACILITIES.map((f) => (
    <option key={f.id} value={f.id}>{f.name}</option>
  ))}
</select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/70">▾</span>
      </div>
      <ThemeToggle className="px-2.5" />
    </div>
  </div>

  {/* === DESKTOP: 1 baris (ikon + judul + Fasilitas + select) === */}
  <div className="hidden md:flex max-w-7xl mx-auto px-6 py-3 items-center gap-4">
    <PuskesmasLogo className="size-10" />

    <div>
      <div className="text-base font-semibold whitespace-nowrap text-slate-950 dark:text-white">
        Informasi Layanan Puskesmas Jagakarsa
      </div>
      <div className="text-xs text-slate-500 dark:text-white/45">
        Direktori jadwal, alur, dan informasi poli
      </div>
    </div>

    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-slate-700 dark:text-white/70">Fasilitas:</span>
      <div className="relative">
        <select
  value={facility}
  onChange={(e) => {
    const v = e.target.value;
    setFacility(v);
    trackEvent('Facility','change', v);

    const fac = FACILITIES.find((f) => f.id === v);
    gaEvent("change_facility", {
      facility_id: v,
      facility_name: fac?.name ?? "(unknown)",
    });
  }}
  className="h-10 rounded-lg pl-3 pr-8 text-[14px] outline-none
             bg-white text-slate-900 border border-black/10
             dark:bg-slate-800 dark:text-white dark:border-white/10
             focus:ring-2 focus:ring-emerald-500 appearance-none
             w-[320px] max-w-[40vw]"
>
  {FACILITIES.map((f) => (
    <option key={f.id} value={f.id}>{f.name}</option>
  ))}
</select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">▾</span>
      </div>
      <ThemeToggle />
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
            onTouchEnd={() => { onDrawerTouchEnd(); trackEvent("Drawer","close","swipe"); }}
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
              onSearchSubmit={onSearchSubmit}
            />
          </div>

          <RightPanel
            selected={selected}
            setSelected={setSelected}
            filtered={filtered}
            overviewServices={filteredByQuery}
            subMatches={subResults}
            onPickSub={handlePickSub}
            jump={jump}
            setJump={setJump}
            searchQuery={query}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            scrollReq={scrollReq}
            onPickPoli={onPickPoli}
            facilityId={facility}          
            facilityName={facilityName}
          />
        </div>

        <SurveyPopup
          formUrl="https://forms.gle/72k85XkYQTQZRfq38"
          delayMs={60000}
          cooldownDays={7}
        />

        <footer className="mt-8 border-t border-white/10">
  <div className="max-w-7xl mx-auto px-4 py-6 grid gap-6
                          md:grid-cols-[minmax(0,1fr)_18rem]
                          lg:grid-cols-[minmax(0,720px)_20rem] items-start">
    <div className="w-full rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10
                            aspect-[16/10] md:aspect-auto md:h-72 lg:h-80 xl:h-96">
      <iframe
        title="Lokasi fasilitas"
        loading="lazy"
        src={mapEmbedSrc(facility)}
        className="w-full h-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>

    <div className="text-sm text-slate-700 dark:text-white/70 space-y-3">
      <div className="font-semibold text-slate-900 dark:text-white">
        Lokasi: {facilityName}
      </div>
      <a
        href={reviewLink(facility)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          gaEvent("click_review", { facility_id: facility, facility_name: facilityName })
        }
        className="inline-flex items-center justify-center rounded-xl px-4 py-2
                   bg-emerald-600 text-white hover:bg-emerald-700
                   border border-emerald-500/40 shadow-sm"
      >
        ⭐ Review us on Google
      </a>
      <div className="text-xs text-slate-500 dark:text-white/50">
        © {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.
      </div>
    </div>
  </div>
</footer>
      </div>
      </>
  );
}
