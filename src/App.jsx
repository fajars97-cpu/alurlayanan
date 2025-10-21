// src/App.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import SurveyPopup from "./components/SurveyPopup.jsx";

// === Data (sesuai struktur lama) ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS,
} from "./data/services";

/* ===================== BASE URL (untuk GitHub Pages) ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;

/* ===================== Fallback gambar ===================== */
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle">Gambar alur tidak ditemukan</text></svg>';

const resolveInfografis = (service) => {
  // mengikuti kebiasaan lama (public/infografis/<id>.jpg atau override s.img)
  const file = (service?.img ?? `${service?.id ?? "missing"}.jpg`).toString();
  if (/^https?:\/\//.test(file)) return file;
  if (file.startsWith("/")) return asset(file);
  return asset(`infografis/${file}`);
};
const onInfoError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = INFO_FALLBACK;
};
const onFlowError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FLOW_FALLBACK;
};

/* ===================== Linkify ===================== */
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

/* ===================== Jadwal (util lama dipertahankan) ===================== */
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
export function isOpenNow(s, ref = new Date()) {
  return getOpenStatus(s, ref).open;
}

/* ===================== Price ===================== */
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
const Chip = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight bg-slate-200/70 text-slate-800 ring-1 ring-black/10 dark:bg-white/8 dark:text-white/80 dark:ring-white/12">
    {children}
  </span>
);

/* ===================== Audio helper (alur) ===================== */
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

/* ===================== FLOOR HELPERS (BARU) ===================== */
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

