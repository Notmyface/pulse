"use client";

import React, { useState, useMemo } from "react";
import {
  Kanban as KanbanIcon,
  CalendarRange,
  Download,
  Plus,
  Circle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Edit3,
} from "lucide-react";
import type { Task, Project, Profile } from "@/types/database";
import { exportGanttToPdf } from "./GanttPdfExport";
import { createDoubleTapHandler } from "@/lib/gestures";

interface KanbanGanttViewProps {
  project: Project | null;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onOpenCreateTask: (defaultStatus?: "todo" | "in_progress" | "done") => void;
  onUpdateTaskStatus: (taskId: string, status: "todo" | "in_progress" | "done") => Promise<void>;
}

export default function KanbanGanttView({
  project,
  tasks,
  onEditTask,
  onOpenCreateTask,
  onUpdateTaskStatus,
}: KanbanGanttViewProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "gantt">("kanban");
  const [selectedGanttTask, setSelectedGanttTask] = useState<Task | null>(null);

  // Kanban Sütunları
  const todoTasks = useMemo(() => tasks.filter((t) => t.status === "todo"), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter((t) => t.status === "in_progress"), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);

  // Gantt için zaman çizelgesi günleri (Önümüzdeki 14 gün)
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    // 2 gün önceden başla
    for (let i = -2; i < 12; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  return (
    <div className="space-y-4">
      {/* Üst Görünüm Toggle'ı & PDF İndir Butonu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "kanban"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode("gantt")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === "gantt"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Gantt
          </button>
        </div>

        {viewMode === "gantt" && (
          <button
            onClick={() => exportGanttToPdf(project, tasks)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            PDF İndir
          </button>
        )}
      </div>

      {/* 1. KANBAN GÖRÜNÜMÜ */}
      {viewMode === "kanban" && (
        <div className="space-y-4">
          {[
            { id: "todo", title: "Yapılacak", list: todoTasks, color: "slate" },
            { id: "in_progress", title: "Devam Ediyor", list: inProgressTasks, color: "indigo" },
            { id: "done", title: "Tamamlandı", list: doneTasks, color: "emerald" },
          ].map((col) => (
            <div
              key={col.id}
              className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700">{col.title}</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600">
                    {col.list.length}
                  </span>
                </div>
                <button
                  onClick={() => onOpenCreateTask(col.id as "todo" | "in_progress" | "done")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ekle
                </button>
              </div>

              <div className="space-y-2">
                {col.list.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onEditTask(task)}
                    className="bg-white p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 shadow-xs cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden"
                  >
                    {/* Görev Rengi Çizgisi */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: task.task_color || "#6366f1" }}
                    />
                    <div className="pl-1.5">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-2">
                        {task.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        {/* Tarih */}
                        <span>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString("tr-TR") : "Tarihsiz"}
                        </span>
                        {/* Sorumlu Avatarları */}
                        <div className="flex -space-x-1">
                          {task.assignees?.slice(0, 2).map((a) => (
                            <span
                              key={a.id}
                              className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center border border-white"
                            >
                              {a.user_emoji || a.full_name.charAt(0)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {col.list.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400 italic">
                    Görev bulunmuyor
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. GANTT GÖRÜNÜMÜ (Ekran 10 Detayı) */}
      {viewMode === "gantt" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs overflow-x-auto">
            {/* Tarih Başlıkları */}
            <div className="flex border-b border-slate-100 pb-2 mb-2 min-w-[500px]">
              <div className="w-32 shrink-0 text-xs font-bold text-slate-400 uppercase">Görev</div>
              <div className="flex-1 grid grid-cols-14 gap-1 text-center">
                {timelineDates.map((date, idx) => (
                  <div key={idx} className="text-[10px] font-semibold text-slate-500">
                    <div>{date.getDate()}</div>
                    <div className="text-[8px] text-slate-400">
                      {date.toLocaleDateString("tr-TR", { weekday: "narrow" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Görev Çubukları */}
            <div className="space-y-2.5 min-w-[500px]">
              {tasks.map((task) => {
                const isSelected = selectedGanttTask?.id === task.id;

                // Çift Dokunuş -> Düzenleme ekranı açar
                const handleTap = createDoubleTapHandler(
                  () => setSelectedGanttTask(task),
                  () => onEditTask(task)
                );

                return (
                  <div
                    key={task.id}
                    onClick={handleTap}
                    className={`flex items-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                      isSelected ? "bg-indigo-50/60 ring-1 ring-indigo-300" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="w-32 shrink-0 truncate text-xs font-semibold text-slate-700 pr-2">
                      {task.title}
                    </div>

                    <div className="flex-1 relative h-6 bg-slate-50 rounded-lg flex items-center px-1">
                      {/* Simüle Edilen Görev Çubuğu */}
                      <div
                        className="h-4 rounded-md shadow-xs opacity-90 transition-all flex items-center px-2 text-[9px] font-bold text-white truncate"
                        style={{
                          backgroundColor: task.task_color || "#6366f1",
                          width: task.due_date ? "65%" : "30%",
                        }}
                      >
                        {task.title}
                      </div>
                    </div>
                  </div>
                );
              })}

              {tasks.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Gantt çizelgesinde görüntülenecek görev yok.
                </div>
              )}
            </div>
          </div>

          {/* Seçili Görev Detayı (Ekran 10 Alt Paneli) */}
          {selectedGanttTask && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedGanttTask.task_color || "#6366f1" }}
                  />
                  <h4 className="text-xs font-bold text-slate-800">
                    {selectedGanttTask.title}
                  </h4>
                </div>
                <button
                  onClick={() => onEditTask(selectedGanttTask)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg"
                >
                  <Edit3 className="w-3 h-3" />
                  Düzenle
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div>
                  <span className="font-semibold text-slate-400">Öncelik:</span>{" "}
                  {selectedGanttTask.priority || "Orta"}
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Bitiş:</span>{" "}
                  {selectedGanttTask.due_date
                    ? new Date(selectedGanttTask.due_date).toLocaleDateString("tr-TR")
                    : "Tarihsiz"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
