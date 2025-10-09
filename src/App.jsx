// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// === Import data yang sudah dipisah ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS, // ⬅️ flow steps sekarang dari services.js
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
  if (/^https?:\/\//.test(img)) return img; // kalau URL penuh, pakai apa adanya
  const p = img.startsWith("/") ? img.slice(1) : img; // buang leading slash
  return asset(p); // prefix dengan BASE_URL
};

// --- Auto-link URL di dalam teks (https, http, www., bit.ly) ---
const URL_RE = /((https?:\/\/|www\.)[^\s)]+|bit\.ly\/[^\s)]+)/gi;
function linkify(text) {
  if (!text) return text;
  // Pecah per baris agar \n jadi <br/>
  const lines = String(text).split(/\r?\n/);
  const nodes = [];
  lines.forEach((line, li) => {
    let lastIndex = 0;
    line.replace(URL_RE, (m, url, _proto, idx) => {
      if (idx > lastIndex) nodes.push(line.slice(lastIndex, idx));
      // pastikan ada skema
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

/* ===================== (Flow) Fallback image & audio singleton ===================== */
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FLOW_FALLBACK;
};

function getFlowAudio() {
  if (!window.__flowAudio) {
    window.__flowAudio = new Audio();
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
 * Skema data yang didukung (fleksibel & backward-compatible):
 *
 * 1) LAMA (tetap didukung):
 *    s.jadwal = { Senin: "08:00–16:00", Sabtu: "Tutup", ... }
 *
 * 2) BARU (direkomendasikan, lebih fleksibel):
 *    s.jadwal = {
 *      tz: "Asia/Jakarta",                 // opsional (default "Asia/Jakarta")
 *      weekly: {                           // jam default mingguan
 *        Senin: ["08:00-12:00","13:00-16:00"],
 *        Selasa: "08:00-16:00",            // string atau array keduanya ok
 *        Rabu: "Tutup",
 *        ... dst ...
 *      },
 *      exceptions: {                       // override tanggal spesifik (YYYY-MM-DD)
 *        "2025-10-28": "Tutup",            // libur
 *        "2025-11-01": ["09:00-12:00"],    // jam khusus
 *      }
 *    }
 *
 *  Catatan: overnight (contoh "22:00-06:00") otomatis dipisah ke dua hari.
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

// --- Utils waktu ---
const toMin = (s) => {
  const [h, m] = String(s).trim().split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};
const pad2 = (n) => (n < 10 ? "0" + n : "" + n);
const fmtMin = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

// Normalize "08:00–16:00" / "08:00-16:00" / "Tutup" → array rentang
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

// Format jadwal “lama” jadi skema “baru”
function normalizeSchedule(jadwalLike) {
  if (!jadwalLike || typeof jadwalLike !== "object" || Array.isArray(jadwalLike)) {
    return { tz: "Asia/Jakarta", weekly: { ...RULE_DEFAULT }, exceptions: {} };
  }
  // Jika sudah pakai { weekly, exceptions } → rapikan saja
  if (jadwalLike.weekly || jadwalLike.exceptions) {
    return {
      tz: jadwalLike.tz || "Asia/Jakarta",
      weekly: { ...RULE_DEFAULT, ...(jadwalLike.weekly || {}) },
      exceptions: { ...(jadwalLike.exceptions || {}) },
    };
  }
  // Mode lama: object hari → string
  const weekly = { ...RULE_DEFAULT, ...jadwalLike };
  return { tz: "Asia/Jakarta", weekly, exceptions: {} };
}

// Ambil label hari ID dari Date
const dayNameID = (date) => DAY_NAMES_ID[date.getDay()];

// Ambil daftar rentang menit untuk tanggal tertentu (gabung weekly + exceptions)
function rangesForDate(schedule, date) {
  const { weekly, exceptions } = normalizeSchedule(schedule);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const key = `${y}-${pad2(m)}-${pad2(d)}`;

  // Exceptions tanggal spesifik override penuh
  if (exceptions[key] != null) {
    return normalizeRanges(exceptions[key]);
  }
  // Weekly default
  const label = dayNameID(date);
  return normalizeRanges(weekly[label]);
}

// Rentang AKTIF untuk “hari ini” (ikutin overnight dari kemarin)
function rangesForToday(schedule, ref = new Date()) {
  const today = new Date(ref);
  const yesterday = new Date(ref);
  yesterday.setDate(ref.getDate() - 1);

  const todayRanges = rangesForDate(schedule, today);
  const yRanges = rangesForDate(schedule, yesterday);

  const out = [];
  // Tambahkan bagian overnight dari kemarin (to < from → melewati tengah malam)
  yRanges.forEach(({ from, to }) => {
    if (to < from) {
      // kemarin 22:00-06:00 → untuk hari ini: 00:00-06:00
      out.push({ from: 0, to });
    }
  });
  // Tambahkan bagian untuk hari ini
  todayRanges.forEach(({ from, to }) => {
    if (to >= from) {
      out.push({ from, to });
    } else {
      // hari ini 22:00-06:00 → untuk hari ini: 22:00-24:00
      out.push({ from, to: 1440 });
    }
  });
  return out;
}

// Status buka & kalkulasi perubahan status berikutnya
function getOpenStatus(service, ref = new Date()) {
  const schedule = service?.jadwal || {};
  const ranges = rangesForToday(schedule, ref);
  const now = ref.getHours() * 60 + ref.getMinutes();

  let open = false;
  let nextChange = null; // menit absolut selanjutnya (dari 0..1440), bisa lewat hari (min + 1440)

  for (const r of ranges) {
    if (now >= r.from && now <= r.to) {
      open = true;
      // sedang buka → nextChange = waktu tutup terdekat
      if (nextChange == null || r.to < nextChange) nextChange = r.to;
    } else if (now < r.from) {
      // belum buka → nextChange kandidat waktu buka terdekat
      if (nextChange == null || r.from < nextChange) nextChange = r.from;
    }
  }

  // Jika tidak ada change di sisa hari, cari event hari esok pertama
  if (nextChange == null) {
    const tomorrow = new Date(ref);
    tomorrow.setDate(ref.getDate() + 1);
    const tRanges = rangesForToday(schedule, tomorrow);
    if (tRanges.length) nextChange = tRanges[0].from + 1440; // +24 jam
  }

  const minutesUntilChange = nextChange != null ? nextChange - now : null;
  return { open, minutesUntilChange, label: formatStatusLabel(open, minutesUntilChange) };
}

function formatStatusLabel(open, minutesUntilChange) {
  if (minutesUntilChange == null) return open ? "Buka" : "Tutup";
  if (minutesUntilChange <= 0) return open ? "Tutup segera" : "Buka sebentar lagi";
  if (minutesUntilChange < 60) {
    return open ? `Tutup ${minutesUntilChange} mnt lagi` : `Buka ${minutesUntilChange} mnt lagi`;
  }
  const h = Math.floor(minutesUntilChange / 60);
  const m = minutesUntilChange % 60;
  const tail = m ? `${h} j ${m} mnt` : `${h} j`;
  return open ? `Tutup ${tail} lagi` : `Buka ${tail} lagi`;
}

// API publik yang dipakai UI (kompatibel lama):
export function getEffectiveJadwal(s) {
  // Kembalikan weekly yang sudah dinormalisasi untuk ditampilkan di tabel
  const { weekly } = normalizeSchedule(s?.jadwal || {});
  // stringify agar konsisten ("Tutup" bila kosong, gabung koma bila array)
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
export function getOpenBadgeLabel(s, ref = new Date()) {
  return getOpenStatus(s, ref).label; // contoh: "Buka", "Tutup 45 mnt lagi", dst.
}

/* ===================== UI kecil ===================== */
const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
    {children}
  </span>
);

/* Pills: BPJS & Harga (Gratis/Rp) */
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
  const n = Number(tarif || 0);
  return n === 0 ? (
    <Pill tone="emerald">Gratis</Pill>
  ) : (
    <Pill tone="sky">Rp {n.toLocaleString("id-ID")}</Pill>
  );
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
        h-full
        md:h-[calc(100svh-56px)]
      `}
    >
      {/* Header kecil di dalam sidebar */}
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold truncate">Jadwal & Tarif</div>
      </div>

      <div className="px-4 pt-3 text-xs text-white/60">
        Fasilitas:{" "}
        <span className="text-white/90 font-medium">{facilityName}</span>
      </div>

      {/* Pencarian */}
      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]"
        />
      </div>

      {/* Daftar poli: batasi tinggi ≈ 7 item; sisanya scroll */}
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
                    <div className="text-xs text-white/60 truncate">
                      {s.klaster}
                    </div>
                  </div>
                  <StatusPill open={isOpenNow(s)} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="text-white/60 mb-1">Jadwal</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/70">
                    {DAY_NAMES_ID.map((d) => (
                      <React.Fragment key={d}>
                        <span className="text-white/50">{d}</span>
                        <span>{getEffectiveJadwal(s)[d] || "Tutup"}</span>
                      </React.Fragment>
                    ))}
                  </div>
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
      {/* ── Gambar: full-fit (tidak terpotong) ───────────────────────── */}
      <div className="w-full bg-slate-900/40">
        {/* tinggi tetap agar stabil di semua rasio gambar */}
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

      {/* ── Teks kartu ──────────────────────────────────────────────── */}
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

/* Pill-only meta (BPJS + Harga) & SubServiceCard */
function SubServiceCard({ item, onPick }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass =
    item.bpjs
      ? "text-emerald-400"
      : "text-rose-400";

  const tarifText = `Tarif Umum: Rp ${Number(item.tarif || 0).toLocaleString("id-ID")}`;

  return (
    <button
      onClick={() => onPick(item)}
      className="
        relative w-full text-left rounded-2xl border border-white/10
        bg-white/5 hover:bg-white/8
        ring-0 hover:ring-1 hover:ring-white/15
        transition-all
        shadow-sm hover:shadow
        active:scale-[.99]
        focus:outline-none focus:ring-2 focus:ring-emerald-500
      "
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* Header status: BPJS & Tarif (rata kiri, tipografi konsisten) */}
        <div className="text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
        </div>
        <div className="text-[12px] sm:text-[13px] text-white/70 -mt-2">
          {tarifText}
        </div>

        {/* Divider halus */}
        <div className="h-px bg-white/10" />

        {/* Konten utama: ikon + judul + keterangan (grid rapi) */}
        <div className="flex items-start gap-3 min-h-[92px]">
          <div className="mt-0.5 text-xl sm:text-2xl shrink-0">
            {item.ikon ?? "🧩"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-[15px] sm:text-[16px] leading-snug text-white">
              {item.nama}
            </div>
            {item.ket && (
              <div className="text-[13px] sm:text-sm text-white/70 mt-1 line-clamp-3">
                {item.ket}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================== Flow Card (pakai FLOW_STEPS) ===================== */
function FlowCard({ step, index }) {
  // step: object dari FLOW_STEPS[id]
  const src = resolveFlowImg(step?.img);

  // Dukungan audio narasi per langkah
  let lastTap = 0;
  const playNarration = () => {
  const file = step?.audio;
  if (!file) return;
  const player = getFlowAudio();
  const key = step.id;

  // Gunakan helper asset() untuk path relatif/absolut
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
    if (
      window.__flowAudioKey !== key ||
      player.src !== new URL(url, location.href).href
    )
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
      <div className="px-3 pt-2 text-[11px] text-white/50">
      Langkah {index + 1}
      </div>

      {/* Gambar */}
      <div className="p-2 sm:p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowError}
            alt={step?.name || `Langkah ${index + 1}`}
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">
            —
          </div>
        )}
      </div>

      {/* Keterangan langkah */}
      {(step?.name || step?.description) && (
        <div className="px-3 pb-3">
          {step?.name && (
            <div className="text-sm font-semibold text-white">
              {step.name}
            </div>
          )}
          {step?.description && (
            <p className="text-xs text-white/70 mt-1">{step.description}</p>
          )}
        </div>
      )}
    </button>
  );
}

/* ===================== Info Card ===================== */
function InfoCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="text-sm uppercase tracking-wide text-white/60 mb-2">
        {title}
      </div>
      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/* ===================== Right Panel ===================== */
function RightPanel({
  selected, setSelected, filtered, subMatches, onPickSub,
  jump, setJump, searchQuery,
}) {
  const [sub, setSub] = useState(null);

  // Reset sub saat ganti poli
  useEffect(() => setSub(null), [selected]);

  // Loncat ke sub tertentu (dari hasil pencarian)
  useEffect(() => {
    if (jump && selected && selected.id === jump.poliId) {
      setSub(selected.layanan?.[jump.idx] ?? null);
      setJump(null);
    }
  }, [jump, selected, setJump]);

  // ==== NORMALISASI SKENARIO (aman untuk hooks) ====
  const scenarios = useMemo(() => {
    const A = sub?.alur;
    if (!A) return {};
    if (Array.isArray(A)) return { standar: A }; // dukung data lama
    return A;                                    // {key: [ids]}
  }, [sub]);

  const scenarioKeys = Object.keys(scenarios);
  const [scenarioKey, setScenarioKey] = useState(null);
  useEffect(() => {
    setScenarioKey(scenarioKeys[0] ?? null);
  }, [sub, JSON.stringify(scenarioKeys)]);

  const flowSteps = useMemo(() => {
    return (scenarios[scenarioKey] || [])
      .map((id) => FLOW_STEPS[id])
      .filter(Boolean);
  }, [scenarios, scenarioKey]);

  // ==== KONDISI 1: mode grid poli / hasil pencarian ====
  const showSearchResults =
    searchQuery?.trim()?.length > 0 && subMatches?.length > 0;

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
                    />
                  ))}
                </div>
              </section>
            ) : (
              <>
                <div className="mb-3 text-white/70">
                  Pilih poli untuk melihat jenis layanannya.
                </div>
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

  // ==== KONDISI 2: sudah pilih poli, belum pilih sub ====
  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopFlowAudio(); setSelected(null); }}
            className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">
            {selected.nama}
          </h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">
          Jenis Layanan — {selected.nama}
        </div>
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.length > 0 ? (
            list.map((it, i) => (
              <SubServiceCard key={i} item={it} onPick={setSub} />
            ))
          ) : (
            <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  // ==== KONDISI 3: sudah pilih sub → tampilkan alur + skenario ====
  return (
    <div className="min-h-[calc(100svh-64px)] p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { stopFlowAudio(); setSub(null); }}
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

      {scenarioKeys.length > 1 && (
        <div className="flex flex-wrap gap-2 -mt-1">
          {scenarioKeys.map((key) => (
            <button
              key={key}
              onClick={() => { stopFlowAudio(); setScenarioKey(key); }}
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
        <p className="mb-2"><strong>Detail layanan:</strong> {sub.nama}</p>

        {(() => {
        const extra = sub.info ?? EXTRA_INFO[sub.nama];
        if (extra) {
        return <p>{linkify(extra)}</p>;   // ⬅️ hanya URL yang jadi link
        }
        // fallback dummy
        return (
        <>
        <p>Informasi tambahan belum tersedia. Silakan lengkapi sesuai ketentuan layanan.</p>
        <p className="mt-2">
        Informasi ini bersifat contoh/dummy. Silakan ganti dengan persyaratan atau
        instruksi khusus untuk layanan <em>{sub.nama}</em>.
        </p>
        </>
        );
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
  const [navOpen, setNavOpen] = useState(false); // Drawer state

  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  console.log(
    "SERVICES_CURRENT:",
    SERVICES_CURRENT.length,
    SERVICES_CURRENT.map((s) => s.id)
  );
  const facilityName =
    FACILITIES.find((f) => f.id === facility)?.name || "-";

  // Reset pilihan poli saat user mulai mengetik agar hasil pencarian muncul
  useEffect(() => {
    if (query.trim().length > 0) {
      setSelected(null);
      stopFlowAudio();
    }
  }, [query]);

  // Filter poli (judul/klaster)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES_CURRENT.filter(
      (s) =>
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.klaster.toLowerCase().includes(q)
    );
  }, [query, SERVICES_CURRENT]);

  // Hasil pencarian untuk sub-layanan (nama/ket)
  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    SERVICES_CURRENT.forEach((p) =>
      (p.layanan || []).forEach((item, idx) => {
        const hay = `${(item.nama || "").toLowerCase()} ${(item.ket || "")
          .toLowerCase()}`;
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
      filtered.length === 0 && query && subResults.length > 0
        ? SERVICES_CURRENT
        : filtered,
    [filtered, query, subResults, SERVICES_CURRENT]
  );

  // Loncat otomatis ke sub-layanan
  const [jump, setJump] = useState(null);
  function handlePickSub(poliId, idx) {
    const p = SERVICES_CURRENT.find((x) => x.id === poliId);
    if (!p) return;
    // keluar dari mode pencarian agar RightPanel pindah ke detail
    setQuery("");
    setSelected(p);
    setJump({ poliId, idx });
    setNavOpen(false); // jika drawer terbuka, tutup
  }

  // Reset saat ganti fasilitas
  useEffect(() => {
    stopFlowAudio();
    setSelected(null);
    setQuery("");
  }, [facility]);

  // Esc untuk menutup drawer (mobile)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden inline-flex items-center justify-center size-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
            aria-label="Buka menu"
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center">
              🏥
            </div>
            <div className="font-semibold">
              Penampil Jadwal & Tarif Layanan
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-white/60 hidden sm:block">
              Fasilitas
            </label>
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
          </div>
        </div>
      </header>

      {/* LAYOUT dengan Drawer */}
      <div className="max-w-7xl mx-auto px-0 md:px-4 grid md:grid-cols-[24rem_1fr]">
        {/* Overlay (mobile) */}
        {navOpen && (
          <button
            aria-label="Tutup menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Sidebar (drawer on mobile) */}
        <div
          className={`fixed z-50 inset-y-0 left-0 w-80 md:w-auto md:static md:z-auto
          transition-transform md:transition-none
           ${navOpen
          ? 'translate-x-0 pointer-events-auto'
          : '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'}
        h-[100dvh] overflow-y-auto overscroll-contain
      `}
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
            selected={selected}
            highlightIds={matchPoliIds}
          />
        </div>

        {/* Panel kanan */}
        <RightPanel
          selected={selected}
          setSelected={setSelected}
          filtered={filtered}
          subMatches={subResults}
          onPickSub={handlePickSub}
          jump={jump}
          setJump={setJump}
          searchQuery={query}
        />
      </div>

      <footer className="py-6 text-center text-white/50 text-sm">
        © {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.
      </footer>
    </div>
  );
}
