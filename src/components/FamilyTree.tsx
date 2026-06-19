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
  photo?: string | null;
  parentId?: string | null;
  parent2Id?: string | null; // нөгөө эцэг/эх
  relation?: string | null; // "adopted" | "step" | null(төрсөн)
  // legacy (Marriage хүснэгт рүү шилжсэн) — зөвхөн хуучин өгөгдөлд
  spouseId?: string | null;
  spouseStatus?: string | null;
}

export interface Marriage {
  id: string;
  partner1Id: string;
  partner2Id: string;
  status?: string | null; // null=гэрлэсэн, "divorced"=салсан
}

interface TreeNode extends Member {
  children?: TreeNode[];
}

interface Props {
  members: Member[];
  marriages: Marriage[];
  isAuthenticated: boolean; // засах эрх (admin эсвэл sub-admin)
  canDelete?: boolean;      // устгах эрх (зөвхөн admin)
  groupMove?: boolean;      // бүлгээр зөөх горим (хүн + бүх удам)
  onAddChild: (parentId: string, parentName: string) => void;
  onAddSpouse: (spouseForId: string, spouseForName: string) => void;
  onAddParent: (childForId: string, childForName: string) => void;
  onEdit: (member: Member) => void;
  onDelete: (id: string, name: string) => void;
  onToggleMarriage: (marriageId: string, status: "divorced" | null) => void;
  onAddRoot: () => void;
  onNodeClick?: (member: Member) => void;
  focusId?: string | null;
}

const NW = 155;
const NH = 72;
const SP = 24;

interface SpouseCard { spouseId: string; status: string | null; marriageId: string }
interface SpouseModel {
  secondaryIds: Set<string>;                       // хосын карт болж шингэсэн (hierarchy-д ороогүй)
  anchorOf: Map<string, string>;                   // secondaryId → anchorId
  spousesOfAnchor: Map<string, SpouseCard[]>;      // anchorId → хосын картууд (эгнээний дараалал)
}

// Marriage-уудаас хэн нь "anchor" (модонд), хэн нь "хосын карт" болохыг тооцно.
function buildSpouseModel(members: Member[], marriages: Marriage[]): SpouseModel {
  const map = new Map(members.map((m) => [m.id, m]));
  const secondaryIds = new Set<string>();
  const anchorOf = new Map<string, string>();
  const spousesOfAnchor = new Map<string, SpouseCard[]>();

  for (const mar of marriages) {
    const a = map.get(mar.partner1Id);
    const b = map.get(mar.partner2Id);
    if (!a || !b) continue;

    // Эцэг/эхгүй (зөвхөн хань) талыг картаар үзүүлнэ
    let anchorId: string, spouseId: string;
    if (!a.parentId && b.parentId) { anchorId = b.id; spouseId = a.id; }
    else if (a.parentId && !b.parentId) { anchorId = a.id; spouseId = b.id; }
    else { anchorId = a.id; spouseId = b.id; }

    if (secondaryIds.has(anchorId) && !secondaryIds.has(spouseId)) {
      [anchorId, spouseId] = [spouseId, anchorId];
    }
    if (secondaryIds.has(spouseId) || secondaryIds.has(anchorId)) continue;

    secondaryIds.add(spouseId);
    anchorOf.set(spouseId, anchorId);
    const list = spousesOfAnchor.get(anchorId) ?? [];
    list.push({ spouseId, status: mar.status ?? null, marriageId: mar.id });
    spousesOfAnchor.set(anchorId, list);
  }

  return { secondaryIds, anchorOf, spousesOfAnchor };
}

