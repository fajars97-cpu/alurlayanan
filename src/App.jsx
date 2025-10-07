// src/App.jsx
import React, { useMemo, useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

// === Import data yang sudah dipisah ===
import {
  FACILITIES,
  SERVICES_BY_FACILITY,
  DOCTORS_BY_POLI,
  EXTRA_INFO,
  FLOW_STEPS, // ⬅️ flow steps dari services.js
} from "./data/services";

/* ===================== Path helpers ===================== */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;
const DIR_INFO = `${BASE}infografis`;

/* =========================================================
   Image variant helpers (AVIF → WebP → fallback)
   - buildVariantsFrom() menerima path file (bisa "poli-umum.avif" atau "poli-umum.jpg"
     atau "/alur/1-menuju-loket.avif" atau URL penuh) dan mengembalikan:
     { avif, webp, fallback }
   - fallback dipertahankan sesuai ekstensi sumber jika ada, default ke .jpg
   - Semua URL akhirnya diprefiks dengan BASE melalui asset()
   ========================================================= */
function splitPath(file) {
  const str = String(file || "");
  // URL penuh → kembalikan apa adanya (biar <img> pakai langsung)
  if (/^https?:\/\//i.test(str)) {
    return { isURL: true, url: str };
  }
  // Hilangkan BASE leading slash agar bisa di-asset()
  const normalized = str.startsWith("/") ? str.slice(1) : str;
  // Dapatkan dir, name, ext
  const lastSlash = normalized.lastIndexOf("/");
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash) : "";
  const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const dot = fileName.lastIndexOf(".");
  const hasExt = dot > 0;
  const name = hasExt ? fileName.slice(0, dot) : fileName;
  const ext = hasExt ? fileName.slice(dot + 1).toLowerCase() : "";
  return { isURL: false, dir, name, ext };
}

function buildVariantsFrom(fileOrName, defaultDir = "") {
  if (!fileOrName) return { avif: null, webp: null, fallback: null };
  const parts = splitPath(fileOrName);

  // URL penuh → tidak bisa bikin varian otomatis, pakai URL sebagai fallback saja
  if (parts.isURL) {
    return { avif: null, webp: null, fallback: parts.url };
  }

  const dir = parts.dir || (defaultDir.startsWith(BASE) ? defaultDir.slice(BASE.length) : defaultDir); // relatif ke BASE
  const basePath = dir ? `${dir}/${parts.name}` : parts.name;

  const avif = asset(`${basePath}.avif`);
  const webp = asset(`${basePath}.webp`);

  // fallback:
  // - jika sumber punya ext → hormati ekstensi aslinya
  // - jika tidak ada → default .jpg
  const fallbackExt = parts.ext || "jpg";
  const fallback = asset(`${basePath}.${fallbackExt}`);

  return { avif, webp, fallback };
}

/* ===================== Infografis helpers (pakai variants) ===================== */
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = INFO_FALLBACK;
};

/* ===================== Flow image helpers (pakai variants) ===================== */
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FLOW_FALLBACK;
};

