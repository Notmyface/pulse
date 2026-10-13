"use client";

import { useState, useEffect } from "react";
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
  UserCheck,
  LogIn,
  LogOut,
  Database
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Task, ChatMessage, NotificationItem } from "@/types/database";
import TaskDetailModal from "@/components/TaskDetailModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import KanbanBoard from "@/components/KanbanBoard";
import MentionPopover from "@/components/MentionPopover";
import FileUploadButton, { type UploadedFile } from "@/components/FileUploadButton";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";

export default function MobileDashboard() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"tasks" | "chat" | "notifications" | "team">("tasks");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [taskFilter, setTaskFilter] = useState<"all" | "assigned_to_me" | "urgent">("all");
  
  // Oturum Bilgisi
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Projeler
  const [projects, setProjects] = useState<Array<{ id: string; name: string; color: string }>>([
    { id: "p1", name: "Pulse Ana Proje", color: "#6366f1" }
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string>("p1");

  // Ekip Üyeleri
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([
    { id: "u1", name: "Kerim (Yönetici)", role: "Admin / Manager" },
    { id: "u2", name: "Ali Demir", role: "Frontend Geliştirici" },
    { id: "u3", name: "Zeynep Yılmaz", role: "Proje Yöneticisi" }
  ]);

  // Sohbet Modu
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [activeDmUser, setActiveDmUser] = useState<string>("u2");

  // Modallar
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dosya ve Mention
  const [pendingAttachment, setPendingAttachment] = useState<UploadedFile | null>(null);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState("");

  // Görevler
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "t1",
      project_id: "p1",
      title: "Supabase Canlı Veritabanı Entegrasyonu",
      description: "Projeleri, görevleri ve mesajları canlı bulut veritabanına kaydet",
      status: "in_progress",
      priority: "urgent",
      created_by: "u1",
      assigned_to: "u1",
      due_date: new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      assigned_profile: { id: "u1", email: "yonetici@ekip.com", full_name: "Yönetici", role: "admin", created_at: "" }
    }
  ]);

  // Mesajlaşma
  interface ExtendedMessage extends ChatMessage {
    attachment?: UploadedFile;
  }

  const [messages, setMessages] = useState<ExtendedMessage[]>([
    {
      id: "m1",
      project_id: "p1",
      sender_id: "u1",
      content: "Pulse çalışma alanına hoş geldiniz! Canlı veritabanına bağlandınız.",
      mentions: [],
      is_direct_message: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      sender: { id: "u1", email: "yonetici@ekip.com", full_name: "Pulse Bot", role: "admin", created_at: "" }
    }
  ]);

  // Bildirimler
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      user_id: "u1",
      actor_id: "u1",
      type: "task_assigned",
      title: "Pulse Hazır!",
      message: "Veritabanı tabloları ve otomatik bildirim tetikleyicileri devrede.",
      entity_type: "project",
      entity_id: "p1",
      is_read: false,
      created_at: new Date().toISOString(),
      actor: { id: "u1", email: "sistem@ekip.com", full_name: "Sistem", role: "admin", created_at: "" }
    }
  ]);

  const [newMessageText, setNewMessageText] = useState("");

  // 1. SUPABASE OTURUM & CANLI VERİ KONTROLÜ
  useEffect(() => {
    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Yönetici"
        };
        setCurrentUser(u);
        loadSupabaseData(session.user.id);
      }
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Yönetici"
        };
        setCurrentUser(u);
        loadSupabaseData(session.user.id);
      } else {
        setCurrentUser(null);
        setIsLiveConnected(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. SUPABASE VERİLERİNİ ÇEKME FONKSİYONU
  const loadSupabaseData = async (userId: string) => {
    try {
      setIsLiveConnected(true);

      // Projeleri çek (yoksa varsayılan proje aç)
      const { data: projData } = await supabase.from("projects").select("*");
      if (projData && projData.length > 0) {
        const formatted = projData.map((p: any) => ({ id: p.id, name: p.name, color: p.color_code || "#6366f1" }));
        setProjects(formatted);
        setActiveProjectId(formatted[0].id);
      } else {
        const { data: newProj } = await supabase.from("projects").insert({
          name: "Pulse Çalışma Alanı",
          color_code: "#6366f1",
          created_by: userId
        }).select().single();
        if (newProj) {
          setProjects([{ id: newProj.id, name: newProj.name, color: newProj.color_code }]);
          setActiveProjectId(newProj.id);
        }
      }

      // Ekip profillerini çek
      const { data: profData } = await supabase.from("profiles").select("*");
      if (profData && profData.length > 0) {
        setTeamMembers(profData.map((p: any) => ({
          id: p.id,
          name: p.full_name || p.email,
          role: p.role === "admin" ? "Yönetici" : "Üye"
        })));
      }

      // Görevleri çek
      const { data: taskData } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (taskData && taskData.length > 0) {
        setTasks(taskData);
      }

      // Mesajları çek
      const { data: msgData } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
      if (msgData && msgData.length > 0) {
        setMessages(msgData);
      }

      // Bildirimleri çek
      const { data: notifData } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      if (notifData && notifData.length > 0) {
        setNotifications(notifData);
      }

      // Canlı Realtime Dinleyici Başlat
      const channel = supabase.channel("pulse-live-feed")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => {
            if (data) setTasks(data);
          });
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          setMessages(prev => [...prev, payload.new as ExtendedMessage]);
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
          setNotifications(prev => [payload.new as NotificationItem, ...prev]);
        })
        .subscribe();

    } catch (err) {
      console.error("Supabase veri çekme hatası:", err);
    }
  };

  // Görevi Tamamla / Geri Al (Supabase ile Senkronize)
  const toggleTaskStatus = async (taskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target) return;

    const nextStatus = target.status === "done" ? "in_progress" : "done";
    const completedAt = nextStatus === "done" ? new Date().toISOString() : undefined;

    // İyimser UI güncellemesi
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: nextStatus, completed_at: completedAt }
          : task
      )
    );

    // Eğer oturum açıksa Supabase'e yaz (Veritabanı tetikleyicisi otomatik bildirim üretecektir)
    if (currentUser) {
      try {
        await supabase.from("tasks").update({
          status: nextStatus,
          completed_at: completedAt,
          completed_by: currentUser.id
        }).eq("id", taskId);
      } catch (err) {
        console.error("Görev durumu güncellenemedi:", err);
      }
    }
  };

  // Yeni Görev Oluşturma
  const handleCreateTask = async (newTaskData: Omit<Task, "id" | "created_at">) => {
    const tempId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTask: Task = {
      ...newTaskData,
      id: tempId,
      created_at: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);

    if (currentUser) {
      try {
        const { data, error } = await supabase.from("tasks").insert({
          project_id: newTaskData.project_id || activeProjectId,
          title: newTaskData.title,
          description: newTaskData.description,
          status: newTaskData.status,
          priority: newTaskData.priority,
          assigned_to: newTaskData.assigned_to,
          due_date: newTaskData.due_date,
          created_by: currentUser.id
        }).select().single();

        if (data) {
          setTasks(prev => prev.map(t => t.id === tempId ? data : t));
        }
      } catch (err) {
        console.error("Görev kaydedilemedi:", err);
      }
    }
  };

  // Mesaj Gönderme
  const handleSendMessage = async () => {
    if (!newMessageText.trim() && !pendingAttachment) return;

    const isDm = chatMode === "dm";
    const mentionedMembers = teamMembers.filter(m => newMessageText.includes(`@${m.name}`));

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMsg: ExtendedMessage = {
      id: tempId,
      project_id: isDm ? undefined : activeProjectId,
      sender_id: currentUser?.id || "u1",
      recipient_id: isDm ? activeDmUser : undefined,
      content: newMessageText,
      mentions: mentionedMembers.map(m => m.id),
      is_direct_message: isDm,
      created_at: new Date().toISOString(),
      sender: {
        id: currentUser?.id || "u1",
        email: currentUser?.email || "yonetici@ekip.com",
        full_name: currentUser?.full_name || "Siz",
        role: "admin",
        created_at: ""
      },
      attachment: pendingAttachment || undefined
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessageText("");
    setPendingAttachment(null);
    setIsMentionOpen(false);

    if (currentUser) {
      try {
        await supabase.from("chat_messages").insert({
          project_id: isDm ? null : activeProjectId,
          sender_id: currentUser.id,
          recipient_id: isDm ? activeDmUser : null,
          content: newMsg.content,
          mentions: newMsg.mentions,
          is_direct_message: isDm
        });
      } catch (err) {
        console.error("Mesaj gönderilemedi:", err);
      }
    }
  };

  // Mention seçimi
  const handleSelectMention = (member: { id: string; name: string }) => {
    const atIndex = newMessageText.lastIndexOf("@");
    const prefix = atIndex >= 0 ? newMessageText.slice(0, atIndex) : newMessageText;
    setNewMessageText(`${prefix}@${member.name} `);
    setIsMentionOpen(false);
  };

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

  const filteredTasks = tasks.filter(t => {
    if (t.project_id && t.project_id !== activeProjectId) return false;
    if (taskFilter === "urgent") return t.priority === "urgent";
    if (taskFilter === "assigned_to_me") return currentUser ? t.assigned_to === currentUser.id : true;
    return true;
  });

  const activeChatMessages = messages.filter(m => {
    if (chatMode === "channel") {
      return !m.is_direct_message;
    } else {
      return m.is_direct_message && (
        (m.sender_id === (currentUser?.id || "u1") && m.recipient_id === activeDmUser) ||
        (m.sender_id === activeDmUser && m.recipient_id === (currentUser?.id || "u1"))
      );
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeDmMember = teamMembers.find(m => m.id === activeDmUser);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto w-full bg-slate-950 text-slate-100 shadow-2xl relative overflow-hidden">
      
      {/* 1. ÜST BAŞLIK (HEADER & GİRİŞ BUTONU) */}
      <header className="px-4 pt-12 pb-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg text-sm">
            ⚡
          </div>
          <div>
            <select 
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1 max-w-[150px] truncate"
            >
              {projects.map(proj => (
                <option key={proj.id} value={proj.id} className="bg-slate-900 text-white">
                  {proj.name}
                </option>
              ))}
            </select>
            
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isLiveConnected ? "Canlı Supabase Bağlı" : "Yerel Mod"}
              </span>
            </div>
          </div>
        </div>

        {/* Giriş / Profil Alanı */}
        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                  {currentUser.full_name}
                </p>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-[9px] text-rose-400 hover:underline block ml-auto"
                >
                  Çıkış
                </button>
              </div>
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <LogIn size={13} />
              <span>Giriş / Kayıt</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab("notifications")} 
            className="relative p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white transition"
            aria-label="Bildirimler"
          >
            <Bell size={16} />
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
                  Tümü ({tasks.length})
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

              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setViewMode(prev => prev === "list" ? "kanban" : "list")}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Görünüm Değiştir"
                >
                  {viewMode === "list" ? <Kanban size={16} /> : <ListFilter size={16} />}
                </button>

                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition"
                  title="Yeni Görev Ata"
                >
                  <Plus size={16} />
                </button>
              </div>
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

        {/* --- TAB: SOHBET (CHAT) --- */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full space-y-3">
            
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button 
                onClick={() => setChatMode("channel")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${chatMode === "channel" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                # {activeProject?.name || "Genel Kanal"}
              </button>
              <button 
                onClick={() => setChatMode("dm")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${chatMode === "dm" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                1-e-1 Özel DM
              </button>
            </div>

            {chatMode === "dm" && (
              <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 text-xs">
                {teamMembers.filter(m => m.id !== currentUser?.id).map(member => (
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

            <div className="flex-1 space-y-3 pt-2">
              {activeChatMessages.map(msg => (
                <div key={msg.id} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                    {msg.sender?.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex-1 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl rounded-tl-none space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-semibold text-slate-200">
                        {msg.sender?.full_name || "Kullanıcı"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTimeAgo(msg.created_at)}
                      </span>
                    </div>
                    
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
              ))}
            </div>

            {/* Mesaj Yazma */}
            <div className="pt-2 sticky bottom-0 bg-slate-950 relative">
              <MentionPopover 
                isOpen={isMentionOpen}
                filterText={mentionFilterText}
                teamMembers={teamMembers}
                onSelect={handleSelectMention}
              />

              {pendingAttachment && (
                <div className="mb-2 p-2 bg-indigo-950/50 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-slate-200 truncate text-[11px] font-medium">
                      {pendingAttachment.file_name}
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
                <FileUploadButton 
                  onFileUploaded={(file) => setPendingAttachment(file)}
                />

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

        {/* --- TAB: EKİP (TEAM) --- */}
        {activeTab === "team" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Kayıtlı Ekip ({teamMembers.length} Kişi)
              </h2>
              {!currentUser && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  + Ekibe Katıl
                </button>
              )}
            </div>

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
        onUpdateStatus={(id, s) => {
          toggleTaskStatus(id);
          if (selectedTask) setSelectedTask(prev => prev ? { ...prev, status: s } : null);
        }}
        onUpdateAssignee={(id, mId) => {
          if (currentUser) {
            supabase.from("tasks").update({ assigned_to: mId }).eq("id", id);
          }
        }}
        onUpdatePriority={(id, p) => {
          if (currentUser) {
            supabase.from("tasks").update({ priority: p }).eq("id", id);
          }
        }}
        onDeleteTask={(id) => {
          setTasks(prev => prev.filter(t => t.id !== id));
          if (currentUser) {
            supabase.from("tasks").delete().eq("id", id);
          }
        }}
      />

      <CreateTaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamMembers={teamMembers}
        projects={projects}
        currentProjectId={activeProjectId}
        onCreateTask={handleCreateTask}
      />

      {/* Supabase Giriş & Kayıt Modalı */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          loadSupabaseData(user.id);
        }}
      />

    </div>
  );
}
