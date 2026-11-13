"use client";

import React, { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import type { Task, Profile } from "@/types/database";
import { createDoubleTapHandler } from "@/lib/gestures";

interface TaskItemCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

export default function TaskItemCard({ task, onEdit, onToggleComplete }: TaskItemCardProps) {
  const isDone = task.status === "done";

  // Tek dokunuş ve çift dokunuş ayırt edici handler
  const handleTap = useMemo(() => {
    return createDoubleTapHandler(
      () => onEdit(task),
      () => onToggleComplete(task)
    );
  }, [task, onEdit, onToggleComplete]);

  // Öncelik etiketleri
  const priorityConfig = {
    urgent: {
      label: "İvedi",
      badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
      icon: AlertCircle,
    },
    high: {
      label: "Yüksek",
      badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
      icon: ArrowUp,
    },
    normal: {
      label: "Orta",
      badgeClass: "bg-orange-50 text-orange-600 border-orange-200",
      icon: Minus,
    },
    low: {
      label: "Düşük",
      badgeClass: "bg-sky-50 text-sky-600 border-sky-200",
      icon: ArrowDown,
    },
  }[task.priority || "normal"];

  const PriorityIcon = priorityConfig.icon;

  return (
    <div
      onClick={handleTap}
      className={`relative group flex items-center justify-between p-3.5 bg-white rounded-2xl border transition-all active:scale-[0.98] select-none cursor-pointer shadow-sm hover:shadow ${
        isDone
          ? "border-slate-200/60 bg-slate-50/60 opacity-75"
          : "border-slate-200 hover:border-indigo-200"
      }`}
    >
      {/* Sol görev rengi şeridi */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
        style={{ backgroundColor: task.task_color || "#6366f1" }}
      />

      <div className="flex items-center gap-3 pl-2 min-w-0 flex-1">
        {/* Tamamlama Butonu */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className="text-slate-300 hover:text-emerald-500 transition-colors shrink-0"
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
          ) : (
            <Circle className="w-5 h-5 hover:stroke-indigo-500" />
          )}
        </button>

        {/* Görev Başlığı ve Proje Bilgisi */}
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4
              className={`text-sm font-medium tracking-tight truncate ${
                isDone
                  ? "line-through text-slate-400 font-normal"
                  : "text-slate-800"
              }`}
            >
              {task.title}
            </h4>
          </div>
          {task.project?.name && (
            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {task.project.name}
            </p>
          )}
        </div>
      </div>

      {/* Sağ Kısım: Sorumlu Avatarları + Öncelik Rozeti */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Çoklu Sorumlular */}
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex -space-x-1.5 overflow-hidden items-center">
            {task.assignees.slice(0, 3).map((assignee: Profile) => (
              <div
                key={assignee.id}
                title={assignee.full_name}
                className="w-6 h-6 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shadow-xs shrink-0"
                style={
                  assignee.user_color
                    ? { backgroundColor: `${assignee.user_color}25`, color: assignee.user_color }
                    : {}
                }
              >
                {assignee.user_emoji || assignee.full_name.charAt(0).toUpperCase()}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full border border-white bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-xs">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        ) : task.assigned_profile ? (
          <div
            title={task.assigned_profile.full_name}
            className="w-6 h-6 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shadow-xs shrink-0"
          >
            {task.assigned_profile.user_emoji || task.assigned_profile.full_name.charAt(0).toUpperCase()}
          </div>
        ) : null}

        {/* Öncelik Rozeti */}
        <span
          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${priorityConfig.badgeClass}`}
        >
          <PriorityIcon className="w-3 h-3" />
          {priorityConfig.label}
        </span>
      </div>
    </div>
  );
}
