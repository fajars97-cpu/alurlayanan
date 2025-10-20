// src/App.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SurveyPopup from "./components/SurveyPopup.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

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
          className="text-emerald-400 underline hover:text-emerald-300"
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
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
    {children}
  </span>
);
function Pill({ children, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30",
    sky: "bg-sky-500/15     text-sky-300     ring-1 ring-sky-400/30",
    slate: "bg-white/8        text-white/80    ring-1 ring-white/12",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
function PricePill({ tarif }) {
  const label = formatTarifID(tarif);
  return label === "Gratis" ? <Pill tone="emerald">Gratis</Pill> : <Pill tone="sky">{label}</Pill>;
}

function formatTarifID(t) {
  if (t == null) return "Tidak tersedia";
  // Range dalam array [min, max]
  if (Array.isArray(t) && t.length === 2) {
    const [a, b] = t.map(Number);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `Rp ${a.toLocaleString("id-ID")}–${b.toLocaleString("id-ID")}`;
    }
  }
  // Range dalam object { min, max } (opsional kalau mau pakai bentuk ini juga)
  if (t && typeof t === "object" && "min" in t && "max" in t) {
    const a = Number(t.min), b = Number(t.max);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `Rp ${a.toLocaleString("id-ID")}–${b.toLocaleString("id-ID")}`;
    }
  }
  // Single number
  const n = Number(t);
  if (Number.isFinite(n)) return n === 0 ? "Gratis" : `Rp ${n.toLocaleString("id-ID")}`;
  // Fallback string
  return String(t);
}

const StatusPill = ({ open }) => (
  <span
    className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${
      open
        ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
        : "bg-rose-500/10 border-rose-400/30 text-rose-300"
    }`}
  >
    {open ? "Buka" : "Tutup"}
  </span>
);

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

  return (
    <aside
      className={`
        w-full md:w-80 shrink-0
        bg-slate-950/70 backdrop-blur border-r border-white/10
        flex flex-col
        h-full md:h-[calc(100svh-56px)]
      `}
    >
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold truncate">Jadwal & Tarif</div>
      </div>

      <div className="px-4 pt-3 text-xs text-white/60">
        Fasilitas: <span className="text-white/90 font-medium">{facilityName}</span>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]"
        />
      </div>

      <div
        className={`
          px-4 pb-2 space-y-2
          overflow-y-auto overscroll-contain
          [scrollbar-width:thin]
          md:max-h-[28rem]
          flex-1
        `}
      >
        <div className="text-xs uppercase text-white/50 mb-2">Daftar Poli</div>

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
            <div key={s.id} className="space-y-2">
              <button
                onClick={() => toggle(s)}
                className={`group w-full text-left p-3 rounded-xl border transition hover:bg-white/5 ${
                  selected?.id === s.id
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : hl
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg">{s.ikon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.nama}</div>
                    <div className="text-xs text-white/60 truncate">{s.klaster}</div>
                  </div>
                  <StatusPill open={open} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="text-white/60 mb-2">Jadwal</div>

                  {/* 1) Tidak ada jadwal khusus sama sekali → tampilkan default */}
                  {uniqueSchedules.length === 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px] text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-white/50">{d}</span>
                          <span>{getEffectiveJadwal({})[d]}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 2) Semua sama → tabel ringkas (lama) */}
                  {uniqueSchedules.length === 1 && uniqueSchedules[0].length > 0 && !singleServiceSchedule && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-white/50">{d}</span>
                          <span>
                            {getEffectiveJadwal({ jadwal: uniqueSchedules[0][0].jadwal })[d]}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* 3) Poli dengan satu layanan yang punya jadwal khusus → tampilkan tabel layanan itu */}
                  {singleServiceSchedule && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/70">
                      {DAY_NAMES_ID.map((d) => (
                        <React.Fragment key={d}>
                          <span className="text-white/50">{d}</span>
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
                      }}
                      className="w-full text-left text-[12px] text-amber-300/90 hover:text-amber-200 underline underline-offset-2"
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
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[.98] transition text-left touch-manipulation"
    >
      <div className="w-full bg-slate-900/40">
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
          <div className="font-semibold truncate">{s.nama}</div>
        </div>
        <div className="text-xs text-white/60 mt-1 truncate">{s.klaster}</div>
      </div>
    </button>
  );
}

