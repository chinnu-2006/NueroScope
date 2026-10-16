import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Waypoints } from 'lucide-react';

import CategoryNode from '../components/graph/CategoryNode.jsx';
import FolderNode from '../components/graph/FolderNode.jsx';
import ModuleGroupNode from '../components/graph/ModuleGroupNode.jsx';
import GraphToolbar from '../components/graph/GraphToolbar.jsx';
import GraphModeSwitcher from '../components/graph/GraphModeSwitcher.jsx';
import GraphFiltersBar from '../components/graph/GraphFiltersBar.jsx';
import GraphIconToolbar from '../components/graph/GraphIconToolbar.jsx';
import GraphBottomLegend from '../components/graph/GraphBottomLegend.jsx';
import GraphAIAssistant from '../components/graph/GraphAIAssistant.jsx';
import NodeDetailPanel from '../components/panels/NodeDetailPanel.jsx';
import PhasePlaceholder from '../components/loading/PhasePlaceholder.jsx';
import { useGraph } from '../hooks/useGraph.js';
import { useRepo } from '../hooks/useRepo.jsx';
import { CATEGORIES, deriveCategory, FILTER_CATEGORIES, withAlpha } from '../utils/nodeCategories.js';
import { LAYOUT_PRESETS, layoutGraph } from '../utils/graphLayout.js';


const NODE_TYPES = {
  category: CategoryNode,
  folder: FolderNode,
  module: ModuleGroupNode,
};

const rfDefaultEdgeOptions = { type: 'bezier', animated: false };


/** Choose the RF custom node type based on the raw kind + id. */
function nodeTypeFor(rawNode) {
  const k = rawNode.kind;
  const id = rawNode.id || '';
  if (k === 'folder' || k === 'folder_root' || id.startsWith('__folder__')) return 'folder';
  const MODULE_KINDS = ['module_group', 'frontend', 'api', 'db', 'service', 'utility', 'test', 'docs'];
  if (id.startsWith('__module__') && MODULE_KINDS.includes(k)) return 'module';
  return 'category';
}


