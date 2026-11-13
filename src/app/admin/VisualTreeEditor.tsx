"use client";

import { useState } from "react";
import { BankElement } from "@/lib/bank-design-schema";

export function VisualTreeEditor({ 
  tree, 
  onChange 
}: { 
  tree: BankElement; 
  onChange: (newTree: BankElement) => void 
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Helper to find an element
  const findElement = (node: BankElement, id: string): BankElement | null => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findElement(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to update an element
  const updateElement = (node: BankElement, id: string, updater: (el: BankElement) => BankElement): BankElement => {
    if (node.id === id) {
      return updater({ ...node });
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateElement(child, id, updater))
      };
    }
    return node;
  };

  const handleStyleChange = (key: string, value: string) => {
    if (!selectedId) return;
    const newTree = updateElement(tree, selectedId, (el) => ({
      ...el,
      styles: { ...el.styles, [key]: value }
    }));
    onChange(newTree);
  };

  const handleContentChange = (value: string) => {
    if (!selectedId) return;
    const newTree = updateElement(tree, selectedId, (el) => ({
      ...el,
      content: value
    }));
    onChange(newTree);
  };

  const selectedNode = selectedId ? findElement(tree, selectedId) : null;

  const renderTreeList = (node: BankElement, depth = 0) => {
    return (
      <div key={node.id} className="w-full">
        <div 
          className={`px-2 py-1 cursor-pointer text-xs flex items-center gap-2 hover:bg-zinc-800 ${selectedId === node.id ? 'bg-blue-900/40 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setSelectedId(node.id)}
        >
          <span className="text-zinc-500 font-mono">{node.type}</span>
          <span className="text-white truncate flex-1">{node.id}</span>
        </div>
        {node.children && node.children.map(child => renderTreeList(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
      <div className="flex border-b border-zinc-800 h-64">
        {/* Sol Panel: Ağaç */}
        <div className="w-1/2 border-r border-zinc-800 overflow-y-auto bg-[#111111] p-2">
          <div className="text-xs font-bold text-zinc-500 mb-2 px-2 uppercase tracking-wider">Tasarım Ağacı</div>
          {renderTreeList(tree)}
        </div>
        
        {/* Sağ Panel: Özellikler */}
        <div className="w-1/2 overflow-y-auto p-4 bg-zinc-900">
          {!selectedNode ? (
            <div className="text-zinc-500 text-xs text-center mt-10">Düzenlemek için soldan bir öğe seçin</div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-bold text-white border-b border-zinc-800 pb-2">
                Öğe: <span className="text-blue-400">{selectedNode.id}</span>
              </div>

              {(selectedNode.type === "text" || selectedNode.type === "button") && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">İçerik (Metin)</label>
                  <input 
                    type="text" 
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-white" 
                    value={selectedNode.content || ""} 
                    onChange={e => handleContentChange(e.target.value)} 
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-500">Stiller (CSS)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Genişlik (width)</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.width || ""} onChange={e => handleStyleChange("width", e.target.value)} placeholder="auto, 100%, 200px..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Yükseklik (height)</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.height || ""} onChange={e => handleStyleChange("height", e.target.value)} placeholder="auto, 100%, 200px..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Arkaplan (bg)</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.backgroundColor || ""} onChange={e => handleStyleChange("backgroundColor", e.target.value)} placeholder="#fff, red, none..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Yazı Rengi (color)</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.color || ""} onChange={e => handleStyleChange("color", e.target.value)} placeholder="#000, blue..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Padding</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.padding || ""} onChange={e => handleStyleChange("padding", e.target.value)} placeholder="10px 20px..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Margin</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.margin || ""} onChange={e => handleStyleChange("margin", e.target.value)} placeholder="0 auto..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Yazı Boyutu</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.fontSize || ""} onChange={e => handleStyleChange("fontSize", e.target.value)} placeholder="16px, 1.2rem..." />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">Border Radius</span>
                    <input type="text" className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" value={selectedNode.styles.borderRadius || ""} onChange={e => handleStyleChange("borderRadius", e.target.value)} placeholder="8px..." />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