function buildTree(members: Member[], model: SpouseModel): { roots: TreeNode[] } {
  const map = new Map<string, TreeNode>();
  members.forEach((m) => map.set(m.id, { ...m }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (model.secondaryIds.has(node.id)) return;
    if (!node.parentId) {
      roots.push(node);
    } else {
      let pid = node.parentId;
      if (model.secondaryIds.has(pid)) pid = model.anchorOf.get(pid) ?? pid;
      const parent = map.get(pid);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return { roots };
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

export default function FamilyTree({ members, marriages, isAuthenticated, canDelete = false, groupMove = false, onAddChild, onAddSpouse, onAddParent, onEdit, onDelete, onToggleMarriage, onAddRoot, onNodeClick, focusId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const memberMap = useRef(new Map<string, Member>());
  const posMap = useRef(new Map<string, { x: number; y: number }>());
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Гишүүний дэлгэц дээрх бодит байрлалыг буцаана (эхнэр/нөхрийг хосын offset-оор тооцно)
  const effectivePosRef = useRef<((id: string) => { x: number; y: number } | null) | null>(null);

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
    // Дахин зурахаас өмнө одоогийн зум/гүйлгэлтийг хадгална (устгах/засах үед байрлал алдагдахгүй)
    const prevTransform = d3.zoomTransform(svgRef.current);
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

    const spouseModel = buildSpouseModel(members, marriages);
    const { secondaryIds, anchorOf, spousesOfAnchor } = spouseModel;
    const { roots } = buildTree(members, spouseModel);

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

    // Өмнө зум/гүйлгэсэн байсан бол түүнийг сэргээнэ (re-render үед байрлал хэвээр)
    const isIdentity = prevTransform.k === 1 && prevTransform.x === 0 && prevTransform.y === 0;
    if (!isIdentity) {
      svg.call(zoom.transform, prevTransform);
    } else {
      // Анх удаа — модыг голлуулна
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
    }

    // ── Helpers ──
    function getPos(id: string) { return posMap.current.get(id) ?? { x: 0, y: 0 }; }

    // Хосыг anchor-ийн хоёр тал руу ээлжлэн байрлуулна (тус бүр нь anchor-той шууд холбогдоно)
    // idx: 0→баруун, 1→зүүн, 2→баруун2, 3→зүүн2 ...
    function slotOffsetX(idx: number) {
      const side = idx % 2 === 0 ? 1 : -1;
      const mag = Math.floor(idx / 2) + 1;
      return side * mag * (NW + SP);
    }

    // Secondary хосын эгнээний индекс ба anchor-ийг буцаана
    function spouseSlot(id: string): { anchorId: string; idx: number } | null {
      const anchorId = anchorOf.get(id);
      if (!anchorId) return null;
      const list = spousesOfAnchor.get(anchorId) ?? [];
      const idx = list.findIndex((s) => s.spouseId === id);
      return idx >= 0 ? { anchorId, idx } : null;
    }

    // Secondary хосын бодит байрлал = anchor-ийн байрлал + slot offset
    function getEffectivePos(id: string) {
      if (secondaryIds.has(id)) {
        const slot = spouseSlot(id);
        if (slot) {
          const p = getPos(slot.anchorId);
          return { x: p.x + slotOffsetX(slot.idx), y: p.y };
        }
      }
      return getPos(id);
    }

    // focus useEffect-д ашиглах: байрлал мэдэгдэхгүй бол null
    effectivePosRef.current = (id: string) => {
      if (!memberMap.current.has(id)) return null;
      if (secondaryIds.has(id)) {
        const slot = spouseSlot(id);
        if (slot && posMap.current.has(slot.anchorId)) {
          const p = posMap.current.get(slot.anchorId)!;
          return { x: p.x + slotOffsetX(slot.idx), y: p.y };
        }
        return null;
      }
      return posMap.current.get(id) ?? null;
    };

    function savePositions() {
      const obj: Record<string, { x: number; y: number }> = {};
      posMap.current.forEach((p, id) => { obj[id] = p; });
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    }

    const spousesOf = (id: string): SpouseCard[] => spousesOfAnchor.get(id) ?? [];
    const hasSpouseCard = (id: string) => spousesOf(id).length > 0;

    // ── Link path ──
    // Хүүхдийн холбоос нь түүний хоёр эцэг/эхийн (хосын) дундаас гарна.
    function childLinkD(childId: string) {
      const child = memberMap.current.get(childId);
      if (!child?.parentId) return "";
      const p1 = getEffectivePos(child.parentId);

      // Нөгөө эцэг/эхийн байрлал — parent2Id, эсвэл ганц хань/anchor-аас тооцно
      let p2: { x: number; y: number } | null = null;
      if (child.parent2Id && memberMap.current.has(child.parent2Id)) {
        p2 = getEffectivePos(child.parent2Id);
      } else {
        const spouses = spousesOf(child.parentId);
        if (spouses.length === 1) p2 = getEffectivePos(spouses[0].spouseId);
        else if (secondaryIds.has(child.parentId)) {
          const anchorId = anchorOf.get(child.parentId);
          if (anchorId) p2 = getEffectivePos(anchorId);
        }
      }

      const t = getEffectivePos(childId);
      const sx = p2 ? (p1.x + p2.x) / 2 : p1.x;
      const sy = p1.y + NH / 2;
      const ty = t.y - NH / 2;
      const mid = (sy + ty) / 2;
      return `M${sx},${sy} C${sx},${mid} ${t.x},${mid} ${t.x},${ty}`;
    }

    // parentId-тэй (эцэг/эх нь байгаа) бүх гишүүнд холбоос — primary болон хосын карт хоёуланд
    const linkChildIds = members
      .filter((m) => m.parentId && memberMap.current.has(m.parentId))
      .map((m) => m.id);

    const linkPaths = g.selectAll<SVGPathElement, string>("path.link")
      .data(linkChildIds, (d) => d)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const rel = memberMap.current.get(d)?.relation;
        return rel === "adopted" || rel === "step" ? "#c4b5fd" : "#b8c5d6";
      })
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", (d) => {
        const rel = memberMap.current.get(d)?.relation;
        return rel === "adopted" || rel === "step" ? "6,5" : null;
      })
      .attr("d", (d) => childLinkD(d));

    // ── Node groups ──
    const visibleNodes = root.descendants().filter((d) => d.data.id !== "__root__");

    const node = g.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>("g.node")
      .data(visibleNodes, (d) => d.data.id)
      .join("g")
      .attr("class", "node")
      .attr("data-id", (d) => d.data.id)
      .attr("cursor", isAuthenticated ? "grab" : "pointer")
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
    const genderChip = (sel: d3.Selection<SVGGElement, d3.HierarchyPointNode<TreeNode>, d3.BaseType, unknown>, gOf: (d: TreeNode) => string | null | undefined, deadOf: (d: TreeNode) => boolean) => {
      const chip = sel.filter((d) => !!gOf(d.data)).append("g")
        .attr("transform", `translate(${-NW / 2 + 14},0)`)
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

    // Өргөмөл / Дагавар шошго — картын дээр талд
    const relMeta: Record<string, { label: string; fill: string; ink: string }> = {
      adopted: { label: "Өргөмөл", fill: "#ede9fe", ink: "#6d28d9" },
      step: { label: "Дагавар", fill: "#fef3c7", ink: "#b45309" },
    };
    const relBadge = node.filter((d) => d.data.relation === "adopted" || d.data.relation === "step")
      .append("g")
      .attr("transform", `translate(0,${-NH / 2 - 11})`)
      .attr("pointer-events", "none");
    relBadge.append("rect")
      .attr("x", -32).attr("y", -9).attr("width", 64).attr("height", 18).attr("rx", 9)
      .attr("fill", (d) => relMeta[d.data.relation!].fill)
      .attr("stroke", (d) => relMeta[d.data.relation!].ink).attr("stroke-width", 0.75).attr("stroke-opacity", 0.4);
    relBadge.append("text").attr("text-anchor", "middle").attr("dy", "0.34em")
      .attr("font-size", "10px").attr("font-weight", "700")
      .attr("fill", (d) => relMeta[d.data.relation!].ink)
      .text((d) => relMeta[d.data.relation!].label);

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

    // ── Spouse cards (олон хань дэмжинэ) ──
    let dragMoved = false;
    node.each(function (d) {
      const spouses = spousesOf(d.data.id);
      if (spouses.length === 0) return;
      const nodeG = d3.select<SVGGElement, d3.HierarchyPointNode<TreeNode>>(this);

      spouses.forEach((sc, i) => {
        const sm = memberMap.current.get(sc.spouseId);
        if (!sm) return;
        const x = slotOffsetX(i);             // anchor-ийн хоёр тал руу ээлжилнэ
        const dir = x > 0 ? 1 : -1;
        const divorced = sc.status === "divorced";

        // Холбоосын зураас — anchor-ийн ирмэгээс хосын ирмэг хүртэл (хос бүр anchor-той холбогдоно)
        const huEdge = dir * (NW / 2);        // anchor-ийн тухайн тал руух ирмэг
        const wEdge = x - dir * (NW / 2);     // хосын anchor тал руух ирмэг
        nodeG.append("line")
          .attr("x1", huEdge).attr("y1", 0).attr("x2", wEdge).attr("y2", 0)
          .attr("stroke", divorced ? "#cbd5e1" : "#f9a8d4")
          .attr("stroke-width", 2).attr("stroke-dasharray", "4,3");

        // ❤/💔 — дарж гэрлэсэн/салсныг солино
        const heart = nodeG.append("g")
          .attr("transform", `translate(${(huEdge + wEdge) / 2},0)`)
          .attr("cursor", isAuthenticated ? "pointer" : "default");
        heart.append("text").attr("y", 5).attr("text-anchor", "middle").attr("font-size", "11px")
          .text(divorced ? "💔" : "❤");
        if (isAuthenticated) {
          heart.append("title").text(divorced ? "Эвлэрүүлэх" : "Салсан болгох");
          heart.on("click", (e) => { e.stopPropagation(); onToggleMarriage(sc.marriageId, divorced ? null : "divorced"); });
        }

        // Хосын карт
        const cardG = nodeG.append("g")
          .attr("class", "spouse-card")
          .attr("data-spouse-id", sm.id)
          .attr("transform", `translate(${x},0)`);

        cardG.append("rect")
          .attr("x", -NW / 2).attr("y", -NH / 2).attr("width", NW).attr("height", NH).attr("rx", 10)
          .attr("fill", cardFill(sm.gender, !!sm.deathYear))
          .attr("stroke", cardStroke(sm.gender, !!sm.deathYear))
          .attr("stroke-width", 2).attr("filter", "url(#sh)");

        genderChip(cardG, () => sm.gender, () => !!sm.deathYear);

        if (sm.deathYear) {
          cardG.append("text").attr("x", NW / 2 - 8).attr("y", -NH / 2 + 14)
            .attr("font-size", "11px").attr("fill", "#94a3b8").attr("text-anchor", "middle").text("✝");
        }

        const sFather = getFatherName(sm, memberMap.current);
        if (sFather) {
          cardG.append("text").attr("text-anchor", "middle").attr("y", -NH / 2 + 18)
            .attr("font-size", "10px").attr("fill", "#94a3b8").attr("font-style", "italic")
            .text(sFather.length > 16 ? sFather.slice(0, 16) + "…" : sFather);
        }

        cardG.append("text").attr("text-anchor", "middle").attr("y", 2)
          .attr("font-size", "13px").attr("font-weight", "700")
          .attr("fill", sm.deathYear ? "#94a3b8" : "#1e293b")
          .text(sm.name.length > 14 ? sm.name.slice(0, 14) + "…" : sm.name);

        cardG.append("text").attr("text-anchor", "middle").attr("y", 17)
          .attr("font-size", "10px").attr("fill", "#64748b").text(yearText(sm));

        // Картны click → detail
        cardG.on("click", (e) => { e.stopPropagation(); if (!dragMoved) onNodeClick?.(sm); });

        // ── Хосын карт дээрх товчнууд ──
        if (isAuthenticated) {
          // + хүүхэд
          cardG.append("g").attr("cursor", "pointer")
            .attr("transform", `translate(${NW / 2 - 10},${-NH / 2 + 10})`)
            .on("click", (e) => { e.stopPropagation(); onAddChild(sm.id, sm.name); })
            .call((s) => {
              s.append("circle").attr("r", 10).attr("fill", "#22c55e");
              s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").attr("font-weight", "bold").text("+");
            });

          // ↑ аав/ээж нэмэх (хэрэв хань эцэг/эхгүй бол)
          if (!sm.parentId) {
            cardG.append("g").attr("cursor", "pointer")
              .attr("transform", `translate(0,${-NH / 2})`)
              .on("click", (e) => { e.stopPropagation(); onAddParent(sm.id, sm.name); })
              .call((s) => {
                s.append("circle").attr("r", 10).attr("fill", "#6366f1");
                s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "13px").attr("font-weight", "bold").text("↑");
              });
          }

          // ✏ засах
          cardG.append("g").attr("cursor", "pointer")
            .attr("transform", `translate(${-NW / 2 + 10},${NH / 2 - 10})`)
            .on("click", (e) => { e.stopPropagation(); onEdit(sm); })
            .call((s) => {
              s.append("circle").attr("r", 10).attr("fill", "#f59e0b");
              s.append("text").attr("text-anchor", "middle").attr("dy", "0.4em").attr("fill", "white").attr("font-size", "11px").text("✏");
            });

          // × устгах (зөвхөн admin)
          if (canDelete) {
            cardG.append("g").attr("cursor", "pointer")
              .attr("transform", `translate(${-NW / 2 + 10},${-NH / 2 + 10})`)
              .on("click", (e) => { e.stopPropagation(); onDelete(sm.id, sm.name); })
              .call((s) => {
                s.append("circle").attr("r", 10).attr("fill", "#ef4444");
                s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").text("×");
              });
          }
        }
      });
    });

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

      // ↑ add parent (only for root nodes — those without a parent)
      node.filter((d) => !d.data.parentId)
        .append("g").attr("cursor", "pointer")
        .attr("transform", `translate(0,${-NH / 2})`)
        .on("click", (e, d) => { e.stopPropagation(); onAddParent(d.data.id, d.data.name); })
        .call((s) => {
          s.append("circle").attr("r", 10).attr("fill", "#6366f1");
          s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "13px").attr("font-weight", "bold").text("↑");
        });

      // ❤ хань нэмэх (дахин гэрлэлт зөвшөөрөхийн тулд үргэлж харагдана)
      node.append("g").attr("cursor", "pointer")
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

      // × delete primary (зөвхөн admin)
      if (canDelete) {
        node.append("g").attr("cursor", "pointer")
          .attr("transform", `translate(${-NW / 2 + 10},${-NH / 2 + 10})`)
          .on("click", (e, d) => { e.stopPropagation(); onDelete(d.data.id, d.data.name); })
          .call((s) => {
            s.append("circle").attr("r", 10).attr("fill", "#ef4444");
            s.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", "white").attr("font-size", "14px").text("×");
          });
      }
    }

    // ── Drag (нэг node, эсвэл бүлгээр бол бүх удам) ──
    let dragIds: string[] = [];
    const drag = d3.drag<SVGGElement, d3.HierarchyPointNode<TreeNode>>()
      .on("start", function (event, d) {
        dragMoved = false;
        event.sourceEvent.stopPropagation();
        // Бүлгээр зөөх горимд — энэ хүн + бүх удам; эс бөгөөс зөвхөн өөрийг нь
        dragIds = groupMove ? d.descendants().map((n) => n.data.id) : [d.data.id];
        d3.select(this).attr("cursor", "grabbing").raise();
      })
      .on("drag", function (event) {
        dragMoved = true;
        const moved = new Set(dragIds);
        for (const id of dragIds) {
          const p = posMap.current.get(id);
          if (!p) continue;
          p.x += event.dx;
          p.y += event.dy;
        }
        node.filter((n) => moved.has(n.data.id))
          .attr("transform", (n) => { const p = getPos(n.data.id); return `translate(${p.x},${p.y})`; });
        linkPaths.attr("d", (ld) => childLinkD(ld));
      })
      .on("end", function () {
        d3.select(this).attr("cursor", "grab");
        savePositions();
      });

    // Зөвхөн admin node чирч байршуулж болно
    if (isAuthenticated) node.call(drag);

    node.on("click", (e, d) => {
      if (dragMoved) return;
      e.stopPropagation();
      onNodeClick?.(d.data);
    });

  }, [members, marriages, isAuthenticated, canDelete, groupMove, onAddChild, onAddSpouse, onAddParent, onDelete, onToggleMarriage, onAddRoot, onEdit, onNodeClick]);

  useEffect(() => {
    render();
    const obs = new ResizeObserver(render);
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, [render]);

  // Focus/zoom to a specific member + тодруулах pulse
  useEffect(() => {
    if (!focusId || !svgRef.current || !zoomBehaviorRef.current) return;
    const pos = effectivePosRef.current?.(focusId) ?? posMap.current.get(focusId);
    if (!pos) return;
    const W = svgRef.current.clientWidth;
    const H = svgRef.current.clientHeight;
    const svgSel = d3.select(svgRef.current);
    const k = 1.15;
    svgSel
      .transition().duration(800).ease(d3.easeCubicInOut)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(W / 2 - k * pos.x, H / 2 - k * pos.y).scale(k));

    // Хайсан гишүүний ард тодруулах цагираг нэмэх (primary болон эхнэр/нөхөр)
    const target = svgSel.selectAll<SVGGElement, unknown>("g.node, g.spouse-card")
      .filter(function () {
        const el = this as SVGGElement;
        return el.getAttribute("data-id") === focusId || el.getAttribute("data-spouse-id") === focusId;
      });
    const ring = target.insert("rect", ":first-child")
      .attr("class", "ft-focus-ring")
      .attr("x", -NW / 2 - 7).attr("y", -NH / 2 - 7)
      .attr("width", NW + 14).attr("height", NH + 14).attr("rx", 17)
      .attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 3.5);

    return () => { ring.remove(); };
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
