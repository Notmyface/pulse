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
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Loader2,
  FolderPlus,
  UserPlus,
  Share2,
  ListTodo
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { PersonalTodo, Task, TaskComment, ChatMessage, NotificationItem, TaskPriority } from "@/types/database";
import TaskDetailModal from "@/components/TaskDetailModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import KanbanBoard from "@/components/KanbanBoard";
import MentionPopover from "@/components/MentionPopover";
import FileUploadButton, { type UploadedFile } from "@/components/FileUploadButton";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import InstallPrompt from "@/components/InstallPrompt";
import PersonalTodoPanel from "@/components/PersonalTodoPanel";
import { createClient } from "@/lib/supabase/client";

export default function MobileDashboard() {
  const supabase = createClient();

  // Oturum State'i
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Giriş / Kayıt / Şifremi Unuttum Form State'leri
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Şifre Sıfırlama (Recovery) Modu
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");

  // Uygulama Navigasyon State'leri
  const [activeTab, setActiveTab] = useState<"personal" | "tasks" | "chat" | "notifications" | "team">("tasks");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [taskFilter, setTaskFilter] = useState<"all" | "assigned_to_me" | "urgent" | "archived">("all");
  
  // Canlı Veritabanı State'leri
  const [projects, setProjects] = useState<Array<{ id: string; name: string; color: string; is_manager: boolean; created_by?: string }>>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectInput, setNewProjectInput] = useState("");

  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [projectMemberships, setProjectMemberships] = useState<Array<{ project_id: string; user_id: string; is_manager: boolean }>>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; email: string; full_name: string; role: string }>>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({});
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>([]);

  interface ExtendedMessage extends ChatMessage {
    attachment?: UploadedFile;
  }
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Sohbet Modu
  const [chatMode, setChatMode] = useState<"channel" | "dm">("channel");
  const [activeDmUser, setActiveDmUser] = useState<string>("");

  // Modallar
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dosya ve Mention
  const [pendingAttachment, setPendingAttachment] = useState<UploadedFile | null>(null);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "manager">("member");
  const [inviteStatus, setInviteStatus] = useState("");

  // 1. SERVICE WORKER KAYDI & OTURUM KONTROLÜ
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(err => {
        console.warn("SW kayıt hatası:", err);
      });
    }

    // URL'de şifre sıfırlama parametresi var mı kontrol et
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const inviteToken = new URLSearchParams(search).get("invite");
      if (inviteToken) {
        window.localStorage.setItem("pulse_pending_invite", inviteToken);
      }
      if (hash.includes("type=recovery") || search.includes("type=recovery")) {
        setIsRecoveryMode(true);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Yönetici"
        };
        setCurrentUser(u);
        loadSupabaseData(session.user.id, u.full_name, u.email);
      }
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Şifre sıfırlama linkine tıklandıysa
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }

      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Yönetici"
        };
        setCurrentUser(u);
        loadSupabaseData(session.user.id, u.full_name, u.email);
      } else {
        setCurrentUser(null);
        setTasks([]);
        setMessages([]);
        setNotifications([]);
        setPersonalTodos([]);
      }
      setIsCheckingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. SUPABASE VERİLERİNİ ÇEKME
  const loadSupabaseData = async (userId: string, userName?: string, userEmail?: string) => {
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        email: userEmail || "",
        full_name: userName || "Kullanıcı"
      }, { onConflict: "id" });

      const inviteToken = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("invite") || window.localStorage.getItem("pulse_pending_invite")
        : null;
      if (inviteToken) {
        const { data: inviteAccepted } = await supabase.rpc("accept_project_invite", { invite_token: inviteToken });
        if (inviteAccepted) {
          window.localStorage.removeItem("pulse_pending_invite");
        }
        window.history.replaceState(null, "", window.location.pathname);
      }

      // 1. Projeleri Çek
      const { data: projData } = await supabase.from("projects").select("*");
      if (projData && projData.length > 0) {
        const formatted = projData.map((p: any) => ({ id: p.id, name: p.name, color: p.color_code || "#6366f1", is_manager: p.created_by === userId, created_by: p.created_by }));
        setProjects(formatted);
        setActiveProjectId(formatted[0].id);
      } else {
        // Veritabanında proje yoksa yeni bir tane oluşturmayı dene
        const { data: newProj, error: newProjectError } = await supabase.from("projects").insert({
          name: "Genel Çalışma Alanı",
          color_code: "#6366f1",
          created_by: userId
        }).select().single();

        if (newProj) {
          setProjects([{ id: newProj.id, name: newProj.name, color: newProj.color_code, is_manager: true, created_by: userId }]);
          setActiveProjectId(newProj.id);
        } else if (newProjectError) {
          console.error("İlk proje oluşturulamadı:", newProjectError);
        }
      }

      // 2. Yalnızca erişilebilen projelerin üyelerini ve profillerini çek
      const { data: membershipData } = await supabase.from("project_members").select("project_id, user_id, is_manager");
      const { data: profData } = await supabase.from("profiles").select("id, email, full_name, role");
      setProjectMemberships((membershipData || []) as Array<{ project_id: string; user_id: string; is_manager: boolean }>);
      setProfiles((profData || []) as Array<{ id: string; email: string; full_name: string; role: string }>);

      const loadedProfiles = (profData || []) as Array<{ id: string; email: string; full_name: string; role: string }>;
      const { data: commentData } = await supabase.from("task_comments").select("*").order("created_at", { ascending: true });
      const commentsByTask = (commentData || []).reduce<Record<string, TaskComment[]>>((grouped, comment: TaskComment) => {
        const author = loadedProfiles.find(profile => profile.id === comment.user_id);
        const taskComment = {
          ...comment,
          author: author ? { ...author, role: author.role as "admin" | "manager" | "member", created_at: "" } : undefined
        };
        grouped[comment.task_id] = [...(grouped[comment.task_id] || []), taskComment];
        return grouped;
      }, {});
      setTaskComments(commentsByTask);

      // 3. Görevleri ve mesajları yalnızca RLS'nin izin verdiği kapsamda çek
      const { data: taskData } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (taskData) setTasks(taskData);

      const { data: msgData } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
      if (msgData) setMessages(msgData);

      const { data: notifData } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
      if (notifData) setNotifications(notifData);

      const { data: personalTodoData } = await supabase.from("personal_todos").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (personalTodoData) {
        setPersonalTodos(personalTodoData as PersonalTodo[]);
        const dueReminders = (personalTodoData as PersonalTodo[]).filter(todo =>
          todo.status === "todo" && todo.remind_at && new Date(todo.remind_at) <= new Date()
        );
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          dueReminders.forEach(todo => {
            const notificationKey = `pulse-reminder-${todo.id}-${todo.remind_at}`;
            if (!window.localStorage.getItem(notificationKey)) {
              new Notification("Pulse kişisel hatırlatıcı", { body: todo.title });
              window.localStorage.setItem(notificationKey, "shown");
            }
          });
        }
      }

      // 4. Realtime Soket Dinleyici
      supabase.channel("pulse-live-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => {
            if (data) setTasks(data);
          });
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
          setMessages(prev => {
            const message = payload.new as ExtendedMessage;
            return prev.some(existingMessage => existingMessage.id === message.id)
              ? prev
              : [...prev, message];
          });
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
          setNotifications(prev => [payload.new as NotificationItem, ...prev]);
        })
        .subscribe();

    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    }
  };

  useEffect(() => {
    const activeMemberships = projectMemberships.filter(member => member.project_id === activeProjectId);
    setProjects(prev => prev.map(project => ({
      ...project,
      is_manager: projectMemberships.some(member =>
        member.project_id === project.id && member.user_id === currentUser?.id && member.is_manager
      ) || project.created_by === currentUser?.id
    })));
    const members = activeMemberships
      .map(member => {
        const profile = profiles.find(item => item.id === member.user_id);
        if (!profile) return null;
        return {
          id: profile.id,
          name: profile.id === currentUser?.id ? `${profile.full_name || "Ben"} (Kendim)` : (profile.full_name || profile.email),
          role: member.is_manager ? "Proje Yöneticisi" : "Üye"
        };
      })
      .filter((member): member is { id: string; name: string; role: string } => member !== null);
    setTeamMembers(members);
    const firstOtherMember = members.find(member => member.id !== currentUser?.id);
    setActiveDmUser(firstOtherMember?.id || "");
  }, [activeProjectId, currentUser, profiles, projectMemberships]);

  // 3. GİRİŞ & KAYIT & ŞİFRE SIFIRLAMA İŞLEMİ
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      // Şifremi Unuttum Modu
      if (authMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}` : undefined
        });

        if (error) throw error;
        setAuthSuccess("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.");
        return;
      }

      // Kayıt Ol Modu
      if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              full_name: authFullName.trim()
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered") || error.message.includes("User already exists")) {
            setAuthError("Bu e-posta adresi ile zaten bir hesap bulunuyor. Lütfen giriş yapın.");
          } else {
            setAuthError(error.message);
          }
          return;
        }

        if (data.session) {
          const u = {
            id: data.user!.id,
            email: data.user!.email || authEmail,
            full_name: authFullName.trim() || authEmail.split("@")[0]
          };
          setCurrentUser(u);
          loadSupabaseData(data.user!.id, u.full_name, u.email);
        } else if (data.user) {
          setAuthSuccess("Hesabınız oluşturuldu! E-postanızı doğruladıktan sonra giriş yapabilirsiniz.");
        }
      } else {
        // Giriş Yap Modu
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setAuthError("E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.");
          } else if (error.message.includes("Email not confirmed")) {
            setAuthError("E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.");
          } else {
            setAuthError("Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.");
          }
          return;
        }

        if (data.user) {
          const u = {
            id: data.user.id,
            email: data.user.email || authEmail,
            full_name: data.user.user_metadata?.full_name || authEmail.split("@")[0]
          };
          setCurrentUser(u);
          loadSupabaseData(data.user.id, u.full_name, u.email);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. ŞİFRE GÜNCELLEME İŞLEMİ (Şifre sıfırlama linkine tıklandığında)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    setRecoverySuccess("");

    if (newPassword.length < 6) {
      setRecoveryError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setRecoverySuccess("Şifreniz başarıyla güncellendi! Yönlendiriliyorsunuz...");
      setTimeout(() => {
        setIsRecoveryMode(false);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setRecoveryError("Şifre güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Yeni Proje Oluştur
  const handleAddNewProject = async () => {
    if (!newProjectInput.trim() || !currentUser) return;

    try {
      const { data, error } = await supabase.from("projects").insert({
        name: newProjectInput.trim(),
        color_code: "#6366f1",
        created_by: currentUser.id
      }).select().single();

      if (data) {
        const newProj = { id: data.id, name: data.name, color: data.color_code, is_manager: true, created_by: currentUser.id };
        setProjects(prev => [...prev, newProj]);
        setActiveProjectId(data.id);
        setNewProjectInput("");
        setIsAddingProject(false);
      } else if (error) {
        console.error("Proje eklenemedi:", error);
        alert(`Proje oluşturulamadı: ${error.message}`);
      }
    } catch (err) {
      console.error("Proje eklenemedi:", err);
    }
  };

  const handleInviteMember = async () => {
    const email = inviteEmail.trim().toLowerCase();
    const activeProject = projects.find(project => project.id === activeProjectId);
    if (!email || !currentUser || !activeProject?.is_manager) return;

    setInviteStatus("");
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();

    if (profile) {
      const { error } = await supabase.from("project_members").upsert({
        project_id: activeProjectId,
        user_id: profile.id,
        is_manager: inviteRole === "manager"
      }, { onConflict: "project_id,user_id" });

      if (error) {
        setInviteStatus("Kullanıcı projeye eklenemedi.");
        return;
      }
      setInviteStatus("Kullanıcı projeye eklendi.");
      setInviteEmail("");
      const { data: membershipData } = await supabase.from("project_members").select("project_id, user_id, is_manager");
      setProjectMemberships((membershipData || []) as Array<{ project_id: string; user_id: string; is_manager: boolean }>);
      return;
    }

    const { data: invite, error } = await supabase.from("project_invites").insert({
      project_id: activeProjectId,
      email,
      invited_by: currentUser.id,
      role: inviteRole
    }).select("token").single();

    if (error || !invite) {
      setInviteStatus("Davet oluşturulamadı.");
      return;
    }

    const inviteUrl = `${window.location.origin}/?invite=${invite.token}`;
    const shareText = `${activeProject.name} projesine katılmak için bu bağlantıyı aç: ${inviteUrl}`;
    if (navigator.share) {
      await navigator.share({ title: `${activeProject.name} daveti`, text: shareText }).catch(() => undefined);
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
    }
    setInviteStatus("Davet bağlantısı hazırlandı.");
    setInviteEmail("");
  };

  const handleToggleManager = async (memberId: string, isManager: boolean) => {
    if (!projects.find(project => project.id === activeProjectId)?.is_manager || memberId === currentUser?.id) return;
    const { error } = await supabase.from("project_members")
      .update({ is_manager: !isManager })
      .eq("project_id", activeProjectId)
      .eq("user_id", memberId);
    if (!error) {
      setProjectMemberships(prev => prev.map(member =>
        member.project_id === activeProjectId && member.user_id === memberId
          ? { ...member, is_manager: !isManager }
          : member
      ));
    }
  };

  // Görevi Tamamla / Geri Al
  const toggleTaskStatus = async (taskId: string) => {
    const target = tasks.find(t => t.id === taskId);
    if (!target || !currentUser) return;

    const nextStatus = target.status === "done" ? "in_progress" : "done";
    const completedAt = nextStatus === "done" ? new Date().toISOString() : undefined;

    setTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: nextStatus, completed_at: completedAt }
          : task
      )
    );

    try {
      await supabase.from("tasks").update({
        status: nextStatus,
        completed_at: completedAt,
        completed_by: currentUser.id
      }).eq("id", taskId);
    } catch (err) {
      console.error("Görev güncellenemedi:", err);
    }
  };

  const handleAddTaskComment = async (taskId: string, content: string) => {
    if (!currentUser) return;

    const { data, error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: currentUser.id,
      content
    }).select("*").single();

    if (error || !data) {
      console.error("Görev yorumu eklenemedi:", error);
      return;
    }

    const author = profiles.find(profile => profile.id === currentUser.id);
    const taskComment: TaskComment = {
      ...data,
      author: author ? { ...author, role: author.role as "admin" | "manager" | "member", created_at: "" } : undefined
    };
    setTaskComments(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), taskComment]
    }));
  };

  const handleArchiveTask = async (taskId: string, archived: boolean) => {
    if (!currentUser || !activeProject?.is_manager) return;
    const update = {
      archived_at: archived ? new Date().toISOString() : null,
      archived_by: archived ? currentUser.id : null
    };
    const { error } = await supabase.from("tasks").update(update).eq("id", taskId);
    if (!error) {
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, ...update } as Task : task));
      setSelectedTask(prev => prev?.id === taskId ? { ...prev, ...update } as Task : prev);
    }
  };

  const handleEditTask = async (taskId: string, changes: { title: string; description?: string; due_date?: string }) => {
    if (!currentUser || !activeProject?.is_manager) return;
    const { error } = await supabase.from("tasks").update(changes).eq("id", taskId);
    if (!error) {
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, ...changes } : task));
      setSelectedTask(prev => prev?.id === taskId ? { ...prev, ...changes } : prev);
    }
  };

  const handleCreatePersonalTodo = async (todo: {
    title: string;
    note?: string;
    priority: TaskPriority;
    due_at?: string;
    remind_at?: string;
  }) => {
    if (!currentUser) return;
    const { data, error } = await supabase.from("personal_todos").insert({
      user_id: currentUser.id,
      ...todo
    }).select().single();
    if (error || !data) {
      console.error("Kişisel todo eklenemedi:", error);
      return;
    }
    setPersonalTodos(prev => [data as PersonalTodo, ...prev]);
  };

  const handleEditPersonalTodo = async (todoId: string, changes: {
    title: string;
    note?: string;
    priority: TaskPriority;
    due_at?: string;
    remind_at?: string;
  }) => {
    const { data, error } = await supabase.from("personal_todos")
      .update(changes)
      .eq("id", todoId)
      .eq("user_id", currentUser?.id)
      .select()
      .single();
    if (!error && data) {
      setPersonalTodos(prev => prev.map(todo => todo.id === todoId ? data as PersonalTodo : todo));
    }
  };

  const handleTogglePersonalTodo = async (todo: PersonalTodo) => {
    const isDone = todo.status === "done";
    const update = {
      status: isDone ? "todo" : "done",
      completed_at: isDone ? null : new Date().toISOString()
    };
    const { error } = await supabase.from("personal_todos").update(update).eq("id", todo.id).eq("user_id", currentUser?.id);
    if (!error) {
      setPersonalTodos(prev => prev.map(item => item.id === todo.id ? { ...item, ...update } as PersonalTodo : item));
    }
  };

  const handleDeletePersonalTodo = async (todoId: string) => {
    const { error } = await supabase.from("personal_todos").delete().eq("id", todoId).eq("user_id", currentUser?.id);
    if (!error) setPersonalTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  const handlePostponePersonalTodo = async (todo: PersonalTodo, days: number) => {
    const nextDueDate = todo.due_at ? new Date(todo.due_at) : new Date();
    nextDueDate.setDate(nextDueDate.getDate() + days);
    const nextReminder = todo.remind_at ? new Date(todo.remind_at) : undefined;
    nextReminder?.setDate(nextReminder.getDate() + days);
    const update = { due_at: nextDueDate.toISOString(), remind_at: nextReminder?.toISOString() || null };
    const { error } = await supabase.from("personal_todos").update(update).eq("id", todo.id).eq("user_id", currentUser?.id);
    if (!error) setPersonalTodos(prev => prev.map(item => item.id === todo.id ? { ...item, ...update } as PersonalTodo : item));
  };

  // Yeni Görev Oluştur
  const handleCreateTask = async (newTaskData: Omit<Task, "id" | "created_at">, newProjectTitle?: string) => {
    if (!currentUser) return;

    try {
      let targetProjectId = newTaskData.project_id || activeProjectId;

      // Eğer modal içinde yeni bir proje ismi yazıldıysa önce projeyi oluştur
      if (newProjectTitle) {
        const { data: createdProj } = await supabase.from("projects").insert({
          name: newProjectTitle,
          color_code: "#6366f1",
          created_by: currentUser.id
        }).select().single();

        if (createdProj) {
          targetProjectId = createdProj.id;
          const p = { id: createdProj.id, name: createdProj.name, color: createdProj.color_code, is_manager: true, created_by: currentUser.id };
          setProjects(prev => [...prev, p]);
          setActiveProjectId(createdProj.id);
        }
      }

      // Eğer hala geçerli bir proje ID'si yoksa ilk projeyi al
      if (!targetProjectId) {
        alert("Önce bir proje oluşturun veya mevcut bir proje seçin.");
        return;
      }

      const { data, error } = await supabase.from("tasks").insert({
        project_id: targetProjectId,
        title: newTaskData.title,
        description: newTaskData.description,
        status: newTaskData.status,
        priority: newTaskData.priority,
        assigned_to: newTaskData.assigned_to || currentUser.id,
        due_date: newTaskData.due_date,
        created_by: currentUser.id
      }).select().single();

      if (data) {
        setTasks(prev => [data, ...prev]);
      } else if (error) {
        console.error("Görev insert hatası:", error);
        alert(`Görev kaydedilemedi: ${error.message}`);
      }
    } catch (err) {
      console.error("Görev oluşturulamadı:", err);
    }
  };

  // Mesaj Gönder
  const handleSendMessage = async () => {
    if ((!newMessageText.trim() && !pendingAttachment) || !currentUser) return;

    const isDm = chatMode === "dm";
    const mentionedMembers = teamMembers.filter(m => newMessageText.includes(`@${m.name}`));

    try {
      const { data } = await supabase.from("chat_messages").insert({
        project_id: activeProjectId,
        sender_id: currentUser.id,
        recipient_id: isDm ? activeDmUser : null,
        content: newMessageText,
        mentions: mentionedMembers.map(m => m.id),
        is_direct_message: isDm
      }).select().single();

      if (data) {
        setMessages(prev => [...prev, {
          ...data,
          sender: {
            id: currentUser.id,
            email: currentUser.email,
            full_name: currentUser.full_name,
            role: "member",
            created_at: ""
          },
          attachment: pendingAttachment || undefined
        }]);
      }

      setNewMessageText("");
      setPendingAttachment(null);
      setIsMentionOpen(false);

    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    }
  };

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

  const activeProject = projects.find(p => p.id === activeProjectId);
  const filteredTasks = tasks.filter(t => {
    if (t.project_id && activeProjectId && t.project_id !== activeProjectId) return false;
    if (taskFilter === "archived") return Boolean(t.archived_at) && Boolean(activeProject?.is_manager);
    if (t.archived_at) return false;
    if (taskFilter === "urgent") return t.priority === "urgent";
    if (taskFilter === "assigned_to_me") return currentUser ? t.assigned_to === currentUser.id : true;
    return true;
  });

  const activeChatMessages = messages.filter(m => {
    if (chatMode === "channel") {
      return m.project_id === activeProjectId && !m.is_direct_message;
    } else {
      return m.project_id === activeProjectId && m.is_direct_message && (
        (m.sender_id === currentUser?.id && m.recipient_id === activeDmUser) ||
        (m.sender_id === activeDmUser && m.recipient_id === currentUser?.id)
      );
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeDmMember = teamMembers.find(m => m.id === activeDmUser);

  // YÜKLENİYOR
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-2xl shadow-indigo-500/30 shadow-xl animate-pulse mb-3">
          ⚡
        </div>
        <p className="text-xs text-slate-400">Pulse Çalışma Alanı Yükleniyor...</p>
      </div>
    );
  }

  // =========================================================================
  // ŞİFRE SIFIRLAMA LİNKİNE TIKLANDIYSA: YENİ ŞİFRE BELİRLEME EKRANI
  // =========================================================================
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen max-w-md mx-auto w-full bg-slate-950 text-slate-100 flex flex-col justify-center px-5 py-8 shadow-2xl relative overflow-hidden">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center font-bold text-3xl text-white shadow-indigo-500/40 shadow-2xl mx-auto">
            🔑
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Yeni Şifrenizi Belirleyin
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Hesabınız için en az 6 karakterli yeni bir şifre oluşturun.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          {recoveryError && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 leading-relaxed">
              {recoveryError}
            </div>
          )}

          {recoverySuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 leading-relaxed">
              {recoverySuccess}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Lock size={12} /> Yeni Şifre
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Lock size={12} /> Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi doğrulayın"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={recoveryLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-3"
            >
              {recoveryLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Şifremi Güncelle & Giriş Yap</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // GİRİŞ YAPILMAMIŞSA: AUTH GATE
  if (!currentUser) {
    return (
      <div className="min-h-screen max-w-md mx-auto w-full bg-slate-950 text-slate-100 flex flex-col justify-center px-5 py-8 shadow-2xl relative overflow-hidden">
        <InstallPrompt />

        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-3xl bg-indigo-600 flex items-center justify-center font-bold text-3xl text-white shadow-indigo-500/40 shadow-2xl mx-auto">
            ⚡
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Pulse Ekip Alanı
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            20-25 kişilik ekibiniz için hafif, hızlı iş takip ve anlık mesajlaşma platformu.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          
          {authMode === "forgot" ? (
            <div className="space-y-1 text-center">
              <h2 className="text-sm font-bold text-white">Şifre Sıfırlama</h2>
              <p className="text-[11px] text-slate-400">
                Kayıtlı e-posta adresinizi girin, sıfırlama bağlantısını gönderelim.
              </p>
            </div>
          ) : (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 py-2 rounded-lg transition ${authMode === "login" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }}
                className={`flex-1 py-2 rounded-lg transition ${authMode === "register" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-white"}`}
              >
                Kayıt Ol
              </button>
            </div>
          )}

          {/* Hata Bildirimi (Sadeleştirilmiş) */}
          {authError && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 leading-relaxed">
              {authError}
            </div>
          )}

          {/* Başarı Bildirimi */}
          {authSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 leading-relaxed">
              {authSuccess}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3 pt-1">
            {authMode === "register" && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <UserIcon size={12} /> Ad Soyad
                </label>
                <input
                  type="text"
                  required
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Mail size={12} /> E-posta
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="adiniz@ekip.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {authMode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-slate-400 flex items-center gap-1">
                    <Lock size={12} /> Şifre
                  </label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode("forgot"); setAuthError(""); setAuthSuccess(""); }}
                      className="text-indigo-400 hover:underline"
                    >
                      Şifremi unuttum?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-3"
            >
              {authLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>
                    {authMode === "login" && "Giriş Yap & Başla"}
                    {authMode === "register" && "Ekibe Katıl & Kayıt Ol"}
                    {authMode === "forgot" && "Sıfırlama Bağlantısı Gönder"}
                  </span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {authMode === "forgot" && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  ← Giriş Ekranına Dön
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // GİRİŞ YAPILMIŞSA: DASHBOARD
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto w-full bg-slate-950 text-slate-100 shadow-2xl relative overflow-hidden">
      
      {/* 1. ÜST BAŞLIK */}
      <header className="px-4 pt-12 pb-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg text-sm shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            {isAddingProject ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={newProjectInput}
                  onChange={(e) => setNewProjectInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNewProject()}
                  placeholder="Proje Adı..."
                  className="bg-slate-800 border border-indigo-500 text-xs text-white px-2 py-0.5 rounded-lg w-28 focus:outline-none"
                />
                <button onClick={handleAddNewProject} className="text-xs text-emerald-400 font-bold px-1">✓</button>
                <button onClick={() => setIsAddingProject(false)} className="text-xs text-slate-400 px-1">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <select 
                  value={activeProjectId}
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      setIsAddingProject(true);
                    } else {
                      setActiveProjectId(e.target.value);
                    }
                  }}
                  className="bg-transparent text-sm font-semibold text-slate-100 focus:outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                >
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id} className="bg-slate-900 text-white">
                      {proj.name}
                    </option>
                  ))}
                  <option value="new" className="bg-slate-900 text-indigo-400 font-semibold">+ Yeni Proje Ekle</option>
                </select>
                <button
                  onClick={() => setIsAddingProject(true)}
                  className="text-slate-400 hover:text-indigo-400 p-0.5"
                  title="Yeni Proje Aç"
                >
                  <FolderPlus size={14} />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] text-emerald-400 font-medium truncate">
                {teamMembers.length} Üye Aktif
              </span>
            </div>
          </div>
        </div>

        {/* Kullanıcı Profili ve Çıkış */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-200 truncate max-w-[70px]">
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

      {/* 2. ANA İÇERİK */}
      <main className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        <InstallPrompt />

        {/* --- TAB: KİŞİSEL TODO --- */}
        {activeTab === "personal" && (
          <PersonalTodoPanel
            todos={personalTodos}
            onCreate={handleCreatePersonalTodo}
            onEdit={handleEditPersonalTodo}
            onToggle={handleTogglePersonalTodo}
            onDelete={handleDeletePersonalTodo}
            onPostpone={handlePostponePersonalTodo}
          />
        )}

        {/* --- TAB: GÖREVLER (TASKS) --- */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 overflow-x-auto text-xs py-0.5">
                <button 
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1 rounded-full font-medium transition ${taskFilter === "all" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                >
                  Tümü ({filteredTasks.length})
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
                {activeProject?.is_manager && (
                  <button
                    onClick={() => setTaskFilter("archived")}
                    className={`px-3 py-1 rounded-full font-medium transition ${taskFilter === "archived" ? "bg-amber-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"}`}
                  >
                    Arşiv
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={() => setViewMode(prev => prev === "list" ? "kanban" : "list")}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                  title="Görünüm Değiştir"
                >
                  {viewMode === "list" ? <Kanban size={16} /> : <ListFilter size={16} />}
                </button>

                {activeProject?.is_manager && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition"
                    title="Yeni Görev Ata"
                  >
                    <Plus size={16} />
                  </button>
                )}
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
                  <div className="text-center py-12 text-slate-400 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 space-y-2">
                    <p>Bu projede henüz görev bulunmuyor.</p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500 transition"
                    >
                      + İlk Görevi Ekle
                    </button>
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
                              {task.archived_at ? (
                                <span className="text-amber-400 font-semibold">Arşivlendi</span>
                              ) : task.status === "done" ? (
                                <span className="text-emerald-400 font-semibold">Tamamlandı</span>
                              ) : task.priority === "urgent" && (
                                <span className="text-rose-400 font-semibold flex items-center gap-1">
                                  <AlertCircle size={12} /> Acil
                                </span>
                              )}
                              <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                                <UserCheck size={11} className="text-indigo-400" />
                                {task.assigned_to === currentUser.id 
                                  ? "Bana Atandı" 
                                  : (teamMembers.find(m => m.id === task.assigned_to)?.name || "Atandı")}
                              </span>
                              {task.due_date && (
                                <span className="text-emerald-400">
                                  Teslim: {new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                                </span>
                              )}
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
                {teamMembers.filter(m => m.id !== currentUser.id).map(member => (
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
              {activeChatMessages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Henüz mesaj bulunmuyor. İlk mesajı siz yazın!
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
                          {msg.sender_id === currentUser.id ? "Siz" : (msg.sender?.full_name || "Kullanıcı")}
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
                ))
              )}
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
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Henüz yeni bir bildirim yok.
                </div>
              ) : (
                notifications.map(notif => (
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
                ))
              )}
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
            </div>

            {activeProject?.is_manager && (
              <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <UserPlus size={14} className="text-indigo-400" /> Projeye davet et
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="E-posta adresi"
                    className="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as "member" | "manager")}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2 text-[11px] text-slate-200 focus:outline-none"
                    aria-label="Davet rolü"
                  >
                    <option value="member">Üye</option>
                    <option value="manager">Yönetici</option>
                  </select>
                  <button
                    onClick={handleInviteMember}
                    disabled={!inviteEmail.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition"
                    title="Davet gönder"
                  >
                    <Share2 size={15} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Kayıtlı kullanıcı doğrudan eklenir; kayıtlı değilse WhatsApp veya paylaşım bağlantısı açılır.</p>
                {inviteStatus && <p className="text-[10px] text-emerald-400">{inviteStatus}</p>}
              </div>
            )}

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
                  {member.id !== currentUser.id && (
                    <div className="flex items-center gap-2">
                      {activeProject?.is_manager && (
                        <button
                          onClick={() => handleToggleManager(member.id, member.role === "Proje Yöneticisi")}
                          className="text-[10px] text-slate-400 hover:text-indigo-300 transition"
                          title="Proje yöneticisi yetkisini değiştir"
                        >
                          {member.role === "Proje Yöneticisi" ? "Yetkiyi kaldır" : "Yönetici yap"}
                        </button>
                      )}
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
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. MOBİL ALT NAVİGASYON */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-3 py-2.5 pb-safe-bottom flex justify-between items-center z-40">
        <button
          onClick={() => setActiveTab("personal")}
          className={`flex flex-col items-center gap-1 transition ${activeTab === "personal" ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-300"}`}
        >
          <ListTodo size={20} />
          <span className="text-[10px]">Kişisel</span>
        </button>

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
        canManageTask={Boolean(activeProject?.is_manager)}
        onEditTask={handleEditTask}
        comments={selectedTask ? taskComments[selectedTask.id] || [] : []}
        onAddComment={handleAddTaskComment}
        onClose={() => setSelectedTask(null)}
        onUpdateStatus={(id, s) => {
          toggleTaskStatus(id);
          if (selectedTask) setSelectedTask(prev => prev ? { ...prev, status: s } : null);
        }}
        onUpdateAssignee={(id, mId) => {
          supabase.from("tasks").update({ assigned_to: mId }).eq("id", id);
        }}
        onUpdatePriority={(id, p) => {
          supabase.from("tasks").update({ priority: p }).eq("id", id);
        }}
        onArchiveTask={handleArchiveTask}
      />

      <CreateTaskModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teamMembers={teamMembers}
        projects={projects}
        currentProjectId={activeProjectId}
        currentUserId={currentUser.id}
        currentUserName={currentUser.full_name}
        onCreateTask={handleCreateTask}
      />

    </div>
  );
}
