"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  Bell, 
  Users, 
  CheckSquare, 
  Plus, 
  Send, 
  Sparkles, 
  AlertCircle, 
  Kanban, 
  ListFilter, 
  FileText, 
  Image as ImageIcon, 
  X, 
  AtSign,
  UserCheck
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Task, ChatMessage, NotificationItem } from "@/types/database";
import TaskDetailModal from "@/components/TaskDetailModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import KanbanBoard from "@/components/KanbanBoard";
import MentionPopover from "@/components/MentionPopover";
import FileUploadButton, { type UploadedFile } from "@/components/FileUploadButton";
import PushNotificationToggle from "@/components/PushNotificationToggle";

export default function MobileDashboard() {
  const [activeTab, setActiveTab] = useState<"tasks" | "chat" | "notifications" | "team">("tasks");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [taskFilter, setTaskFilter] = useState<"all" | "assigned_to_me" | "urgent">("all");
  
  // Projeler
  const [projects] = useState([
    { id: "p1", name: "Pulse Mobil v1", color: "#6366f1" },
    { id: "p2", name: "Büyüme & Lansman", color: "#ec4899" },
    { id: "p3", name: "Müşteri Destek", color: "#10b981" }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>("p1");

  // 20-25 Kişilik Ekip Üyeleri
  const [teamMembers] = useState([
    { id: "u1", name: "Kerim (Yönetici)", role: "Admin / Manager" },
    { id: "u2", name: "Ali Demir", role: "Frontend Geliştirici" },
    { id: "u3", name: "Zeynep Yılmaz", role: "Proje Yöneticisi" },
    { id: "u4", name: "Burak Kaya", role: "Backend Geliştirici" },
    { id: "u5", name: "Selin Arslan", role: "UI/UX Tasarımcı" }
  ]);

  // Sohbet Modu: 'channel' (Proje Odası) veya 'dm' (1-e-1 Özel Konuşma)
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [activeDmUser, setActiveDmUser] = useState<string>("u2"); // Varsayılan DM: Ali Demir

  // Modallar
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dosya Eki State'i
  const [pendingAttachment, setPendingAttachment] = useState<UploadedFile | null>(null);

  // Mention State'i
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState("");

  // Görevler
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "t1",
      project_id: "p1",
      title: "Mobil PWA Bildirim Entegrasyonu",
      description: "Web Push API kullanarak kilit ekranı bildirimlerini aktifleştir",
      status: "in_progress",
      priority: "urgent",
      created_by: "u1",
      assigned_to: "u2",
      due_date: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      assigned_profile: { id: "u2", email: "ali@ekip.com", full_name: "Ali Demir", role: "member", created_at: "" }
    },
    {
      id: "t2",
      project_id: "p1",
      title: "Cloudflare R2 Dosya Yükleme Servisi",
      description: "Presigned URL ile güvenli direct-to-storage yüklemelerini test et",
      status: "todo",
      priority: "high",
      created_by: "u1",
      assigned_to: "u3",
      due_date: new Date(Date.now() + 172800000).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      assigned_profile: { id: "u3", email: "zeynep@ekip.com", full_name: "Zeynep Yılmaz", role: "manager", created_at: "" }
    },
    {
      id: "t3",
      project_id: "p1",
      title: "Ekip İçi @Mention Bildirim Testi",
      description: "Mesaj içinde @ etiketi yapıldığında anlık bildirim tetikleyicisi",
      status: "done",
      priority: "normal",
      created_by: "u1",
      assigned_to: "u1",
      completed_at: new Date(Date.now() - 1800000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString(),
      assigned_profile: { id: "u1", email: "yonetici@ekip.com", full_name: "Kerim (Yönetici)", role: "admin", created_at: "" }
    }
  ]);

  // Mesajlaşma (Dosya ekleri destekli)
  interface ExtendedMessage extends ChatMessage {
    attachment?: UploadedFile;
  }

  const [messages, setMessages] = useState<ExtendedMessage[]>([
    {
      id: "m1",
      project_id: "p1",
      sender_id: "u3",
      content: "Selam ekip, bugünkü görev dağılımı güncellendi! @Ali Demir PWA bildirimleri senin üzerinde.",
      mentions: ["u2"],
      is_direct_message: false,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      sender: { id: "u3", email: "zeynep@ekip.com", full_name: "Zeynep Yılmaz", role: "manager", created_at: "" }
    },
    {
      id: "m2",
      project_id: "p1",
      sender_id: "u2",
      content: "Harika, üzerinde çalışıyorum. Eklediğim API şemasını inceleyebilirsiniz:",
      mentions: [],
      is_direct_message: false,
      created_at: new Date(Date.now() - 900000).toISOString(),
      sender: { id: "u2", email: "ali@ekip.com", full_name: "Ali Demir", role: "member", created_at: "" },
      attachment: {
        file_name: "pwa-api-spec.pdf",
        file_url: "#",
        file_size: 1024 * 450,
        mime_type: "application/pdf"
      }
    },
    {
      id: "m3",
      sender_id: "u2",
      recipient_id: "u1",
      content: "Yönetici selam, acil görev hakkında bir soru sorabilir miyim?",
      mentions: [],
      is_direct_message: true,
      created_at: new Date(Date.now() - 400000).toISOString(),
      sender: { id: "u2", email: "ali@ekip.com", full_name: "Ali Demir", role: "member", created_at: "" }
    }
  ]);

  // Bildirimler
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      user_id: "u1",
      actor_id: "u2",
      type: "task_completed",
      title: "Görev Tamamlandı",
      message: "Ali Demir 'Mobil PWA Bildirim Entegrasyonu' görevini tamamladı.",
      entity_type: "task",
      entity_id: "t1",
      is_read: false,
      created_at: new Date(Date.now() - 600000).toISOString(),
      actor: { id: "u2", email: "ali@ekip.com", full_name: "Ali Demir", role: "member", created_at: "" }
    },
    {
      id: "n2",
      user_id: "u1",
      actor_id: "u3",
      type: "mention",
      title: "Mesajda Etiketlendiniz",
      message: "Zeynep Yılmaz sizi etiketledi: '@Kerim'",
      entity_type: "chat",
      entity_id: "m1",
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      actor: { id: "u3", email: "zeynep@ekip.com", full_name: "Zeynep Yılmaz", role: "manager", created_at: "" }
    }
  ]);

  const [newMessageText, setNewMessageText] = useState("");

  // Görevi Tamamla / Geri Al
  const toggleTaskStatus = (taskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const nextStatus = target.status === "done" ? "in_progress" : "done";

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: nextStatus,
              completed_at: nextStatus === "done" ? new Date().toISOString() : undefined
            }
          : task
      )
    );

    if (nextStatus === "done") {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: "u1",
        actor_id: target.assigned_to || "u1",
        type: "task_completed",
        title: "Görev Tamamlandı!",
        message: `"${target.title}" görevi tamamlandı olarak işaretlendi.`,
        entity_type: "task",
        entity_id: target.id,
        is_read: false,
        created_at: new Date().toISOString(),
        actor: target.assigned_profile
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  // Görev Güncelleme
  const handleUpdateStatus = (taskId: string, newStatus: Task["status"]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { 
      ...t, 
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : undefined
    } : t));

    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleUpdateAssignee = (taskId: string, memberId: string, memberName: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      assigned_to: memberId,
      assigned_profile: {
        id: memberId,
        email: `${memberName.toLowerCase().replace(/\s+/g, '')}@ekip.com`,
        full_name: memberName,
        role: "member",
        created_at: ""
      }
    } : t));

    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { 
        ...prev, 
        assigned_to: memberId,
        assigned_profile: {
          id: memberId,
          email: `${memberName.toLowerCase().replace(/\s+/g, '')}@ekip.com`,
          full_name: memberName,
          role: "member",
          created_at: ""
        }
      } : null);
    }
  };

  const handleUpdatePriority = (taskId: string, priority: Task["priority"]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, priority } : null);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  // Yeni Görev Oluşturma
  const handleCreateTask = (newTaskData: Omit<Task, "id" | "created_at">) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);

    if (newTask.assigned_to && newTask.assigned_to !== "u1") {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: newTask.assigned_to,
        actor_id: "u1",
        type: "task_assigned",
        title: "Yeni Görev Atandı",
        message: `Yönetici size "${newTask.title}" görevini atadı.`,
        entity_type: "task",
        entity_id: newTask.id,
        is_read: false,
        created_at: new Date().toISOString(),
        actor: { id: "u1", email: "yonetici@ekip.com", full_name: "Kerim (Yönetici)", role: "admin", created_at: "" }
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  // Mesaj Gönderme & Mention Bildirimi Tetikleme
  const handleSendMessage = () => {
    if (!newMessageText.trim() && !pendingAttachment) return;

    // Etiketlenen kişileri bul
    const mentionedMembers = teamMembers.filter(m => 
      newMessageText.includes(`@${m.name}`)
    );

    const isDm = chatMode === "dm";

    const newMsg: ExtendedMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      project_id: isDm ? undefined : activeProjectId,
      sender_id: "u1",
      recipient_id: isDm ? activeDmUser : undefined,
      content: newMessageText,
      mentions: mentionedMembers.map(m => m.id),
      is_direct_message: isDm,
      created_at: new Date().toISOString(),
      sender: { id: "u1", email: "yonetici@ekip.com", full_name: "Siz (Yönetici)", role: "admin", created_at: "" },
      attachment: pendingAttachment || undefined
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessageText("");
    setPendingAttachment(null);
    setIsMentionOpen(false);

    // Etiketlenen kişilere otomatik bildirim üret
    mentionedMembers.forEach(member => {
      if (member.id !== "u1") {
        const notif: NotificationItem = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: member.id,
          actor_id: "u1",
          type: "mention",
          title: "Mesajda Etiketlendiniz",
          message: `Kerim sizi etiketledi: "${newMessageText.slice(0, 40)}..."`,
          entity_type: "chat",
          entity_id: newMsg.id,
          is_read: false,
          created_at: new Date().toISOString(),
          actor: { id: "u1", email: "yonetici@ekip.com", full_name: "Kerim (Yönetici)", role: "admin", created_at: "" }
        };
        setNotifications(prev => [notif, ...prev]);
      }
    });
  };

  // Mention seçildiğinde input'a ekle
  const handleSelectMention = (member: { id: string; name: string }) => {
    const atIndex = newMessageText.lastIndexOf("@");
    const prefix = atIndex >= 0 ? newMessageText.slice(0, atIndex) : newMessageText;
    setNewMessageText(`${prefix}@${member.name} `);
    setIsMentionOpen(false);
  };

  // Input değişiminde @ algılama
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessageText(val);

    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setIsMentionOpen(true);
      setMentionFilterText("");
    } else if (lastAt >= 0 && !val.slice(lastAt).includes(" ")) {
      setIsMentionOpen(true);
      setMentionFilterText(val.slice(lastAt + 1));
    } else {
      setIsMentionOpen(false);
    }
  };

  // Aktif filtrelenmiş görevler
  const filteredTasks = tasks.filter(t => {
    if (t.project_id !== activeProjectId) return false;
    if (taskFilter === "urgent") return t.priority === "urgent";
    if (taskFilter === "assigned_to_me") return t.assigned_to === "u1";
    return true;
  });

  // Aktif sohbetteki mesajlar
  const activeChatMessages = messages.filter(m => {
    if (chatMode === "channel") {
      return !m.is_direct_message && m.project_id === activeProjectId;
    } else {
      // 1-e-1 DM: Benimle aktif seçili kişi arasındaki mesajlar
      return m.is_direct_message && (
        (m.sender_id === "u1" && m.recipient_id === activeDmUser) ||
        (m.sender_id === activeDmUser && m.recipient_id === "u1")
      );
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeDmMember = teamMembers.find(m => m.id === activeDmUser);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto w-full bg-slate-950 text-slate-100 shadow-2xl relative overflow-hidden">
      
      {/* 1. ÜST BAŞLIK (HEADER) */}
      <header className="px-4 pt-12 pb-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg">
            ⚡
          </div>
          <div>
            <select 
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              {projects.map(proj => (
                <option key={proj.id} value={proj.id} className="bg-slate-900 text-white">
                  {proj.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              24 Üye Aktif
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {activeTab === "tasks" && (
            <button 
              onClick={() => setViewMode(prev => prev === "list" ? "kanban" : "list")}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition"
              title={viewMode === "list" ? "Kanban Görünümü" : "Liste Görünümü"}
            >
              {viewMode === "list" ? <Kanban size={17} /> : <ListFilter size={17} />}
            </button>
          )}

          <button 
            onClick={() => setActiveTab("notifications")} 
            className="relative p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition"
            aria-label="Bildirimler"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* 2. ANA İÇERİK ALANI */}
      <main className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        
        {/* --- TAB: GÖREVLER (TASKS) --- */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto text-xs py-0.5">
                <button 
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1 rounded-full font-medium transition ${taskFilter === "all" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                >
                  Tümü ({tasks.filter(t => t.project_id === activeProjectId).length})
                </button>
                <button 
                  onClick={() => setTaskFilter("urgent")}
                  className={`px-3 py-1 rounded-full font-medium transition ${taskFilter === "urgent" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                >
                  Acil
                </button>
                <button 
                  onClick={() => setTaskFilter("assigned_to_me")}
                  className={`px-3 py-1 rounded-full font-medium transition ${taskFilter === "assigned_to_me" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                >
                  Bana Atanan
                </button>
              </div>

              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition shrink-0"
                title="Yeni Görev Ata"
              >
                <Plus size={18} />
              </button>
            </div>

            {viewMode === "kanban" ? (
              <KanbanBoard 
                tasks={filteredTasks}
                onSelectTask={(task) => setSelectedTask(task)}
                onToggleStatus={toggleTaskStatus}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    Bu filtreye uygun görev bulunamadı.
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const isDone = task.status === "done";
                    return (
                      <div 
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                          isDone 
                            ? "bg-slate-900/40 border-slate-800/60 opacity-60" 
                            : "bg-slate-900 border-slate-800 hover:border-indigo-500/50 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(task.id);
                            }}
                            className="mt-0.5 text-slate-400 hover:text-indigo-400 transition"
                          >
                            {isDone ? (
                              <CheckCircle2 size={20} className="text-emerald-500" />
                            ) : (
                              <Circle size={20} className="hover:text-indigo-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${isDone ? "line-through text-slate-400" : "text-slate-100"}`}>
                              {task.title}
                            </p>
                            
                            {task.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                              {task.priority === "urgent" && (
                                <span className="text-rose-400 font-semibold flex items-center gap-1">
                                  <AlertCircle size={12} /> Acil
                                </span>
                              )}
                              <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                                <UserCheck size={11} className="text-indigo-400" />
                                {task.assigned_profile?.full_name || "Atanmadı"}
                              </span>
                              <span className="text-slate-400">
                                {formatTimeAgo(task.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>
        )}

        {/* --- TAB: SOHBET (CHAT) - KANAL VS 1-E-1 DM & DOSYA PAYLAŞIMI --- */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full space-y-3">
            
            {/* Sohbet Modu Seçici: Kanal vs Özel DM */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button 
                onClick={() => setChatMode("channel")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${chatMode === "channel" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                # {activeProject?.name}
              </button>
              <button 
                onClick={() => setChatMode("dm")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${chatMode === "dm" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                1-e-1 Özel Sohbet (DM)
              </button>
            </div>

            {/* DM Modu Aktifse: Ekip Üyesi Seçici Avatar Çubuğu */}
            {chatMode === "dm" && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 text-xs">
                {teamMembers.filter(m => m.id !== "u1").map(member => (
                  <button
                    key={member.id}
                    onClick={() => setActiveDmUser(member.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shrink-0 transition ${
                      activeDmUser === member.id 
                        ? "bg-slate-800 border-indigo-500 text-white font-medium" 
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-[9px] flex items-center justify-center font-bold text-white">
                      {member.name.charAt(0)}
                    </div>
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bilgi Çubuğu */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles size={14} className="shrink-0" />
              <span>
                {chatMode === "channel" 
                  ? `Proje grubundaki herkes mesajınızı görebilir. @etiket ile bildirim gönderebilirsiniz.`
                  : `${activeDmMember?.name} ile özel şifreli görüşmedesiniz.`
                }
              </span>
            </div>

            {/* Mesaj Akışı */}
            <div className="flex-1 space-y-3 pt-2">
              {activeChatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Henüz mesaj yok. İlk mesajı siz yazın!
                </div>
              ) : (
                activeChatMessages.map(msg => (
                  <div key={msg.id} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                      {msg.sender?.full_name?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl rounded-tl-none space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-slate-200">
                          {msg.sender?.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(msg.created_at)}
                        </span>
                      </div>
                      
                      {/* Mesaj Metni (@etiket renklendirme) */}
                      {msg.content && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {msg.content.split(" ").map((word, i) => (
                            <span key={`${msg.id}-w-${i}`}>
                              {word.startsWith("@") ? (
                                <span className="text-indigo-400 font-semibold bg-indigo-950/60 px-1 py-0.5 rounded mr-1">
                                  {word}
                                </span>
                              ) : (
                                word + " "
                              )}
                            </span>
                          ))}
                        </p>
                      )}

                      {/* Eklenmiş Dosya / Görsel Önizlemesi */}
                      {msg.attachment && (
                        <div className="mt-2 p-2 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {msg.attachment.mime_type.startsWith("image/") ? (
                              <ImageIcon size={16} className="text-pink-400 shrink-0" />
                            ) : (
                              <FileText size={16} className="text-indigo-400 shrink-0" />
                            )}
                            <div className="truncate">
                              <p className="font-medium text-slate-200 truncate text-[11px]">
                                {msg.attachment.file_name}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {(msg.attachment.file_size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                          </div>

                          <a 
                            href={msg.attachment.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium shrink-0 ml-2"
                          >
                            İndir / Görüntüle
                          </a>
                        </div>
                      )}

                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mesaj Yazma ve Dosya Ekleme Alanı */}
            <div className="pt-2 sticky bottom-0 bg-slate-950 relative">
              
              {/* @Mention Otomatik Tamamlama Popover */}
              <MentionPopover 
                isOpen={isMentionOpen}
                filterText={mentionFilterText}
                teamMembers={teamMembers}
                onSelect={handleSelectMention}
              />

              {/* Bekleyen Dosya Eki Rozeti */}
              {pendingAttachment && (
                <div className="mb-2 p-2 bg-indigo-950/50 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-slate-200 truncate text-[11px] font-medium">
                      {pendingAttachment.file_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({(pendingAttachment.file_size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button 
                    onClick={() => setPendingAttachment(null)}
                    className="p-1 hover:text-rose-400 text-slate-400 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 focus-within:border-indigo-500 shadow-lg">
                
                {/* Güvenli Dosya Yükleme Butonu */}
                <FileUploadButton 
                  onFileUploaded={(file) => setPendingAttachment(file)}
                />

                {/* Hızlı @ Butonu */}
                <button
                  type="button"
                  onClick={() => {
                    setNewMessageText(prev => prev + "@");
                    setIsMentionOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-400 transition"
                  title="Kişi Etiketle"
                >
                  <AtSign size={17} />
                </button>

                <input 
                  type="text" 
                  value={newMessageText}
                  onChange={handleMessageInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={chatMode === "channel" ? "@etiketle veya gruba yaz..." : `${activeDmMember?.name} kişisine özel yaz...`}
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-1"
                />

                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
                >
                  <Send size={15} />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* --- TAB: BİLDİRİMLER (NOTIFICATIONS) --- */}
        {activeTab === "notifications" && (
          <div className="space-y-3">
            
            {/* Kilit Ekranı / Web Push Bildirimi Aktifleştirme Kartı */}
            <PushNotificationToggle />

            <div className="flex justify-between items-center mb-1 pt-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Son Bildirimler</h2>
              <button 
                onClick={() => setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Tümünü Okundu Say
              </button>
            </div>

            <div className="space-y-2">
              {notifications.map(notif => (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-xl border transition ${
                    notif.is_read ? "bg-slate-900/60 border-slate-800" : "bg-indigo-950/20 border-indigo-500/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                      {notif.type === "task_completed" ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{notif.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: EKİP (TEAM - 20-25 KİŞİLİK LİSTE) --- */}
        {activeTab === "team" && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ekip Üyeleri (24 Kişi)</h2>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{member.name}</p>
                      <p className="text-[10px] text-slate-400">{member.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveDmUser(member.id);
                      setChatMode("dm");
                      setActiveTab("chat");
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                  >
                    Özel DM
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 3. MOBİL ALT NAVİGASYON (BOTTOM NAVIGATION BAR) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-6 py-2.5 pb-safe-bottom flex justify-between items-center z-40">
        <button 
          onClick={() => setActiveTab("tasks")}
          className={`flex flex-col items-center gap-1 transition ${activeTab === "tasks" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-300"}`}
        >
          <CheckSquare size={20} />
          <span className="text-[10px]">Görevler</span>
        </button>

        <button 
          onClick={() => setActiveTab("chat")}
          className={`flex flex-col items-center gap-1 transition ${activeTab === "chat" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-300"}`}
        >
          <MessageSquare size={20} />
          <span className="text-[10px]">Sohbet</span>
        </button>

        <button 
          onClick={() => setActiveTab("notifications")}
          className={`flex flex-col items-center gap-1 transition relative ${activeTab === "notifications" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-300"}`}
        >
          <Bell size={20} />
          <span className="text-[10px]">Bildirim</span>
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-0 right-1"></span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("team")}
          className={`flex flex-col items-center gap-1 transition ${activeTab === "team" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-300"}`}
        >
          <Users size={20} />
          <span className="text-[10px]">Ekip</span>
        </button>
      </nav>

      {/* 4. MODALLAR */}
      <TaskDetailModal 
        task={selectedTask}
        teamMembers={teamMembers}
        onClose={() => setSelectedTask(null)}
        onUpdateStatus={handleUpdateStatus}
        onUpdateAssignee={handleUpdateAssignee}
        onUpdatePriority={handleUpdatePriority}
        onDeleteTask={handleDeleteTask}
      />

      <CreateTaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamMembers={teamMembers}
        projects={projects}
        currentProjectId={activeProjectId}
        onCreateTask={handleCreateTask}
      />

    </div>
  );
}
