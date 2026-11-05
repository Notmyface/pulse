"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Hash, 
  Lock, 
  MessageSquare, 
  Plus, 
  Send, 
  ArrowLeft, 
  Users, 
  UserPlus, 
  AtSign, 
  X, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Archive, 
  File, 
  Download,
  FolderOpen
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { Profile, Project, Channel, ChannelMember, ChatMessage } from "@/types/database";
import FileUploadButton, { type UploadedFile } from "@/components/FileUploadButton";
import MentionPopover from "@/components/MentionPopover";
import CreateChannelModal from "@/components/chat/CreateChannelModal";
import InviteChannelMemberModal from "@/components/chat/InviteChannelMemberModal";
import ChannelDocsTab from "@/components/chat/ChannelDocsTab";
import { createClient } from "@/lib/supabase/client";

interface ChatSectionProps {
  currentUser: { id: string; email: string; full_name: string };
  projects: Array<{ id: string; name: string; color: string; is_manager: boolean; created_by?: string }>;
  profiles: Profile[];
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  channelMembers: ChannelMember[];
  setChannelMembers: React.Dispatch<React.SetStateAction<ChannelMember[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeProjectId?: string;
  initialDmUserId?: string | null;
  sendPushNotification: (userId: string, title: string, body: string) => Promise<void>;
}

export default function ChatSection({
  currentUser,
  projects,
  profiles,
  channels,
  setChannels,
  channelMembers,
  setChannelMembers,
  messages,
  setMessages,
  activeProjectId,
  initialDmUserId,
  sendPushNotification
}: ChatSectionProps) {
  const supabase = createClient();

  // Görünüm State'leri
  const [subTab, setSubTab] = useState<"channels" | "dm">("channels");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(initialDmUserId || null);
  const [roomTab, setRoomTab] = useState<"messages" | "docs">("messages");

  useEffect(() => {
    if (initialDmUserId) {
      setActiveDmUserId(initialDmUserId);
      setActiveChannelId(null);
      setSubTab("dm");
      setRoomTab("messages");
    }
  }, [initialDmUserId]);

  // Modallar
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);

  // Mesajlaşma State'leri
  const [newMessageText, setNewMessageText] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<UploadedFile | null>(null);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionFilterText, setMentionFilterText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Aktif Kanal / DM Bilgisi
  const activeChannel = channels.find(c => c.id === activeChannelId) || null;
  const activeDmUser = profiles.find(p => p.id === activeDmUserId) || null;
  const isInsideRoom = Boolean(activeChannel || activeDmUser);

  // Aktif kanaldaki üyelerin ID'leri
  const activeChannelMemberIds = activeChannel
    ? activeChannel.type === "project"
      ? profiles.map(p => p.id) // Proje kanalına tüm proje üyeleri otomatik erişir
      : [
          activeChannel.created_by,
          ...channelMembers.filter(cm => cm.channel_id === activeChannel.id).map(cm => cm.user_id)
        ]
    : [];

  // Mention için liste
  const mentionEligibleMembers = profiles.map(p => ({
    id: p.id,
    name: p.full_name || p.email.split("@")[0],
    role: p.role || "Üye"
  }));

  // Mesaj listesini filtrele
  const currentMessages = messages.filter(msg => {
    if (activeChannel) {
      return msg.channel_id === activeChannel.id;
    }
    if (activeDmUser) {
      return (
        msg.is_direct_message &&
        ((msg.sender_id === currentUser.id && msg.recipient_id === activeDmUser.id) ||
         (msg.sender_id === activeDmUser.id && msg.recipient_id === currentUser.id))
      );
    }
    return false;
  });

  // Kanalda paylaşılan dökümanlar listesi
  const channelDocuments = currentMessages.filter(msg => Boolean(msg.attachment_url));