/* SubServiceCard */
function SubServiceCard({ item, onPick, parentJadwal }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs ? "text-emerald-400" : "text-rose-400";
  const tarifText = `Tarif Umum: ${formatTarifID(item.tarif)}`;

  const jadwalLayanan = item.jadwal || null;
  const open = isOpenNow({ jadwal: jadwalLayanan || parentJadwal });
  const today = jadwalLayanan ? todayText(jadwalLayanan) : null;
  const weekly = jadwalLayanan ? summarizeWeekly(jadwalLayanan) : null;

  return (
    <button
      onClick={() => onPick(item)}
      className="relative w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 ring-0 hover:ring-1 hover:ring-white/15 transition-all shadow-sm hover:shadow active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
          <span className="ml-auto"><StatusPill open={open} /></span>
        </div>
        <div className="text-[12px] sm:text-[13px] text-white/70 -mt-2">{tarifText}</div>
        <div className="h-px bg-white/10" />
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-xl sm:text-2xl shrink-0">{item.ikon ?? "🧩"}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] sm:text-[16px] leading-snug text-white">
              {item.nama}
            </div>
            {item.ket && (
              <div className="text-[13px] sm:text-sm text-white/70 mt-1 line-clamp-3">
                {item.ket}
              </div>
            )}
            {/* Jadwal ringkas per layanan */}
            <div className="mt-2 text-[12px] sm:text-[13px] text-white/70 leading-snug">
              {jadwalLayanan ? (
                <>
                  <div><span className="text-white/50">Hari ini:</span> {today}</div>
                  <div className="break-words"><span className="text-white/50">Jadwal Buka:</span> {weekly}</div>
                </>
              ) : (
                <div className="italic text-white/60">Ikuti jadwal default poli</div>
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
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden text-left hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Langkah ${index + 1} — ketuk untuk narasi, ketuk cepat 2x untuk ulang`}
    >
      <div className="px-3 pt-2 text-[11px] text-white/50">Langkah {index + 1}</div>
      <div className="p-2 sm:p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowError}
            alt={step?.name || `Langkah ${index + 1}`}
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">—</div>
        )}
      </div>
      {(step?.name || step?.description) && (
        <div className="px-3 pb-3">
          {step?.name && <div className="text-sm font-semibold text-white">{step.name}</div>}
          {step?.description && <p className="text-xs text-white/70 mt-1">{step.description}</p>}
        </div>
      )}
    </button>
  );
}

/* ===================== Info Card ===================== */
function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="text-sm uppercase tracking-wide text-white/60 mb-2">{title}</div>
      <div className="prose prose-invert max-w-none text-sm leading-relaxed">{children}</div>
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
            transition={{ duration: 0.25 }}
          >
            {showSearchResults ? (
              <section className="mb-6">
                <div className="mb-2 text-white/70">Hasil Pelayanan</div>
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
                <div className="mb-3 text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              stopFlowAudio();
              setSelected(null);
            }}
            className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">{selected.nama}</h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">Jenis Layanan — {selected.nama}</div>
        <div
          ref={servicesGridRef}
          className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {list.length > 0 ? (
            list.map((it, i) => (
              <SubServiceCard key={i} item={it} onPick={setSub} parentJadwal={selected.jadwal} />
            ))
          ) : (
            <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            stopFlowAudio();
            setSub(null);
          }}
          className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
        >
          ← Kembali
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">
          {selected.nama} — {sub.nama}
        </h2>
        <div className="ml-auto flex gap-2">
          <Chip>{selected.klaster}</Chip>
          {selected.telemed && <Chip>Telemed</Chip>}
        </div>
      </div>

      <div className="text-white/70">
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
              }}
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
                key === scenarioKey
                  ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
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
          <div className="font-semibold text-white mb-1">
            {DOCTORS_BY_POLI[selected.id] ?? "—"}
          </div>
          <div className="text-white/70">
            <p className="mb-2">
              <strong>Detail layanan:</strong> {sub.nama}
            </p>
           {(() => {
  const extra = sub.info ?? EXTRA_INFO[sub.nama];

  // helper path → manfaatkan asset() yang sudah ada di file
  const toSrc = (p) => {
    if (!p) return null;
    if (/^https?:\/\//.test(p)) return p;          // URL absolut
    const clean = String(p).replace(/^\/+/, "");    // buang leading slash
    return asset(clean);                            // gabung BASE_URL + path
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

  // 1) STRING → tetap seperti semula
  if (typeof extra === "string") {
    return <p>{linkify(extra)}</p>;
  }

  // 2) ARRAY (campuran string dan {img, alt})
  if (Array.isArray(extra)) {
    return (
      <div className="space-y-3">
        {extra.map((item, i) => {
          if (typeof item === "string") {
            return <p key={`txt-${i}`}>{linkify(item)}</p>;
          }
          if (item && typeof item === "object" && item.img) {
            return (
              <div key={`img-${i}`} className="space-y-1">
             <img
                  src={toSrc(item.img)}
                  alt={item.alt || sub.nama}
                  className="w-full rounded-xl border border-white/10"
                  onError={onInfoError}
                  loading="lazy"
                />
  {item.alt && (
    <div className="text-[12px] text-white/60 leading-snug">{item.alt}</div>
  )}
</div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // 3) OBJECT { text, images }
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
                className="w-full rounded-xl border border-white/10"
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
    </div>
  );
}

/* ===================== App Root ===================== */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [facility, setFacility] = useState("pkm-jagakarsa");
  const [navOpen, setNavOpen] = useState(false);
  const [scrollReq, setScrollReq] = useState(null); // { poliId, ts }

  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  const facilityName = FACILITIES.find((f) => f.id === facility)?.name || "-";

  useEffect(() => {
    if (query.trim().length > 0) {
      setSelected(null);
      stopFlowAudio();
    }
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES_CURRENT.filter(
      (s) => !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q)
    );
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

  const [jump, setJump] = useState(null);
  function handlePickSub(poliId, idx) {
    const p = SERVICES_CURRENT.find((x) => x.id === poliId);
    if (!p) return;
    setQuery("");
    setSelected(p);
    setJump({ poliId, idx });
    setNavOpen(false);
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
    <div className="min-h-screen bg-gradient-to-b 
                  from-white via-slate-50 to-slate-100 text-slate-900
                  dark:from-slate-900 dark:via-slate-950 dark:to-black dark:text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <button
            className="md:hidden inline-flex items-center justify-center size-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
            aria-label="Buka menu"
            onClick={() => setNavOpen(true)}
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
            <label className="text-xs text-white/60 hidden sm:block">Fasilitas</label>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="h-9 rounded-lg bg-slate-800 text-white border border-white/10 px-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              {FACILITIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <ThemeToggle />

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-0 md:px-4 grid md:grid-cols-[24rem_1fr]">
        {navOpen && (
          <button
            aria-label="Tutup menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />
        )}

        <div
          className={`fixed z-50 inset-y-0 left-0 w-80 md:w-auto md:static md:z-auto
          transition-transform md:transition-none
          ${navOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
          h-[100dvh] overflow-y-auto overscroll-contain`}
          role="dialog"
          aria-modal="true"
        >
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
        formUrl="https://forms.gle/8phAGQay9pj7vh1CA"
        delayMs={60000}
        cooldownDays={14}
      />

      <footer className="py-6 text-center text-white/50 text-sm">
        © {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.
      </footer>
    </div>
  );
}