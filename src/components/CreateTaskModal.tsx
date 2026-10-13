"use client";

import { useState } from "react";
import { X, Plus, User, AlertCircle, Calendar, Folder } from "lucide-react";
import type { Task } from "@/types/database";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: { id: string; name: string; role: string }[];
  projects: { id: string; name: string; color: string }[];
  currentProjectId: string;
  onCreateTask: (newTask: Omit<Task, "id" | "created_at">) => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  teamMembers,
  projects,
  currentProjectId,
  onCreateTask
}: CreateTaskModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(currentProjectId || projects[0]?.id || "p1");
  const [assignedTo, setAssignedTo] = useState(teamMembers[0]?.id || "");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [dueDateDays, setDueDateDays] = useState<number>(3); // 3 gün sonra varsayılan

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = teamMembers.find(m => m.id === assignedTo);

    const due_date = new Date(Date.now() + dueDateDays * 86400000).toISOString();

    onCreateTask({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      status: "todo",
      priority,
      created_by: "u1", // Mevcut oturum açmış yönetici
      assigned_to: assignedTo || undefined,
      due_date,
      assigned_profile: assignedMember ? {
        id: assignedMember.id,
        email: `${assignedMember.name.toLowerCase().replace(/\s+/g, '')}@ekip.com`,
        full_name: assignedMember.name,
        role: "member",
        created_at: ""
      } : undefined
    });

    setTitle("");
    setDescription("");
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

          {/* Grid: Proje, Atanan Kişi, Öncelik, Teslim Tarihi */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            
            {/* Proje */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Folder size={13} className="text-indigo-400" /> Proje
              </label>
              <select 
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>

            {/* Atanan Kişi */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <User size={13} className="text-indigo-400" /> Görevli Kişi
              </label>
              <select 
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
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
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔴 Acil</option>
                <option value="high">🟠 Yüksek</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Düşük</option>
              </select>
            </div>

            {/* Teslim Süresi */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Calendar size={13} className="text-emerald-400" /> Teslim Süresi
              </label>
              <select 
                value={dueDateDays}
                onChange={(e) => setDueDateDays(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>Bugün / Yarın (1 Gün)</option>
                <option value={3}>3 Gün İçinde</option>
                <option value={7}>1 Hafta İçinde</option>
                <option value={14}>2 Hafta İçinde</option>
              </select>
            </div>

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
