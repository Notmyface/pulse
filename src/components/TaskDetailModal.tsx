"use client";

import { useEffect, useState } from "react";
import { 
  X, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User, 
  AlertCircle, 
  Send, 
  MessageSquare, 
  Paperclip, 
  Calendar,
  Trash2,
  Pencil
} from "lucide-react";
import type { Task, TaskComment } from "@/types/database";
import { formatTimeAgo } from "@/lib/utils";

interface TaskDetailModalProps {
  task: Task | null;
  teamMembers: { id: string; name: string; role: string }[];
  onClose: () => void;
  onUpdateStatus: (taskId: string, newStatus: Task["status"]) => void;
  onUpdateAssignee: (taskId: string, memberId: string, memberName: string) => void;
  onUpdatePriority: (taskId: string, priority: Task["priority"]) => void;
  onEditTask: (taskId: string, changes: { title: string; description?: string; due_date?: string }) => void;
  onArchiveTask: (taskId: string, archived: boolean) => void;
  canManageTask: boolean;
  comments: TaskComment[];
  onAddComment: (taskId: string, content: string) => void;
}

export default function TaskDetailModal({
  task,
  teamMembers,
  onClose,
  onUpdateStatus,
  onUpdateAssignee,
  onUpdatePriority,
  onEditTask,
  onArchiveTask,
  canManageTask,
  comments,
  onAddComment
}: TaskDetailModalProps) {
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "");
    setIsEditing(false);
  }, [task?.id]);

  const handleAddComment = () => {
    if (!task || !commentText.trim()) return;
    onAddComment(task.id, commentText.trim());
    setCommentText("");
  };

  if (!task) return null;

  const isDone = task.status === "done";

  const handleSaveTask = () => {
    if (!editTitle.trim()) return;
    onEditTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      due_date: editDueDate ? new Date(editDueDate).toISOString() : undefined
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Drawer Container (Mobilde alttan açılan Bottom Sheet) */}
      <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Üst Kapatma & Çekme Çubuğu */}
        <div className="pt-3 pb-2 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Görev Detayı & Tartışma</span>
          {canManageTask && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="ml-auto mr-2 p-1 text-slate-400 hover:text-indigo-300" title="Görevi düzenle">
              <Pencil size={15} />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Gövde - Kaydırılabilir Alan */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Görev Başlığı ve Tamamlama Butonu */}
          <div className="flex items-start gap-3">
            <button 
              onClick={() => onUpdateStatus(task.id, isDone ? "in_progress" : "done")}
              className="mt-1 text-slate-400 hover:text-indigo-400 transition"
            >
              {isDone ? (
                <CheckCircle2 size={24} className="text-emerald-500" />
              ) : (
                <Circle size={24} className="hover:text-indigo-400" />
              )}
            </button>
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <>
                  <input value={editTitle} onChange={event => setEditTitle(event.target.value)} className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-2.5 py-2 text-sm text-white focus:outline-none" />
                  <textarea value={editDescription} onChange={event => setEditDescription(event.target.value)} rows={3} placeholder="Açıklama" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setIsEditing(false)} className="px-2.5 py-1.5 text-[11px] text-slate-400">İptal</button>
                    <button onClick={handleSaveTask} className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px]">Kaydet</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className={`text-base font-semibold leading-snug ${isDone ? "line-through text-slate-400" : "text-white"}`}>{task.title}</h2>
                  {task.description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{task.description}</p>}
                </>
              )}
            </div>
          </div>

          {/* Özellikler Grid (Atanan, Öncelik, Durum, Teslim Tarihi) */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
            
            {/* Atanan Kişi (Yönetici değiştirebilir) */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <User size={13} className="text-indigo-400" /> Görevli
              </label>
              <select 
                value={task.assigned_to || ""}
                onChange={(e) => {
                  const selected = teamMembers.find(m => m.id === e.target.value);
                  onUpdateAssignee(task.id, e.target.value, selected?.name || "");
                }}
                disabled={!canManageTask}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Atanmadı</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Öncelik Seviyesi */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <AlertCircle size={13} className="text-rose-400" /> Öncelik
              </label>
              <select 
                value={task.priority}
                onChange={(e) => onUpdatePriority(task.id, e.target.value as Task["priority"])}
                disabled={!canManageTask}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="urgent">🔴 Acil</option>
                <option value="high">🟠 Yüksek</option>
                <option value="normal">🔵 Normal</option>
                <option value="low">⚪ Düşük</option>
              </select>
            </div>

            {/* Durum */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Clock size={13} className="text-amber-400" /> Durum
              </label>
              <select 
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as Task["status"])}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="todo">Yapılacak</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="done">Tamamlandı</option>
              </select>
            </div>

            {/* Teslim Tarihi */}
            <div className="space-y-1">
              <label className="text-slate-400 flex items-center gap-1 text-[11px]">
                <Calendar size={13} className="text-emerald-400" /> Teslim
              </label>
              {isEditing ? (
                <input type="datetime-local" value={editDueDate} onChange={event => setEditDueDate(event.target.value)} className="w-full bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1.5 text-slate-200 text-xs scheme-dark focus:outline-none" />
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "Belirtilmedi"}
                </div>
              )}
            </div>

          </div>

          {/* GÖREV İÇİ TARTIŞMA / YORUMLAR (THREAD MANTIĞI) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <MessageSquare size={14} className="text-indigo-400" />
              <span>Göreve Özel Yorumlar ({comments.length})</span>
            </div>

            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-indigo-300">{comment.author?.full_name || "Kullanıcı"}</span>
                    <span className="text-slate-400">{formatTimeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{comment.content}</p>
                </div>
              ))}
            </div>

            {/* Yorum Yazma Kutusu */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500">
              <input 
                type="text" 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Bu göreve özel bir not veya yorum yaz..."
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 px-2 focus:outline-none"
              />
              <button 
                onClick={handleAddComment}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {canManageTask && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onArchiveTask(task.id, !task.archived_at)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-amber-950/30 transition"
              >
                <Trash2 size={13} /> {task.archived_at ? "Arşivden Çıkar" : "Görevi Arşivle"}
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
