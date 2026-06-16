"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { getFatherName } from "@/lib/family";

export interface Member {
  id: string;
  name: string;
  birthYear?: number | null;
  deathYear?: number | null;
  gender?: string | null;
  note?: string | null;
  parentId?: string | null;
  spouseId?: string | null;
}

interface TreeNode extends Member {
  children?: TreeNode[];
}

interface Props {
  members: Member[];
  isAuthenticated: boolean;
  onAddChild: (parentId: string, parentName: string) => void;
  onAddSpouse: (spouseForId: string, spouseForName: string) => void;
  onEdit: (member: Member) => void;
  onDelete: (id: string, name: string) => void;
  onAddRoot: () => void;
  onNodeClick?: (member: Member) => void;
  focusId?: string | null;
}

const NW = 155;
const NH = 72;
const SP = 24;

function buildTree(members: Member[]): { roots: TreeNode[]; secondaryIds: Set<string> } {
  const map = new Map<string, TreeNode>();
  members.forEach((m) => map.set(m.id, { ...m }));

  const secondaryIds = new Set<string>();
  members.forEach((m) => {
    if (!m.spouseId) return;
    const other = map.get(m.spouseId);
    if (other?.spouseId === m.id) {
      if (m.id > m.spouseId) secondaryIds.add(m.id);
    } else {
      secondaryIds.add(m.spouseId);
    }
  });

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (secondaryIds.has(node.id)) return;
    if (!node.parentId) {
      roots.push(node);
    } else {
      let pid = node.parentId;
      if (secondaryIds.has(pid)) {
        pid = map.get(pid)?.spouseId ?? pid;
      }
      const parent = map.get(pid);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return { roots, secondaryIds };
}

function yearText(m: Member) {
  if (m.birthYear && m.deathYear) return `${m.birthYear} – ${m.deathYear}`;
  if (m.birthYear) return `${m.birthYear} –`;
  return "";
}
function cardFill(g?: string | null, dead?: boolean) {
  if (dead) return "#f1f5f9";
  return g === "female" ? "#fdf2f8" : "#eff6ff";
}
function cardStroke(g?: string | null, dead?: boolean) {
  if (dead) return "#94a3b8";
  return g === "female" ? "#f9a8d4" : "#93c5fd";
}


const LS_KEY = "ft-positions";

export default function FamilyTree({ members, isAuthenticated, onAddChild, onAddSpouse, onEdit, onDelete, onAddRoot, onNodeClick, focusId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const memberMap = useRef(new Map<string, Member>());
  const posMap = useRef(new Map<string, { x: number; y: number }>());
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Load saved positions once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, { x: number; y: number }>;
        Object.entries(obj).forEach(([id, p]) => posMap.current.set(id, p));
      }
    } catch { /* ignore */ }
  }, []);

  const render = useCallback(() => {
    if (!svgRef.current) return;

    memberMap.current = new Map(members.map((m) => [m.id, m]));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 900;
    const H = svgRef.current.clientHeight || 600;

    const defs = svg.append("defs");
    const f = defs.append("filter").attr("id", "sh").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
    f.append("feDropShadow").attr("dx", 0).attr("dy", 4).attr("stdDeviation", 5).attr("flood-color", "#1e293b").attr("flood-opacity", 0.12);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.08, 3])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const { roots, secondaryIds } = buildTree(members);

    // ── Empty state ──
    if (members.length === 0) {
      svg.append("text").attr("x", W / 2).attr("y", H / 2 - 16)
        .attr("text-anchor", "middle").attr("fill", "#94a3b8").attr("font-size", "15px")
        .text("Ургийн мод хоосон байна");
      if (isAuthenticated) {
        const btn = svg.append("g").attr("transform", `translate(${W / 2},${H / 2 + 20})`)
          .attr("cursor", "pointer").on("click", onAddRoot);
        btn.append("rect").attr("x", -72).attr("y", -16).attr("width", 144).attr("height", 32).attr("rx", 8).attr("fill", "#3b82f6");
        btn.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "13px").text("+ Үндэс нэмэх");
      }
      return;
    }

    // ── Tree layout (initial positions only) ──
    const hierData: TreeNode = roots.length === 1 ? roots[0] : { id: "__root__", name: "", children: roots };
    const root = d3.tree<TreeNode>().nodeSize([NW + SP + NW + 40, NH + 60])(
      d3.hierarchy<TreeNode>(hierData, (d) => d.children)
    ) as d3.HierarchyPointNode<TreeNode>;

    // Set initial positions for NEW members; keep saved positions for existing ones
    const currentIds = new Set(members.map((m) => m.id));
    posMap.current.forEach((_, id) => { if (!currentIds.has(id)) posMap.current.delete(id); });

    root.descendants().forEach((d) => {
      if (d.data.id === "__root__") return;
      if (!posMap.current.has(d.data.id)) {
        posMap.current.set(d.data.id, { x: d.x ?? 0, y: d.y ?? 0 });
      }
    });

    // Center on first render (when no saved positions for any member)
    const hasSaved = root.descendants().some((d) => {
      if (d.data.id === "__root__") return false;
      try { return !!JSON.parse(localStorage.getItem(LS_KEY) ?? "{}")[d.data.id]; } catch { return false; }
    });
    if (!hasSaved) {
      let minX = Infinity, maxX = -Infinity;
      root.descendants().forEach((d) => {
        if (d.data.id === "__root__") return;
        if (d.x < minX) minX = d.x;
        if (d.x > maxX) maxX = d.x;
      });
      svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2 - (minX + maxX) / 2, 60));
    }

    // ── Helpers ──
    function getPos(id: string) { return posMap.current.get(id) ?? { x: 0, y: 0 }; }

    function savePositions() {
      const obj: Record<string, { x: number; y: number }> = {};
      posMap.current.forEach((p, id) => { obj[id] = p; });
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    }

    const hasSpouseCard = (id: string) => {
      const sid = memberMap.current.get(id)?.spouseId;
      return !!sid && secondaryIds.has(sid) && memberMap.current.has(sid);
    };

    // ── Link path ──
    function linkD(sourceId: string, targetId: string) {
      const s = getPos(sourceId);
      const t = getPos(targetId);
      const coupleOffsetX = hasSpouseCard(sourceId) ? NW / 2 + SP / 2 : 0;
      const sx = s.x + coupleOffsetX;
      const sy = s.y + NH / 2;
      const ty = t.y - NH / 2;
      const mid = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${mid} ${t.x},${mid} ${t.x},${ty}`;
    }

    const linkData = root.links()
      .filter((l) => l.source.data.id !== "__root__")
      .map((l) => ({ sid: l.source.data.id, tid: l.target.data.id }));

    const linkPaths = g.selectAll<SVGPathElement, typeof linkData[0]>("path.link")
      .data(linkData, (d) => d.sid + "→" + d.tid)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#b8c5d6")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("d", (d) => linkD(d.sid, d.tid));

    // ── Node groups ──
    const visibleNodes = root.descendants().filter((d) => d.data.id !== "__root__");

    const node = g.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>("g.node")
      .data(visibleNodes, (d) => d.data.id)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "grab")
      .attr("transform", (d) => { const p = getPos(d.data.id); return `translate(${p.x},${p.y})`; });

    // ── Draw primary card ──
    node.append("rect")
      .attr("class", "ft-card")
      .attr("x", -NW / 2).attr("y", -NH / 2)
      .attr("width", NW).attr("height", NH).attr("rx", 13)
      .attr("fill", (d) => cardFill(d.data.gender, !!d.data.deathYear))
      .attr("stroke", (d) => cardStroke(d.data.gender, !!d.data.deathYear))
      .attr("stroke-width", 1.5).attr("filter", "url(#sh)");

    // Хүйсний тэмдэг — өнгөт chip
    const genderChip = (sel: d3.Selection<SVGGElement, d3.HierarchyPointNode<TreeNode>, SVGGElement, unknown>, gOf: (d: TreeNode) => string | null | undefined, deadOf: (d: TreeNode) => boolean) => {
      const chip = sel.filter((d) => !!gOf(d.data)).append("g")
        .attr("transform", `translate(${-NW / 2 + 15},${-NH / 2 + 15})`)
        .attr("pointer-events", "none");
      chip.append("circle").attr("r", 8)
        .attr("fill", (d) => deadOf(d.data) ? "#cbd5e1" : (gOf(d.data) === "female" ? "#fbcfe8" : "#bfdbfe"));
      chip.append("text").attr("text-anchor", "middle").attr("dy", "0.34em")
        .attr("font-size", "10px").attr("font-weight", "700")
        .attr("fill", (d) => deadOf(d.data) ? "#64748b" : (gOf(d.data) === "female" ? "#be185d" : "#1d4ed8"))
        .text((d) => gOf(d.data) === "female" ? "♀" : "♂");
    };
    genderChip(node, (d) => d.gender, (d) => !!d.deathYear);

    // Deceased cross mark for primary
    node.filter(d => !!d.data.deathYear).append("text")
      .attr("x", NW / 2 - 8).attr("y", -NH / 2 + 14)
      .attr("font-size", "11px").attr("fill", "#94a3b8").attr("text-anchor", "middle")
      .text("✝");

    // Аавын нэр (овог) — parentId байвал л харагдана
    node.append("text").attr("text-anchor", "middle").attr("y", -NH / 2 + 18)
      .attr("font-size", "10px").attr("fill", "#94a3b8").attr("font-style", "italic")
      .text((d) => {
        const father = getFatherName(d.data, memberMap.current);
        if (!father) return "";
        return father.length > 16 ? father.slice(0, 16) + "…" : father;
      });

    // Өөрийн нэр
    node.append("text").attr("text-anchor", "middle").attr("y", 2)
      .attr("font-size", "13px").attr("font-weight", "700")
      .attr("fill", (d) => d.data.deathYear ? "#94a3b8" : "#1e293b")
      .text((d) => { const n = d.data.name; return n.length > 14 ? n.slice(0, 14) + "…" : n; });

    // Он
    node.append("text").attr("text-anchor", "middle").attr("y", 17)
      .attr("font-size", "10px").attr("fill", "#64748b")
      .text((d) => yearText(d.data));

    node.append("text").attr("text-anchor", "middle").attr("y", 30)
      .attr("font-size", "10px").attr("fill", "#94a3b8")
      .text((d) => { const n = d.data.note ?? ""; return n.length > 18 ? n.slice(0, 18) + "…" : n; });

    // ── Spouse card ──
    const sOffset = NW + SP;

    const coupleNodes = node.filter((d) => hasSpouseCard(d.data.id));

    coupleNodes.append("line")
      .attr("x1", NW / 2).attr("y1", 0).attr("x2", sOffset - NW / 2).attr("y2", 0)
      .attr("stroke", "#f9a8d4").attr("stroke-width", 2).attr("stroke-dasharray", "4,3");

    coupleNodes.append("text").attr("x", sOffset / 2).attr("y", 5)
      .attr("text-anchor", "middle").attr("font-size", "11px").text("❤");

    const sg = coupleNodes.append("g").attr("transform", `translate(${sOffset},0)`);

    sg.append("rect")
      .attr("x", -NW / 2).attr("y", -NH / 2).attr("width", NW).attr("height", NH).attr("rx", 10)
      .attr("fill", (d) => { const sp = memberMap.current.get(d.data.spouseId!); return cardFill(sp?.gender, !!sp?.deathYear); })
      .attr("stroke", (d) => { const sp = memberMap.current.get(d.data.spouseId!); return cardStroke(sp?.gender, !!sp?.deathYear); })
      .attr("stroke-width", 2).attr("filter", "url(#sh)");

    genderChip(sg, (d) => memberMap.current.get(d.spouseId!)?.gender, (d) => !!memberMap.current.get(d.spouseId!)?.deathYear);

    // Deceased cross for spouse
    sg.filter(d => !!memberMap.current.get(d.data.spouseId!)?.deathYear).append("text")
      .attr("x", NW / 2 - 8).attr("y", -NH / 2 + 14)
      .attr("font-size", "11px").attr("fill", "#94a3b8").attr("text-anchor", "middle")
      .text("✝");

    // Spouse-н аавын нэр
    sg.append("text").attr("text-anchor", "middle").attr("y", -NH / 2 + 18)
      .attr("font-size", "10px").attr("fill", "#94a3b8").attr("font-style", "italic")
      .text((d) => {
        const sp = memberMap.current.get(d.data.spouseId!);
        if (!sp) return "";
        const father = getFatherName(sp, memberMap.current);
        return father.length > 16 ? father.slice(0, 16) + "…" : father;
      });

    sg.append("text").attr("text-anchor", "middle").attr("y", 2)
      .attr("font-size", "13px").attr("font-weight", "700")
      .attr("fill", (d) => memberMap.current.get(d.data.spouseId!)?.deathYear ? "#94a3b8" : "#1e293b")
      .text((d) => { const n = memberMap.current.get(d.data.spouseId!)?.name ?? ""; return n.length > 14 ? n.slice(0, 14) + "…" : n; });

    sg.append("text").attr("text-anchor", "middle").attr("y", 17)
      .attr("font-size", "10px").attr("fill", "#64748b")
      .text((d) => yearText(memberMap.current.get(d.data.spouseId!) ?? d.data));

    // ── Auth buttons ──
    if (isAuthenticated) {
      // + child
      node.append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${NW / 2 - 10},${-NH / 2 + 10})`)
        .on("click", (e, d) => { e.stopPropagation(); onAddChild(d.data.id, d.data.name); })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#22c55e");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").attr("font-weight", "bold").text("+");
        });

      // ❤ add spouse (only if no spouse)
      node.filter((d) => !hasSpouseCard(d.data.id))
        .append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${NW / 2 - 10},${NH / 2 - 10})`)
        .on("click", (e, d) => { e.stopPropagation(); onAddSpouse(d.data.id, d.data.name); })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#ec4899");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.4em").attr("fill", "white").attr("font-size", "11px").text("❤");
        });

      // ✏ edit primary
      node.append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${-NW / 2 + 10},${NH / 2 - 10})`)
        .on("click", (e, d) => { e.stopPropagation(); onEdit(d.data); })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#f59e0b");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.4em").attr("fill", "white").attr("font-size", "11px").text("✏");
        });

      // × delete primary
      node.append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${-NW / 2 + 10},${-NH / 2 + 10})`)
        .on("click", (e, d) => { e.stopPropagation(); onDelete(d.data.id, d.data.name); })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#ef4444");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").text("×");
        });

      // ✏ edit spouse
      sg.append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${-NW / 2 + 10},${NH / 2 - 10})`)
        .on("click", (e, d) => {
          e.stopPropagation();
          const sp = memberMap.current.get(d.data.spouseId!);
          if (sp) onEdit(sp);
        })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#f59e0b");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.4em").attr("fill", "white").attr("font-size", "11px").text("✏");
        });

      // × delete spouse
      sg.append("g").attr("cursor", "pointer")
        .attr("transform", `translate(${NW / 2 - 10},${-NH / 2 + 10})`)
        .on("click", (e, d) => {
          e.stopPropagation();
          const sp = memberMap.current.get(d.data.spouseId!);
          if (sp) onDelete(sp.id, sp.name);
        })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#ef4444");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").text("×");
        });
    }

    // ── Drag each node independently ──
    let dragMoved = false;

    const drag = d3.drag<SVGGElement, d3.HierarchyPointNode<TreeNode>>()
      .on("start", function (event) {
        dragMoved = false;
        event.sourceEvent.stopPropagation();
        d3.select(this).attr("cursor", "grabbing").raise();
      })
      .on("drag", function (event, d) {
        dragMoved = true;
        const p = posMap.current.get(d.data.id);
        if (!p) return;
        p.x += event.dx;
        p.y += event.dy;
        d3.select(this).attr("transform", `translate(${p.x},${p.y})`);
        linkPaths.attr("d", (ld) => linkD(ld.sid, ld.tid));
      })
      .on("end", function () {
        d3.select(this).attr("cursor", "grab");
        savePositions();
      });

    node.call(drag);

    node.on("click", (e, d) => {
      if (dragMoved) return;
      e.stopPropagation();
      onNodeClick?.(d.data);
    });

    sg.on("click", (e, d) => {
      e.stopPropagation();
      if (dragMoved) return;
      const sp = memberMap.current.get(d.data.spouseId!);
      if (sp) onNodeClick?.(sp);
    });

  }, [members, isAuthenticated, onAddChild, onAddSpouse, onDelete, onAddRoot, onEdit, onNodeClick]);

  useEffect(() => {
    render();
    const obs = new ResizeObserver(render);
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, [render]);

  // Focus/zoom to a specific member
  useEffect(() => {
    if (!focusId || !svgRef.current || !zoomBehaviorRef.current) return;
    const pos = posMap.current.get(focusId);
    if (!pos) return;
    const W = svgRef.current.clientWidth;
    const H = svgRef.current.clientHeight;
    d3.select(svgRef.current)
      .transition().duration(700)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(W / 2 - pos.x, H / 2 - pos.y).scale(1));
  }, [focusId]);

  const handleExport = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.fillStyle = "#f6f9fd";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "urgiin-mod.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{
        display: "block", width: "100%", height: "100%",
        background:
          "radial-gradient(circle at center, #d4ddea 1.1px, transparent 1.1px) 0 0 / 24px 24px," +
          "linear-gradient(160deg, #f6f9fd 0%, #eef3f9 100%)",
      }} />
      <button onClick={handleExport} title="PNG татах" className="ft-btn" style={{
        position: "absolute", bottom: 18, right: 18,
        background: "rgba(255,255,255,0.92)", border: "1px solid var(--line)",
        backdropFilter: "blur(6px)", color: "var(--ink-soft)",
        boxShadow: "var(--shadow-md)",
      }}>📥 PNG татах</button>
    </div>
  );
}