/* ===================== Audio singleton ===================== */
function getFlowAudio() {
  if (!window.__flowAudio) {
    const a = new Audio();
    a.preload = "none"; // hemat kuota
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

/* ===================== Jadwal helpers ===================== */
const DAY_NAMES_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const RULE_DEFAULT = {
  Senin: "08:00–16:00",
  Selasa: "08:00–16:00",
  Rabu: "08:00–16:00",
  Kamis: "08:00–16:00",
  Jumat: "08:00–16:30",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};
function buildRuleJadwal(service) {
  const id = (service?.id || "").toLowerCase();
  if (id === "igd") return Object.fromEntries(DAY_NAMES_ID.map((d) => [d, "00:00–24:00"]));
  if (id.includes("pelayanan-24"))
    return Object.fromEntries(DAY_NAMES_ID.map((d) => [d, "16:00–24:00, 00:00–06:00"]));
  return { ...RULE_DEFAULT };
}
function getEffectiveJadwal(s) {
  return s?.jadwal && Object.keys(s.jadwal).length ? s.jadwal : buildRuleJadwal(s);
}
const toMin = (s) => {
  const [h, m] = String(s).split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};
function parseRanges(v) {
  const t = String(v || "");
  if (t.toLowerCase().includes("tutup")) return [];
  return t.split(",").map((r) => r.trim().replace(/–|—/g, "-"));
}
function rangesForToday(j, ref = new Date()) {
  const d = ref.getDay(), day = DAY_NAMES_ID[d], prev = DAY_NAMES_ID[(d + 6) % 7];
  const today = parseRanges(j[day]), yesterday = parseRanges(j[prev]);
  const out = [];
  const push = (r, label) => {
    const [a, b] = r.split("-").map((s) => s.trim());
    if (!a || !b) return;
    const A = toMin(a), B = toMin(b);
    if (B >= A) out.push({ from: A, to: B });
    else {
      if (label === "yesterday") out.push({ from: 0, to: B });
      else out.push({ from: A, to: 1440 });
    }
  };
  yesterday.forEach((r) => push(r, "yesterday"));
  today.forEach((r) => push(r, "today"));
  return out;
}
function isOpenNow(s, ref = new Date()) {
  const j = getEffectiveJadwal(s);
  const now = ref.getHours() * 60 + ref.getMinutes();
  return rangesForToday(j, ref).some((R) => now >= R.from && now <= R.to);
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
    sky:     "bg-sky-500/15     text-sky-300     ring-1 ring-sky-400/30",
    slate:   "bg-white/8        text-white/80    ring-1 ring-white/12",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-tight ${tones[tone]}`}>
      {children}
    </span>
  );
}
function PricePill({ tarif }) {
  const n = Number(tarif || 0);
  return n === 0 ? <Pill tone="emerald">Gratis</Pill> : <Pill tone="sky">Rp {n.toLocaleString("id-ID")}</Pill>;
}
const StatusPill = ({ open }) => (
  <span className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${
    open ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
         : "bg-rose-500/10    border-rose-400/30    text-rose-300"}`}>
    {open ? "Buka" : "Tutup"}
  </span>
);

/* ===================== Sidebar ===================== */
function Sidebar({
  facilityName, query, setQuery, services,
  onPick, selected, highlightIds = [],
}) {
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (s) => { onPick(s); setExpandedId((id) => (id === s.id ? null : s.id)); };

  return (
    <aside className={`
        w-full md:w-80 shrink-0 bg-slate-950/70 backdrop-blur border-r border-white/10
        flex flex-col h-full md:h-[calc(100svh-56px)]
      `}>
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

      <div className={`
          px-4 pb-2 space-y-2 overflow-y-auto overscroll-contain [scrollbar-width:thin]
          md:max-h-[28rem] flex-1
        `}>
        <div className="text-xs uppercase text-white/50 mb-2">Daftar Poli</div>
        {services.map((s) => {
          const active = expandedId === s.id;
          const hl = highlightIds.includes(s.id);
          return (
            <div key={s.id} className="space-y-2">
              <button
                onClick={() => toggle(s)}
                className={`group w-full text-left p-3 rounded-xl border transition hover:bg-white/5 ${
                  selected?.id === s.id ? "border-emerald-500/60 bg-emerald-500/10"
                  : hl ? "border-emerald-400 bg-emerald-400/10"
                  : "border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg">{s.ikon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.nama}</div>
                    <div className="text-xs text-white/60 truncate">{s.klaster}</div>
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
  // Bangun varian berdasarkan 'img' dari service (boleh "poli-umum.avif" atau "poli-umum.jpg")
  const file = (s?.img ?? `${s?.id ?? "missing"}`).toString();
  const { avif, webp, fallback } = buildVariantsFrom(file, "infografis");

  return (
    <button
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[.98] transition text-left touch-manipulation"
    >
      {/* Gambar: full-fit (tidak terpotong) */}
      <div className="w-full bg-slate-900/40">
        <div className="h-36 sm:h-44 md:h-48 lg:h-52 grid place-items-center p-2 sm:p-3">
          <picture>
            {avif && <source srcSet={avif} type="image/avif" />}
            {webp && <source srcSet={webp} type="image/webp" />}
            <img
              src={fallback}
              alt={s.nama}
              loading="lazy"
              decoding="async"
              width={800}
              height={450}
              className="block max-h-full max-w-full object-contain"
              onError={onInfoError}
            />
          </picture>
        </div>
      </div>

      {/* Teks kartu */}
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

/* SubServiceCard: rapi & profesional */
function SubServiceCard({ item, onPick }) {
  const bpjsText = item.bpjs ? "BPJS: Tercakup" : "BPJS: Tidak Tercakup";
  const bpjsClass = item.bpjs ? "text-emerald-400" : "text-rose-400";
  const tarifText = `Tarif Umum: Rp ${Number(item.tarif || 0).toLocaleString("id-ID")}`;

  return (
    <button
      onClick={() => onPick(item)}
      className="
        relative w-full text-left rounded-2xl border border-white/10
        bg-white/5 hover:bg-white/8
        ring-0 hover:ring-1 hover:ring-white/15
        transition-all shadow-sm hover:shadow active:scale-[.99]
        focus:outline-none focus:ring-2 focus:ring-emerald-500
      "
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="text-[12px] sm:text-[13px] font-semibold tracking-tight">
          <span className={bpjsClass}>{bpjsText}</span>
        </div>
        <div className="text-[12px] sm:text-[13px] text-white/70 -mt-2">{tarifText}</div>

        <div className="h-px bg-white/10" />

        <div className="flex items-start gap-3 min-h-[92px]">
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
          </div>
        </div>
      </div>
    </button>
  );
}

/* ===================== Flow Card (pakai FLOW_STEPS) ===================== */
function FlowCard({ step, index }) {
  // step.img bisa "/alur/1-menuju-loket.avif" atau ".jpg" → siapkan variants
  const { avif, webp, fallback } = buildVariantsFrom(step?.img || "", "");

  // Audio narasi per langkah
  let lastTap = 0;
  const playNarration = () => {
    const file = step?.audio;
    if (!file) return;
    const player = getFlowAudio();
    const key = step.id;

    const url = asset(String(file).replace(/^\/+/, "")); // path dari services.js
    const now = Date.now();
    const isDoubleTap = now - lastTap < 400;
    lastTap = now;

    if (window.__flowAudioKey === key && isDoubleTap) {
      try { player.pause(); player.currentTime = 0; player.play(); } catch {}
      return;
    }
    try {
      player.pause();
      player.currentTime = 0;
      if (window.__flowAudioKey !== key || player.src !== new URL(url, location.href).href) {
        player.src = url;
      }
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

      {/* Gambar langkah (contain, tidak terpotong) */}
      <div className="p-2 sm:p-3 flex items-center justify-center">
        <picture>
          {avif && <source srcSet={avif} type="image/avif" />}
          {webp && <source srcSet={webp} type="image/webp" />}
          <img
            src={fallback || FLOW_FALLBACK}
            alt={step?.name || `Langkah ${index + 1}`}
            className="block max-w-full max-h-[12rem] md:max-h-[14rem] object-contain"
            loading="lazy"
            decoding="async"
            onError={onFlowError}
          />
        </picture>
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
    if (Array.isArray(A)) return { standar: A }; // kompatibel data lama
    return A;                                    // {key:[ids]}
  }, [sub]);

  const scenarioKeys = Object.keys(scenarios);
  const [scenarioKey, setScenarioKey] = useState(null);
  useEffect(() => {
    setScenarioKey(scenarioKeys[0] ?? null);
  }, [sub, JSON.stringify(scenarioKeys)]);

  const flowSteps = useMemo(() => {
    return (scenarios[scenarioKey] || []).map((id) => FLOW_STEPS[id]).filter(Boolean);
  }, [scenarios, scenarioKey]);

  // ==== KONDISI 1: grid poli / hasil pencarian ====
  const showSearchResults = searchQuery?.trim()?.length > 0 && subMatches?.length > 0;
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
                <div className="mb-3 text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((s) => <ServiceCard key={s.id} s={s} onPick={setSelected} />)}
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
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">{selected.nama}</h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">Jenis Layanan — {selected.nama}</div>
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.length > 0
            ? list.map((it, i) => <SubServiceCard key={i} item={it} onPick={setSub} />)
            : <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>}
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
        {flowSteps.map((step, i) => <FlowCard key={step.id ?? i} step={step} index={i} />)}
      </div>

      <div className="mt-4 sm:mt-6">
        <InfoCard title="Dokter Penanggung Jawab">
          <div className="font-semibold text-white mb-1">
            {DOCTORS_BY_POLI[selected.id] ?? "—"}
          </div>
          <div className="text-white/70">
            <p className="mb-2"><strong>Detail layanan:</strong> {sub.nama}</p>
            <p>{EXTRA_INFO[sub.nama] ?? "Informasi tambahan belum tersedia. Silakan lengkapi sesuai ketentuan layanan."}</p>
            <p className="mt-2">
              Informasi ini bersifat contoh/dummy. Silakan ganti dengan persyaratan atau instruksi khusus untuk layanan <em>{sub.nama}</em>.
            </p>
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

  const matchPoliIds = useMemo(() => Array.from(new Set(subResults.map((r) => r.poli.id))), [subResults]);
  const sidebarList = useMemo(
    () => (filtered.length === 0 && query && subResults.length > 0 ? SERVICES_CURRENT : filtered),
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

  useEffect(() => { stopFlowAudio(); setSelected(null); setQuery(""); }, [facility]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      {/* HEADER */}
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
            <div className="font-semibold">Penampil Jadwal & Tarif Layanan</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-white/60 hidden sm:block">Fasilitas</label>
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="h-9 rounded-lg bg-slate-800 text-white border border-white/10 px-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              {FACILITIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* LAYOUT dengan Drawer */}
      <div className="max-w-7xl mx-auto px-0 md:px-4 grid md:grid-cols-[24rem_1fr]">
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
           ${navOpen ? "translate-x-0 pointer-events-auto"
                     : "-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"}
          h-[100dvh] overflow-y-auto overscroll-contain`}
          role="dialog"
          aria-modal="true"
        >
          <Sidebar
            facilityName={facilityName}
            query={query}
            setQuery={setQuery}
            services={sidebarList}
            onPick={(s) => { setSelected(s); setNavOpen(false); }}
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
