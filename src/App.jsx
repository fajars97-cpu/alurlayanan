import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================================================
   Path & Asset Helpers (aman untuk GitHub Pages)
============================================================================ */
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;

const DIR_INFO = `${BASE}infografis`;
const DIR_FLOW = `${BASE}alur`;

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

const FLOW_MAP = {
  0: null,
  1: "1-menuju-loket.jpg",
  2: "2-menuju-kasir.jpg",
  3: "3-menuju-poli-gigi.jpg",
  4: "4-menuju-farmasi.jpg",
  5: "5-selesai.jpg",
};
const resolveFlowImg = (code) => {
  const f = FLOW_MAP[code] ?? null;
  return f ? `${DIR_FLOW}/${f}` : null;
};
const FLOW_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="16" text-anchor="middle" dominant-baseline="middle">Gambar alur tidak ditemukan</text></svg>';
const onFlowError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FLOW_FALLBACK;
};

/* ============================================================================
   Data Contoh (silakan ganti/extend sesuai kebutuhan)
============================================================================ */
const SERVICES = [
  {
    id: "poli-umum",
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    lokasi: "Lantai 1 — Ruang 101",
    telemed: true,
    img: "poli-umum.jpg.png",
    layanan: [
      {
        nama: "Pemeriksaan Umum",
        ikon: "🩺",
        tarif: 0,
        ket: "Konsultasi dokter umum",
        alur: [1, 5],
      },
      { nama: "Kontrol Berkala", ikon: "📅", tarif: 0, alur: [1, 5] },
      {
        nama: "Surat Keterangan Sehat",
        ikon: "📝",
        tarif: 15000,
        alur: [1, 2, 5],
      },
    ],
  },
  {
    id: "poli-gigi",
    nama: "Poli Gigi",
    klaster: "Pelayanan Medik",
    ikon: "🦷",
    lokasi: "Lantai 1 — Ruang 103",
    telemed: false,
    img: "poli-gigi.jpg",
    layanan: [
      { nama: "Cabut Gigi", ikon: "🦷", tarif: 30000, alur: [1, 2, 3, 4, 5] },
      {
        nama: "Scaling (Pembersihan Karang)",
        ikon: "🪥",
        tarif: 40000,
        alur: [1, 3, 4, 5],
      },
      {
        nama: "Penambalan Gigi",
        ikon: "🧱",
        tarif: 30000,
        alur: [1, 3, 2, 4, 5],
      },
    ],
  },
  {
    id: "igd",
    nama: "IGD",
    klaster: "Gawat Darurat",
    ikon: "🚑",
    lokasi: "Lantai Dasar — IGD",
    telemed: false,
    img: "igd.jpg",
    layanan: [{ nama: "Tindakan Darurat", ikon: "⚡", tarif: 0, alur: [1, 5] }],
  },
  {
    id: "pelayanan-24-jam",
    nama: "Pelayanan 24 Jam",
    klaster: "Layanan Malam",
    ikon: "🌙",
    lokasi: "Lantai 1 — Layanan 24 Jam",
    telemed: false,
    img: "pelayanan-24-jam.jpg",
    layanan: [{ nama: "Pelayanan Malam", ikon: "🌙", tarif: 0, alur: [1, 5] }],
  },
];

/* ============================================================================
   Jadwal & Status Buka
   - IGD → 00:00–24:00 (semua hari)
   - Pelayanan 24 Jam → 16:00–24:00 dan 00:00–06:00 (lintas hari)
   - Lainnya → Sen–Jum 08:00–16:00; Sab–Min Tutup
============================================================================ */
const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const RULE_DEFAULT = {
  Senin: "08:00–16:00",
  Selasa: "08:00–16:00",
  Rabu: "08:00–16:00",
  Kamis: "08:00–16:00",
  Jumat: "08:00–16:00",
  Sabtu: "Tutup",
  Minggu: "Tutup",
};

