"use client";

import React, { useState, useEffect } from "react";
import { Loader2, LogIn, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Category,
  Project,
  Task,
  TaskComment,
  ChatMessage,
  NotificationItem,
  UserRole,
} from "@/types/database";

// Modüler Bileşenler
import MobileBottomNav, { type TabType } from "@/components/navigation/MobileBottomNav";
import PersonalHomeScreen from "@/components/personal/PersonalHomeScreen";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import TaskFilterSheet, { type FilterState } from "@/components/tasks/TaskFilterSheet";
import CategoryListManager from "@/components/tasks/CategoryListManager";
import KanbanGanttView from "@/components/views/KanbanGanttView";
import ListDocEditor from "@/components/docs/ListDocEditor";
import GeneralCalendar from "@/components/calendar/GeneralCalendar";
import TeamScreen from "@/components/team/TeamScreen";
import ChatHub from "@/components/chat/ChatHub";
import ArchiveScreen from "@/components/chat/ArchiveScreen";
import ListFilesManager, { type ListAttachment } from "@/components/files/ListFilesManager";

export default function MobileDashboard() {
  const supabase = createClient();

  // Oturum State'leri
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Giriş / Kayıt Form State'leri
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Navigasyon & Görünüm State'leri
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [tasksSubView, setTasksSubView] = useState<"lists" | "board" | "docs" | "files">("lists");
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Veritabanı State'leri
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attachments, setAttachments] = useState<ListAttachment[]>([]);

  // Modallar
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // 1. OTURUM & PWA SERVİSİ
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.warn("SW kayıt hatası:", err);
        });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initUserData(session.user.id, session.user.email || "", session.user.user_metadata?.full_name);
      } else {
        setIsCheckingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        initUserData(session.user.id, session.user.email || "", session.user.user_metadata?.full_name);
      } else {
        setCurrentUser(null);
        setTasks([]);
        setProjects([]);
        setCategories([]);
        setIsCheckingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. VERİ YÜKLEME
  const initUserData = async (userId: string, email: string, fullName?: string) => {
    try {
      const name = fullName || email.split("@")[0] || "Kullanıcı";

      // Profil kaydını kontrol et / güncelle
      const { data: profile } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            full_name: name,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (profile) {
        setCurrentUser(profile as Profile);
      }

      await loadAllData(userId);
    } catch (err) {
      console.error("Kullanıcı başlatma hatası:", err);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const loadAllData = async (userId: string) => {
    try {
      // 1. Profiller
      const { data: profData } = await supabase.from("profiles").select("*");
      if (profData) setProfiles(profData as Profile[]);

      // 2. Kategoriler
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_archived", false)
        .order("order_index", { ascending: true });
      if (catData) setCategories(catData as Category[]);

      // 3. Listeler (Projeler)
      const { data: projData } = await supabase.from("projects").select("*").order("created_at", { ascending: true });
      if (projData) {
        setProjects(projData as Project[]);
        if (projData.length > 0 && !activeProjectId) {
          setActiveProjectId(projData[0].id);
        }
      }

      // 4. Görevler & Çoklu Atamalar
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*, task_assignees(user_id, profiles(*))")
        .order("created_at", { ascending: false });

      if (taskData) {
        const mappedTasks = taskData.map((t: any) => {
          const assignees = t.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [];
          return {
            ...t,
            assignees,
          };
        });
        setTasks(mappedTasks as Task[]);
      }

      // 5. Yorumlar
      const { data: commentData } = await supabase.from("task_comments").select("*, author:profiles(*)").order("created_at", { ascending: true });
      if (commentData) {
        const grouped = commentData.reduce<Record<string, TaskComment[]>>((acc, item: any) => {
          acc[item.task_id] = [...(acc[item.task_id] || []), item];
          return acc;
        }, {});
        setTaskComments(grouped);
      }

      // 6. Mesajlar
      const { data: msgData } = await supabase.from("chat_messages").select("*, sender:profiles(*)").order("created_at", { ascending: true });
      if (msgData) setMessages(msgData as ChatMessage[]);

      // 7. Bildirimler
      const { data: notifData } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (notifData) setNotifications(notifData as NotificationItem[]);

      // 8. Dosya Ekleri
      const { data: attachData } = await supabase.from("attachments").select("*").order("created_at", { ascending: false });
      if (attachData) setAttachments(attachData as ListAttachment[]);

      // 9. Realtime Senkronizasyon
      supabase
        .channel("pulse-live-data")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          refreshTasks();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        })
        .subscribe();
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    }
  };

  const refreshTasks = async () => {
    const { data: taskData } = await supabase
      .from("tasks")
      .select("*, task_assignees(user_id, profiles(*))")
      .order("created_at", { ascending: false });

    if (taskData) {
      const mappedTasks = taskData.map((t: any) => ({
        ...t,
        assignees: t.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [],
      }));
      setTasks(mappedTasks as Task[]);
    }
  };

  // 3. GÖREV İŞLEMLERİ
  const handleSaveTask = async (taskData: Partial<Task>, assigneeIds: string[]) => {
    if (!currentUser) return;

    try {
      if (taskData.id) {
        // Güncelleme
        const { error } = await supabase
          .from("tasks")
          .update({
            title: taskData.title,
            description: taskData.description,
            due_date: taskData.due_date,
            project_id: taskData.project_id || null,
            priority: taskData.priority,
            task_color: taskData.task_color,
          })
          .eq("id", taskData.id);

        if (error) throw error;

        // Atamaları güncelle
        await supabase.from("task_assignees").delete().eq("task_id", taskData.id);
        if (assigneeIds.length > 0) {
          await supabase.from("task_assignees").insert(
            assigneeIds.map((userId) => ({
              task_id: taskData.id,
              user_id: userId,
            }))
          );
        }
      } else {
        // Yeni Oluşturma
        const { data: created, error } = await supabase
          .from("tasks")
          .insert({
            title: taskData.title,
            description: taskData.description,
            due_date: taskData.due_date,
            project_id: taskData.project_id || null,
            priority: taskData.priority || "normal",
            task_color: taskData.task_color || "#6366f1",
            status: "todo",
            created_by: currentUser.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (created && assigneeIds.length > 0) {
          await supabase.from("task_assignees").insert(
            assigneeIds.map((userId) => ({
              task_id: created.id,
              user_id: userId,
            }))
          );
        }
      }

      await refreshTasks();
    } catch (err) {
      console.error("Görev kaydedilemedi:", err);
    }
  };

  const handleToggleCompleteTask = async (task: Task) => {
    const isDone = task.status === "done";
    const nextStatus = isDone ? "todo" : "done";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await supabase
        .from("tasks")
        .update({
          status: nextStatus,
          completed_at: nextStatus === "done" ? new Date().toISOString() : null,
          completed_by: nextStatus === "done" ? currentUser?.id : null,
        })
        .eq("id", task.id);
    } catch (err) {
      console.error("Görev durumu güncellenemedi:", err);
      await refreshTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase
        .from("tasks")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: currentUser?.id,
        })
        .eq("id", taskId);
      await refreshTasks();
    } catch (err) {
      console.error("Görev arşivlenemedi:", err);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      await supabase
        .from("tasks")
        .update({ archived_at: null, archived_by: null })
        .eq("id", taskId);
      await refreshTasks();
    } catch (err) {
      console.error("Görev arşivden çıkarılamadı:", err);
    }
  };

  // 4. KATEGORİ & LİSTE İŞLEMLERİ
  const handleCreateCategory = async (cat: { name: string; color: string; icon: string }) => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setCategories((prev) => [...prev, data as Category]);
    } catch (err) {
      console.error("Kategori oluşturulamadı:", err);
    }
  };

  const handleCreateProject = async (proj: {
    name: string;
    category_id: string;
    modules: any;
  }) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: proj.name,
          category_id: proj.category_id || null,
          created_by: currentUser.id,
          module_todo: proj.modules.module_todo,
          module_docs: proj.modules.module_docs,
          module_files: proj.modules.module_files,
          module_kanban: proj.modules.module_kanban,
          module_gantt: proj.modules.module_gantt,
          module_chat: proj.modules.module_chat,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProjects((prev) => [...prev, data as Project]);
        setActiveProjectId(data.id);
      }
    } catch (err) {
      console.error("Liste oluşturulamadı:", err);
    }
  };

  const handleSaveDoc = async (listId: string, content: string) => {
    try {
      await supabase
        .from("projects")
        .update({ documentation_content: content })
        .eq("id", listId);
      setProjects((prev) =>
        prev.map((p) => (p.id === listId ? { ...p, documentation_content: content } : p))
      );
    } catch (err) {
      console.error("Dokümantasyon kaydedilemedi:", err);
    }
  };

  const handleUploadProjectFile = async (projectId: string, uploaded: any) => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("attachments")
        .insert({
          file_name: uploaded.file_name,
          file_url: uploaded.file_url,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
          uploaded_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setAttachments((prev) => [data as ListAttachment, ...prev]);
      }
    } catch (err) {
      console.error("Dosya kaydedilemedi:", err);
    }
  };

  // 5. EKİP & SOHBET İŞLEMLERİ
  const handleUpdateRole = async (memberId: string, role: UserRole) => {
    try {
      await supabase.from("profiles").update({ role }).eq("id", memberId);
      setProfiles((prev) =>
        prev.map((p) => (p.id === memberId ? { ...p, role } : p))
      );
    } catch (err) {
      console.error("Rol güncellenemedi:", err);
    }
  };

  const handleSendMessage = async (params: {
    content: string;
    channel_id?: string;
    project_id?: string;
    recipient_id?: string;
  }) => {
    if (!currentUser) return;
    try {
      await supabase.from("chat_messages").insert({
        content: params.content,
        sender_id: currentUser.id,
        project_id: params.project_id || null,
        recipient_id: params.recipient_id || null,
        is_direct_message: Boolean(params.recipient_id),
      });
    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    }
  };

  const handleAddComment = async (taskId: string, content: string) => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("task_comments")
        .insert({
          task_id: taskId,
          user_id: currentUser.id,
          content,
        })
        .select("*, author:profiles(*)")
        .single();

      if (data) {
        setTaskComments((prev) => ({
          ...prev,
          [taskId]: [...(prev[taskId] || []), data as TaskComment],
        }));
      }
    } catch (err) {
      console.error("Yorum eklenemedi:", err);
    }
  };

  // Auth Giriş Formu İşleyicisi
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else if (authMode === "register") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { full_name: authFullName },
          },
        });
        if (error) throw error;
        setAuthSuccess("Kayıt başarılı! Giriş yapabilirsiniz.");
      }
    } catch (err: any) {
      setAuthError(err.message || "İşlem sırasında hata oluştu");
    } finally {
      setAuthLoading(false);
    }
  };

  // Yükleme Durumu
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Pulse yükleniyor...</p>
      </div>
    );
  }

  // Giriş Ekranı (Eğer Oturum Yoksa)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex flex-col justify-center px-4 py-12 max-w-sm mx-auto">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-500/20 mb-2">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Pulse İş Takip</h1>
            <p className="text-xs text-slate-500">Ekip hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {authMode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ad Soyad
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Ayşe Yılmaz"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                E-posta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {authError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-600 font-medium">
                {authSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : authMode === "login" ? (
                "Giriş Yap"
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {authMode === "login"
                ? "Hesabınız yok mu? Kayıt Olun"
                : "Zaten hesabınız var mı? Giriş Yapın"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Seçili Liste (Proje)
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;
  const projectTasks = tasks.filter((t) => t.project_id === activeProjectId && !t.archived_at);
  const archivedTasks = tasks.filter((t) => Boolean(t.archived_at));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Çevrimdışı Uyarı Barı */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-center text-xs font-bold sticky top-0 z-50 shadow-xs flex items-center justify-center gap-1.5">
          <span>⚠️ Çevrimdışı moddasınız. Kayıtlı görevleri görüntüleyebilirsiniz.</span>
        </div>
      )}

      {/* 1. SEKME 1: KİŞİSEL SAYFA (Ekran 1) */}
      {activeTab === "personal" && (
        <PersonalHomeScreen
          currentUser={currentUser}
          tasks={tasks.filter((t) => !t.archived_at)}
          onOpenCreateTask={() => {
            setEditingTask(null);
            setIsEditModalOpen(true);
          }}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsEditModalOpen(true);
          }}
          onToggleCompleteTask={handleToggleCompleteTask}
          unreadNotificationCount={notifications.filter((n) => !n.is_read).length}
        />
      )}

      {/* 2. SEKME 2: GÖREVLER (Kategoriler, Listeler, Kanban & Gantt, Dokümantasyon) */}
      {activeTab === "tasks" && (
        <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
          {/* Üst Kategori & Liste Seçici veya Görünüm Sekmeleri */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <button
              onClick={() => setTasksSubView("lists")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                tasksSubView === "lists"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Kategoriler & Listeler
            </button>
            {activeProject && (
              <div className="flex items-center gap-1.5">
                {(activeProject.module_kanban || activeProject.module_gantt) && (
                  <button
                    onClick={() => setTasksSubView("board")}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all ${
                      tasksSubView === "board"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Görünüm
                  </button>
                )}
                {activeProject.module_docs && (
                  <button
                    onClick={() => setTasksSubView("docs")}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all ${
                      tasksSubView === "docs"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Doküman
                  </button>
                )}
                {activeProject.module_files && (
                  <button
                    onClick={() => setTasksSubView("files")}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all ${
                      tasksSubView === "files"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Dosyalar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Alt Görünüm 1: Kategori ve Liste Ağacı */}
          {tasksSubView === "lists" && (
            <CategoryListManager
              categories={categories}
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                setTasksSubView("board");
              }}
              onCreateCategory={handleCreateCategory}
              onCreateProject={handleCreateProject}
              canManageLists={currentUser.role === "admin" || currentUser.role === "manager"}
            />
          )}

          {/* Alt Görünüm 2: Kanban & Gantt Paneli */}
          {tasksSubView === "board" && (
            <KanbanGanttView
              project={activeProject}
              tasks={projectTasks}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsEditModalOpen(true);
              }}
              onOpenCreateTask={(defaultStatus) => {
                setEditingTask({
                  id: "",
                  project_id: activeProjectId,
                  title: "",
                  status: defaultStatus || "todo",
                  priority: "normal",
                  created_by: currentUser.id,
                  created_at: "",
                });
                setIsEditModalOpen(true);
              }}
              onUpdateTaskStatus={async (taskId, status) => {
                await supabase.from("tasks").update({ status }).eq("id", taskId);
                await refreshTasks();
              }}
            />
          )}

          {/* Alt Görünüm 3: Dokümantasyon Not Defteri */}
          {tasksSubView === "docs" && activeProject && (
            <ListDocEditor
              listId={activeProject.id}
              listName={activeProject.name}
              initialContent={activeProject.documentation_content || ""}
              onSave={handleSaveDoc}
              readOnly={currentUser.role === "member"}
            />
          )}

          {/* Alt Görünüm 4: Dosyalar Modülü */}
          {tasksSubView === "files" && activeProject && (
            <ListFilesManager
              projectId={activeProject.id}
              projectName={activeProject.name}
              files={attachments}
              onUploadFile={async (uploaded) => {
                await handleUploadProjectFile(activeProject.id, uploaded);
              }}
              canUpload={currentUser.role !== "member"}
            />
          )}
        </div>
      )}

      {/* 3. SEKME 3: GENEL TAKVİM (Ekran 6) */}
      {activeTab === "calendar" && (
        <GeneralCalendar
          tasks={tasks.filter((t) => !t.archived_at)}
          profiles={profiles}
          currentUserId={currentUser.id}
          onSelectTask={(task) => {
            setEditingTask(task);
            setIsEditModalOpen(true);
          }}
          onOpenCreateTask={(dateStr) => {
            setEditingTask({
              id: "",
              title: "",
              due_date: dateStr ? new Date(dateStr).toISOString() : undefined,
              status: "todo",
              priority: "normal",
              created_by: currentUser.id,
              created_at: "",
            });
            setIsEditModalOpen(true);
          }}
        />
      )}

      {/* 4. SEKME 4: SOHBET & ARŞİV (Ekran 5 & 9) */}
      {activeTab === "chat" && (
        <>
          {isArchiveOpen ? (
            <div className="relative">
              <button
                onClick={() => setIsArchiveOpen(false)}
                className="mx-4 mt-2 mb-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                ← Sohbetlere Geri Dön
              </button>
              <ArchiveScreen
                archivedTasks={archivedTasks}
                projects={projects}
                onRestoreTask={handleRestoreTask}
              />
            </div>
          ) : (
            <ChatHub
              currentUser={currentUser}
              profiles={profiles}
              projects={projects}
              channels={[]}
              messages={messages}
              onSendMessage={handleSendMessage}
              onOpenArchive={() => setIsArchiveOpen(true)}
            />
          )}
        </>
      )}

      {/* 5. SEKME 5: EKİP & YETKİLENDİRME (Ekran 7 & 8) */}
      {activeTab === "team" && (
        <TeamScreen
          profiles={profiles}
          currentUser={currentUser}
          onUpdateRole={handleUpdateRole}
          onInviteMember={async (email, fullName, role) => {
            alert(`Davet e-postası hazırlandı: ${email}`);
          }}
        />
      )}

      {/* MODAL 1: GÖREV DÜZENLEME (Ekran 2) */}
      <TaskEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={editingTask?.id ? editingTask : null}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        profiles={profiles}
        projects={projects}
        categories={categories}
        currentUserId={currentUser.id}
        comments={editingTask?.id ? taskComments[editingTask.id] || [] : []}
        onAddComment={handleAddComment}
      />

      {/* SABİT MOBİL ALT MENÜ (5 SEÇENEK) */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setIsArchiveOpen(false);
          setActiveTab(tab);
        }}
        unreadChatCount={0}
      />
    </div>
  );
}
