"use client";

import React, { useState } from "react";
import {
  Folder,
  Plus,
  ChevronRight,
  Settings,
  Archive,
  Layers,
  Check,
  X,
  FileText,
  ListTodo,
  Kanban,
  CalendarRange,
  MessageSquare,
  File,
} from "lucide-react";
import type { Category, Project } from "@/types/database";

interface CategoryListManagerProps {
  categories: Category[];
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateCategory: (cat: { name: string; color: string; icon: string }) => Promise<void>;
  onCreateProject: (proj: {
    name: string;
    category_id: string;
    modules: {
      module_todo: boolean;
      module_docs: boolean;
      module_files: boolean;
      module_kanban: boolean;
      module_gantt: boolean;
      module_chat: boolean;
    };
  }) => Promise<void>;
  canManageLists: boolean;
}

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#eab308", "#ec4899", "#6366f1"];

export default function CategoryListManager({
  categories,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateCategory,
  onCreateProject,
  canManageLists,
}: CategoryListManagerProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Yeni Kategori Formu
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);

  // Yeni Liste Formu
  const [newProjName, setNewProjName] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [modules, setModules] = useState({
    module_todo: true,
    module_docs: true,
    module_files: true,
    module_kanban: true,
    module_gantt: true,
    module_chat: true,
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await onCreateCategory({
      name: newCatName.trim(),
      color: newCatColor,
      icon: "folder",
    });
    setNewCatName("");
    setIsCategoryModalOpen(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    await onCreateProject({
      name: newProjName.trim(),
      category_id: selectedCatId,
      modules,
    });
    setNewProjName("");
    setIsProjectModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Üst Bar: Kategori & Liste Ekleme Butonları */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Kategoriler ve Listeler
        </h2>
        {canManageLists && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Kategori
            </button>
            <button
              onClick={() => {
                if (categories.length > 0 && !selectedCatId) {
                  setSelectedCatId(categories[0].id);
                }
                setIsProjectModalOpen(true);
              }}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Liste Ekle
            </button>
          </div>
        )}
      </div>

      {/* Kategori ve Liste Ağacı */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const catProjects = projects.filter((p) => p.category_id === cat.id && !p.is_archived);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ({catProjects.length})
                  </span>
                </div>
              </div>

              {/* Listeler */}
              <div className="space-y-1.5 pl-3 border-l-2 border-slate-100 ml-1">
                {catProjects.map((proj) => {
                  const isActive = activeProjectId === proj.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => onSelectProject(proj.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all text-left ${
                        isActive
                          ? "bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-100 shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{proj.name}</span>
                      </div>

                      {/* Açık Modül İkonları */}
                      <div className="flex items-center gap-1 shrink-0 text-slate-400">
                        {proj.module_todo && <span title="Todo"><ListTodo className="w-3 h-3" /></span>}
                        {proj.module_docs && <span title="Dokümantasyon"><FileText className="w-3 h-3" /></span>}
                        {proj.module_kanban && <span title="Kanban"><Kanban className="w-3 h-3" /></span>}
                        {proj.module_gantt && <span title="Gantt"><CalendarRange className="w-3 h-3" /></span>}
                        {proj.module_chat && <span title="Sohbet"><MessageSquare className="w-3 h-3" /></span>}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1" />
                      </div>
                    </button>
                  );
                })}

                {catProjects.length === 0 && (
                  <p className="text-[11px] text-slate-400 py-1 pl-1 italic">
                    Bu kategoriye henüz liste eklenmemiş.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Kategorisiz Listeler */}
        {projects.filter((p) => !p.category_id && !p.is_archived).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 mb-2">Genel / Kategorisiz</h3>
            <div className="space-y-1.5">
              {projects
                .filter((p) => !p.category_id && !p.is_archived)
                .map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all text-left ${
                      activeProjectId === proj.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{proj.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Yeni Kategori Modalı */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Yeni Kategori</h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kategori Adı *
              </label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Örn: Hukuk, Satış..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori Rengi
              </label>
              <div className="flex items-center gap-2">
                {CATEGORY_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewCatColor(col)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newCatColor === col ? "scale-120 ring-2 ring-slate-800 ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
            >
              Kategori Oluştur
            </button>
          </form>
        </div>
      )}

      {/* Yeni Liste Modalı (Modül Açıp Kapatma) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateProject}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Yeni Liste (İş) Ekle</h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Liste Adı *
              </label>
              <input
                type="text"
                required
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                placeholder="Örn: 8 Villa, Kemalpaşa Bel..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Bağlı Olduğu Kategori
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Kategorisiz</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Liste Modülleri Seçimi (Madde 4.3) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Açık Olacak Modüller
              </label>
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {[
                  { key: "module_todo", label: "To do (Görev Takibi)" },
                  { key: "module_docs", label: "Dokümantasyon" },
                  { key: "module_files", label: "Dosyalar" },
                  { key: "module_kanban", label: "Kanban Görünümü" },
                  { key: "module_gantt", label: "Gantt Zaman Çizelgesi" },
                  { key: "module_chat", label: "Liste Sohbeti" },
                ].map((mod) => {
                  const isChecked = modules[mod.key as keyof typeof modules];
                  return (
                    <label
                      key={mod.key}
                      className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer select-none py-1"
                    >
                      <span>{mod.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setModules((prev) => ({
                            ...prev,
                            [mod.key]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!newProjName.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
            >
              Listeyi Oluştur
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