/* ===================== Sidebar (coding lama, sticky) ===================== */
function Sidebar({ facilityName, query, setQuery, services, onPick }) {
  return (
    <aside
      className="w-full md:w-80 shrink-0 bg-[#0d1220] border-r border-white/10 flex flex-col md:sticky md:top-14 self-start md:h-[calc(100svh-56px)]"
      aria-label="Navigasi poli dan pencarian"
    >
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div aria-hidden className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <h2 className="font-semibold truncate text-white">Jadwal & Tarif</h2>
      </div>

      <div className="px-4 pt-3 text-xs text-white/70">
        Fasilitas: <span className="text-white font-medium">{facilityName}</span>
      </div>

      <div className="p-4 space-y-3">
        <label htmlFor="search" className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          id="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full h-11 px-3 rounded-xl bg-white/10 text-white border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500 text-[15px]"
          aria-label="Cari layanan atau nama poli"
        />
      </div>

      <div
        className="px-3 pb-3 space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:thin] flex-1"
        role="list"
        aria-label="Daftar poli"
      >
        <div className="text-xs uppercase text-white/50 mb-2 px-1">Daftar Poli</div>

        {services.map((s) => {
          const open =
            (s?.layanan || []).some((l) => isOpenNow({ jadwal: l.jadwal || s.jadwal })) ||
            isOpenNow({ jadwal: s.jadwal });

          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="group w-full text-left p-3 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg" aria-hidden>
                  {s.ikon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-white">{s.nama}</div>
                  <div className="text-xs text-white/60 truncate">{s.klaster}</div>
                </div>
                <span
                  className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${
                    open
                      ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-400/30 text-rose-300"
                  }`}
                >
                  {open ? "Buka" : "Tutup"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* ===================== Kartu poli (grid default) ===================== */
function ServiceCard({ s, onPick }) {
  return (
    <button
      onClick={() => onPick(s)}
      className={`group relative overflow-hidden rounded-2xl border
      bg-slate-100/70 dark:bg-white/5
      hover:bg-slate-200/80 dark:hover:bg-white/10
      active:scale-[.98] transition text-left touch-manipulation
      ${floorBorderClass(s.lokasi)}`}
    >
      <div className="w-full bg-slate-200/10 dark:bg-slate-900/40 transition-colors duration-300">
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
          <div className="font-semibold truncate text-white">{s.nama}</div>
        </div>
        <div className="text-xs text-white/60 mt-1 truncate">{s.klaster}</div>
      </div>
    </button>
  );
}

/* ===================== Flow Card (alur) ===================== */
function FlowCard({ step, index }) {
  const src = step?.img ? (/^https?:\/\//.test(step.img) ? step.img : asset(step.img.replace(/^\//, ""))) : null;
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
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={playNarration}
      className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden text-left hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
      aria-label={`Langkah ${index + 1} — ketuk untuk narasi, ketuk cepat 2x untuk ulang`}
      title="Ketuk untuk memutar narasi. Ketuk dua kali untuk mengulang cepat."
    >
      <div className="px-3 pt-2 text-[11px] text-white/60">Langkah {index + 1}</div>
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
      {step?.name && <div className="px-3 pb-2 text-[12px] text-white/80">{step.name}</div>}
    </button>
  );
}

/* ===================== Extra Info ===================== */
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
                  src={/^https?:\/\//.test(im) ? im : asset(im.replace(/^\//, ""))}
                  alt={node.alt || `info-${i}`}
                  className="block w-full rounded-xl border border-white/10 object-contain"
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
            className="block w-full rounded-xl border border-white/10 object-contain"
            loading="lazy"
          />
        );
      }
    }
    return null;
  };

  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-white">Informasi Tambahan</h3>
      <div className="prose prose-sm dark:prose-invert max-w-none">{render(info, 0)}</div>
    </section>
  );
}

/* ===================== Detail Panel Layanan ===================== */
function DetailPanel({ poli, layanan, onBack }) {
  const refTop = useRef(null);
  useEffect(() => {
    refTop.current?.focus?.();
  }, [poli?.id, layanan?.nama]);

  const dokter = DOCTORS_BY_POLI?.[poli?.id] || null;

  const steps = useMemo(() => {
    if (!layanan?.alur) return [];
    const ids = Array.isArray(layanan.alur) ? layanan.alur : Object.values(layanan.alur || {}).flat();
    return ids.map((id) => FLOW_STEPS?.[id]).filter(Boolean);
  }, [layanan]);

  return (
    <section aria-label={`Detail layanan ${layanan?.nama}`} className="space-y-4" tabIndex={-1} ref={refTop}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">{layanan?.nama}</h2>
          <p className="text-sm text-white/60">
            {poli?.nama} • {poli?.lokasi || "Lokasi tidak tersedia"}
          </p>
        </div>
        <button
          onClick={() => { stopFlowAudio(); onBack?.(); }}
          className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          aria-label="Kembali ke daftar layanan"
        >
          ← Kembali
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-3">
          <h3 className="font-semibold">Alur Layanan</h3>
          {steps.length === 0 ? (
            <div className="text-sm text-white/60">Alur belum ditambahkan.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {steps.map((st, i) => (
                <FlowCard key={st?.id ?? i} step={st} index={i} />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-2 space-y-4">
          <section aria-labelledby="tarif-status">
            <h3 id="tarif-status" className="font-semibold">Ringkasan</h3>
            <div className="rounded-xl border border-white/10 p-3 bg-white/5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70">Tarif:</span>
                <Chip>{formatTarifID(layanan?.tarif)}</Chip>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70">BPJS:</span>
                <Chip>{layanan?.bpjs ? "Tercakup" : "Tidak Tercakup"}</Chip>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70">Status:</span>
                <Chip>{isOpenNow({ jadwal: layanan?.jadwal || poli?.jadwal }) ? "Buka" : "Tutup"}</Chip>
              </div>
            </div>
          </section>

          {dokter && (
            <section aria-labelledby="petugas-title">
              <h3 id="petugas-title" className="font-semibold">Petugas/Penanggung Jawab</h3>
              <div className="rounded-xl border border-white/10 p-3 bg-white/5">
                <p className="text-sm text-white/80">{dokter}</p>
              </div>
            </section>
          )}

          <ExtraInfoSection title={layanan?.nama} />
        </aside>
      </div>
    </section>
  );
}

/* ===================== APP ===================== */
export default function App() {
  const [facility, setFacility] = useState("pkm-jagakarsa");
  const [query, setQuery] = useState("");

  const SERVICES_CURRENT = SERVICES_BY_FACILITY[facility] || [];
  const facilityName = FACILITIES.find((f) => f.id === facility)?.name || "-";

  // Flow lama: selected poli → daftar layanan; selectedServiceIdx → detail
  const [selected, setSelected] = useState(null);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(null);

  // Reset saat mencari
  useEffect(() => {
    if (query.trim()) {
      setSelected(null);
      setSelectedServiceIdx(null);
      stopFlowAudio();
    }
  }, [query]);

  // Filter + sort poli (BARU: urut lantai)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = SERVICES_CURRENT.filter(
      (s) => !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q)
    );
    return list.slice().sort((a, b) => {
      const fa = getFloorNumber(a.lokasi) ?? 999;
      const fb = getFloorNumber(b.lokasi) ?? 999;
      if (fa !== fb) return fa - fb;
      return a.nama.localeCompare(b.nama, "id");
    });
  }, [SERVICES_CURRENT, query]);

  // Sub hasil: cari pada layanan (prioritas nama layanan → poli)
  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const res = [];
    for (const p of SERVICES_CURRENT) {
      for (let i = 0; i < (p.layanan || []).length; i++) {
        const l = p.layanan[i];
        if (
          l.nama?.toLowerCase().includes(q) ||
          l.ket?.toLowerCase().includes(q) ||
          p.nama?.toLowerCase().includes(q)
        ) {
          res.push({ poliId: p.id, idx: i, poliNama: p.nama, layanan: l });
        }
      }
    }
    return res;
  }, [SERVICES_CURRENT, query]);

  const sidebarList = useMemo(() => {
    const sortByFloor = (arr) =>
      arr.slice().sort((a, b) => {
        const fa = getFloorNumber(a.lokasi) ?? 999;
        const fb = getFloorNumber(b.lokasi) ?? 999;
        if (fa !== fb) return fa - fb;
        return a.nama.localeCompare(b.nama, "id");
      });
    return filtered.length === 0 && query && subResults.length > 0
      ? sortByFloor(SERVICES_CURRENT)
      : filtered;
  }, [filtered, query, subResults, SERVICES_CURRENT]);

  function handlePickSub(poliId, idx) {
    const p = SERVICES_CURRENT.find((x) => x.id === poliId);
    if (!p) return;
    setQuery("");
    setSelected(p);
    setSelectedServiceIdx(idx);
    stopFlowAudio();
  }

  return (
    <div className="min-h-[100svh] bg-[#0b1020] text-white">
      {/* Header */}
      <header className="h-14 border-b border-white/10 bg-[#0b1020] sticky top-0 z-30" role="banner">
        <div className="mx-auto max-w-7xl h-full px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-xl">🩺</span>
            <h1 className="text-base sm:text-lg font-semibold truncate">
              Informasi Layanan Puskesmas Jagakarsa
            </h1>
          </div>
          <nav aria-label="Toolbar" className="flex items-center gap-2">
            <label className="text-xs text-white/70 mr-2">Fasilitas</label>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="h-9 rounded-lg px-2 text-sm outline-none bg-white/10 text-white border border-white/10 focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              {FACILITIES.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </nav>
        </div>
      </header>

      {/* Grid dua kolom – kanan fleksibel, sejajar dengan sidebar */}
      <main className="mx-auto max-w-7xl px-4 py-4 grid md:grid-cols-[20rem,minmax(0,1fr)] gap-6 items-start">
        {/* Sidebar */}
        <Sidebar
          facilityName={facilityName}
          query={query}
          setQuery={setQuery}
          services={sidebarList}
          onPick={(s) => {
            setSelected(s);
            setSelectedServiceIdx(null);
            stopFlowAudio();
          }}
        />

        {/* Panel kanan */}
        <section aria-label="Konten utama" className="space-y-4 self-start">
          {/* GRID POLI (default) */}
          {!selected && (
            <div className="space-y-4">
              <div className="text-sm text-white/70">Pilih poli untuk melihat jenis layanannya.</div>

              {query && subResults.length > 0 && (
                <div className="rounded-2xl border border-white/10 p-3 bg-white/5">
                  <div className="text-xs uppercase text-white/60 mb-2">Hasil yang berkaitan</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subResults.map((r, i) => (
                      <button
                        key={i}
                        className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3"
                        onClick={() => handlePickSub(r.poliId, r.idx)}
                      >
                        <div className="text-[13px] font-semibold">{r.layanan.nama}</div>
                        <div className="text-xs text-white/60">{r.poliNama}</div>
                        {r.layanan.ket && (
                          <div className="text-xs text-white/60 mt-1 line-clamp-2">{r.layanan.ket}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((s) => (
                  <ServiceCard key={s.id} s={s} onPick={(p) => setSelected(p)} />
                ))}
              </div>
            </div>
          )}

          {/* DAFTAR LAYANAN */}
          {selected && (
            <section aria-label={`Detail ${selected.nama}`} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => { setSelected(null); setSelectedServiceIdx(null); stopFlowAudio(); }}
                  className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  aria-label="Kembali ke daftar poli"
                >
                  ← Kembali
                </button>
                <div className="min-w-0 text-right">
                  <h2 className="text-xl font-semibold truncate">{selected.nama}</h2>
                  <p className="text-sm text-white/60 truncate">
                    {selected.klaster} — {selected.lokasi || "Lokasi tidak tersedia"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold">Layanan di {selected?.nama || "—"}</h3>
                  <span className="text-xs text-white/60">{(selected.layanan || []).length} layanan</span>
                </div>

                {(selected.layanan || []).length === 0 ? (
                  <div className="text-sm text-white/60">Belum ada layanan.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(selected.layanan || []).map((item, idx) => {
                      const open = isOpenNow({ jadwal: item.jadwal || selected.jadwal });
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedServiceIdx(idx)}
                          className="relative w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all shadow-sm hover:shadow active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <div className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold tracking-tight">
                              <span className={item.bpjs ? "text-emerald-300" : "text-rose-300"}>
                                {item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup"}
                              </span>
                              <span className="ml-auto text-[11px] px-2 py-1 rounded-full border"
                                style={{ borderColor: open ? "#34d39988" : "#f8717188", background: open ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)" }}>
                                {open ? "Buka" : "Tutup"}
                              </span>
                            </div>
                            <div className="text-[12px] sm:text-[13px] text-white/80">
                              Tarif Umum: {formatTarifID(item.tarif)}
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-xl sm:text-2xl shrink-0" aria-hidden>
                                {item.ikon ?? "🧩"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-[15px] sm:text-[16px] leading-snug">
                                  {item.nama}
                                </div>
                                {item.ket && (
                                  <p className="text-[13px] sm:text-sm text-white/70 mt-1 line-clamp-3">
                                    {item.ket}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DETAIL LAYANAN */}
              {selectedServiceIdx != null && selected.layanan?.[selectedServiceIdx] && (
                <DetailPanel
                  poli={selected}
                  layanan={selected.layanan[selectedServiceIdx]}
                  onBack={() => { setSelectedServiceIdx(null); stopFlowAudio(); }}
                />
              )}
            </section>
          )}
        </section>
      </main>

      {/* Survey popup (tetap) */}
      <SurveyPopup />

      <footer className="mt-8 py-6 border-t border-white/10 text-center text-xs text-white/60">
        <p>© {new Date().getFullYear()} Puskesmas Jagakarsa — Informasi layanan.</p>
      </footer>
    </div>
  );
}
