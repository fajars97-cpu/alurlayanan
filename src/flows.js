// src/flows.js

// Subflow Laboratorium (bisa direuse di layanan lain)
const subflow_lab = {
  nodes: [
    { id: "lab_ke",    type: "step", data: { img: 6, label: "Menuju Laboratorium (Lt. 3)" } },
    { id: "lab_wait",  type: "step", data: { img: 7, label: "Menunggu Hasil" } },
    { id: "lab_back",  type: "step", data: { img: 8, label: "Kembali ke Poli Umum (baca hasil)" } },
  ],
  edges: [
    { from: "lab_ke",   to: "lab_wait" },
    { from: "lab_wait", to: "lab_back" },
  ],
};

// Kumpulan flow per layanan (kunci: "<id-poli>/<slug-layanan>")
export const FLOWS = {
  // Poli Umum — Pemeriksaan Umum (dengan decision cek lab)
  "poli-umum/pemeriksaan-umum": {
    nodes: [
      { id: "loket",   type: "step",     data: { img: 1, label: "Menuju Loket" } },
      { id: "poli",    type: "step",     data: { img: 9, label: "Menuju Poli Umum" } },
      { id: "cekLab",  type: "decision", data: { key: "cekLab", label: "Perlu Cek Laboratorium?" } },
      { id: "lab",     type: "group",    data: { ref: "subflow_lab" } },
      { id: "farmasi", type: "step",     data: { img: 4, label: "Farmasi" } },
      { id: "done",    type: "step",     data: { img: 5, label: "Selesai" } },
    ],
    edges: [
      { from: "loket",  to: "poli" },
      { from: "poli",   to: "cekLab" },
      { from: "cekLab", to: "lab",     when: "ctx.decisions.cekLab === 'ya'" },
      { from: "cekLab", to: "farmasi", when: "ctx.decisions.cekLab === 'tidak'" },
      { from: "lab",    to: "farmasi" },
      { from: "farmasi",to: "done" },
    ],
    subflows: { subflow_lab },
    start: "loket",
  },
};
