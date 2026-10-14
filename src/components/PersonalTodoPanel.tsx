"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Plus,
  Trash2,
  Undo2
} from "lucide-react";
import type { PersonalTodo, TaskPriority } from "@/types/database";

interface PersonalTodoPanelProps {
  todos: PersonalTodo[];
  onCreate: (todo: {
    title: string;
    note?: string;
    priority: TaskPriority;
    due_at?: string;
    remind_at?: string;
  }) => void;
  onToggle: (todo: PersonalTodo) => void;
  onDelete: (todoId: string) => void;
  onPostpone: (todo: PersonalTodo, days: number) => void;
}

const priorityLabels: Record<TaskPriority, string> = {
  urgent: "Acil",
  high: "Yüksek",
  normal: "Normal",
  low: "Düşük"
};

const priorityColors: Record<TaskPriority, string> = {
  urgent: "text-rose-400",
  high: "text-orange-400",
  normal: "text-indigo-400",
  low: "text-slate-400"
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function formatTodoDate(value?: string) {
  if (!value) return "Tarih yok";
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function PersonalTodoPanel({ todos, onCreate, onToggle, onDelete, onPostpone }: PersonalTodoPanelProps) {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueAt, setDueAt] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const firstDay = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    return new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - firstDay + 1);
  });

  const visibleTodos = todos
    .filter(todo => filter === "all" || (filter === "open" ? todo.status === "todo" : todo.status === "done"))
    .sort((first, second) => {
      if (!first.due_at) return 1;
      if (!second.due_at) return -1;
      return first.due_at.localeCompare(second.due_at);
    });

  const selectedTodos = visibleTodos.filter(todo => todo.due_at && dateKey(new Date(todo.due_at)) === selectedDate);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      due_at: toIso(dueAt),
      remind_at: toIso(remindAt)
    });
    setTitle("");
    setNote("");
    setDueAt("");
    setRemindAt("");
    setPriority("normal");
    setShowDetails(false);
  };

  const shiftMonth = (amount: number) => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Kişisel Todo</h2>
          <p className="text-[10px] text-slate-400">Sadece senin görebileceğin işler</p>
        </div>
        <span className="text-[10px] text-slate-400">{todos.filter(todo => todo.status === "todo").length} açık iş</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Bugün neyi tamamlamak istiyorsun?"
            className="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button type="submit" disabled={!title.trim()} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg" title="Todo ekle">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={event => setDueAt(event.target.value)}
            className="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 scheme-dark"
            aria-label="Todo teslim tarihi"
          />
          <select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none" aria-label="Todo önceliği">
            {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={async () => {
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
              await Notification.requestPermission();
            }
            setShowDetails(prev => !prev);
          }} className="p-1.5 text-slate-400 hover:text-white" title="Not ve hatırlatıcı alanlarını aç">
            <Bell size={15} />
          </button>
        </div>
        {showDetails && (
          <div className="space-y-2 pt-1">
            <textarea value={note} onChange={event => setNote(event.target.value)} rows={2} placeholder="Kısa not..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none" />
            <label className="flex items-center gap-2 text-[10px] text-slate-400">
              <Bell size={13} className="text-amber-400" /> Hatırlatıcı
              <input type="datetime-local" value={remindAt} onChange={event => setRemindAt(event.target.value)} className="ml-auto bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 scheme-dark" />
            </label>
          </div>
        )}
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="p-1 text-slate-400 hover:text-white" title="Önceki ay"><ChevronLeft size={16} /></button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><CalendarDays size={14} className="text-indigo-400" />{calendarMonth.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}</div>
          <button onClick={() => shiftMonth(1)} className="p-1 text-slate-400 hover:text-white" title="Sonraki ay"><ChevronRight size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-500">
          {['P', 'S', 'Ç', 'P', 'C', 'C', 'P'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} className="aspect-square" />;
            const key = dateKey(date);
            const dayTodos = todos.filter(todo => todo.due_at && dateKey(new Date(todo.due_at)) === key);
            const isSelected = selectedDate === key;
            const isToday = dateKey(today) === key;
            return (
              <button key={key} onClick={() => setSelectedDate(key)} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] transition ${isSelected ? "bg-indigo-600 text-white" : isToday ? "border border-indigo-500/60 text-indigo-300" : "text-slate-300 hover:bg-slate-800"}`}>
                <span>{date.getDate()}</span>
                {dayTodos.length > 0 && <span className={`w-1 h-1 rounded-full mt-0.5 ${dayTodos.some(todo => todo.status === "todo") ? "bg-amber-400" : "bg-emerald-400"}`} />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 border-t border-slate-800 pt-2">
          {(["all", "open", "done"] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`flex-1 py-1 rounded-lg text-[10px] ${filter === value ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}>{value === "all" ? "Tümü" : value === "open" ? "Açık" : "Tamamlandı"}</button>)}
        </div>
      </div>

      {selectedTodos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-slate-400">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</h3>
          {selectedTodos.map(todo => <TodoRow key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onPostpone={onPostpone} />)}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-slate-400">Tüm kişisel işler</h3>
        {visibleTodos.length === 0 ? <div className="text-center py-8 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">Henüz kişisel todo yok.</div> : visibleTodos.map(todo => <TodoRow key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onPostpone={onPostpone} />)}
      </div>
    </div>
  );
}

function TodoRow({ todo, onToggle, onDelete, onPostpone }: { todo: PersonalTodo; onToggle: (todo: PersonalTodo) => void; onDelete: (todoId: string) => void; onPostpone: (todo: PersonalTodo, days: number) => void }) {
  const overdue = todo.status === "todo" && todo.due_at && new Date(todo.due_at) < new Date();
  return (
    <div className={`bg-slate-900 border rounded-xl p-3 space-y-2 ${overdue ? "border-rose-500/50" : "border-slate-800"}`}>
      <div className="flex items-start gap-2">
        <button onClick={() => onToggle(todo)} className="mt-0.5 text-slate-400 hover:text-emerald-400" title={todo.status === "done" ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}>
          {todo.status === "done" ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${todo.status === "done" ? "line-through text-slate-500" : "text-slate-100"}`}>{todo.title}</p>
          {todo.note && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{todo.note}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
            <span className={priorityColors[todo.priority]}>{priorityLabels[todo.priority]}</span>
            {todo.due_at && <span className={overdue ? "text-rose-400" : "text-slate-400"}><Clock3 size={11} className="inline mr-0.5" />{formatTodoDate(todo.due_at)}</span>}
            {todo.remind_at && <span className="text-amber-400"><Bell size={11} className="inline mr-0.5" />{formatTodoDate(todo.remind_at)}</span>}
          </div>
        </div>
        <button onClick={() => onDelete(todo.id)} className="p-1 text-slate-500 hover:text-rose-400" title="Todo'yu sil"><Trash2 size={14} /></button>
      </div>
      {todo.status === "todo" && <div className="flex gap-1.5 pl-6">
        <button onClick={() => onPostpone(todo, 1)} className="px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-400 hover:text-white">Yarına ertele</button>
        <button onClick={() => onPostpone(todo, 7)} className="px-2 py-1 rounded-md bg-slate-800 text-[10px] text-slate-400 hover:text-white">1 hafta ertele</button>
      </div>}
      {todo.status === "done" && <span className="flex items-center gap-1 pl-6 text-[10px] text-emerald-400"><Check size={11} /> Tamamlandı</span>}
    </div>
  );
}
