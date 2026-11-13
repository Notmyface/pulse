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
  Edit2,
  Trash2,
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
  onUpdateProject?: (
    projectId: string,
    updates: {
      name: string;
      category_id: string | null;
      modules: {
        module_todo: boolean;
        module_docs: boolean;
        module_files: boolean;
        module_kanban: boolean;
        module_gantt: boolean;
        module_chat: boolean;
      };
    }
  ) => Promise<void>;
  onArchiveProject?: (projectId: string) => Promise<void>;
  canManageLists?: boolean;
}

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#eab308", "#ec4899", "#6366f1"];

export default function CategoryListManager({
  categories,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateCategory,
  onCreateProject,
  onUpdateProject,
  onArchiveProject,
  canManageLists = true,
}: CategoryListManagerProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Yeni Kategori Formu
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);

  // Yeni Proje Formu
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

  // Proje Düzenleme Formu
  const [editProjName, setEditProjName] = useState("");
  const [editProjCatId, setEditProjCatId] = useState<string>("");
  const [editModules, setEditModules] = useState({
    module_todo: true,
    module_docs: true,
    module_files: true,
    module_kanban: true,
    module_gantt: true,
    module_chat: true,
  });

  const handleOpenCreateProject = (preselectedCatId?: string) => {
    setSelectedCatId(preselectedCatId || (categories.length > 0 ? categories[0].id : ""));
    setNewProjName("");
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(proj);
    setEditProjName(proj.name);
    setEditProjCatId(proj.category_id || "");
    setEditModules({
      module_todo: proj.module_todo ?? true,
      module_docs: proj.module_docs ?? true,
      module_files: proj.module_files ?? true,
      module_kanban: proj.module_kanban ?? true,
      module_gantt: proj.module_gantt ?? true,
      module_chat: proj.module_chat ?? true,
    });
  };

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

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjName.trim() || !onUpdateProject) return;
    await onUpdateProject(editingProject.id, {
      name: editProjName.trim(),
      category_id: editProjCatId ? editProjCatId : null,
      modules: editModules,
    });
    setEditingProject(null);
  };

  return (
    <div className="space-y-4">
      {/* Üst Bar: Kategori & Proje Ekleme Butonları */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Kategoriler ve Projeler
          </h2>
          <p className="text-[11px] text-slate-500">
            Projelerinizi düzenleyin veya kategori atayın
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Kategori
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateProject()}
            className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Proje Ekle
          </button>
        </div>
      </div>

      {/* Kategori ve Proje Ağacı */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const catProjects = projects.filter((p) => p.category_id === cat.id && !p.is_archived);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs"
            >
              {/* Kategori Başlığı ve İçinden Proje Ekle Butonu */}
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
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

                <button
                  type="button"
                  onClick={() => handleOpenCreateProject(cat.id)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Proje Ekle
                </button>
              </div>

              {/* Kategoriye Bağlı Projeler */}
              <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 ml-1">
                {catProjects.map((proj) => {
                  const isActive = activeProjectId === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => onSelectProject(proj.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-50/80 text-indigo-700 font-semibold border border-indigo-100 shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                        <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{proj.name}</span>
                      </div>

                      {/* Açık Modül İkonları + Düzenle Butonu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 text-slate-400 mr-1">
                          {proj.module_todo && <span title="Todo"><ListTodo className="w-3 h-3" /></span>}
                          {proj.module_docs && <span title="Dokümantasyon"><FileText className="w-3 h-3" /></span>}
                          {proj.module_kanban && <span title="Kanban"><Kanban className="w-3 h-3" /></span>}
                          {proj.module_gantt && <span title="Gantt"><CalendarRange className="w-3 h-3" /></span>}
                          {proj.module_chat && <span title="Sohbet"><MessageSquare className="w-3 h-3" /></span>}
                        </div>

                        {/* Düzenleme Butonu */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditProject(proj, e)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                          title="Projeyi & Kategoriyi Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>
                  );
                })}

                {catProjects.length === 0 && (
                  <p className="text-[11px] text-slate-400 py-1.5 pl-1 italic">
                    Bu kategoriye ait proje bulunmuyor. Proje ekleyebilirsiniz.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Kategorisiz / Genel Projeler */}
        {projects.filter((p) => !p.category_id && !p.is_archived).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-600">
                Kategorisiz / Genel Projeler
              </h3>
              <button
                type="button"
                onClick={() => handleOpenCreateProject("")}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:bg-indigo-50 px-2 py-0.5 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Proje Ekle
              </button>
            </div>

            <div className="space-y-1.5">
              {projects
                .filter((p) => !p.category_id && !p.is_archived)
                .map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onSelectProject(proj.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      activeProjectId === proj.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                      <Folder className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{proj.name}</span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-md font-normal border border-amber-200">
                        Kategorisiz
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditProject(proj, e)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                        title="Kategori Ata veya Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Yeni Proje Ekle */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateProject}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Yeni Proje Ekle</h3>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Proje Adı *
              </label>
              <input
                type="text"
                required
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                placeholder="Örn: 8 Villa, Kemalpaşa Belediyesi..."
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
                <option value="">Kategorisiz (Genel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Liste Modülleri Seçimi */}
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 active:scale-95 transition-all"
            >
              Projeyi Oluştur
            </button>
          </form>
        </div>
      )}

      {/* MODAL 2: Projeyi / Listeyi Düzenle (Kategori Değiştirme) */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveEditProject}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Projeyi Düzenle</h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Proje Adı *
              </label>
              <input
                type="text"
                required
                value={editProjName}
                onChange={(e) => setEditProjName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Kategori Değiştirme Alanı */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Kategori Belirle / Değiştir
              </label>
              <select
                value={editProjCatId}
                onChange={(e) => setEditProjCatId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                <option value="">Kategorisiz (Genel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Projeyi başka bir kategoriye taşımak için yukarıdan yeni kategoriyi seçin.
              </p>
            </div>

            {/* Modüller */}
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
                  const isChecked = editModules[mod.key as keyof typeof editModules];
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
                          setEditModules((prev) => ({
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

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {onArchiveProject && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Bu projeyi arşivlemek istediğinize emin misiniz?")) {
                      onArchiveProject(editingProject.id);
                      setEditingProject(null);
                    }
                  }}
                  className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  Arşivle
                </button>
              )}
              <button
                type="submit"
                disabled={!editProjName.trim()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 active:scale-95 transition-all"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Yeni Kategori Ekle */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Yeni Kategori Ekle</h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
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
                placeholder="Örn: Hukuk, Satış, Tasarım..."
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
                      newCatColor === col ? "scale-125 ring-2 ring-slate-800 ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 active:scale-95 transition-all"
            >
              Kategori Oluştur
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
