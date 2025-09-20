import React, { useMemo, useState, useEffect } from "react";
import { evalFlow, linearFromArray } from "./flowEngine";
import { FLOWS } from "./flows";

// === util slugify untuk konsistensi key ===
const slugify = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// === Dummy data poli & layanan (cukup untuk test) ===
const SERVICES_JAGAKARSA = [
  {
    id: "poli-umum",
    nama: "Poli Umum",
    klaster: "Pelayanan Medik",
    ikon: "🩺",
    layanan: [
      { nama: "Pemeriksaan Umum", ikon: "🩺", tarif: 0 },
      { nama: "Kontrol Berkala", ikon: "📅", tarif: 0 },
    ],
  },
  {
    id: "poli-gigi",
    nama: "Poli Gigi",
    klaster: "Pelayanan Medik",
    ikon: "🦷",
    layanan: [
      { nama: "Cabut Gigi", ikon: "🦷", tarif: 30000 },
      { nama: "Scaling", ikon: "🪥", tarif: 40000 },
    ],
  },
];

function ServiceCard({ s, onPick }) {
  return (
    <button
      onClick={() => onPick(s)}
      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left w-full"
    >
      <div className="text-lg">{s.ikon}</div>
      <div className="font-semibold">{s.nama}</div>
      <div className="text-xs text-white/60">{s.klaster}</div>
    </button>
  );
}

function SubServiceCard({ item, onPick }) {
  return (
    <button
      onClick={() => onPick(item)}
      className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left w-full"
    >
      <div className="flex items-center gap-2">
        <div>{item.ikon}</div>
        <div className="font-semibold">{item.nama}</div>
      </div>
    </button>
  );
}

function FlowStepCard({ node, idx }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/50 mb-2">Langkah {idx + 1}</div>
      <div className="font-semibold">{node.data?.label || node.id}</div>
    </div>
  );
}

function FlowDecisionCard({ node, current, onAnswer }) {
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
      <div className="font-semibold mb-2">{node.data?.label}</div>
      <div className="flex gap-2">
        <button
          onClick={() => onAnswer("ya")}
          className={`px-3 py-1 rounded-lg border ${
            current === "ya"
              ? "bg-emerald-600/30 border-emerald-500/60"
              : "bg-white/10 border-white/20"
          }`}
        >
          Ya
        </button>
        <button
          onClick={() => onAnswer("tidak")}
          className={`px-3 py-1 rounded-lg border ${
            current === "tidak"
              ? "bg-rose-600/30 border-rose-500/60"
              : "bg-white/10 border-white/20"
          }`}
        >
          Tidak
        </button>
      </div>
    </div>
  );
}

// === Right Panel untuk render alur ===
function RightPanel({ selected, sub, onBackSub, onBack }) {
  const [decisions, setDecisions] = useState({});

  const serviceKey = selected && sub ? `${selected.id}/${slugify(sub.nama)}` : null;
  const graph = (serviceKey && FLOWS[serviceKey]) || linearFromArray(sub?.alur || []);

  // DEBUG LOG
  useEffect(() => {
    if (serviceKey) {
      console.log("[flow] serviceKey:", serviceKey);
      console.log("[flow] has graph:", !!FLOWS[serviceKey]);
      if (FLOWS[serviceKey]) {
        console.log("[flow] graph.start:", FLOWS[serviceKey].start);
        console.log("[flow] graph.nodes:", FLOWS[serviceKey].nodes.map((n) => n.id));
      }
    }
  }, [serviceKey]);

  const path = useMemo(
    () => (graph ? evalFlow(graph, graph.start, { decisions }) : []),
    [graph, decisions]
  );

  // DEBUG path hasil evaluasi
  useEffect(() => {
    if (path.length) {
      console.log(
        "[flow] rendered path:",
        path.map((n) => `${n.type}:${n.data?.label || n.id}`)
      );
    }
  }, [path]);

  if (!selected) {
    return <div className="p-6 text-white/60">Pilih poli di sebelah kiri.</div>;
  }

  if (!sub) {
    return (
      <div className="p-6 space-y-3">
        <button onClick={onBack} className="px-3 py-2 rounded bg-white/10">
          ← Kembali
        </button>
        <h2 className="font-semibold text-lg">{selected.nama}</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {selected.layanan.map((it, i) => (
            <SubServiceCard key={i} item={it} onPick={() => onBackSub(it)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <button onClick={() => onBackSub(null)} className="px-3 py-2 rounded bg-white/10">
        ← Kembali
      </button>
      <h2 className="font-semibold text-lg">
        {selected.nama} — {sub.nama}
      </h2>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {path.map((node, i) => {
          if (node.type === "step") {
            return <FlowStepCard key={node.id} node={node} idx={i} />;
          }
          if (node.type === "decision") {
            const key = node.data.key;
            return (
              <FlowDecisionCard
                key={node.id}
                node={node}
                current={decisions[key]}
                onAnswer={(val) => setDecisions((d) => ({ ...d, [key]: val }))}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

// === Root App ===
export default function App() {
  const [selected, setSelected] = useState(null);
  const [sub, setSub] = useState(null);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="p-4 font-semibold border-b border-white/10">
        Penampil Jadwal & Alur — Experimental Flow
      </header>
      <div className="grid md:grid-cols-[20rem_1fr]">
        <aside className="p-4 border-r border-white/10 space-y-3">
          {SERVICES_JAGAKARSA.map((s) => (
            <ServiceCard key={s.id} s={s} onPick={(ss) => { setSelected(ss); setSub(null); }} />
          ))}
        </aside>
        <RightPanel
          selected={selected}
          sub={sub}
          onBack={() => setSelected(null)}
          onBackSub={(x) => setSub(x)}
        />
      </div>
    </div>
  );
}
