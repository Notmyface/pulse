"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  Users,
  User,
  Plus,
  Send,
  Paperclip,
  Smile,
  ChevronLeft,
  Circle,
  Archive,
} from "lucide-react";
import type { Profile, Project, ChatMessage, Channel } from "@/types/database";

interface ChatHubProps {
  currentUser: Profile;
  profiles: Profile[];
  projects: Project[];
  channels: Channel[];
  channelMembers?: Array<{ channel_id: string; user_id: string }>;
  messages: ChatMessage[];
  onSendMessage: (params: {
    content: string;
    channel_id?: string;
    project_id?: string;
    recipient_id?: string;
  }) => Promise<void>;
  onOpenArchive?: () => void;
}

export default function ChatHub({
  currentUser,
  profiles,
  projects,
  channels,
  channelMembers = [],
  messages,
  onSendMessage,
  onOpenArchive,
}: ChatHubProps) {
  const [activeTab, setActiveTab] = useState<"projects" | "people">("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<{
    type: "project" | "dm" | "channel";
    id: string;
    title: string;
  } | null>(null);

  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Filtrelenmiş Mesajlar (Seçili sohbet için)
  const currentChatMessages = messages.filter((msg) => {
    if (!selectedChat) return false;
    if (selectedChat.type === "project") {
      return msg.project_id === selectedChat.id;
    }
    if (selectedChat.type === "dm") {
      return (
        (msg.sender_id === currentUser.id && msg.recipient_id === selectedChat.id) ||
        (msg.sender_id === selectedChat.id && msg.recipient_id === currentUser.id)
      );
    }
    if (selectedChat.type === "channel") {
      return msg.channel_id === selectedChat.id;
    }
    return false;
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage({
        content: inputMessage.trim(),
        project_id: selectedChat.type === "project" ? selectedChat.id : undefined,
        recipient_id: selectedChat.type === "dm" ? selectedChat.id : undefined,
        channel_id: selectedChat.type === "channel" ? selectedChat.id : undefined,
      });
      setInputMessage("");
    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    } finally {
      setIsSending(false);
    }
  };

  // 1. Seçili Sohbet Ekranı (Mesajlaşma İçi)
  if (selectedChat) {
    return (
      <div className="flex flex-col h-[85vh] max-w-md mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Sohbet Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedChat(null)}
              className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-xs font-bold text-slate-800 leading-tight">
                {selectedChat.title}
              </h3>
              <span className="text-[10px] text-emerald-600 font-medium">Aktif</span>
            </div>
          </div>
        </div>

        {/* Mesaj Akışı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {currentChatMessages.map((msg) => {
            const isMine = msg.sender_id === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {!isMine && (
                  <span className="text-[10px] font-semibold text-slate-400 mb-0.5 ml-1">
                    {msg.sender?.full_name || "Üye"}
                  </span>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isMine
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 mx-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}

          {currentChatMessages.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-400">
              Henüz mesaj bulunmuyor. İlk mesajı siz yazın!
            </div>
          )}
        </div>

        {/* Mesaj Gönderme Formu */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl shadow-xs disabled:opacity-50 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 2. Ana Sohbet Listesi (Ekran 5)
  return (
    <div className="pb-24 pt-2 px-2 sm:px-4 w-full space-y-4">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Sohbet</h2>
        {onOpenArchive && (
          <button
            onClick={onOpenArchive}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-xl transition-all"
          >
            <Archive className="w-3.5 h-3.5" />
            Arşiv
          </button>
        )}
      </div>

      {/* 2. Sekmeler: İş Sohbetleri | Kişiler */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab("projects")}
          className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "projects"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          İş Sohbetleri
        </button>
        <button
          onClick={() => setActiveTab("people")}
          className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "people"
              ? "bg-white text-indigo-700 shadow-xs"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Kişiler
        </button>
      </div>

      {/* 3. Arama Çubuğu */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sohbet ara..."
          className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* 4. İş Sohbetleri Listesi */}
      {activeTab === "projects" && (
        <div className="space-y-2">
          {channels
            .filter((channel) => channel.type === "custom")
            .filter((channel) => channel.created_by === currentUser.id || channelMembers.some(member => member.channel_id === channel.id && member.user_id === currentUser.id))
            .filter((channel) => !searchQuery.trim() || channel.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChat({ type: "channel", id: channel.id, title: channel.name })}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all"
              >
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white bg-slate-700 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{channel.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Özel sohbet</p>
                </div>
              </div>
            ))}
          {projects
            .filter((p) => p.module_chat !== false && !p.is_archived)
            .map((proj) => (
              <div
                key={proj.id}
                onClick={() =>
                  setSelectedChat({
                    type: "project",
                    id: proj.id,
                    title: proj.name,
                  })
                }
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: proj.color_code || "#6366f1" }}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {proj.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {proj.category?.name || "Liste Sohbeti"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 5. Kişiler (1-e-1 DM) Listesi */}
      {activeTab === "people" && (
        <div className="space-y-2">
          {profiles
            .filter((p) => p.id !== currentUser.id)
            .map((profile) => (
              <div
                key={profile.id}
                onClick={() =>
                  setSelectedChat({
                    type: "dm",
                    id: profile.id,
                    title: profile.full_name,
                  })
                }
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-bold shrink-0"
                      style={{
                        backgroundColor: profile.user_color ? `${profile.user_color}25` : "#e0e7ff",
                        color: profile.user_color || "#4338ca",
                      }}
                    >
                      {profile.user_emoji || profile.full_name.charAt(0)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {profile.full_name}
                    </h4>
                    <span className="text-[11px] text-emerald-600 font-medium">
                      Çevrimiçi
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
