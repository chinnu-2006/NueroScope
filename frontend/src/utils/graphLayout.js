import dagre from 'dagre';

/** Per-mode dagre defaults. Density tuned to feel like a real architecture map. */
export const LAYOUT_PRESETS = {
  file:      { rankdir: 'TB', ranksep: 70, nodesep: 22, nodeW: 152, nodeH: 44 },
  folder:    { rankdir: 'TB', ranksep: 70, nodesep: 26, nodeW: 152, nodeH: 52 },
  module:    { rankdir: 'LR', ranksep: 180, nodesep: 90, nodeW: 260, nodeH: 96 },
  tree:      { rankdir: 'TB', ranksep: 90, nodesep: 30, nodeW: 168, nodeH: 44 },
  callgraph: { rankdir: 'LR', ranksep: 120, nodesep: 28, nodeW: 176, nodeH: 44 },
};


/**
 * Run dagre against `nodes` and `edges`, returning nodes with `position`,
 * `sourcePosition`, `targetPosition` set for React Flow. Uses per-node
 * sizes so mixed graphs (folders + files together) route cleanly.
 */
export function layoutGraph(nodes, edges, opts = {}) {
  const preset = opts.preset ?? LAYOUT_PRESETS.file;
  const rankdir = opts.rankdir ?? preset.rankdir;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir,
    ranksep: opts.ranksep ?? preset.ranksep,
    nodesep: opts.nodesep ?? preset.nodesep,
    marginx: 40,
    marginy: 40,
    ranker: opts.ranker ?? 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  const sizeFor = opts.sizeFor ?? (() => ({ width: preset.nodeW, height: preset.nodeH }));

  nodes.forEach((n) => g.setNode(n.id, sizeFor(n)));
  // Weight "contains" edges more than "import" so folder → file dominates the ranking
  // (files cluster near their folder).
  edges.forEach((e) => g.setEdge(e.source, e.target, { weight: e.__weight ?? 1 }));

  dagre.layout(g);

  const [sourcePosition, targetPosition] =
    rankdir === 'TB' ? ['bottom', 'top'] : ['right', 'left'];

  return nodes.map((n) => {
    const p = g.node(n.id);
    const sz = sizeFor(n);
    return {
      ...n,
      position: { x: p.x - sz.width / 2, y: p.y - sz.height / 2 },
      sourcePosition,
      targetPosition,
    };
  });
}
