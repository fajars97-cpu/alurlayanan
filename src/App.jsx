import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * App.jsx – Alur Layanan (Vite + React + Tailwind)
 * Fitur:
 * - Sidebar: daftar poli + expand jadwal saat item diklik
 * - Status pill Buka/Tutup dihitung dari jadwal harian
 * - Aturan default jadwal:
 *    • IGD → 7×24 jam
 *    • Pelayanan 24 Jam → 16:00–24:00 & 00:00–06:00 (lintas hari)
 *    • Lainnya → Senin–Jumat 08:00–16:00; Sabtu/Minggu Tutup
 * - Pencarian global: jika mengetik nama layanan (mis. “cabut gigi”),
 *   hasil pelayanan langsung muncul & kliknya membuka alur 9 langkah
 *   tanpa harus memilih polinya dulu.
 * - Path aset aman untuk GitHub Pages via import.meta.env.BASE_URL
 */

// ===== Path helper (aman untuk GitHub Pages) =====
const BASE = import.meta.env.BASE_URL ?? "/";
const asset = (p) => `${BASE}${String(p).replace(/^\/+/, "")}`;

// --- Direktori publik
const DIR_INFO = `${BASE}infografis`;
const DIR_FLOW = `${BASE}alur`;

// ===== Infografis per poli =====
const resolveInfografis = (service) => {
  const file = (service?.img ?? `${service?.id ?? "missing"}.jpg`).toString();
  if (/^https?:\/\//.test(file)) return file;
  if (file.startsWith("/")) return asset(file);
  return `${DIR_INFO}/${file}`;
};
const INFO_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" fill="white" font-family="Segoe UI,Arial" font-size="22" text-anchor="middle" dominant-baseline="middle">Infografis tidak ditemukan</text></svg>';
const onInfoError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = INFO_FALLBACK; };

// ===== Alur shared (kode → nama file) =====
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
const onFlowError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = FLOW_FALLBACK; };

