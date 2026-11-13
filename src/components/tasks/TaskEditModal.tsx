"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  Check,
  FolderKanban,
  AlertCircle,
  Palette,
  Send,
  Paperclip,
  Smile,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Task, Profile, Project, Category, TaskPriority, TaskComment } from "@/types/database";

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (taskData: Partial<Task>, assigneeIds: string[]) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  profiles: Profile[];
  projects: Project[];
  categories: Category[];
  currentUserId: string;
  comments?: TaskComment[];
  onAddComment?: (taskId: string, content: string) => Promise<void>;
}

const COLOR_PALETTE = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
];

export default function TaskEditModal({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  profiles,
  projects,
  categories,
  currentUserId,
  comments = [],
  onAddComment,
}: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [taskColor, setTaskColor] = useState("#6366f1");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
      setSelectedProjectId(task.project_id || "");
      setPriority(task.priority || "normal");
      setTaskColor(task.task_color || "#6366f1");

      const existingIds = task.assignees?.map((a) => a.id) || (task.assigned_to ? [task.assigned_to] : []);
      setSelectedAssigneeIds(existingIds);
    } else {
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelectedProjectId("");
      setPriority("normal");
      setTaskColor("#6366f1");
      setSelectedAssigneeIds([currentUserId]);
    }
  }, [task, currentUserId]);

  if (!isOpen) return null;

  const toggleAssignee = (profileId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await onSave(
        {
          id: task?.id,
          title: title.trim(),
          description: description.trim() || undefined,
          due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
          project_id: selectedProjectId || undefined,
          priority,
          task_color: taskColor,
        },
        selectedAssigneeIds
      );
      onClose();
    } catch (err) {
      console.error("Görev kaydedilemedi:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!task?.id || !newComment.trim() || !onAddComment) return;
    await onAddComment(task.id, newComment.trim());
    setNewComment("");
  };

  const displayedComments = showAllComments ? comments : comments.slice(-2);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-semibold text-slate-800">
            {task ? "İşi Düzenle" : "Yeni İş Ekle"}
          </h3>
          {task && onDelete ? (
            <button
              onClick={() => {
                if (window.confirm("Bu görevi silmek istediğinize emin misiniz?")) {
                  onDelete(task.id);
                  onClose();
                }
              }}
              className="p-1.5 -mr-1.5 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Başlık */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Başlık *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Mimari çizim"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Tarih */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tarih (Bitiş)
            </label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Kişiler (Çoklu Seçim) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">
                Kişiler (Çoklu Seçim)
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedAssigneeIds.length} kişi seçildi
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {profiles.map((profile) => {
                const isSelected = selectedAssigneeIds.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => toggleAssignee(profile.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium shrink-0 transition-all ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: profile.user_color || "#6366f1" }}
                    >
                      {profile.user_emoji || profile.full_name.charAt(0)}
                    </span>
                    <span className="truncate max-w-[80px]">
                      {profile.full_name.split(" ")[0]}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liste (Kategori > Liste) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Liste (Kategori {">"} Liste)
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="">Kişisel Görev (Listesiz)</option>
              {projects.map((proj) => {
                const cat = categories.find((c) => c.id === proj.category_id);
                return (
                  <option key={proj.id} value={proj.id}>
                    {cat ? `${cat.name} > ` : ""}
                    {proj.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Öncelik */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Öncelik
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "urgent", label: "İvedi", color: "rose" },
                { id: "high", label: "Yüksek", color: "amber" },
                { id: "normal", label: "Orta", color: "orange" },
                { id: "low", label: "Düşük", color: "sky" },
              ].map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as TaskPriority)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Renk (Kanban & Gantt için) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600">
                Görev Rengi (Kanban & Gantt için)
              </label>
              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: taskColor }} />
            </div>
            <div className="flex items-center gap-2.5">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTaskColor(color)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                    taskColor === color ? "scale-115 ring-2 ring-offset-2 ring-slate-800" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {taskColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Yorumlar (Yalnızca mevcut görevler için) */}
          {task && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Yorumlar ({comments.length})
              </label>

              {/* Yorum Listesi */}
              {displayedComments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {displayedComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-700">
                          {comment.author?.full_name || "Kullanıcı"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComments(!showAllComments)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {showAllComments ? (
                        <>Daha az göster <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>{comments.length - 2} yorum daha göster <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Yorum Yazma Alanı */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Yorumunuzu yazın..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
