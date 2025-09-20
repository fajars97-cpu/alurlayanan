// src/flowEngine.js
// Evaluator sederhana untuk graph-based flow (tanpa library).

export function evalFlow(flow, startId, ctx) {
  if (!flow) return [];
  const nodesById = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
  const edgesFrom = flow.edges.reduce((acc, e) => {
    (acc[e.from] ||= []).push(e);
    return acc;
  }, {});

  const guardOK = (expr) => {
    if (!expr) return true;
    try {
      // contoh expr: "ctx.decisions.cekLab === 'ya'"
      return Function("ctx", `return (${expr})`)(ctx || {});
    } catch {
      return false;
    }
  };

  const expandGroup = (node) => {
    if (node.type !== "group") return [node];
    const ref = node.data?.ref;
    const sub = flow.subflows?.[ref];
    if (!sub) return [node];
    // flatten (tanpa nested untuk kesederhanaan)
    return sub.nodes.map(sn => ({ ...sn, _fromGroup: ref }));
  };

  const out = [];
  let cur = startId;

  while (cur) {
    const node = nodesById[cur];
    if (!node) break;

    out.push(...expandGroup(node));

    // berhenti dulu di decision; tunggu input user
    if (node.type === "decision") break;

    const next = (edgesFrom[cur] || []).find(e => guardOK(e.when));
    cur = next?.to ?? null;
  }
  return out;
}

// Adapter: bikin flow linear dari array angka (back-compat)
export function linearFromArray(steps) {
  const nodes = [];
  const edges = [];
  let prev = null;

  (Array.isArray(steps) ? steps : []).filter(Boolean).forEach((code, i) => {
    const id = `s${i}_${code}`;
    nodes.push({ id, type: "step", data: { img: code, label: `Langkah ${i + 1}` } });
    if (prev) edges.push({ from: prev, to: id });
    prev = id;
  });

  return { nodes, edges, subflows: {}, start: nodes[0]?.id || null };
}
