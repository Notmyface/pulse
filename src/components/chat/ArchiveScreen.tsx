"use client";

import React, { useState } from "react";
import { Archive, Search, RotateCcw, CheckCircle2, Folder, Trash2 } from "lucide-react";
import type { Task, Project } from "@/types/database";

interface ArchiveScreenProps {
  archivedTasks: Task[];
  projects: Project[];
  onRestoreTask: (taskId: string) => Promise<void>;
}

export default function ArchiveScreen({
  archivedTasks,
  projects,
  onRestoreTask,
}: ArchiveScreenProps) {
  const [tab, setTab] = useState<"all" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const filteredTasks = archivedTasks.filter((task) => {
    if (tab === "completed" && task.status !== "done") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        task.project?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRestore = async (taskId: string) => {
    try {
      setRestoringId(taskId);
      await onRestoreTask(taskId);
    } catch (err) {
      console.error("Geri yüklenemedi:", err);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Arşiv</h2>
        <span className="text-xs font-semibold text-slate-400">
          {archivedTasks.length} arşivlenmiş kayıt
        </span>
      </div>

      {/* 2. Sekmeler: Tüm İşler | Tamamlananlar */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          onClick={() => setTab("all")}
          className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "all"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tüm İşler
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
            tab === "completed"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tamamlananlar
        </button>
      </div>

      {/* 3. Arama Çubuğu */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Arşivde ara..."
          className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* 4. Arşiv Listesi */}
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <Archive className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {task.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  {task.project?.name || "Kişisel İş"} •{" "}
                  {task.completed_at
                    ? `Tamamlandı • ${new Date(task.completed_at).toLocaleDateString("tr-TR")}`
                    : "Arşivlendi"}
                </p>
              </div>
            </div>

            {/* Geri Yükle Butonu */}
            <button
              onClick={() => handleRestore(task.id)}
              disabled={restoringId === task.id}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-xl active:scale-95 transition-all shrink-0"
              title="Arşivden Çıkar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{restoringId === task.id ? "..." : "Geri Al"}</span>
            </button>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-6 space-y-2">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Archive className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">Arşiv Boş</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Arşivdeki işler ve geçmiş sohbetler burada güvenle saklanır.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
