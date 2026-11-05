"use client";

import { useState } from "react";
import { X, UserPlus, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Channel } from "@/types/database";

interface InviteChannelMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  currentUserId: string;
  profiles: Profile[];
  existingMemberIds: string[];
  onMembersAdded: (newMemberIds: string[]) => void;
}

export default function InviteChannelMemberModal({
  isOpen,
  onClose,
  channel,
  currentUserId,
  profiles,
  existingMemberIds,
  onMembersAdded
}: InviteChannelMemberModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const supabase = createClient();
  // Zaten kanalda olanları filtrele
  const eligibleUsers = profiles.filter(
    p => p.id !== currentUserId && !existingMemberIds.includes(p.id)
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setError("");
    try {
      setIsSubmitting(true);

      const memberRows = selectedUserIds.map(userId => ({
        channel_id: channel.id,
        user_id: userId,
        role: "member"
      }));

      const { error: insertErr } = await supabase
        .from("channel_members")
        .insert(memberRows);

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      // Bildirim gönder
      selectedUserIds.forEach(async (targetUserId) => {
        try {
          await supabase.from("notifications").insert({
            user_id: targetUserId,
            actor_id: currentUserId,
            type: "mention",
            title: "Kanala Davet Edildiniz",
            message: `"#${channel.name}" özel sohbet kanalına davet edildiniz.`,
            entity_type: "chat",
            entity_id: channel.id
          });
        } catch {
          // Sessizce yut
        }
      });

      onMembersAdded(selectedUserIds);
      setSelectedUserIds([]);
      onClose();
    } catch (err: any) {
      console.error("Üye ekleme hatası:", err);
      setError(err?.message || "Üyeler eklenirken hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Kanala Üye Davet Et</h3>
              <p className="text-[11px] text-slate-400 font-mono">#{channel.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-300">
                Eklenebilecek Ekip Üyeleri
              </label>
              <span className="text-[10px] text-slate-500">
                {selectedUserIds.length} kişi seçildi
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              {eligibleUsers.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-4">
                  Tüm ekip üyeleri bu kanala zaten dahil edilmiş.
                </div>
              ) : (
                eligibleUsers.map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => toggleUserSelection(user.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                        isSelected
                          ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                          : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </div>
                        <div className="truncate">
                          <p className="font-medium text-slate-200 truncate text-[11px] leading-tight">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700"
                      }`}>
                        {isSelected && <Check size={10} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length === 0}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Ekleniyor...
                </>
              ) : (
                `Davet Et (${selectedUserIds.length})`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
