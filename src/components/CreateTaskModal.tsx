"use client";

import { useState } from "react";
import { X, Plus, User, AlertCircle, Calendar, Folder, FolderPlus } from "lucide-react";
import type { Task } from "@/types/database";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: { id: string; name: string; role: string }[];
  projects: { id: string; name: string; color: string }[];
  currentProjectId: string;
  currentUserId?: string;
  currentUserName?: string;
  onCreateTask: (newTask: Omit<Task, "id" | "created_at">, newProjectTitle?: string) => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  teamMembers,
  projects,
  currentProjectId,
  currentUserId,
  currentUserName,
  onCreateTask
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  // Ekip üyelerinde kendisi yoksa en başa ekle
  const availableMembers = [...teamMembers];
  if (currentUserId && !availableMembers.some(m => m.id === currentUserId)) {
    availableMembers.unshift({
      id: currentUserId,
      name: currentUserName ? `${currentUserName} (Kendim)` : "Ben",
      role: "Yönetici"
    });
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(currentProjectId || projects[0]?.id || "new");
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingNewProject, setIsCreatingNewProject] = useState(projects.length === 0);
  const [assignedTo, setAssignedTo] = useState(currentUserId || availableMembers[0]?.id || "");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  
  // Takvimden seçilebilir tarih (Varsayılan: 3 gün sonrası)
  const defaultDueDate = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = availableMembers.find(m => m.id === assignedTo);
    const finalDueDate = dueDate ? new Date(dueDate).toISOString() : undefined;

    onCreateTask(
      {
        project_id: isCreatingNewProject ? "" : projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        status: "todo",
        priority,
        created_by: currentUserId || "u1",
        assigned_to: assignedTo || undefined,
        due_date: finalDueDate,
        assigned_profile: assignedMember ? {
          id: assignedMember.id,
          email: `${assignedMember.name.toLowerCase().replace(/\s+/g, '')}@ekip.com`,
          full_name: assignedMember.name,
          role: "member",
          created_at: ""
        } : undefined
      },
      isCreatingNewProject ? newProjectName.trim() : undefined
    );

    setTitle("");
    setDescription("");
    setNewProjectName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Üst Başlık */}
        <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={15} className="text-indigo-400" /> Yeni Görev Oluştur & Dağıt
          </span>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Alanı */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          
          {/* Görev Başlığı */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Görev Başlığı *
            </label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Mobil PWA arayüz tasarımını incele"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">
              Açıklama / Detaylar
            </label>
            <textarea 
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Görevin amaç ve gereksinimleri..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Proje Seçimi veya Yeni Proje Ekleme */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <label className="text-slate-400 flex items-center gap-1">
                <Folder size={13} className="text-indigo-400" /> İlgili Proje
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNewProject(!isCreatingNewProject)}
                className="text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <FolderPlus size={12} />
                {isCreatingNewProject ? "Mevcut Projelerden Seç" : "+ Yeni Proje Oluştur"}
              </button>
            </div>

            {isCreatingNewProject ? (
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Yeni Proje Adı (Örn: Pazarlama Kampanyası)"
                className="w-full bg-slate-800 border border-indigo-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
            ) : (
              <select 
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.length === 0 ? (
                  <option value="default">Genel Çalışma Alanı</option>
                ) : (
                  projects.map(proj => (
                    <option key={proj.id} value={proj.id}>{proj.name}</option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Grid: Atanan Kişi, Öncelik, Takvimden Teslim Tarihi */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            
            {/* Görevli Kişi */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <User size={13} className="text-indigo-400" /> Görevli Kişi
              </label>
              <select 
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {availableMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Öncelik */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <AlertCircle size={13} className="text-rose-400" /> Öncelik
              </label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔴 Acil</option>
                <option value="high">🟠 Yüksek</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Düşük</option>
              </select>
            </div>

          </div>

          {/* TAKVİMDEN TESLİM TARİHİ SEÇİMİ */}
          <div className="space-y-1">
            <label className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Calendar size={13} className="text-emerald-400" /> Teslim Tarihi (Takvim)
            </label>
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 scheme-dark cursor-pointer"
            />
          </div>

          {/* Gönder / Oluştur Butonu */}
          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              İptal
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
            >
              Görevi Ata & Kaydet
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