  // Döküman sekmesinden doğrudan dosya yükleme
  const handleDirectDocUpload = async (file: UploadedFile) => {
    if (!currentUser) return;
    const isDm = Boolean(activeDmUser);
    const channelId = activeChannel ? activeChannel.id : null;
    const recipientId = activeDmUser ? activeDmUser.id : null;

    try {
      const payload: any = {
        channel_id: channelId,
        project_id: activeChannel?.project_id || null,
        sender_id: currentUser.id,
        recipient_id: recipientId,
        content: `📄 "${file.file_name}" dökümanı paylaşıldı`,
        mentions: [],
        is_direct_message: isDm,
        attachment_url: file.file_url,
        attachment_name: file.file_name,
        attachment_size: file.file_size,
        attachment_mime: file.mime_type
      };

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Döküman kayıt hatası:", error);
        alert(`Döküman eklenemedi: ${error.message}`);
        return;
      }

      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            ...data,
            sender: {
              id: currentUser.id,
              email: currentUser.email,
              full_name: currentUser.full_name,
              role: "member",
              created_at: ""
            }
          }];
        });

        if (isDm && recipientId) {
          void sendPushNotification(recipientId, `${currentUser.full_name} yeni bir belge paylaştı`, file.file_name);
        } else if (activeChannel) {
          const targetUsers = activeChannelMemberIds.filter(id => id !== currentUser.id);
          targetUsers.slice(0, 10).forEach(uid => {
            void sendPushNotification(uid, `#${activeChannel.name} kanalında yeni belge`, `${currentUser.full_name}: ${file.file_name}`);
          });
        }
      }
    } catch (err) {
      console.error("Döküman yüklenemedi:", err);
    }
  };

  // Yeni mesaj geldiğinde veya odaya girildiğinde en alta kaydır
  useEffect(() => {
    if (isInsideRoom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isInsideRoom, currentMessages.length]);

  // Proje kanalları ve Özel kanalları ayır
  const projectChannels = channels.filter(c => c.type === "project");
  const customChannels = channels.filter(c => c.type === "custom");

  // Mesaj Gönderme
  const handleSendMessage = async () => {
    if ((!newMessageText.trim() && !pendingAttachment) || !currentUser) return;

    const isDm = Boolean(activeDmUser);
    const channelId = activeChannel ? activeChannel.id : null;
    const recipientId = activeDmUser ? activeDmUser.id : null;

    const mentionedUserIds = profiles
      .filter(p => newMessageText.includes(`@${p.full_name || p.email.split("@")[0]}`))
      .map(p => p.id);

    try {
      const payload: any = {
        channel_id: channelId,
        project_id: activeChannel?.project_id || null,
        sender_id: currentUser.id,
        recipient_id: recipientId,
        content: newMessageText.trim(),
        mentions: mentionedUserIds,
        is_direct_message: isDm
      };

      if (pendingAttachment) {
        payload.attachment_url = pendingAttachment.file_url;
        payload.attachment_name = pendingAttachment.file_name;
        payload.attachment_size = pendingAttachment.file_size;
        payload.attachment_mime = pendingAttachment.mime_type;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Mesaj kayıt hatası:", error);
        alert(`Mesaj gönderilemedi: ${error.message}`);
        return;
      }

      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, {
            ...data,
            sender: {
              id: currentUser.id,
              email: currentUser.email,
              full_name: currentUser.full_name,
              role: "member",
              created_at: ""
            }
          }];
        });

        // Push Bildirimleri
        if (isDm && recipientId) {
          void sendPushNotification(
            recipientId,
            `${currentUser.full_name} kişisinden yeni mesaj`,
            newMessageText.trim() || "📎 Bir dosya gönderdi"
          );
        } else if (activeChannel) {
          // Kanaldaki diğer üyelere push bildirimi
          const targetUsers = activeChannelMemberIds.filter(id => id !== currentUser.id);
          targetUsers.slice(0, 10).forEach(uid => {
            void sendPushNotification(
              uid,
              `#${activeChannel.name} kanalında yeni mesaj`,
              `${currentUser.full_name}: ${newMessageText.trim() || "📎 Bir dosya paylaştı"}`
            );
          });
        }
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

  // Belge ve Dosya İkonu Belirleyici
  const renderAttachment = (msg: ChatMessage) => {
    const url = msg.attachment_url;
    const name = msg.attachment_name || "Dosya";
    const size = msg.attachment_size ? `${(msg.attachment_size / 1024).toFixed(0)} KB` : "";
    const mime = msg.attachment_mime || "";

    if (!url) return null;

    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
    const isPdf = mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");
    const isSpreadsheet = mime.includes("sheet") || mime.includes("excel") || mime.includes("csv") || /\.(xlsx?|csv)$/i.test(name);
    const isArchive = mime.includes("zip") || mime.includes("compressed") || /\.(zip|rar|7z|tar|gz)$/i.test(name);

    return (
      <div className="mt-2 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
            {isImage ? (
              <ImageIcon size={16} className="text-pink-400" />
            ) : isPdf ? (
              <FileText size={16} className="text-rose-400" />
            ) : isSpreadsheet ? (
              <FileSpreadsheet size={16} className="text-emerald-400" />
            ) : isArchive ? (
              <Archive size={16} className="text-amber-400" />
            ) : (
              <File size={16} className="text-indigo-400" />
            )}
          </div>
          <div className="truncate">
            <p className="font-medium text-slate-200 truncate text-[11px]">{name}</p>
            {size && <span className="text-[10px] text-slate-400">{size}</span>}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[10px] font-medium transition shrink-0"
        >
          <Download size={11} /> İndir / Aç
        </a>
      </div>
    );
  };

  // Son Mesaj Bilgisi Getirici (Kanal için)
  const getLastChannelMessage = (channelId: string) => {
    const channelMsgs = messages.filter(m => m.channel_id === channelId);
    if (channelMsgs.length === 0) return null;
    return channelMsgs[channelMsgs.length - 1];
  };

  // Son DM Mesaj Bilgisi Getirici (Kullanıcı için)
  const getLastDmMessage = (userId: string) => {
    const dms = messages.filter(m =>
      m.is_direct_message &&
      ((m.sender_id === currentUser.id && m.recipient_id === userId) ||
       (m.sender_id === userId && m.recipient_id === currentUser.id))
    );
    if (dms.length === 0) return null;
    return dms[dms.length - 1];
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 1. ODA DIŞI: KANALLAR / DM SEKMESİ VE LİSTE GÖRÜNÜMÜ */}
      {!isInsideRoom && (
        <div className="space-y-3">
          {/* Üst Sekme Geçişi */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shadow-sm">
            <button
              onClick={() => setSubTab("channels")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                subTab === "channels" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Hash size={14} /> Kanallar
            </button>
            <button
              onClick={() => setSubTab("dm")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                subTab === "dm" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare size={14} /> Direkt Mesajlar (DM)
            </button>
          </div>

          {/* --- KANALLAR LİSTESİ --- */}
          {subTab === "channels" && (
            <div className="space-y-4">
              {/* Proje Kanalları Bölümü */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderOpen size={13} className="text-indigo-400" /> Proje Kanalları (Otomatik)
                  </span>
                  <span className="text-[10px] text-slate-500">{projectChannels.length} Kanal</span>
                </div>

                <div className="space-y-1.5">
                  {projectChannels.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500">
                      Henüz atanmış bir proje kanalı bulunmuyor.
                    </div>
                  ) : (
                    projectChannels.map(channel => {
                      const lastMsg = getLastChannelMessage(channel.id);
                      const project = projects.find(p => p.id === channel.project_id);
                      return (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setActiveChannelId(channel.id);
                            setRoomTab("messages");
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 transition text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold group-hover:scale-105 transition">
                              #
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-200 text-xs group-hover:text-white truncate">
                                  {channel.name}
                                </span>
                                {project && (
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color || "#6366f1" }} />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {lastMsg ? (
                                  <span>
                                    <strong className="text-slate-300">
                                      {lastMsg.sender_id === currentUser.id ? "Siz" : (lastMsg.sender?.full_name?.split(" ")[0] || "Biri")}:
                                    </strong>{" "}
                                    {lastMsg.content || "📎 Dosya paylaşıldı"}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-500">Henüz mesaj yok</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            {lastMsg && (
                              <span className="text-[10px] text-slate-500">
                                {formatTimeAgo(lastMsg.created_at)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Özel Kanallar Bölümü */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} className="text-amber-400" /> Özel Kanallar (Davetli)
                  </span>
                  <button
                    onClick={() => setIsCreateChannelOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 transition"
                  >
                    <Plus size={12} /> Yeni Kanal
                  </button>
                </div>

                <div className="space-y-1.5">
                  {customChannels.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
                      <p className="text-xs text-slate-400">Henüz bir özel kanala davet edilmediniz.</p>
                      <button
                        onClick={() => setIsCreateChannelOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium transition"
                      >
                        <Plus size={13} /> İlk Özel Kanalı Aç
                      </button>
                    </div>
                  ) : (
                    customChannels.map(channel => {
                      const lastMsg = getLastChannelMessage(channel.id);
                      const isOwner = channel.created_by === currentUser.id;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setActiveChannelId(channel.id);
                            setRoomTab("messages");
                          }}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 transition text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition">
                              <Lock size={14} />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-200 text-xs group-hover:text-white truncate">
                                  {channel.name}
                                </span>
                                {isOwner && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-semibold">
                                    Kurucu
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {lastMsg ? (
                                  <span>
                                    <strong className="text-slate-300">
                                      {lastMsg.sender_id === currentUser.id ? "Siz" : (lastMsg.sender?.full_name?.split(" ")[0] || "Biri")}:
                                    </strong>{" "}
                                    {lastMsg.content || "📎 Dosya paylaşıldı"}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-500">Henüz mesaj yok</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            {lastMsg && (
                              <span className="text-[10px] text-slate-500">
                                {formatTimeAgo(lastMsg.created_at)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- DİREKT MESAJLAR (DM) LİSTESİ --- */}
          {subTab === "dm" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Ekip İçi Birebir Mesajlaşma
                </span>
                <span className="text-[10px] text-slate-500">
                  {profiles.filter(p => p.id !== currentUser.id).length} Kişi
                </span>
              </div>

              <div className="space-y-1.5">
                {profiles.filter(p => p.id !== currentUser.id).length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                    Ekibinizde henüz başka kayıtlı kullanıcı bulunmuyor.
                  </div>
                ) : (
                  profiles.filter(p => p.id !== currentUser.id).map(user => {
                    const lastMsg = getLastDmMessage(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          setActiveDmUserId(user.id);
                          setRoomTab("messages");
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 transition text-left group shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
                            {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                          </div>
                          <div className="truncate">
                            <span className="font-medium text-slate-200 text-xs group-hover:text-white truncate block">
                              {user.full_name || user.email}
                            </span>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {lastMsg ? (
                                <span>
                                  <strong className="text-slate-300">
                                    {lastMsg.sender_id === currentUser.id ? "Siz" : (user.full_name?.split(" ")[0] || "O")}:
                                  </strong>{" "}
                                  {lastMsg.content || "📎 Dosya gönderildi"}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">Sohbet başlatmak için tıklayın</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {lastMsg && (
                            <span className="text-[10px] text-slate-500">
                              {formatTimeAgo(lastMsg.created_at)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. ODA İÇİ: AKTİF KANAL VEYA DM SOHBET ODASI */}
      {isInsideRoom && (
        <div className="flex flex-col h-[calc(100vh-175px)] min-h-[460px]">
          {/* Oda Başlığı & Navigasyon */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => {
                  setActiveChannelId(null);
                  setActiveDmUserId(null);
                  setRoomTab("messages");
                }}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition shrink-0"
                title="Geri Dön"
              >
                <ArrowLeft size={16} />
              </button>

              <div className="truncate">
                {activeChannel && (
                  <div className="flex items-center gap-1.5">
                    {activeChannel.type === "project" ? (
                      <span className="text-indigo-400 font-bold text-sm">#</span>
                    ) : (
                      <Lock size={14} className="text-amber-400 shrink-0" />
                    )}
                    <h2 className="text-xs font-semibold text-white truncate">
                      {activeChannel.name}
                    </h2>
                    {activeChannel.type === "project" ? (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-medium">
                        Proje
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-medium">
                        Özel
                      </span>
                    )}
                  </div>
                )}

                {activeDmUser && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center font-bold text-white shrink-0">
                      {activeDmUser.full_name?.charAt(0) || "U"}
                    </div>
                    <h2 className="text-xs font-semibold text-white truncate">
                      {activeDmUser.full_name || activeDmUser.email}
                    </h2>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {activeChannel
                    ? activeChannel.description || (activeChannel.type === "project" ? "Projedeki herkes erişebilir" : `${activeChannelMemberIds.length} üye`)
                    : activeDmUser?.email}
                </p>
              </div>
            </div>

            {/* Sağ Aksiyon: Özel kanala üye davet etme butonu */}
            {activeChannel && activeChannel.type === "custom" && (
              <button
                onClick={() => setIsInviteMemberOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 hover:text-indigo-300 text-[11px] font-medium transition shrink-0"
              >
                <UserPlus size={13} /> Üye Ekle
              </button>
            )}
          </div>

          {/* Sohbet / Dökümanlar Alt Sekmesi */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800 text-xs mb-2 shrink-0 shadow-sm">
            <button
              onClick={() => setRoomTab("messages")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                roomTab === "messages" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare size={13} /> Sohbet
            </button>
            <button
              onClick={() => setRoomTab("docs")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition ${
                roomTab === "docs" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText size={13} /> Dökümanlar & Belgeler ({channelDocuments.length})
            </button>
          </div>

          {roomTab === "messages" ? (
            <>
              {/* Mesaj Akışı */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                {currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-2 text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <MessageSquare size={24} />
                    </div>
                    <p className="text-xs text-slate-400">Henüz bir mesaj bulunmuyor.</p>
                    <p className="text-[11px] text-slate-600 max-w-xs">
                      İlk mesajı siz yazabilir veya bir dosya/belge paylaşarak sohbeti başlatabilirsiniz.
                    </p>
                  </div>
                ) : (
                  currentMessages.map(msg => {
                    const isMe = msg.sender_id === currentUser.id;
                    const senderName = isMe ? "Siz" : (msg.sender?.full_name || "Ekip Üyesi");

                    return (
                      <div key={msg.id} className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                            {msg.sender?.full_name?.charAt(0) || "U"}
                          </div>
                        )}

                        <div className={`max-w-[85%] rounded-2xl p-2.5 space-y-1.5 shadow-sm ${
                          isMe 
                            ? "bg-indigo-600/90 text-white rounded-tr-none" 
                            : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                        }`}>
                          <div className="flex justify-between items-baseline gap-2">
                            <span className={`text-[11px] font-semibold ${isMe ? "text-indigo-100" : "text-slate-300"}`}>
                              {senderName}
                            </span>
                            <span className={`text-[9px] ${isMe ? "text-indigo-200/70" : "text-slate-500"}`}>
                              {formatTimeAgo(msg.created_at)}
                            </span>
                          </div>

                          {msg.content && (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content.split(" ").map((word, i) => (
                                <span key={`${msg.id}-w-${i}`}>
                                  {word.startsWith("@") ? (
                                    <span className={`font-semibold px-1 py-0.5 rounded mr-1 ${
                                      isMe ? "bg-indigo-800/80 text-white" : "bg-indigo-950 text-indigo-400 border border-indigo-500/30"
                                    }`}>
                                      {word}
                                    </span>
                                  ) : (
                                    word + " "
                                  )}
                                </span>
                              ))}
                            </p>
                          )}

                          {/* Belge / Dosya Kartı */}
                          {renderAttachment(msg)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Mesaj Giriş Alanı */}
              <div className="pt-2 sticky bottom-0 bg-slate-950 relative shrink-0">
                <MentionPopover 
                  isOpen={isMentionOpen}
                  filterText={mentionFilterText}
                  teamMembers={mentionEligibleMembers}
                  onSelect={handleSelectMention}
                />

                {/* Seçili dosya önizlemesi */}
                {pendingAttachment && (
                  <div className="mb-2 p-2 bg-indigo-950/60 border border-indigo-500/40 rounded-xl flex items-center justify-between text-xs">
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
                      title="Kaldır"
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
                    title="Kişi Etiketle (@)"
                  >
                    <AtSign size={17} />
                  </button>

                  <input 
                    type="text" 
                    value={newMessageText}
                    onChange={handleMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      activeChannel 
                        ? `#${activeChannel.name} kanalına yaz veya dosya ekle...` 
                        : `${activeDmUser?.full_name || "Kullanıcı"} kişisine özel yaz...`
                    }
                    className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-1"
                  />

                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessageText.trim() && !pendingAttachment}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition shadow-md shadow-indigo-600/30"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-hidden pt-1">
              <ChannelDocsTab
                documents={channelDocuments}
                currentUserId={currentUser.id}
                onUploadDocument={handleDirectDocUpload}
                channelName={activeChannel?.name || activeDmUser?.full_name}
              />
            </div>
          )}
        </div>
      )}

      {/* Kanal Oluşturma Modalı */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        currentUserId={currentUser.id}
        profiles={profiles}
        onChannelCreated={(newChan) => {
          setChannels(prev => [...prev, newChan]);
          setActiveChannelId(newChan.id);
          setRoomTab("messages");
        }}
      />

      {/* Kanala Üye Davet Modalı */}
      {activeChannel && (
        <InviteChannelMemberModal
          isOpen={isInviteMemberOpen}
          onClose={() => setIsInviteMemberOpen(false)}
          channel={activeChannel}
          currentUserId={currentUser.id}
          profiles={profiles}
          existingMemberIds={activeChannelMemberIds}
          onMembersAdded={(newMemberIds) => {
            const newRows = newMemberIds.map(uid => ({
              id: `${activeChannel.id}-${uid}`,
              channel_id: activeChannel.id,
              user_id: uid,
              role: "member" as const,
              joined_at: new Date().toISOString()
            }));
            setChannelMembers(prev => [...prev, ...newRows]);
          }}
        />
      )}
    </div>
  );
}
