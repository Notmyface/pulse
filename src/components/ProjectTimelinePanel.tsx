"use client";

import { CalendarRange, Link2 } from "lucide-react";
import type { Task, TaskDependency } from "@/types/database";

interface ProjectTimelinePanelProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  onSelectTask: (task: Task) => void;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export default function ProjectTimelinePanel({ tasks, dependencies, onSelectTask }: ProjectTimelinePanelProps) {
  const activeTasks = tasks.filter(task => !task.archived_at);
  if (activeTasks.length === 0) {
    return <div className="text-center py-12 text-xs text-slate-500">Bu projede zaman çizelgesi için görev yok.</div>;
  }

  const firstDay = startOfDay(new Date(Math.min(...activeTasks.map(task => new Date(task.created_at).getTime()))));
  const lastDay = startOfDay(new Date(Math.max(...activeTasks.map(task => new Date(task.due_date || task.created_at).getTime()))));
  const dayCount = Math.max(7, Math.min(60, Math.ceil((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1));
  const days = Array.from({ length: dayCount }, (_, index) => new Date(firstDay.getTime() + index * 86400000));
  const columnWidth = 52;

  const getTaskPosition = (task: Task) => {
    const start = startOfDay(new Date(task.created_at));
    const end = startOfDay(new Date(task.due_date || task.created_at));
    const left = Math.max(0, Math.round((start.getTime() - firstDay.getTime()) / 86400000));
    const width = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return { left: left * columnWidth, width: width * columnWidth - 8 };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-300">
        <CalendarRange size={15} className="text-indigo-400" />
        <span>Proje zaman çizelgesi</span>
        <span className="text-[10px] text-slate-500">Yatay kaydır</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <div className="min-w-max">
          <div className="flex border-b border-slate-800 pl-32">
            {days.map(day => <div key={dayKey(day)} style={{ width: columnWidth }} className="shrink-0 border-l border-slate-800/70 py-2 text-center text-[9px] text-slate-500">{day.getDate()}<br />{day.toLocaleDateString("tr-TR", { month: "short" })}</div>)}
          </div>
          {activeTasks.sort((first, second) => first.created_at.localeCompare(second.created_at)).map(task => {
            const position = getTaskPosition(task);
            const incoming = dependencies.filter(dependency => dependency.task_id === task.id);
            const isDone = task.status === "done";
            return (
              <button key={task.id} onClick={() => onSelectTask(task)} className="group flex w-full text-left hover:bg-slate-900">
                <div className="w-32 shrink-0 border-t border-slate-800 px-2 py-2">
                  <p className={`truncate text-[10px] font-medium ${isDone ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</p>
                  {incoming.length > 0 && <span className="mt-1 flex items-center gap-1 text-[9px] text-indigo-300"><Link2 size={9} /> Bağlı görev</span>}
                </div>
                <div className="relative h-12 border-t border-slate-800" style={{ width: days.length * columnWidth }}>
                  {days.map(day => <span key={dayKey(day)} style={{ left: (day.getTime() - firstDay.getTime()) / 86400000 * columnWidth, width: columnWidth }} className="absolute inset-y-0 border-l border-slate-800/50" />)}
                  <span style={{ left: position.left, width: position.width }} className={`absolute top-3 h-6 rounded-md px-2 text-[9px] leading-6 text-white shadow-sm ${isDone ? "bg-emerald-700/70 line-through" : task.priority === "urgent" ? "bg-rose-600/80" : "bg-indigo-600/80"}`}>
                    {task.status === "done" ? "Tamamlandı" : task.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
