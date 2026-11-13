"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Circle,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { Task, Profile } from "@/types/database";

interface GeneralCalendarProps {
  tasks: Task[];
  profiles: Profile[];
  currentUserId: string;
  onSelectTask: (task: Task) => void;
  onOpenCreateTask: (defaultDate?: string) => void;
}

export default function GeneralCalendar({
  tasks,
  profiles,
  currentUserId,
  onSelectTask,
  onOpenCreateTask,
}: GeneralCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");

  // Ay Bilgileri
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Takvim Günleri Hesaplama
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Pazartesi'yi 0 kabul etmek için (0: Pzt, 6: Paz)
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Önceki aydan taşan günler
    for (let i = startDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // Bu ayın günleri
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // 35 veya 42 güne tamamlama (Sonraki ay)
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Seçili güne ait görevler
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const tasksForSelectedDate = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      return t.due_date.slice(0, 10) === selectedDateStr;
    });
  }, [tasks, selectedDateStr]);

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* 1. Üst Sekmeler: Ay | Hafta | Gün */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Takvim</h2>
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          {(["month", "week", "day"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCalendarView(mode)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                calendarView === mode
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {mode === "month" ? "Ay" : mode === "week" ? "Hafta" : "Gün"}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ay Navigasyonu */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={prevMonth}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-slate-800 capitalize">{monthName}</span>
        <button
          onClick={nextMonth}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Takvim Izgarası (Grid) */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-xs">
        {/* Gün İsimleri */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
            <div key={day} className="text-[11px] font-semibold text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Gün Hücreleri */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayItem, idx) => {
            const dateStr = dayItem.date.toISOString().slice(0, 10);
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            // O güne ait görevler
            const dayTasks = tasks.filter((t) => t.due_date && t.due_date.slice(0, 10) === dateStr);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(dayItem.date)}
                className={`min-h-[44px] p-1 rounded-2xl flex flex-col items-center justify-between transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md font-bold"
                    : isToday
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                    : dayItem.isCurrentMonth
                    ? "text-slate-700 hover:bg-slate-50 font-medium"
                    : "text-slate-300 font-normal"
                }`}
              >
                <span className="text-xs">{dayItem.date.getDate()}</span>

                {/* Görev Noktaları / Emojileri */}
                <div className="flex -space-x-1 items-center justify-center min-h-[14px]">
                  {dayTasks.slice(0, 2).map((task) => (
                    <span
                      key={task.id}
                      className="w-2 h-2 rounded-full border border-white"
                      style={{
                        backgroundColor: isSelected
                          ? "#ffffff"
                          : task.task_color || "#6366f1",
                      }}
                    />
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[8px] leading-none opacity-80">+</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Seçili Gün Görevleri */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>
            {selectedDate.toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              weekday: "long",
            })}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {tasksForSelectedDate.length} iş
          </span>
        </h3>

        <div className="space-y-2">
          {tasksForSelectedDate.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: task.task_color || "#6366f1" }}
                />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {task.title}
                  </h4>
                  {task.project?.name && (
                    <span className="text-[10px] text-slate-400 font-medium truncate block">
                      {task.project.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Sorumlu Emoji & Öncelik */}
              <div className="flex items-center gap-2 shrink-0">
                {task.assignees?.map((a) => (
                  <span
                    key={a.id}
                    title={a.full_name}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs shadow-2xs"
                  >
                    {a.user_emoji || a.full_name.charAt(0)}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {tasksForSelectedDate.length === 0 && (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
              Bu tarihe atanmış bir görev bulunmuyor.
            </div>
          )}
        </div>
      </div>

      {/* Kayan Ekle Butonu */}
      <button
        onClick={() => onOpenCreateTask(selectedDateStr)}
        className="fixed bottom-20 right-5 z-40 w-13 h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all"
        title="Bu Güne Görev Ekle"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
}
