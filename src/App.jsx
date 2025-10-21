// src/App.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import ThemeToggle from "./components/ThemeToggle.jsx";
import SurveyPopup from "./components/SurveyPopup.jsx";

// === Import data ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS,
} from "./data/services";

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

// --- Auto-link URL di dalam teks ---
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

/* ===================== Jadwal helpers (mendukung overnight) ===================== */
// Hari ID
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
  // overnight dari kemarin → awal hari ini
  yRanges.forEach(({ from, to }) => {
    if (to < from) out.push({ from: 0, to });
  });
  // hari ini (termasuk overnight ke besok)
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
  for (const r of ranges) {
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
  const minutesUntilChange = nextChange != null ? nextChange - now : null;
  return { open, minutesUntilChange };
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

/* ===== Jadwal aggregator untuk Sidebar ===== */
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

/* ====== Ringkasan jadwal (kartu layanan) ====== */
const TODAY = () => DAY_NAMES_ID[new Date().getDay()];
function summarizeWeekly(jadwalLike) {
  const eff = getEffectiveJadwal({ jadwal: jadwalLike });
  const short = (d) => d.slice(0, 3);
  const openEntries = DAY_NAMES_ID
    .map((d) => [d, eff[d]])
    .filter(([, val]) => val && !/^\s*Tutup\s*$/i.test(val));
  if (openEntries.length === 0) return "Tidak melayani rutin";

  const groups = [];
  let cur = null;
  openEntries.forEach(([d, val]) => {
    if (!cur || cur.val !== val) {
      cur && groups.push(cur);
      cur = { from: d, to: d, val };
    } else {
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
function Pill({ children, tone = "emerald" }) {
  const tones = {
    emerald:
      "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/30",
    sky:
      "bg-sky-500/15 text-sky-700 ring-1 ring-sky-600/20 dark:text-sky-300 dark:ring-sky-400/30",
    slate:
      "bg-slate-200/70 text-slate-800 ring-1 ring-black/10 dark:bg-white/8 dark:text-white/80 dark:ring-white/12",
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
    const a = Number(t.min),
      b = Number(t.max);
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
const StatusPill = ({ open }) => (
  <span
    className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${
      open
        ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-700 dark:text-emerald-300"
        : "bg-rose-500/10 border-rose-400/30 text-rose-700 dark:text-rose-300"
    }`}
  >
    {open ? "Buka" : "Tutup"}
  </span>
);

/* ===================== Sidebar (poli + jadwal ringkas) ===================== */
function Sidebar({
  facilityName,
  query,
  setQuery,
  filters,
  setFilters,
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

  return (
    <aside
      className="
        w-full md:w-80 shrink-0
        bg-white/70 dark:bg-slate-950/70 backdrop-blur
        border-r border-black/5 dark:border-white/10
        flex flex-col
        h-full md:h-[calc(100svh-56px)]
        transition-colors duration-300
      "
      aria-label="Navigasi poli dan pencarian"
    >
      <div className="p-4 flex items-center gap-2 border-b border-black/5 dark:border-white/10">
        <div aria-hidden className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <h2 className="font-semibold truncate text-slate-900 dark:text-white">
          Jadwal & Tarif
        </h2>
      </div>

      <div className="px-4 pt-3 text-xs text-slate-700 dark:text-white/70">
        Fasilitas:{" "}
        <span className="text-slate-900 font-medium dark:text-white">{facilityName}</span>
      </div>

      <div className="p-4 space-y-3">
        <label htmlFor="search" className="text-xs uppercase text-slate-600 dark:text-white/50">
          Pencarian
        </label>
        <input
          id="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full h-11 px-3 rounded-xl
          bg-white text-slate-900 border border-black/10
          dark:bg-white/5 dark:text-white dark:border-white/10
          outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]"
          aria-label="Cari layanan atau nama poli"
        />

        {/* Filters */}
        <fieldset className="space-y-2" aria-label="Filter layanan">
          <legend className="text-xs uppercase text-slate-600 dark:text-white/50">Filter</legend>

          <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/80">
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={filters.openNow}
              onChange={(e) => setFilters((f) => ({ ...f, openNow: e.target.checked }))}
            />
            <span>Buka sekarang</span>
          </label>

          <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/80">
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={filters.bpjs}
              onChange={(e) => setFilters((f) => ({ ...f, bpjs: e.target.checked }))}
            />
            <span>BPJS Tercakup</span>
          </label>

          <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/80">
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={filters.telemed}
              onChange={(e) => setFilters((f) => ({ ...f, telemed: e.target.checked }))}
            />
            <span>Telemed</span>
          </label>
        </fieldset>
      </div>

      <div
        className="
          px-4 pb-2 space-y-2
          overflow-y-auto overscroll-contain
          [scrollbar-width:thin]
          md:max-h-[28rem]
          flex-1
        "
        role="list"
        aria-label="Daftar poli"
      >
        <div className="text-xs uppercase text-slate-600 dark:text-white/50 mb-2">Daftar Poli</div>

        {services.map((s) => {
          const active = expandedId === s.id;
          const hl = highlightIds.includes(s.id);
          const open = poliOpenAny(s);

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
            <div key={s.id} className="space-y-2" role="listitem">
              <button
                onClick={() => toggle(s)}
                className={`group w-full text-left p-3 rounded-xl border transition
                ${
                  selected?.id === s.id
                    ? "bg-emerald-500/10 border-emerald-500/60"
                    : hl
                    ? "bg-emerald-400/10 border-emerald-400/50"
                    : "bg-slate-100/70 border-black/10 dark:bg-white/5 dark:border-white/10"
                }
                hover:bg-slate-200/80 dark:hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                aria-expanded={active}
                aria-controls={`sched-${s.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg" aria-hidden>
                    {s.ikon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-slate-900 dark:text-white">
                      {s.nama}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-white/60 truncate">
                      {s.klaster}
                    </div>
                  </div>
                  <StatusPill open={open} />
                </div>
              </button>

              {active && (
                <div
                  id={`sched-${s.id}`}
                  className="mx-2 mb-2 rounded-xl border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 p-3 text-sm"
                >
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

                  {/* 2) Semua sama → tabel ringkas */}
                  {uniqueSchedules.length === 1 &&
                    uniqueSchedules[0].length > 0 &&
                    !singleServiceSchedule && (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-slate-800 dark:text-white/70">
                        {DAY_NAMES_ID.map((d) => (
                          <React.Fragment key={d}>
                            <span className="text-slate-500 dark:text-white/50">{d}</span>
                            <span>
                              {getEffectiveJadwal({
                                jadwal: uniqueSchedules[0][0].jadwal,
                              })[d]}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                  {/* 3) Poli dengan satu layanan yang punya jadwal khusus → tabel layanan itu */}
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

                  {/* 4) Banyak layanan dengan jadwal berbeda → notice; klik = scroll ke daftar layanan */}
                  {uniqueSchedules.length > 1 && !singleServiceSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        onPick(s);
                        onScrollToServices?.(s.id);
                      }}
                      className="w-full text-left text-[12px] text-amber-700 hover:text-amber-600 underline underline-offset-2 dark:text-amber-300 dark:hover:text-amber-200"
                      aria-label={`Jadwal beragam untuk ${s.nama}. Klik untuk menuju daftar layanan.`}
                    >
                      Jadwal beragam — <span className="font-semibold">cek tiap layanan</span>
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
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border
      border-black/10 dark:border-white/10
      bg-slate-100/70 dark:bg-white/5
      hover:bg-slate-200/80 dark:hover:bg-white/10
      active:scale-[.98] transition text-left touch-manipulation
      focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Buka detail ${s.nama}`}
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
          <div className="text-xl" aria-hidden>
            {s.ikon}
          </div>
          <div className="font-semibold truncate text-slate-900 dark:text-white">{s.nama}</div>
        </div>
        <div className="text-xs text-slate-600 mt-1 truncate dark:text-white/60">{s.klaster}</div>
      </div>
    </button>
  );
}

function SubServiceCard({ item, onPick, parentJadwal }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-rose-700 dark:text-rose-400";
  const tarifText = `Tarif Umum: ${formatTarifID(item.tarif)}`;

  const jadwalLayanan = item.jadwal || null;
  const open = isOpenNow({ jadwal: jadwalLayanan || parentJadwal });
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
      focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Buka detail layanan ${item.nama}`}
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
          <span className="ml-auto">
            <StatusPill open={open} />
          </span>
        </div>
        <div className="text-[12px] sm:text-[13px] text-slate-700 dark:text-white/70">
          {tarifText}
        </div>
        <div className="h-px bg-black/10 dark:bg-white/10" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl sm:text-2xl shrink-0" aria-hidden>
            {item.ikon ?? "🧩"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] sm:text-[16px] leading-snug text-slate-900 dark:text-white">
              {item.nama}
            </div>
            {item.ket && (
              <p className="text-[13px] sm:text-sm text-slate-600 dark:text-white/70 mt-1 line-clamp-3">
                {item.ket}
              </p>
            )}
            {/* Jadwal ringkas per layanan */}
            <div className="mt-2 text-[12px] sm:text-[13px] leading-snug">
              {jadwalLayanan ? (
                <>
                  <div className="text-slate-700 dark:text-white/70">
                    <span className="text-slate-600 dark:text-white/50">Hari Ini:</span> {today}
                  </div>
                  <div className="break-words text-slate-700 dark:text-white/70">
                    <span className="text-slate-600 dark:text-white/50">Jadwal Buka:</span>{" "}
                    {weekly}
                  </div>
                </>
              ) : (
                <div className="italic text-slate-600 dark:text-white/60">
                  Ikuti jadwal default poli
                </div>
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
      return;
    }
    try {
      player.pause();
      player.currentTime = 0;
      if (window.__flowAudioKey !== key || player.src !== new URL(url, location.href).href)
        player.src = url;
      window.__flowAudioKey = key;
      player.play().catch(() => {});
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
      title="Ketuk untuk memutar narasi. Ketuk dua kali untuk mengulang cepat."
    >
      <div className="px-3 pt-2 text-[11px] text-slate-600 dark:text-white/50">
        Langkah {index + 1}
      </div>
      <div className="p-2 sm:p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowError}
            alt={step?.name || `Langkah ${index + 1}`}
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
            loading="lazy"
          />
        ) : (
          <img
            src={FLOW_FALLBACK}
            alt="Gambar alur tidak ditemukan"
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
            loading="lazy"
          />
        )}
      </div>
      {step?.name && (
        <div className="px-3 pb-2 text-[12px] text-slate-800 dark:text-white/80">
          {step.name}
        </div>
      )}
    </button>
  );
}

/* ===================== EXTRA INFO ===================== */
function ExtraInfoSection({ title }) {
  const info = EXTRA_INFO?.[title];
  if (!info) return null;

  const render = (node, idx) => {
    if (!node) return null;
    if (typeof node === "string") return <p key={idx}>{linkify(node)}</p>;
    if (Array.isArray(node)) return node.map((n, i) => render(n, `${idx}-${i}`));
    if (typeof node === "object" && (node.img || node.images || node.text)) {
      if (node.text || node.images) {
        return (
          <div key={idx} className="space-y-2">
            {node.text && <p>{linkify(node.text)}</p>}
            {Array.isArray(node.images) &&
              node.images.map((im, i) => (
                <img
                  key={i}
                  src={resolveFlowImg(im)}
                  alt={node.alt || `info-${i}`}
                  className="block w-full rounded-xl border border-black/10 dark:border-white/10 object-contain"
                  loading="lazy"
                />
              ))}
          </div>
        );
      }
      if (node.img) {
        const src = /^https?:\/\//.test(node.img) ? node.img : asset(node.img.replace(/^\//, ""));
        return (
          <img
            key={idx}
            src={src}
            alt={node.alt || "informasi tambahan"}
            className="block w-full rounded-xl border border-black/10 dark:border-white/10 object-contain"
            loading="lazy"
          />
        );
      }
    }
    return null;
  };

  return (
    <section aria-labelledby="extra-info-title" className="space-y-2">
      <h3 id="extra-info-title" className="font-semibold text-slate-900 dark:text-white">
        Informasi Tambahan
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none">{render(info, 0)}</div>
    </section>
  );
}

/* ===================== Detail Panel ===================== */
function DetailPanel({ poli, layanan, onBack }) {
  const refTop = useRef(null);
  useEffect(() => {
    refTop.current?.focus?.();
  }, [poli?.id, layanan?.nama]);

  const dokter = DOCTORS_BY_POLI?.[poli?.id] || null;

  // Konstruksi array langkah (mendukung bentuk array langsung atau mapping)
  function stepsFor(l) {
    if (!l?.alur) return [];
    const ids = Array.isArray(l.alur) ? l.alur : Object.values(l.alur || {}).flat();
    return ids.map((id) => FLOW_STEPS?.[id]).filter(Boolean);
  }
  const steps = stepsFor(layanan);

  return (
    <section
      aria-label={`Detail layanan ${layanan?.nama}`}
      className="space-y-4"
      tabIndex={-1}
      ref={refTop}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
            {layanan?.nama}
          </h2>
          <p className="text-sm text-slate-600 dark:text-white/60">
            {poli?.nama} • {poli?.lokasi || "Lokasi tidak tersedia"}
          </p>
        </div>
        <button
          onClick={() => {
            stopFlowAudio();
            onBack?.();
          }}
          className="h-10 px-3 rounded-lg border border-black/10 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Kembali ke daftar layanan"
        >
          ← Kembali
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Kolom kiri: alur */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="font-semibold text-slate-900 dark:text-white">Alur Layanan</h3>
          {steps.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-white/60">
              Alur belum ditambahkan.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {steps.map((st, i) => (
                <FlowCard key={st.id ?? i} step={st} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Kolom kanan: info, tarif, petugas */}
        <aside className="lg:col-span-2 space-y-4">
          <section aria-labelledby="tarif-status">
            <h3 id="tarif-status" className="font-semibold text-slate-900 dark:text-white">
              Ringkasan
            </h3>
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 bg-slate-100/70 dark:bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-white/60">Tarif:</span>
                <PricePill tarif={layanan?.tarif} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-white/60">BPJS:</span>
                <Pill tone={layanan?.bpjs ? "emerald" : "slate"}>
                  {layanan?.bpjs ? "Tercakup" : "Tidak Tercakup"}
                </Pill>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-white/60">Status:</span>
                <StatusPill open={isOpenNow({ jadwal: layanan?.jadwal || poli?.jadwal })} />
              </div>
              {layanan?.jadwal ? (
                <div className="text-sm text-slate-700 dark:text-white/70">
                  <div>
                    <span className="text-slate-600 dark:text-white/50">Hari Ini:</span>{" "}
                    {todayText(layanan.jadwal)}
                  </div>
                  <div className="break-words">
                    <span className="text-slate-600 dark:text-white/50">Jadwal Buka:</span>{" "}
                    {summarizeWeekly(layanan.jadwal)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-white/60 italic">
                  Ikuti jadwal default poli
                </div>
              )}
            </div>
          </section>

          {dokter && (
            <section aria-labelledby="petugas-title">
              <h3 id="petugas-title" className="font-semibold text-slate-900 dark:text-white">
                Petugas/Penanggung Jawab
              </h3>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 bg-slate-100/70 dark:bg-white/5">
                <p className="text-sm text-slate-800 dark:text-white/80">{dokter}</p>
              </div>
            </section>
          )}

          <ExtraInfoSection title={layanan?.nama} />
        </aside>
      </div>
    </section>
  );
}

/* ===================== App ===================== */
export default function App() {
  const [facilityId] = useState(FACILITIES?.[0]?.id || "");
  const facilityName = FACILITIES?.find((f) => f.id === facilityId)?.name || "—";
  const allPoli = SERVICES_BY_FACILITY?.[facilityId] || [];

  // Search & filters
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ openNow: false, bpjs: false, telemed: false });

  // Selection state
  const [selectedPoli, setSelectedPoli] = useState(allPoli?.[0] || null);
  const [selectedLayanan, setSelectedLayanan] = useState(null);

  // Scroll anchor untuk "cek tiap layanan"
  const servicesRef = useRef(null);
  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Terapkan filter Telemed (poli-level), Buka Sekarang (layanan/poli), BPJS (layanan)
  const filteredPoli = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchScore = (poli) => {
      let score = 0;
      if (!q) return 0;
      // Prioritaskan kecocokan nama layanan
      for (const l of poli.layanan || []) {
        if (l.nama?.toLowerCase().includes(q)) score += 4;
      }
      // Kemudian nama poli
      if (poli.nama?.toLowerCase().includes(q)) score += 2;
      return score;
    };

    const result = allPoli
      .filter((p) => (filters.telemed ? !!p.telemed : true))
      .map((p) => ({ ...p, __score: matchScore(p) }));

    // Jika filter Open Now → minimal ada salah satu jadwal yang sedang buka (poli or layanan)
    const withOpen = filters.openNow
      ? result.filter((p) => {
          if (p?.layanan?.length) {
            return p.layanan.some((l) => isOpenNow({ jadwal: l.jadwal || p.jadwal }));
          }
          return isOpenNow({ jadwal: p.jadwal });
        })
      : result;

    // Filter BPJS → setidaknya ada satu layanan yang bpjs === true
    const withBpjs = filters.bpjs
      ? withOpen.filter((p) => (p.layanan || []).some((l) => l.bpjs))
      : withOpen;

    // Pencarian: jika ada query, tetap tampilkan poli yang relevan
    const finalList =
      q.length > 0
        ? withBpjs
            .filter((p) => p.__score > 0)
            .sort((a, b) => b.__score - a.__score || a.nama.localeCompare(b.nama))
        : withBpjs.sort((a, b) => a.nama.localeCompare(b.nama));

    return finalList;
  }, [allPoli, query, filters]);

  // Highlight poli yang cocok langsung dengan search
  const highlightIds = useMemo(() => filteredPoli.slice(0, 3).map((p) => p.id), [filteredPoli]);

  // Jika selectedPoli tidak ada di filteredPoli (karena filter berubah), pilih yang pertama
  useEffect(() => {
    if (!selectedPoli || !filteredPoli.find((p) => p.id === selectedPoli.id)) {
      setSelectedPoli(filteredPoli[0] || null);
      setSelectedLayanan(null);
    }
  }, [filteredPoli, selectedPoli?.id]);

  // Daftar layanan untuk panel kanan (setelah pilih poli)
  const layananList = useMemo(() => {
    if (!selectedPoli) return [];
    // Terapkan filter BPJS & Open Now ke level layanan
    return (selectedPoli.layanan || []).filter((l) => {
      const passBpjs = filters.bpjs ? !!l.bpjs : true;
      const passOpen = filters.openNow ? isOpenNow({ jadwal: l.jadwal || selectedPoli.jadwal }) : true;
      return passBpjs && passOpen;
    });
  }, [selectedPoli, filters]);

  // Aksesibilitas: hentikan audio saat meninggalkan detail
  useEffect(() => () => stopFlowAudio(), []);

  return (
    <div className="min-h-[100svh] bg-white text-slate-900 dark:bg-slate-950 dark:text-white transition-colors">
      {/* Header */}
      <header
        className="h-14 border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm sticky top-0 z-30"
        role="banner"
      >
        <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-xl">🩺</span>
            <h1 className="text-base sm:text-lg font-semibold truncate">
              Informasi Layanan Puskesmas Jagakarsa
            </h1>
          </div>
          <nav aria-label="Toolbar" className="flex items-center gap-2">
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-7xl px-4 py-4 grid md:grid-cols-[20rem,1fr] gap-4">
        <Sidebar
          facilityName={facilityName}
          query={query}
          setQuery={setQuery}
          filters={filters}
          setFilters={setFilters}
          services={filteredPoli}
          onPick={(p) => {
            setSelectedPoli(p);
            setSelectedLayanan(null);
          }}
          selected={selectedPoli}
          onScrollToServices={scrollToServices}
          highlightIds={highlightIds}
        />

        {/* Panel kanan */}
        <section aria-label="Konten utama" className="space-y-4">
          {/* Infografis Poli */}
          {selectedPoli && !selectedLayanan && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden bg-slate-100/70 dark:bg-white/5">
              <div className="grid md:grid-cols-[1fr,1fr] gap-0">
                <div className="p-4 order-2 md:order-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                    {selectedPoli.nama}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-white/60">
                    {selectedPoli.klaster} • {selectedPoli.lokasi || "Lokasi tidak tersedia"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPoli.telemed && <Pill>Telemed</Pill>}
                    <Pill tone={poliOpenAny(selectedPoli) ? "emerald" : "slate"}>
                      {poliOpenAny(selectedPoli) ? "Sedang buka" : "Sedang tutup"}
                    </Pill>
                  </div>
                </div>
                <div className="order-1 md:order-2 bg-slate-200/70 dark:bg-slate-900/40 grid place-items-center p-2">
                  <img
                    src={resolveInfografis(selectedPoli)}
                    onError={onInfoError}
                    alt={`Infografis ${selectedPoli.nama}`}
                    className="block w-full max-h-64 object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Daftar layanan dari poli terpilih */}
          {!selectedLayanan && (
            <div className="space-y-3" ref={servicesRef}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Layanan di {selectedPoli?.nama || "—"}
                </h2>
                <span className="text-xs text-slate-600 dark:text-white/60">
                  {layananList.length} layanan
                </span>
              </div>
              {layananList.length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-white/60">
                  Tidak ada layanan yang cocok dengan filter saat ini.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {layananList.map((item, idx) => (
                    <SubServiceCard
                      key={idx}
                      item={item}
                      parentJadwal={selectedPoli?.jadwal}
                      onPick={(it) => setSelectedLayanan(it)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Panel detail layanan */}
          {selectedPoli && selectedLayanan && (
            <DetailPanel
              poli={selectedPoli}
              layanan={selectedLayanan}
              onBack={() => setSelectedLayanan(null)}
            />
          )}
        </section>
      </main>

      {/* Survey popup (cooldown via localStorage; jalan di GitHub Pages) */}
      <SurveyPopup />

      {/* Footer ringkas */}
      <footer className="mt-8 py-6 border-t border-black/10 dark:border-white/10 text-center text-xs text-slate-600 dark:text-white/50">
        <p>
          © {new Date().getFullYear()} Puskesmas Jagakarsa — Informasi layanan. Tema gelap/terang
          via <code>class="dark"</code> pada <code>&lt;html&gt;</code>.
        </p>
      </footer>
    </div>
  );
}
