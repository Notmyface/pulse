"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  ArrowRight, 
  ArrowLeft, 
  Calendar,
  Check
} from "lucide-react";
import type { Task, Profile } from "@/types/database";
import { formatTimeAgo } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  profiles?: Profile[];
  currentUserId?: string;
  onSelectTask: (task: Task) => void;
  onToggleStatus: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: Task["status"]) => void;
}

export default function KanbanBoard({
  tasks,
  profiles = [],
  currentUserId,
  onSelectTask,
  onToggleStatus,
  onUpdateStatus
}: KanbanBoardProps) {
  const [activeColumn, setActiveColumn] = useState<Task["status"]>("todo");

  const columns: { id: Task["status"]; label: string; count: number; color: string; dotColor: string }[] = [
    { 
      id: "todo", 
      label: "Yapılacak", 
      count: tasks.filter(t => t.status === "todo").length,
      color: "border-slate-700 text-slate-300",
      dotColor: "bg-slate-400"
    },
    { 
      id: "in_progress", 
      label: "Devam Ediyor", 
      count: tasks.filter(t => t.status === "in_progress").length,
      color: "border-amber-500/40 text-amber-400",
      dotColor: "bg-amber-400"
    },
    { 
      id: "done", 
      label: "Tamamlandı", 
      count: tasks.filter(t => t.status === "done").length,
      color: "border-emerald-500/40 text-emerald-400",
      dotColor: "bg-emerald-400"
    }
  ];

  // Kullanıcı adı çözümleyici
  const getAssigneeName = (assignedTo?: string) => {
    if (!assignedTo) return "Atanmadı";
    if (assignedTo === currentUserId) return "Bana Atandı";
    const profile = profiles.find(p => p.id === assignedTo);
    return profile?.full_name || profile?.email?.split("@")[0] || "Atandı";
  };

  const handleStatusChange = (taskId: string, newStatus: Task["status"]) => {
    if (onUpdateStatus) {
      onUpdateStatus(taskId, newStatus);
    } else {
      onToggleStatus(taskId);
    }
  };

  const renderTaskCard = (task: Task) => {
    const isDone = task.status === "done";
    const isInProgress = task.status === "in_progress";
    const isTodo = task.status === "todo";
    const assigneeName = getAssigneeName(task.assigned_to);

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task)}
        className={`p-3.5 rounded-xl border cursor-pointer transition shadow-sm active:scale-[0.99] space-y-2.5 ${
          isDone 
            ? "bg-slate-900/50 border-slate-800/80 opacity-75 hover:opacity-100" 
            : "bg-slate-900 border-slate-800 hover:border-indigo-500/50"
        }`}
      >
        {/* Üst Kısım: Başlık ve Toggle */}
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug ${isDone ? "line-through text-slate-400" : "text-slate-100"}`}>
            {task.title}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(task.id);
            }}
            className="text-slate-400 hover:text-indigo-400 transition shrink-0 mt-0.5"
            title={isDone ? "Geri Al" : "Tamamla"}
          >
            {isDone ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <Circle size={18} />
            )}
          </button>
        </div>

        {/* Açıklama */}
        {task.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Rozetler: Öncelik ve Teslim Tarihi */}
        <div className="flex items-center flex-wrap gap-2 text-[10px]">
          {task.priority === "urgent" && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1 border border-rose-500/30">
              <AlertCircle size={10} /> Acil
            </span>
          )}

          {task.priority === "high" && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
              Yüksek
            </span>
          )}

          {task.due_date && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700/60">
              <Calendar size={10} className="text-indigo-400" />
              {new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>

        {/* Alt Kısım: Atanan Kişi ve Hızlı Durum Butonları */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full text-slate-300 truncate max-w-[130px] border border-slate-800">
            <UserCheck size={10} className="text-indigo-400 shrink-0" />
            <span className="truncate">{assigneeName}</span>
          </span>

          {/* Sütunlar Arası Hızlı Geçiş Butonları */}
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {isTodo && (
              <button
                onClick={() => handleStatusChange(task.id, "in_progress")}
                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium transition flex items-center gap-1"
                title="Devam Ediyor'a Taşı"
              >
                <span>İlerle</span> <ArrowRight size={10} />
              </button>
            )}

            {isInProgress && (
              <>
                <button
                  onClick={() => handleStatusChange(task.id, "todo")}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                  title="Yapılacak'a Geri Al"
                >
                  <ArrowLeft size={10} />
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, "done")}
                  className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium transition flex items-center gap-1"
                  title="Tamamla"
                >
                  <span>Tamamla</span> <Check size={10} />
                </button>
              </>
            )}

            {isDone && (
              <button
                onClick={() => handleStatusChange(task.id, "in_progress")}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium transition flex items-center gap-1"
                title="Devam Ediyor'a Geri Al"
              >
                <ArrowLeft size={10} /> <span>Geri Al</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 1. MOBİL SÜTUN SEKMELERİ (Tablet/Geniş ekranda gizlenebilir veya tamamlayıcı olabilir) */}
      <div className="flex gap-2 border-b border-slate-800/80 pb-2 md:hidden">
        {columns.map(col => (
          <button
            key={col.id}
            onClick={() => setActiveColumn(col.id)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
              activeColumn === col.id 
                ? "bg-slate-800 border-indigo-500 text-white shadow-sm" 
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
            <span>{col.label}</span>
            <span className="text-[10px] bg-slate-950 px-1.5 py-0.2 rounded-full font-bold">
              {col.count}
            </span>
          </button>
        ))}
      </div>

      {/* 2. MOBİL: AKTİF SÜTUN KARTLARI */}
      <div className="space-y-2.5 min-h-[300px] md:hidden">
        {tasks.filter(t => t.status === activeColumn).length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            Bu aşamada henüz görev bulunmuyor.
          </div>
        ) : (
          tasks
            .filter(t => t.status === activeColumn)
            .map(renderTaskCard)
        )}
      </div>

      {/* 3. TABLET / GENİŞ EKRAN: 3 SÜTUN YAN YANA GÖRÜNÜM */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-3 min-h-[350px]">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-3 flex flex-col space-y-3">
              {/* Sütun Başlığı */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 font-bold text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Sütun Kartları */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-xs italic">
                    Görev yok
                  </div>
                ) : (
                  colTasks.map(renderTaskCard)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