// ===== Data contoh (silakan ganti/extend) =====
const SERVICES = [
  {
    id: "poli-umum",
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    lokasi: "Lantai 1 — Ruang 101",
    telemed: true,
    jadwal: {
      Senin: "08:00–12:00, 13:00–16:00",
      Selasa: "08:00–12:00, 13:00–16:00",
      Rabu: "08:00–12:00, 13:00–16:00",
      Kamis: "08:00–12:00, 13:00–16:00",
      Jumat: "08:00–11:00",
      Sabtu: "Tutup",
      Minggu: "Tutup",
    },
    img: "poli-umum.jpg.png",
    layanan: [
      { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0, ket: "Konsultasi dokter umum", alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Kontrol Berkala",   ikon: "📅", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Surat Keterangan Sehat", ikon: "📝", tarif: 15000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Konseling",         ikon: "💬", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
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
      { nama: "Cabut Gigi",        ikon: "🦷", tarif: 30000, alur: [1,2,3,4,5,0,0,0,0] },
      { nama: "Scaling (Pembersihan Karang)", ikon: "🪥", tarif: 40000, alur: [1,3,4,5,0,0,0,0,0] },
      { nama: "Penambalan Gigi",   ikon: "🧱", tarif: 30000, alur: [1,3,2,4,5,0,0,0,0] },
      { nama: "Konsultasi Gigi",   ikon: "💬", tarif: 0, alur: [1,3,5,0,0,0,0,0,0] },
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
    layanan: [
      { nama: "Tindakan Darurat", ikon: "⚡", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
    ],
  },
  {
    id: "pelayanan-24-jam",
    nama: "Pelayanan 24 Jam",
    klaster: "Layanan Malam",
    ikon: "🌙",
    lokasi: "Lantai 1 — Layanan 24 Jam",
    telemed: false,
    img: "pelayanan-24-jam.jpg",
    layanan: [
      { nama: "Pelayanan Malam", ikon: "🌙", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
    ],
  },
  {
    id: "kia-kb",
    nama: "KIA / KB",
    klaster: "Kesehatan Ibu & Anak",
    ikon: "👶",
    lokasi: "Lantai 2 — Ruang KIA",
    telemed: false,
    img: "kia-kb.jpg",
    layanan: [
      { nama: "Pemeriksaan Kehamilan", ikon: "🤰", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
      { nama: "Suntik KB",             ikon: "💉", tarif: 15000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Implant KB",            ikon: "🧷", tarif: 75000, alur: [1,2,5,0,0,0,0,0,0] },
      { nama: "Konseling Laktasi",     ikon: "🍼", tarif: 0, alur: [1,5,0,0,0,0,0,0,0] },
    ],
  },
];

// ===== Helpers Waktu & Jadwal =====
const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const RULE_DEFAULT = {
  Senin:  "08:00–16:00",
  Selasa: "08:00–16:00",
  Rabu:   "08:00–16:00",
  Kamis:  "08:00–16:00",
  Jumat:  "08:00–16:00",
  Sabtu:  "Tutup",
  Minggu: "Tutup",
};

function buildRuleJadwal(service){
  const id = (service?.id||"").toLowerCase();
  const name = (service?.nama||"").toLowerCase();
  if (id === "igd" || name.includes("igd")) {
    return Object.fromEntries(DAY_NAMES_ID.map(d => [d, "00:00–24:00"])); // 24/7
  }
  if (id.includes("pelayanan-24") || name.includes("pelayanan 24 jam")) {
    // 16:00–24:00 dan 00:00–06:00 setiap hari
    return Object.fromEntries(DAY_NAMES_ID.map(d => [d, "16:00–24:00, 00:00–06:00"]));
  }
  return { ...RULE_DEFAULT };
}

function getEffectiveJadwal(service){
  return service?.jadwal && Object.keys(service.jadwal).length
    ? service.jadwal
    : buildRuleJadwal(service);
}

const toMin = (s) => { const [h,m] = String(s).split(":").map(n=>parseInt(n,10)||0); return h*60+m; };

function parseRanges(val){
  const txt = String(val||"");
  if (txt.toLowerCase().includes("tutup")) return [];
  return txt.split(",").map(r => r.trim().replace(/–|—/g, "-"));
}

function rangesForToday(jadwal, refDate=new Date()){
  const dayIdx = refDate.getDay();
  const day = DAY_NAMES_ID[dayIdx];
  const prev = DAY_NAMES_ID[(dayIdx+6)%7];

  const today = parseRanges(jadwal[day]);
  const yesterday = parseRanges(jadwal[prev]);

  const out = [];
  const pushSplit = (r, labelDay) => {
    const [a,b] = r.split("-").map(s=>s.trim());
    if(!a||!b) return;
    const A = toMin(a), B = toMin(b);
    if (B >= A) {
      out.push({ from:A, to:B, source:labelDay }); // normal
    } else {
      if (labelDay === "yesterday") {
        // carry ke hari ini: 00:00..B
        out.push({ from:0, to:B, source:"carry" });
      } else {
        // today overnight: A..24:00
        out.push({ from:A, to:24*60, source:"today" });
      }
    }
  };

  yesterday.forEach(r => pushSplit(r, "yesterday"));
  today.forEach(r => pushSplit(r, "today"));
  return out;
}

function isOpenNow(service, refDate=new Date()){
  const jadwal = getEffectiveJadwal(service);
  const now = refDate.getHours()*60 + refDate.getMinutes();
  return rangesForToday(jadwal, refDate).some(R => now >= R.from && now <= R.to);
}

function todayText(service, refDate=new Date()){
  const segs = rangesForToday(getEffectiveJadwal(service), refDate).map(R => {
    const toHM = (m)=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
    return `${toHM(R.from)}–${toHM(R.to===1440?1439:R.to)}`;
  });
  return segs.length ? segs.join(", ") : "Tutup";
}

// ===== UI Kecil =====
const Chip = ({ children }) => (
  <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 whitespace-nowrap">{children}</span>
);

function Rupiah({ n }){
  if (typeof n !== "number") return null;
  if (n === 0) return <span className="px-2 rounded bg-emerald-600/20 text-emerald-300">Gratis</span>;
  return <span className="px-2 rounded bg-sky-600/20 text-sky-300">Rp {n.toLocaleString("id-ID")}</span>;
}

const StatusPill = ({ open }) => (
  <span className={`ml-auto text-[11px] px-2 py-1 rounded-full border ${open?"bg-emerald-500/10 border-emerald-400/30 text-emerald-300":"bg-rose-500/10 border-rose-400/30 text-rose-300"}`}>{open?"Buka":"Tutup"}</span>
);

// ===== Sidebar =====
function Sidebar({ query, setQuery, services, onPick, selected }){
  const [expandedId, setExpandedId] = useState(null);
  const toggle = (s) => { onPick(s); setExpandedId(id => id===s.id? null : s.id); };

  return (
    <aside className="w-full md:w-[23rem] shrink-0 bg-slate-950/70 backdrop-blur border-r border-white/10">
      <div className="p-4 flex items-center gap-2 border-b border-white/10">
        <div className="size-8 rounded-xl bg-emerald-600 grid place-items-center">🏥</div>
        <div className="font-semibold">Jadwal & Tarif</div>
      </div>

      <div className="p-4 space-y-3">
        <label className="text-xs uppercase text-white/50">Pencarian</label>
        <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Cari 'umum', 'gigi', 'cabut gigi' ..." className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div className="px-4 pb-2 max-h-[calc(100svh-200px)] overflow-auto space-y-2">
        <div className="text-xs uppercase text-white/50 mb-2">Daftar Poli</div>
        {services.map((s)=>{
          const active = expandedId === s.id;
          return (
            <div key={s.id} className="space-y-2">
              <button onClick={()=>toggle(s)} className={`group w-full text-left p-3 rounded-xl border transition hover:bg-white/5 ${selected?.id===s.id?"border-emerald-500/60 bg-emerald-500/10":"border-white/10"}`}>
                <div className="flex items-center gap-3">
                  <div className="text-lg">{s.ikon}</div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.nama}</div>
                    <div className="text-xs text-white/60 truncate">{s.klaster}</div>
                  </div>
                  <StatusPill open={isOpenNow(s)} />
                </div>
              </button>

              {active && (
                <div className="mx-2 mb-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="text-white/60 mb-1">Jadwal</div>
                  <div className="text-white/90 mb-2">Hari ini: <b>{todayText(s)}</b></div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-white/70">
                    {DAY_NAMES_ID.map((d)=>(
                      <React.Fragment key={d}>
                        <span className="text-white/50">{d}</span>
                        <span>{getEffectiveJadwal(s)[d]||"Tutup"}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {services.length===0 && <div className="text-sm text-white/50">Tidak ada hasil untuk kata kunci.</div>}
      </div>
    </aside>
  );
}

// ===== Kartu =====
function ServiceCard({ s, onPick }){
  return (
    <button onClick={()=>onPick(s)} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left">
      <div className="aspect-[16/9] w-full overflow-hidden">
        <img src={resolveInfografis(s)} onError={onInfoError} alt={s.nama} className="w-full h-full object-cover group-hover:scale-105 transition" />
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

function SubServiceCard({ item, onPick }){
  return (
    <button onClick={()=>onPick(item)} className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="text-xl">{item.ikon ?? "🧩"}</div>
          <div className="font-semibold">{item.nama}</div>
          <div className="ml-auto">{typeof item.tarif === "number" ? <Rupiah n={item.tarif} /> : null}</div>
        </div>
        {item.ket && <div className="text-sm text-white/60 mt-1">{item.ket}</div>}
      </div>
    </button>
  );
}

function FlowCard({ code, index }){
  const src = resolveFlowImg(code);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-3 pt-2 text-[11px] text-white/50">Langkah {index+1}</div>
      <div className="p-3 flex items-center justify-center">
        {src ? (
          <img src={src} onError={onFlowError} alt={`Langkah ${index+1}`} className="max-w-full h-auto object-contain" />
        ) : (
          <div className="w-full aspect-[4/3] grid place-items-center text-white/30 text-sm">—</div>
        )}
      </div>
    </div>
  );
}

// ===== Panel Kanan =====
function RightPanel({ selected, setSelected, filtered, subMatches, onPickSub, jump, setJump, searchQuery }){
  const [sub, setSub] = useState(null);
  useEffect(()=>setSub(null), [selected]);

  // buka otomatis sub-layanan saat datang dari hasil pencarian
  useEffect(()=>{
    if (jump && selected && selected.id === jump.poliId) {
      setSub(selected.layanan?.[jump.idx] ?? null);
      setJump(null);
    }
  }, [jump, selected, setJump]);

  // 1) belum pilih poli → tampilkan hasil pelayanan (jika ada) + grid poli
  if (!selected) {
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div key="grid-poli" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:.25 }}>
            {searchQuery && subMatches?.length>0 && (
              <section className="mb-6">
                <div className="mb-2 text-white/70">Hasil Pelayanan</div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {subMatches.map(({ poli, item, index }) => (
                    <SubServiceCard key={poli.id+'#'+index} item={{ ...item, nama: `${item.nama} — ${poli.nama}` }} onPick={()=>onPickSub(poli.id, index)} />
                  ))}
                </div>
              </section>
            )}

            <div className="mb-3 text-white/70">Pilih poli untuk melihat jenis layanannya.</div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((s)=>(<ServiceCard key={s.id} s={s} onPick={setSelected}/>))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 2) sudah pilih poli, belum pilih layanan → grid sub-layanan
  if (!sub) {
    const list = selected.layanan ?? [];
    return (
      <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={()=>setSelected(null)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20">← Kembali</button>
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
          {list.length>0 ? list.map((it,i)=> <SubServiceCard key={i} item={it} onPick={setSub} />) : (
            <div className="text-white/60">Belum ada jenis layanan terdaftar.</div>
          )}
        </div>
      </div>
    );
  }

  // 3) sudah pilih layanan → 9 langkah alur
  const steps = Array.from({ length: 9 }, (_, i) => sub.alur?.[i] ?? 0);
  return (
    <div className="min-h-[calc(100svh-64px)] p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={()=>setSub(null)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20">← Kembali</button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl">{selected.ikon}</div>
        <h2 className="text-xl md:text-2xl font-semibold">{selected.nama} — {sub.nama}</h2>
        <div className="ml-auto flex gap-2">
          <Chip>{selected.klaster}</Chip>
          {selected.telemed && <Chip>Telemed</Chip>}
        </div>
      </div>

      <div className="text-white/70">Alur layanan untuk: <span className="font-medium">{sub.nama}</span></div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((code, i) => (<FlowCard key={i} code={code} index={i} />))}
      </div>
    </div>
  );
}

// ===== App Root =====
export default function App(){
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  // filter poli berdasar query (nama/klaster)
  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return SERVICES.filter(s => !q || s.nama.toLowerCase().includes(q) || s.klaster.toLowerCase().includes(q));
  }, [query]);

  // hasil pencarian untuk sub-layanan
  const subResults = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const rows = [];
    SERVICES.forEach((p) => (p.layanan||[]).forEach((item, idx) => {
      const hay = `${(item.nama||"").toLowerCase()} ${(item.ket||"").toLowerCase()}`;
      if (hay.includes(q)) rows.push({ poli: p, item, index: idx });
    }));
    return rows;
  }, [query]);

  // loncat otomatis ke sub-layanan (dipakai RightPanel)
  const [jump, setJump] = useState(null);
  function handlePickSub(poliId, idx){
    const p = SERVICES.find(x=>x.id===poliId);
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
        <Sidebar query={query} setQuery={setQuery} services={filtered} onPick={(s)=>setSelected(s)} selected={selected} />
        <RightPanel selected={selected} setSelected={setSelected} filtered={filtered} subMatches={subResults} onPickSub={handlePickSub} jump={jump} setJump={setJump} searchQuery={query} />
      </div>

      <footer className="py-6 text-center text-white/50 text-sm">© {new Date().getFullYear()} Puskesmas Jagakarsa — Mockup UI.</footer>
    </div>
  );
}
