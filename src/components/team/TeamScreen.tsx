"use client";

import React, { useState } from "react";
import { Users, Crown, Shield, Plus, MoreVertical, Settings, UserPlus, X } from "lucide-react";
import type { Profile, UserRole } from "@/types/database";
import PermissionModal from "./PermissionModal";

interface TeamScreenProps {
  profiles: Profile[];
  currentUser: Profile;
  onUpdateRole: (memberId: string, role: UserRole) => Promise<void>;
  onInviteMember: (email: string, fullName: string, role: UserRole) => Promise<void>;
}

export default function TeamScreen({
  profiles,
  currentUser,
  onUpdateRole,
  onInviteMember,
}: TeamScreenProps) {
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("member");
  const [isInviting, setIsInviting] = useState(false);

  const isAdmin = currentUser.role === "admin";

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isInviting) return;
    try {
      setIsInviting(true);
      await onInviteMember(inviteEmail.trim(), inviteName.trim(), inviteRole);
      setInviteEmail("");
      setInviteName("");
      setIsInviteModalOpen(false);
    } catch (err) {
      console.error("Davet gönderilemedi:", err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto space-y-4">
      {/* 1. Üst Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">Ekip</h2>
        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Üye Ekle
          </button>
        )}
      </div>

      {/* 2. Yatay Üye Avatarları (Ekran 7 Üst Kısmı) */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar">
        {profiles.map((p) => (
          <div key={p.id} className="relative flex flex-col items-center shrink-0">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs border border-white"
              style={{
                backgroundColor: p.user_color ? `${p.user_color}25` : "#e0e7ff",
                color: p.user_color || "#4338ca",
              }}
            >
              {p.user_emoji || p.full_name.charAt(0)}
            </div>
            {p.role === "admin" && (
              <span className="absolute -top-1 -right-1 text-xs">👑</span>
            )}
            <span className="text-[11px] font-semibold text-slate-700 mt-1 max-w-[56px] truncate">
              {p.full_name.split(" ")[0]}
            </span>
          </div>
        ))}
        {isAdmin && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-13 h-13 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 3. Üye Detay Listesi */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Üye Detayları & Yetkiler
        </h3>

        <div className="space-y-2">
          {profiles.map((member) => (
            <div
              key={member.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
                    style={{
                      backgroundColor: member.user_color ? `${member.user_color}25` : "#e0e7ff",
                      color: member.user_color || "#4338ca",
                    }}
                  >
                    {member.user_emoji || member.full_name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {member.full_name}
                      </h4>
                      {member.role === "admin" && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                          Yönetici
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium truncate block">
                      @{member.username || member.email.split("@")[0].toLowerCase()} · {member.email}
                    </span>
                  </div>
                </div>

                {/* Yetki Ayarlama Butonu */}
                {isAdmin && (
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
                    title="Yetkileri Yönet"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Ekran 7 İçi Hızlı İzin Ayarları */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    Projeleri görme izni
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked={member.role !== "member"}
                    disabled={!isAdmin || member.role === "admin"}
                    onChange={(e) => {
                      if (isAdmin) {
                        onUpdateRole(member.id, e.target.checked ? "manager" : "member");
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    Takvim görünürlüğü
                  </span>
                  <select
                    disabled={!isAdmin}
                    defaultValue={member.role === "admin" ? "all" : "own"}
                    className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="all">Tüm ekip</option>
                    <option value="own">Sadece kendi</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Yetkilendirme Modalı */}
      <PermissionModal
        isOpen={Boolean(selectedMember)}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        onUpdateRole={onUpdateRole}
      />

      {/* Üye Ekleme / Davet Modalı */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSendInvite}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Yeni Ekip Üyesi Davet Et</h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Örn: Ayşe Yılmaz"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                E-posta Adresi *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="ayse@sirket.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Yetki Seviyesi
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="member">3. Seviye (Sadece Atananlar)</option>
                <option value="manager">2. Seviye (Liste Yönetimi)</option>
                <option value="admin">1. Seviye (Genel Yönetici)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!inviteEmail.trim() || isInviting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50"
            >
              {isInviting ? "Gönderiliyor..." : "Davet Gönder"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