/** File view: keep source code files + anything that has edges. */
function filterFileGraph(raw) {
  const connected = new Set();
  raw.edges.forEach((e) => {
    connected.add(e.source);
    connected.add(e.target);
  });
  const CODE = new Set(['Python', 'JavaScript', 'TypeScript']);
  const nodes = raw.nodes.filter((n) => CODE.has(n.language) || connected.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = raw.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return { nodes, edges };
}


/**
 * File-mode enrichment: derive folder nodes from file paths, add "contains"
 * edges from folder → file so dagre clusters files near their owning folder.
 * Folders are keyed by their full path; the "root" bucket holds top-level files.
 */
function enrichWithFolders(view) {
  const nodes = [...view.nodes];
  const edges = [...view.edges];
  const folderIds = new Map(); // path → id

  const ensureFolder = (folderPath) => {
    if (!folderPath) return null;
    if (folderIds.has(folderPath)) return folderIds.get(folderPath);
    const id = `__folder__${folderPath}`;
    folderIds.set(folderPath, id);
    nodes.push({
      id,
      path: folderPath,
      name: folderPath.split('/').pop(),
      kind: 'folder',
      lines: 0,
      complexity: 0,
      language: 'Folder',
    });
    return id;
  };

  // Every real file gets a folder → file "contains" edge. Folder-to-parent
  // edges connect the folder hierarchy so dagre lays out cleanly.
  for (const n of view.nodes) {
    if (!n.path || n.id.startsWith('__')) continue;
    const parts = n.path.split('/');
    if (parts.length <= 1) continue; // root files have no folder
    const parentFolder = parts.slice(0, -1).join('/');
    const parentFolderId = ensureFolder(parentFolder);
    if (parentFolderId) {
      edges.push({
        id: `__contains__${parentFolderId}->${n.id}`,
        source: parentFolderId,
        target: n.id,
        kind: 'contains',
        __weight: 4, // stronger pull in dagre
      });
    }
  }
  // Connect folder → sub-folder so the tree reads.
  for (const [folderPath, folderId] of folderIds) {
    const parts = folderPath.split('/');
    if (parts.length <= 1) continue;
    const parentPath = parts.slice(0, -1).join('/');
    const parentFolderId = folderIds.get(parentPath);
    if (parentFolderId) {
      edges.push({
        id: `__contains__${parentFolderId}->${folderId}`,
        source: parentFolderId,
        target: folderId,
        kind: 'contains',
        __weight: 4,
      });
    }
  }

  return { nodes, edges };
}


function buildRfNodes(raw, extras = {}) {
  return raw.nodes.map((n) => {
    const category = deriveCategory(n);
    const data = {
      raw: n,
      category,
      title: n.name,
      subtitle: n.path,
      language: n.language,
      fileCount: n.file_count,
      dimmed: false,
      highlighted: false,
    };
    if (extras.collapsibleFolders && (n.kind === 'folder' || n.kind === 'folder_root' || n.id?.startsWith('__folder__'))) {
      data.collapsed = extras.isCollapsed?.(n.path) ?? false;
      data.onToggleCollapse = () => extras.toggleCollapse?.(n.path);
    }
    return {
      id: n.id,
      type: nodeTypeFor(n),
      position: { x: 0, y: 0 },
      data,
    };
  });
}


/** Build RF edges. `kind: 'contains'` becomes a very soft folder→file line;
 * `import` edges inherit the SOURCE node's category color for the reference
 * "everything glows in its own color" look.
 */
function buildRfEdges(raw, nodeIndex) {
  return raw.edges.map((e) => {
    if (e.kind === 'contains') {
      const target = nodeIndex.get(e.target);
      const color = target?.data?.category?.color || 'rgba(148,163,184,0.35)';
      return {
        id: e.id ?? `${e.source}->${e.target}`,
        source: e.source,
        target: e.target,
        type: 'bezier',
        style: { stroke: withAlpha(color, '55'), strokeWidth: 1, strokeDasharray: '4 4' },
        __edgeKind: 'contains',
      };
    }
    const source = nodeIndex.get(e.source);
    const color = source?.data?.category?.color || 'rgba(148,163,184,0.5)';
    const weightBoost = e.weight ? Math.min(3.5, 1 + Math.log2(e.weight)) : 1.2;
    return {
      id: e.id ?? `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: 'bezier',
      style: { stroke: withAlpha(color, 'bb'), strokeWidth: weightBoost },
      __edgeKind: 'import',
      __baseColor: color,
    };
  });
}


function sizeForMode(mode) {
  const preset = LAYOUT_PRESETS[mode];
  return (n) => {
    const isFolder = n.data?.raw?.kind === 'folder' || n.data?.raw?.kind === 'folder_root' || n.id?.startsWith('__folder__');
    if (isFolder) return { width: 152, height: 52 };
    if (mode === 'module') return { width: 260, height: 96 };
    return { width: preset.nodeW, height: preset.nodeH };
  };
}


function GraphInner() {
  const { repoId } = useRepo();
  const [mode, setMode] = useState('file');
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState(() => new Set(FILTER_CATEGORIES));
  const [activeLayers, setActiveLayers] = useState(() => new Set());
  const [layersInitialized, setLayersInitialized] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);
  const { fitView, zoomIn } = useReactFlow();

  const { data, loading, hasRepo } = useGraph(mode);

  // Collapse handling — click on a folder chevron toggles it.
  const toggleCollapse = useCallback((folderPath) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  }, []);
  const isCollapsed = useCallback((folderPath) => {
    if (!folderPath) return false;
    // A file/folder is hidden if any ancestor folder is collapsed.
    const parts = folderPath.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const anc = parts.slice(0, i).join('/');
      if (collapsedFolders.has(anc)) return true;
    }
    return collapsedFolders.has(folderPath);
  }, [collapsedFolders]);

  // Per-mode view assembly (filter + enrich).
  const view = useMemo(() => {
    if (!data) return null;
    if (mode === 'file')   return enrichWithFolders(filterFileGraph(data));
    return data;
  }, [data, mode]);

  // Apply collapsed-folder filter to nodes/edges before layout.
  const visibleView = useMemo(() => {
    if (!view) return null;
    if (mode !== 'file' && mode !== 'folder') return view;
    if (collapsedFolders.size === 0) return view;
    const hiddenNodes = new Set();
    for (const n of view.nodes) {
      if (n.id.startsWith('__folder__')) continue; // folder itself is always shown
      if (n.kind === 'folder_root') continue;
      const parts = (n.path || '').split('/');
      for (let i = 1; i < parts.length; i++) {
        const anc = parts.slice(0, i).join('/');
        if (collapsedFolders.has(anc)) {
          hiddenNodes.add(n.id);
          break;
        }
      }
    }
    const nodes = view.nodes.filter((n) => !hiddenNodes.has(n.id));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = view.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges };
  }, [view, mode, collapsedFolders]);

  // Category counts for the "Types" dropdown.
  const counts = useMemo(() => {
    if (!visibleView) return {};
    const c = {};
    visibleView.nodes.forEach((n) => {
      if (n.id.startsWith('__folder__') || n.id.startsWith('__module__')) return;
      const id = deriveCategory(n).id;
      c[id] = (c[id] || 0) + 1;
    });
    return c;
  }, [visibleView]);

  // Top-level directories for the "Layers" dropdown.
  const [allLayers, layerCounts] = useMemo(() => {
    if (!visibleView) return [[], {}];
    const c = {};
    for (const n of visibleView.nodes) {
      if (n.id.startsWith('__folder__') || n.id.startsWith('__module__')) continue;
      if (!n.path) continue;
      const top = n.path.split('/')[0];
      c[top] = (c[top] || 0) + 1;
    }
    const dirs = Object.keys(c).sort();
    return [dirs, c];
  }, [visibleView]);

  // Auto-populate active layers on first load.
  useEffect(() => {
    if (allLayers.length && !layersInitialized) {
      setActiveLayers(new Set(allLayers));
      setLayersInitialized(true);
    }
  }, [allLayers, layersInitialized]);

  // Bidirectional neighborhood — powers focus mode.
  const neighborhood = useMemo(() => {
    if (!visibleView) return new Map();
    const m = new Map();
    visibleView.nodes.forEach((n) => m.set(n.id, new Set([n.id])));
    visibleView.edges.forEach((e) => {
      if (e.kind === 'contains') return; // folder-file "contains" doesn't count as a real dep
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    });
    return m;
  }, [visibleView]);

  const nodesById = useMemo(() => {
    const m = new Map();
    (visibleView?.nodes ?? []).forEach((n) => m.set(n.id, n));
    return m;
  }, [visibleView]);

  // Lay out + build RF-node state whenever the view or mode changes.
  useEffect(() => {
    if (!visibleView) {
      setRfNodes([]);
      setRfEdges([]);
      setSelectedId(null);
      return;
    }
    const base = buildRfNodes(visibleView, {
      collapsibleFolders: mode === 'file' || mode === 'folder',
      isCollapsed,
      toggleCollapse,
    });
    const laid = layoutGraph(base, visibleView.edges, {
      preset: LAYOUT_PRESETS[mode],
      sizeFor: sizeForMode(mode),
    });
    const nodeIndex = new Map(laid.map((n) => [n.id, n]));
    setRfNodes(laid);
    setRfEdges(buildRfEdges(visibleView, nodeIndex));
    setSelectedId(null);
    setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 80);
  }, [visibleView, mode, fitView, isCollapsed, toggleCollapse]);

  // Recompute per-node/edge visual state when filters/selection/search change.
  useEffect(() => {
    if (!visibleView) return;
    const q = query.trim().toLowerCase();
    const searching = q.length > 0;
    const matches = new Set();
    if (searching) {
      visibleView.nodes.forEach((n) => {
        if (
          n.name?.toLowerCase().includes(q) ||
          n.path?.toLowerCase().includes(q)
        ) {
          matches.add(n.id);
        }
      });
    }

    const inCategoryFilter = (n) => {
      const cat = deriveCategory(n).id;
      // Structural nodes (folders / module groups) are always shown; the
      // category filter is only meaningful for real files.
      if (!FILTER_CATEGORIES.includes(cat)) return true;
      return activeCategories.has(cat);
    };

    const inLayerFilter = (n) => {
      if (!activeLayers.size) return true;
      if (n.id.startsWith('__folder__') || n.id.startsWith('__module__')) return true;
      const top = (n.path || '').split('/')[0];
      return activeLayers.has(top);
    };

    const focusSet = selectedId ? neighborhood.get(selectedId) : null;

    setRfNodes((ns) =>
      ns.map((rn) => {
        const raw = rn.data.raw;
        const filterOk = inCategoryFilter(raw) && inLayerFilter(raw);
        const searchOk = !searching || matches.has(rn.id);
        const focusOk = !focusSet || focusSet.has(rn.id);
        const dimmed = !(filterOk && searchOk && focusOk);
        const highlighted = rn.id === selectedId || (searching && matches.has(rn.id));
        return { ...rn, data: { ...rn.data, dimmed, highlighted } };
      }),
    );

    setRfEdges((es) =>
      es.map((e) => {
        const isContains = e.__edgeKind === 'contains';
        const touchSelected =
          selectedId && (e.source === selectedId || e.target === selectedId);
        const baseColor = e.__baseColor || 'rgba(148,163,184,0.5)';

        if (isContains) {
          return {
            ...e,
            animated: false,
            style: { ...e.style, opacity: selectedId ? 0.15 : 1 },
          };
        }
        if (touchSelected) {
          return {
            ...e,
            animated: true,
            style: { stroke: baseColor, strokeWidth: 2.2, filter: `drop-shadow(0 0 6px ${baseColor})` },
          };
        }
        return {
          ...e,
          animated: false,
          style: {
            stroke: selectedId ? withAlpha(baseColor, '22') : withAlpha(baseColor, 'bb'),
            strokeWidth: 1.2,
          },
        };
      }),
    );
  }, [visibleView, query, activeCategories, activeLayers, selectedId, neighborhood]);

  const matchCount = useMemo(() => {
    if (!query.trim() || !visibleView) return 0;
    const q = query.trim().toLowerCase();
    return visibleView.nodes.filter(
      (n) => n.name?.toLowerCase().includes(q) || n.path?.toLowerCase().includes(q),
    ).length;
  }, [query, visibleView]);

  const onNodeClick = useCallback(
    (_, node) => setSelectedId((prev) => (prev === node.id ? null : node.id)),
    [],
  );
  const onPaneClick = useCallback(() => setSelectedId(null), []);

  const onFit = useCallback(() => fitView({ padding: 0.15, duration: 400 }), [fitView]);
  const onZoomIn = useCallback(() => zoomIn({ duration: 200 }), [zoomIn]);
  const onLayoutRefresh = useCallback(() => {
    if (!visibleView) return;
    const base = buildRfNodes(visibleView, {
      collapsibleFolders: mode === 'file' || mode === 'folder',
      isCollapsed,
      toggleCollapse,
    });
    const laid = layoutGraph(base, visibleView.edges, {
      preset: LAYOUT_PRESETS[mode],
      sizeFor: sizeForMode(mode),
    });
    const nodeIndex = new Map(laid.map((n) => [n.id, n]));
    setRfNodes(laid);
    setRfEdges(buildRfEdges(visibleView, nodeIndex));
    setSelectedId(null);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 60);
  }, [visibleView, mode, fitView, isCollapsed, toggleCollapse]);

  const toggleCategory = useCallback((id) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleLayer = useCallback((id) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submitSearch = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (!q || !visibleView) return;
    const hit = visibleView.nodes.find(
      (n) => n.name?.toLowerCase().includes(q) || n.path?.toLowerCase().includes(q),
    );
    if (hit) {
      setSelectedId(hit.id);
      setTimeout(() => fitView({ nodes: [{ id: hit.id }], padding: 0.6, duration: 500 }), 30);
    }
  }, [query, visibleView, fitView]);

  const expandAll = useCallback(() => setCollapsedFolders(new Set()), []);
  const collapseAll = useCallback(() => {
    if (!view) return;
    const s = new Set();
    view.nodes.forEach((n) => {
      if (n.id.startsWith('__folder__') && n.path) s.add(n.path);
    });
    setCollapsedFolders(s);
  }, [view]);

  if (!hasRepo) {
    return (
      <PhasePlaceholder
        icon={Waypoints}
        title="Interactive Dependency Graph"
        subtitle="Analyze a repository from the top nav to see its architecture as a graph."
      />
    );
  }

  const selectedNode = selectedId ? rfNodes.find((n) => n.id === selectedId) : null;
  const selectedMeta = selectedNode ? buildNodeMeta(selectedNode, visibleView, nodesById) : null;
  const collapsible = mode === 'file' || mode === 'folder';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-3">
        <h1 className="text-2xl font-semibold tracking-tight">Graph Visualization</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Interactive dependency graph of the codebase
        </p>
      </div>

      {/* Mode tabs */}
      <div className="px-8 mb-3">
        <GraphModeSwitcher value={mode} onChange={setMode} />
      </div>

      {/* Filters + toolbar row */}
      <div className="px-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <GraphFiltersBar
          query={query}
          onQueryChange={setQuery}
          onSubmit={submitSearch}
          matchCount={matchCount}
          activeCategories={activeCategories}
          onToggleCategory={toggleCategory}
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
          allLayers={allLayers}
          counts={counts}
          layerCounts={layerCounts}
        />
        <GraphToolbar
          onFitView={onFit}
          onLayout={onLayoutRefresh}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          collapsible={collapsible}
        />
      </div>

      {/* Canvas */}
      <div className="relative mx-8 mb-4 flex-1 min-h-[560px] rounded-lg overflow-hidden hairline bg-surface-base grid-bg">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center pointer-events-none">
            <div className="text-sm text-ink-muted">Building graph…</div>
          </div>
        )}

        {visibleView && visibleView.nodes.length === 0 && !loading ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <div className="text-sm text-ink-muted">No nodes to display in this view.</div>
          </div>
        ) : (
          <>
            <GraphIconToolbar
              onZoomIn={onZoomIn}
              onFitView={onFit}
              onRelayout={onLayoutRefresh}
            />

            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={NODE_TYPES}
              defaultEdgeOptions={rfDefaultEdgeOptions}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              proOptions={{ hideAttribution: true }}
              minZoom={0.1}
              maxZoom={2}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(255,255,255,0.05)" />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) => n?.data?.category?.color || 'var(--ink-muted)'}
                nodeStrokeColor="transparent"
                nodeBorderRadius={4}
                maskColor="rgba(10,14,26,0.65)"
              />
            </ReactFlow>

            <GraphBottomLegend />

            <NodeDetailPanel
              repoId={repoId}
              nodeMeta={selectedMeta}
              onClose={() => setSelectedId(null)}
            />
          </>
        )}
      </div>

      {/* Bottom AI Code Assistant panel */}
      <div className="mx-8 mb-8">
        <GraphAIAssistant
          onCitationClick={(hit) => {
            const target = rfNodes.find((n) => n.data.raw.id === hit.file_id);
            if (target) {
              setSelectedId(target.id);
              setTimeout(
                () => fitView({ nodes: [{ id: target.id }], padding: 0.6, duration: 500 }),
                40,
              );
            }
          }}
        />
      </div>
    </div>
  );
}




function buildNodeMeta(rfNode, view, nodesById) {
  const raw = rfNode.data.raw;
  const category = rfNode.data.category;
  const isSyntheticGroup =
    raw.id?.startsWith('__folder__') || raw.id?.startsWith('__module__');
  // Component Tree / Call Graph nodes are functions, not files — there's no
  // file-detail record keyed by their synthetic id. They carry `file_id`
  // pointing at the file they're defined in; show that file's detail panel
  // instead (title/subtitle still show the function/component name+path).
  const isSyntheticDef = raw.id?.startsWith('__def__') || raw.id?.startsWith('__fn__');

  if (!isSyntheticGroup) {
    return {
      id: isSyntheticDef && raw.file_id ? raw.file_id : raw.id,
      title: rfNode.data.title,
      subtitle: rfNode.data.subtitle,
      category,
      kind: raw.kind,
      raw,
      isFile: true,
    };
  }

  // Aggregate group info from the current view.
  const samplePaths = [];
  let fileCount = 0;
  let language = raw.language;
  let lines = raw.lines || 0;

  if (raw.id.startsWith('__folder__')) {
    const prefix = raw.path ? raw.path + '/' : '';
    for (const n of view.nodes) {
      if (n.id.startsWith('__')) continue;
      if (raw.path === '' ? true : n.path?.startsWith(prefix) || n.path === raw.path) {
        fileCount += 1;
        if (samplePaths.length < 12) samplePaths.push(n.path);
      }
    }
  } else if (raw.id.startsWith('__module__')) {
    fileCount = raw.file_count ?? 0;
  }

  return {
    id: raw.id,
    title: rfNode.data.title,
    subtitle: rfNode.data.subtitle,
    category,
    kind: raw.kind,
    raw,
    isFile: false,
    groupInfo: { fileCount, language, lines, samplePaths },
  };
}


export default function GraphVisualization() {
  return (
    <ReactFlowProvider>
      <GraphInner />
    </ReactFlowProvider>
  );
}
