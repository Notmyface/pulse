"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Bell,
  Plus,
  ArrowUpDown,
  Filter,
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import type { Task, Profile } from "@/types/database";
import TaskItemCard from "./TaskItemCard";
import UndoToast from "./UndoToast";

interface PersonalHomeScreenProps {
  currentUser: Profile;
  tasks: Task[];
  onOpenCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleCompleteTask: (task: Task) => Promise<void>;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
}

type TimeFilterKey = "this_week" | "next_week" | "this_month" | "past" | "all";

export default function PersonalHomeScreen({
  currentUser,
  tasks,
  onOpenCreateTask,
  onEditTask,
  onToggleCompleteTask,
  onOpenNotifications,
  unreadNotificationCount = 0,
}: PersonalHomeScreenProps) {
  // Zaman Filtreleri State'i
  const [timeFilters, setTimeFilters] = useState<Record<TimeFilterKey, boolean>>({
    this_week: true,
    next_week: false,
    this_month: false,
    past: false,
    all: false,
  });

  // Tamamlanma Filtresi (Tamamlananlar / Tamamlanmayanlar)
  const [showCompleted, setShowCompleted] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(true);

  // Sıralama Seçeneği (A: Tarihsizler önce, B: Yakın tarihliler önce)
  const [sortOption, setSortOption] = useState<"A" | "B">("A");

  // Arama metni
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Geri Al (Undo) Toast State'i
  const [undoToast, setUndoToast] = useState<{
    isOpen: boolean;
    task: Task | null;
    message: string;
  }>({
    isOpen: false,
    task: null,
    message: "",
  });

  // Filtre Değiştirme Mantığı (Gereksinim Dokümanı Madde 2.3 Kuralları)
  const handleToggleTimeFilter = (key: TimeFilterKey) => {
    setTimeFilters((prev) => {
      const next = { ...prev };

      if (key === "all") {
        const willBeAll = !prev.all;
        return {
          this_week: false,
          next_week: false,
          this_month: false,
          past: false,
          all: willBeAll,
        };
      }

      // Başka bir filtre seçildiyse "all" kalkar
      next.all = false;
      const willBeActive = !prev[key];
      next[key] = willBeActive;

      // Özel Kural 1: Bu Ay seçildiğinde haftalık seçimler kalkar
      if (key === "this_month" && willBeActive) {
        next.this_week = false;
        next.next_week = false;
      }

      // Özel Kural 2: Bu Hafta veya Önümüzdeki Hafta seçildiğinde Bu Ay kalkar
      if ((key === "this_week" || key === "next_week") && willBeActive) {
        next.this_month = false;
      }

      // Hiçbir şey kalmadıysa varsayılan Hepsi yap
      const hasAny = Object.entries(next).some(([k, v]) => k !== "all" && v);
      if (!hasAny && !next.all) {
        next.all = true;
      }

      return next;
    });
  };

  // Kişisel Sayfa Görev Görünürlük Kuralları (Madde 2.1)
  const userPersonalTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Çoklu atama kontrolü
      const isAssigned =
        t.assignees?.some((a) => a.id === currentUser.id) ||
        t.assigned_to === currentUser.id;

      // 2. Kendisi oluşturmuş ama listesiz/ataması olmayan iş
      const isCreatorPersonal =
        t.created_by === currentUser.id &&
        (!t.project_id || (!t.assigned_to && (!t.assignees || t.assignees.length === 0)));

      // Görev kullanıcıya ait veya kullanıcı sorumlu
      return isAssigned || isCreatorPersonal;
    });
  }, [tasks, currentUser.id]);

  // Filtrelenmiş ve Sıralanmış Görevler
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Hafta başlangıcı (Pazartesi) ve bitişi
    const dayOfWeek = (startOfToday.getDay() + 6) % 7; // 0 = Pazartesi
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Önümüzdeki hafta
    const startOfNextWeek = new Date(endOfWeek);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

    // Bu ay başlangıcı ve bitişi
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return userPersonalTasks.filter((task) => {
      // Arama filtresi
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesProject = task.project?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesProject) return false;
      }

      // Tamamlanma durumu filtresi (Madde 2.4)
      const isDone = task.status === "done";
      if (!showCompleted && isDone) return false;
      if (!showIncomplete && !isDone) return false;

      // Zaman filtresi (Madde 2.3)
      if (timeFilters.all) return true;

      const dueDate = task.due_date ? new Date(task.due_date) : null;

      // Tarihsiz işler
      if (!dueDate) {
        return timeFilters.all || (!timeFilters.past && !timeFilters.next_week);
      }

      let matchesTime = false;

      // Bu Hafta
      if (timeFilters.this_week && dueDate >= startOfWeek && dueDate < endOfWeek) {
        matchesTime = true;
      }
      // Önümüzdeki Hafta
      if (timeFilters.next_week && dueDate >= startOfNextWeek && dueDate < endOfNextWeek) {
        matchesTime = true;
      }
      // Bu Ay
      if (timeFilters.this_month && dueDate >= startOfMonth && dueDate <= endOfMonth) {
        matchesTime = true;
      }
      // Geçmiş
      if (timeFilters.past && dueDate < startOfToday) {
        matchesTime = true;
      }

      return matchesTime;
    });
  }, [userPersonalTasks, timeFilters, showCompleted, showIncomplete, searchQuery]);

  // Gruplama ve Sıralama
  const { undatedTasks, datedTaskGroups, pastTasks } = useMemo(() => {
    const undated: Task[] = [];
    const datedMap = new Map<string, Task[]>();
    const past: Task[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    filteredTasks.forEach((task) => {
      if (!task.due_date) {
        undated.push(task);
      } else {
        const dateStr = task.due_date.slice(0, 10);
        if (dateStr < todayStr && task.status === "done") {
          past.push(task);
        } else {
          if (!datedMap.has(dateStr)) datedMap.set(dateStr, []);
          datedMap.get(dateStr)!.push(task);
        }
      }
    });

    // Tarih gruplarını sırala (en yakından en uzağa)
    const sortedDates = Array.from(datedMap.keys()).sort();
    const sortedGroups = sortedDates.map((dateStr) => ({
      date: dateStr,
      tasks: datedMap.get(dateStr)!,
    }));

    return {
      undatedTasks: undated,
      datedTaskGroups: sortedGroups,
      pastTasks: past,
    };
  }, [filteredTasks]);

  // Tamamlama ve Geri Al (Undo) İşlemi
  const handleToggleComplete = async (task: Task) => {
    await onToggleCompleteTask(task);
    const newStatus = task.status === "done" ? "todo" : "done";
    if (newStatus === "done") {
      setUndoToast({
        isOpen: true,
        task,
        message: `"${task.title}" tamamlandı`,
      });
      setTimeout(() => {
        setUndoToast((prev) => (prev.task?.id === task.id ? { ...prev, isOpen: false } : prev));
      }, 4000);
    }
  };

  const handleUndo = async () => {
    if (undoToast.task) {
      await onToggleCompleteTask(undoToast.task);
      setUndoToast({ isOpen: false, task: null, message: "" });
    }
  };

  const openTasksCount = userPersonalTasks.filter((t) => t.status !== "done").length;

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto min-h-screen">
      {/* 1. Üst Başlık ve Karşılama */}
      <div className="flex items-center justify-between py-3 mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm border border-slate-100"
            style={{
              backgroundColor: currentUser.user_color ? `${currentUser.user_color}20` : "#e0e7ff",
              color: currentUser.user_color || "#4338ca",
            }}
          >
            {currentUser.user_emoji || currentUser.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              Merhaba {currentUser.full_name.split(" ")[0]}!
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Bugünün özeti: <span className="font-semibold text-indigo-600">{openTasksCount} iş</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenNotifications}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      {/* Arama Alanı (Açıldığında) */}
      {isSearchOpen && (
        <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kişisel işlerde ara..."
            autoFocus
            className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}

      {/* 2. Zaman Filtreleri (Badge Checkbox) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {[
          { key: "this_week", label: "Bu Hafta" },
          { key: "next_week", label: "Önümüzdeki Hafta" },
          { key: "past", label: "Geçmiş" },
          { key: "this_month", label: "Bu Ay" },
          { key: "all", label: "Hepsi" },
        ].map((item) => {
          const isChecked = timeFilters[item.key as TimeFilterKey];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleToggleTimeFilter(item.key as TimeFilterKey)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                isChecked
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Durum & Sıralama Barı */}
      <div className="flex items-center justify-between py-2 mb-2 text-xs text-slate-500 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIncomplete(!showIncomplete)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
              showIncomplete ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Açık ({userPersonalTasks.filter((t) => t.status !== "done").length})
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
              showCompleted ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Tamamlanan ({userPersonalTasks.filter((t) => t.status === "done").length})
          </button>
        </div>

        <button
          onClick={() => setSortOption(sortOption === "A" ? "B" : "A")}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
          title="Sıralamayı Değiştir"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{sortOption === "A" ? "Tarihsizler Önce" : "Tarihliler Önce"}</span>
        </button>
      </div>

      {/* 4. Görev Listesi (Seçenek A / B Sıralamasına Göre) */}
      <div className="space-y-4">
        {/* Sıralama A: Önce Tarihsizler */}
        {sortOption === "A" && undatedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between">
              <span>Tarihsiz İşler ({undatedTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {undatedTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tarihli Gruplar */}
        {datedTaskGroups.map((group) => {
          const dateObj = new Date(group.date);
          const dateFormatted = dateObj.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
          });

          return (
            <div key={group.date} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 tracking-tight flex items-center justify-between">
                <span>{dateFormatted}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {group.tasks.length} iş
                </span>
              </h3>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskItemCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Sıralama B: Sonra Tarihsizler */}
        {sortOption === "B" && undatedTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between">
              <span>Tarihsiz İşler ({undatedTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {undatedTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Geçmiş İşler Grubu */}
        {pastTasks.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between">
              <span>Geçmiş İşler ({pastTasks.length})</span>
            </h3>
            <div className="space-y-2">
              {pastTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Boş Durum (Empty State) */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-3xl mx-auto flex items-center justify-center mb-3">
              <CheckSquare className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              Filtrelere uygun görev bulunamadı
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
              Zaman veya durum filtrelerini değiştirerek daha fazla iş görebilirsiniz.
            </p>
            <button
              onClick={() =>
                setTimeFilters({
                  this_week: false,
                  next_week: false,
                  this_month: false,
                  past: false,
                  all: true,
                })
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full"
            >
              Tüm İşleri Göster
            </button>
          </div>
        )}
      </div>

      {/* 5. Kayan Hızlı Ekleme Butonu (FAB +) */}
      <button
        onClick={onOpenCreateTask}
        className="fixed bottom-20 right-5 z-40 w-13 h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all"
        title="Yeni Görev Ekle"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* 6. Geri Al (Undo) Bildirimi */}
      <UndoToast
        isOpen={undoToast.isOpen}
        message={undoToast.message}
        onUndo={handleUndo}
      />
    </div>
  );
}