function buildRuleJadwal(service) {
  const id = (service?.id || "").toLowerCase();
  const name = (service?.nama || "").toLowerCase();
  if (id === "igd" || name.includes("igd")) {
    return Object.fromEntries(DAY_NAMES_ID.map((d) => [d, "00:00–24:00"])); // 24/7
  }
  if (id.includes("pelayanan-24") || name.includes("pelayanan 24 jam")) {
    return Object.fromEntries(
      DAY_NAMES_ID.map((d) => [d, "16:00–24:00, 00:00–06:00"])
    );
  }
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
  const d = ref.getDay();
  const day = DAY_NAMES_ID[d];
  const prev = DAY_NAMES_ID[(d + 6) % 7];

  const today = parseRanges(j[day]);
  const yesterday = parseRanges(j[prev]);

  const out = [];
  const push = (r, label) => {
    const [a, b] = r.split("-").map((s) => s.trim());
    if (!a || !b) return;
    const A = toMin(a),
      B = toMin(b);
    if (B >= A) {
      out.push({ from: A, to: B });
    } else {
      // overnight
      if (label === "yesterday") out.push({ from: 0, to: B }); // carry ke hari ini
      else out.push({ from: A, to: 1440 }); // hingga 24:00
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

/* ============================================================================
   UI Atoms
============================================================================ */
const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">
    {children}
  </span>
);

function Rupiah({ n }) {
  if (typeof n !== "number") return null;
  if (n === 0)
    return (
      <span className="px-2 rounded bg-emerald-600/20 text-emerald-300">
        Gratis
      </span>
    );
  return (
    <span className="px-2 rounded bg-sky-600/20 text-sky-300">
      Rp {n.toLocaleString("id-ID")}
    </span>
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

/* ============================================================================
   Sidebar
============================================================================ */
function Sidebar({
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
    <aside className="w-full md:w-[23rem] shrink-0 bg-slate-950/70 backdrop-blur border-r border-white/10">
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">
          🏥
        </div>
        <div className="font-semibold">Jadwal & Tarif</div>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..."
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="px-4 pb-2 max-h-[calc(100svh-200px)] overflow-auto space-y-2">
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
                  <div className="min-w-0">
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

/* ============================================================================
   Cards
============================================================================ */
function ServiceCard({ s, onPick }) {
  return (
    <button
      onClick={() => onPick(s)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
    >
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img
          src={resolveInfografis(s)}
          onError={onInfoError}
          alt={s.nama}
          className="w-full h-full object-cover"
        />
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

function SubServiceCard({ item, onPick }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">{item.ikon ?? "🧩"}</div>
          <div className="font-semibold">{item.nama}</div>
          <div className="ml-auto">
            {typeof item.tarif === "number" ? <Rupiah n={item.tarif} /> : null}
          </div>
        </div>
        {item.ket && <div className="text-sm text-white/60 mt-1">{item.ket}</div>}
      </div>
    </button>
  );
}

function FlowCard({ code, index }) {
  const src = resolveFlowImg(code);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-white/50">Langkah {index + 1}</div>
      <div className="p-3 flex items-center justify-center">
        {src ? (
          <img
            src={src}
            onError={onFlowError}
            alt={`Langkah ${index + 1}`}
            className="max-w-full h-auto object-contain"
          />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">
            —
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   Right Panel
============================================================================ */
function RightPanel({
  selected,
  setSelected,
  filtered,
  subMatches,
  onPickSub,
  jump,
  setJump,
  searchQuery,
}) {
  const [sub, setSub] = useState(null);
  useEffect(() => setSub(null), [selected]);

  // auto-buka sub-layanan ketika datang dari hasil pencarian
  useEffect(() => {
    if (jump && selected && selected.id === jump.poliId) {
      setSub(selected.layanan?.[jump.idx] ?? null);
      setJump(null);
    }
  }, [jump, selected, setJump]);

  // 1) awal: jika ada hasil pelayanan, tampilkan itu dan sembunyikan grid poli
  if (!selected) {
    const hasServiceResults = searchQuery && subMatches?.length > 0;
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="grid-poli"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            {hasServiceResults && (
              <section className="mb-6">
                <div className="mb-2 text-white/70">Hasil Pelayanan</div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subMatches.map(({ poli, item, index }) => (
                    <SubServiceCard
                      key={poli.id + "#" + index}
                      item={{ ...item, nama: `${item.nama} — ${poli.nama}` }}
                      onPick={() => onPickSub(poli.id, index)}
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasServiceResults && (
              <>
                <div className="mb-3 text-white/70">
                  Pilih poli untuk melihat jenis layanannya.
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

  // 2) sudah pilih poli → daftar layanan
  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelected(null)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
          >
            ← Kembali
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl">{selected.ikon}</div>
          <h2 className="text-xl md:text-2xl font-semibold">{selected.nama}</h2>
          <div className="ml-auto flex gap-2">
            <Chip>{selected.klaster}</Chip>
            {selected.telemed && <Chip>Telemed</Chip>}
          </div>
        </div>

        <div className="mb-1 text-white/70">Jenis Layanan — {selected.nama}</div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.length > 0 ? (
            list.map((it, i) => <SubServiceCard key={i} item={it} onPick={setSub} />)
          ) : (
            <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  // 3) sudah pilih layanan → alur
  const steps = Array.from({ length: 9 }, (_, i) => sub.alur?.[i] ?? 0);
  const visibleSteps = steps.filter((code) => code && code !== 0);

  return (
    <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSub(null)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
        >
          ← Kembali
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-xl md:text-2xl font-semibold">
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {visibleSteps.map((code, i) => (
          <FlowCard key={i} code={code} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   App Root
============================================================================ */
export default function App() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // filter poli berdasar nama/klaster
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter(
      (s) =>
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.klaster.toLowerCase().includes(q)
    );
  }, [query]);

  // hasil pencarian untuk sub-layanan (pelayanan)
  const subResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    SERVICES.forEach((p) =>
      (p.layanan || []).forEach((item, idx) => {
        const hay = `${(item.nama || "").toLowerCase()} ${(item.ket || "").toLowerCase()}`;
        if (hay.includes(q)) rows.push({ poli: p, item, index: idx });
      })
    );
    return rows;
  }, [query]);

  // poli yang relevan → highlight
  const matchPoliIds = useMemo(
    () => Array.from(new Set(subResults.map((r) => r.poli.id))),
    [subResults]
  );

  // daftar untuk sidebar: kalau filter poli kosong tapi ada hasil pelayanan → tampilkan semua poli
  const sidebarList = useMemo(() => {
    if (filtered.length === 0 && query && subResults.length > 0) return SERVICES;
    return filtered;
  }, [filtered, query, subResults]);

  // loncat otomatis ke sub-layanan
  const [jump, setJump] = useState(null);
  function handlePickSub(poliId, idx) {
    const p = SERVICES.find((x) => x.id === poliId);
    if (!p) return;
    setSelected(p);
    setJump({ poliId, idx });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <header className="sticky top-0 z-30 backdrop-blur bg-slate-900/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-600 grid place-items-center">🏥</div>
            <div className="font-semibold">Penampil Jadwal & Tarif Layanan</div>
          </div>
          <div className="ml-auto hidden md:flex text-sm gap-2 text-white/70">
            <Chip>Mobile-first</Chip>
            <Chip>Infografis</Chip>
            <Chip>Animated</Chip>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto md:px-4 grid md:grid-cols-[24rem_1fr]">
        <Sidebar
          query={query}
          setQuery={setQuery}
          services={sidebarList}
          onPick={(s) => setSelected(s)}
          selected={selected}
          highlightIds={matchPoliIds}
        />
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
