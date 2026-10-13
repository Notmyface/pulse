"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle, UserCheck } from "lucide-react";
import type { Task } from "@/types/database";
import { formatTimeAgo } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onToggleStatus: (taskId: string) => void;
}

export default function KanbanBoard({
  tasks,
  onSelectTask,
  onToggleStatus
}: KanbanBoardProps) {
  const [activeColumn, setActiveColumn] = useState<Task["status"]>("todo");

  const columns: { id: Task["status"]; label: string; count: number; color: string }[] = [
    { 
      id: "todo", 
      label: "Yapılacak", 
      count: tasks.filter(t => t.status === "todo").length,
      color: "border-slate-700 text-slate-300"
    },
    { 
      id: "in_progress", 
      label: "Devam Ediyor", 
      count: tasks.filter(t => t.status === "in_progress").length,
      color: "border-amber-500/40 text-amber-400"
    },
    { 
      id: "done", 
      label: "Tamamlandı", 
      count: tasks.filter(t => t.status === "done").length,
      color: "border-emerald-500/40 text-emerald-400"
    }
  ];

  return (
    <div className="space-y-3">
      
      {/* Sütun Değiştirme Butonları (Mobilde yatay sekme) */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
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
            <span>{col.label}</span>
            <span className="text-[10px] bg-slate-950 px-1.5 py-0.2 rounded-full font-bold">
              {col.count}
            </span>
          </button>
        ))}
      </div>

      {/* Aktif Sütundaki Kartlar */}
      <div className="space-y-2.5 min-h-[300px]">
        {tasks.filter(t => t.status === activeColumn).length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            Bu aşamada henüz görev bulunmuyor.
          </div>
        ) : (
          tasks
            .filter(t => t.status === activeColumn)
            .map(task => {
              const isDone = task.status === "done";
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition shadow-sm active:scale-[0.99] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold leading-snug ${isDone ? "line-through text-slate-400" : "text-slate-100"}`}>
                      {task.title}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus(task.id);
                      }}
                      className="text-slate-400 hover:text-indigo-400 transition shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                      <UserCheck size={11} className="text-indigo-400" />
                      {task.assigned_profile?.full_name || "Atanmadı"}
                    </span>

                    {task.priority === "urgent" && (
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        <AlertCircle size={11} /> Acil
                      </span>
                    )}

                    <span>{formatTimeAgo(task.created_at)}</span>
                  </div>
                </div>
              );
            })
        )}
      </div>

    </div>
  );
}
