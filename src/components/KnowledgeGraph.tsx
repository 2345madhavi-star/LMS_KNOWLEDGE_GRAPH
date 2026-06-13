import React, { useState, useEffect } from "react";
import { Book } from "../types";

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraphProps {
  books: Book[];
  relationships: GraphEdge[];
  onSelectBook?: (bookId: string) => void;
}

interface Node {
  id: string;
  label: string;
  type: "book" | "author" | "subject" | "genre" | "topic";
  x: number;
  y: number;
}

export default function KnowledgeGraph({ books, relationships, onSelectBook }: KnowledgeGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Initialize nodes and custom positions
  useEffect(() => {
    const tempNodes: Node[] = [];
    const uniqueNodeIds = new Set<string>();

    // 1. Add Books
    books.forEach((b, index) => {
      // Position books in a central horizontal timeline step layout
      const x = 80 + index * 100;
      const y = 140 + (index % 2 === 0 ? -40 : 40);
      tempNodes.push({
        id: b.id,
        label: b.title,
        type: "book",
        x,
        y,
      });
      uniqueNodeIds.add(b.id);
    });

    // 2. Add Authors
    books.forEach((b, index) => {
      const authId = b.author;
      if (!uniqueNodeIds.has(authId)) {
        tempNodes.push({
          id: authId,
          label: authId,
          type: "author",
          x: 100 + index * 90,
          y: 40,
        });
        uniqueNodeIds.add(authId);
      }
    });

    // 3. Add Subjects
    books.forEach((b, index) => {
      const subjId = b.subject;
      if (!uniqueNodeIds.has(subjId)) {
        tempNodes.push({
          id: subjId,
          label: subjId,
          type: "subject",
          x: 150 + index * 85,
          y: 280,
        });
        uniqueNodeIds.add(subjId);
      }
    });

    setNodes(tempNodes);
    setEdges(relationships);
  }, [books, relationships]);

  // Handle Drag Move Action for custom interactive physics feel
  const handleMouseDown = (nodeId: string) => {
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNodeId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes((prev) =>
      prev.map((n) => (n.id === draggedNodeId ? { ...n, x: Math.max(20, Math.min(x, 780)), y: Math.max(20, Math.min(y, 380)) } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Node styles configuration
  const getNodeColor = (type: string, isSelected: boolean, isHovered: boolean) => {
    if (isSelected) return "fill-amber-450 stroke-amber-600 stroke-[2.5]";
    if (isHovered) return "fill-blue-500 stroke-blue-700 stroke-[2]";

    switch (type) {
      case "book":
        return "fill-blue-600 stroke-white hover:fill-blue-700 shadow-sm";
      case "author":
        return "fill-indigo-50 stroke-indigo-400 hover:fill-indigo-100";
      case "subject":
        return "fill-purple-50 stroke-purple-400 hover:fill-purple-100";
      default:
        return "fill-slate-50 stroke-slate-400 hover:fill-slate-100";
    }
  };

  // Highlight direct connection links
  const isEdgeHighlighted = (edge: GraphEdge) => {
    if (!selectedNode && !hoveredNode) return true;
    const activeId = selectedNode?.id || hoveredNode?.id;
    return edge.source === activeId || edge.target === activeId;
  };

  const filteredEdges = edges.filter((e) => {
    if (filterType === "all") return true;
    return e.type === filterType;
  });

  // Calculate coordinates for connection line
  const getNodeCoords = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (node) return { x: node.x, y: node.y };
    // Fallback if target node is raw text author or subject not on list
    // Find matching named node or calculate dynamic anchor
    const isSubject = books.some((b) => b.subject === id);
    const isAuthor = books.some((b) => b.author === id);
    if (isSubject) {
      return { x: 400, y: 310 };
    }
    if (isAuthor) {
      return { x: 300, y: 40 };
    }
    return { x: 400, y: 200 };
  };

  // Node details text summary
  const getSelectedNodeDetails = () => {
    if (!selectedNode) return null;
    if (selectedNode.type === "book") {
      const book = books.find((b) => b.id === selectedNode.id);
      const prereqs = edges
        .filter((e) => e.target === selectedNode.id && e.type === "prerequisite")
        .map((e) => books.find((b) => b.id === e.source)?.title || e.source);

      const antiReqs = edges
        .filter((e) => (e.source === selectedNode.id || e.target === selectedNode.id) && e.type === "anti_requisite")
        .map((e) => {
          const id = e.source === selectedNode.id ? e.target : e.source;
          return books.find((b) => b.id === id)?.title || id;
        });

      return {
        title: book?.title || selectedNode.label,
        author: book?.author || "Core Syllabus",
        genre: book?.genre,
        subject: book?.subject,
        description: book?.description,
        prerequisites: prereqs,
        antiRequisites: antiReqs,
        id: book?.id
      };
    } else {
      // Auth or subject details
      const connections = edges
        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e) => {
          const targetId = e.source === selectedNode.id ? e.target : e.source;
          const book = books.find((b) => b.id === targetId);
          return { label: book?.title || targetId, type: e.type };
        });

      return {
        title: selectedNode.label,
        type: selectedNode.type.toUpperCase(),
        connections,
      };
    }
  };

  const details = getSelectedNodeDetails();

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Visual Workspace Canvas */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-800 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block animate-pulse" />
              <span>Interactive Library Graph</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Drag nodes to rearrange. Click a node to inspect academic flow.
            </p>
          </div>

          <div className="flex space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 font-bold"
            >
              <option value="all">Show All Relations</option>
              <option value="prerequisite">Prerequisites Only</option>
              <option value="anti_requisite">Anti-requisites Only</option>
              <option value="written_by">Written By</option>
              <option value="belongs_to">Belongs To</option>
            </select>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-slate-500 font-bold tracking-wide border-b border-slate-100 mb-4 pb-2">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-blue-600 border border-blue-800 shadow" />
            <span>Book Title</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-400" />
            <span>Author Node</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-purple-50 border border-purple-400" />
            <span>Subject Category</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-8 border-t-2 border-dashed border-rose-500" />
            <span>Anti-Requisite Conflict</span>
          </span>
        </div>

        {/* GRAPH CANVAS SVG */}
        <svg
          className="w-full h-[320px] md:h-[380px] bg-slate-50 rounded-xl cursor-default select-none border border-slate-100"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Defs for arrow heads */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-gray" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
            </marker>
          </defs>

          {/* Connection Lines (Edges) */}
          {filteredEdges.map((edge, idx) => {
            const start = getNodeCoords(edge.source);
            const end = getNodeCoords(edge.target);
            const isHighlighted = isEdgeHighlighted(edge);
            const opacity = isHighlighted ? "opacity-100" : "opacity-15";

            const edgeColors: { [key: string]: string } = {
              prerequisite: "#10b981", // Solid Emerald
              anti_requisite: "#f43f5e", // Crimson Rose
              written_by: "#4f46e5", // Indigo Blue
              belongs_to: "#06b6d4" // Cyan
            };

            const strokeColor = edgeColors[edge.type] || "#334155";
            const isDash = edge.type === "anti_requisite";

            return (
              <g key={`${edge.source}-${edge.target}-${idx}`} className={`transition-all duration-300 ${opacity}`}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={strokeColor}
                  strokeWidth={edge.type === "prerequisite" || edge.type === "anti_requisite" ? 2.5 : 1.5}
                  strokeDasharray={isDash ? "5,5" : undefined}
                  markerEnd={edge.type === "prerequisite" ? "url(#arrow)" : "url(#arrow-gray)"}
                />
              </g>
            );
          })}

          {/* Interactive Circle Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const size = node.type === "book" ? 12 : 9;

            return (
              <g
                key={node.id}
                className="transition-all duration-200 cursor-grab active:cursor-grabbing"
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={() => handleMouseDown(node.id)}
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  r={size}
                  className={`${getNodeColor(node.type, isSelected, isHovered)} transition-all shadow-sm`}
                />
                <text
                  dy={node.type === "book" ? -18 : 16}
                  textAnchor="middle"
                  className={`text-[9px] font-sans font-bold tracking-wide ${
                    isSelected ? "fill-amber-700" : "fill-slate-700"
                  } select-none`}
                >
                  {node.label.length > 20 ? node.label.substring(0, 18) + "..." : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Details Side Drawer Panel */}
      <div className="w-full xl:w-80 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900 flex flex-col justify-between">
        {!selectedNode ? (
          <div className="text-center py-12 text-slate-500">
            <span className="text-3xl block mb-2 font-emoji">🌐</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Node Inspector</span>
            <p className="text-xs text-slate-500 px-4 mt-2">
              Select or hover over any node inside our library graph system to inspect academic prerequisites, equivalencies, and anti-requisite warnings.
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Context Header */}
            <div>
              <span className="inline-block text-[10px] font-bold text-blue-700 uppercase tracking-widest font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200/50 mb-2">
                {selectedNode.type} Details
              </span>
              <h4 className="text-base font-bold text-slate-900 tracking-tight lead-relaxed">
                {details?.title}
              </h4>
              {"author" in details! && (
                <p className="text-xs text-blue-600 mt-1 font-semibold">By {details.author}</p>
              )}
            </div>

            {/* Standard subjects values */}
            {"genre" in details! && (
              <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-100 py-3">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Genre</span>
                  <span className="text-slate-700 font-bold">{details.genre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Subject</span>
                  <span className="text-slate-700 font-bold">{details.subject}</span>
                </div>
              </div>
            )}

            {/* Descriptions block */}
            {"description" in details! && details.description && (
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold text-[10px] uppercase">Abstract</span>
                <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">{details.description}</p>
              </div>
            )}

            {/* Crucial Section: Prerequisites List */}
            {"prerequisites" in details! && (
              <div className="space-y-2">
                <span className="text-slate-450 block font-bold text-[10px] uppercase tracking-wider">
                  Prerequisites Required
                </span>
                {details.prerequisites && details.prerequisites.length > 0 ? (
                  <div className="space-y-1.5">
                    {details.prerequisites.map((p, i) => (
                      <div key={i} className="flex items-start space-x-1.5 bg-emerald-50 text-emerald-800 text-xs border border-emerald-250/60 rounded-xl p-2.5 font-semibold">
                        <span className="font-emoji select-none text-emerald-600">✔</span>
                        <span className="leading-tight">{p}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold italic block pl-1">
                    Zero introductory books demanded. Available for borrowing instantly!
                  </span>
                )}
              </div>
            )}

            {/* Crucial Section: Anti-requisites warning list */}
            {"antiRequisites" in details! && (
              <div className="space-y-2">
                <span className="text-slate-450 block font-bold text-[10px] uppercase tracking-wider">
                  Anti-requisite Conflicts
                </span>
                {details.antiRequisites && details.antiRequisites.length > 0 ? (
                  <div className="space-y-1.5">
                    {details.antiRequisites.map((ar, i) => (
                      <div key={i} className="flex items-start space-x-1.5 bg-rose-50 text-rose-800 text-xs border border-rose-250/60 rounded-xl p-2.5 font-semibold">
                        <span className="font-emoji select-none text-rose-650">✕</span>
                        <span className="leading-tight">Cannot borrow alongside: {ar}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold italic block pl-1">
                    No equivalent book boundaries associated.
                  </span>
                )}
              </div>
            )}

            {/* Subject/Author multi details connections listing */}
            {"connections" in details! && (
              <div className="space-y-2.5">
                <span className="text-slate-450 block font-bold text-[10px] uppercase tracking-wider">
                  Correlated Nodes
                </span>
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {details.connections.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl p-2.5 border border-slate-100 hover:bg-slate-100 font-semibold text-slate-700">
                      <span className="truncate">{c.label}</span>
                      <span className="text-[9px] font-mono font-bold tracking-wider text-teal-800 uppercase bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action CTA box if it is a book node */}
            {selectedNode.type === "book" && onSelectBook && details.id && (
              <button
                onClick={() => onSelectBook(details.id)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md uppercase cursor-pointer"
              >
                Inspect Book & Borrow
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
