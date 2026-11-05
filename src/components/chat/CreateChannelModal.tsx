"use client";

import { useState } from "react";
import { X, Hash, Users, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Channel } from "@/types/database";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  profiles: Profile[];
  onChannelCreated: (channel: Channel) => void;
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  currentUserId,
  profiles,
  onChannelCreated
}: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const supabase = createClient();
  const availableUsers = profiles.filter(p => p.id !== currentUserId);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = channelName.trim().replace(/^#+/, "").toLowerCase();
    if (!trimmedName) {
      setError("Kanal adı boş olamaz.");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Kanallar tablosuna ekle
      const { data: channelData, error: channelErr } = await supabase
        .from("channels")
        .insert({
          name: trimmedName,
          description: description.trim() || null,
          type: "custom",
          created_by: currentUserId
        })
        .select()
        .single();

      if (channelErr || !channelData) {
        throw new Error(channelErr?.message || "Kanal oluşturulamadı.");
      }

      // 2. Seçilen üyeleri channel_members tablosuna ekle
      if (selectedUserIds.length > 0) {
        const memberRows = selectedUserIds.map(userId => ({
          channel_id: channelData.id,
          user_id: userId,
          role: "member"
        }));

        const { error: membersErr } = await supabase
          .from("channel_members")
          .insert(memberRows);

        if (membersErr) {
          console.warn("Kanal üyeleri eklenirken uyarı:", membersErr.message);
        }

        // Bildirim gönder
        selectedUserIds.forEach(async (targetUserId) => {
          try {
            await supabase.from("notifications").insert({
              user_id: targetUserId,
              actor_id: currentUserId,
              type: "mention",
              title: "Yeni Kanala Eklendiniz",
              message: `"#${channelData.name}" özel sohbet kanalına eklendiniz.`,
              entity_type: "chat",
              entity_id: channelData.id
            });
          } catch {
            // Sessizce yut
          }
        });
      }

      onChannelCreated(channelData as Channel);
      setChannelName("");
      setDescription("");
      setSelectedUserIds([]);
      onClose();
    } catch (err: any) {
      console.error("Kanal oluşturma hatası:", err);
      setError(err?.message || "Beklenmeyen bir hata oluştu.");
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
              <Hash size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Yeni Özel Kanal Oluştur</h3>
              <p className="text-[11px] text-slate-400">Yalnızca davet edilen üyelerin katılabileceği grup</p>
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

        <form onSubmit={handleCreate} className="space-y-3.5">
          {/* Kanal Adı */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Kanal Adı</label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-500 text-sm font-mono">#</span>
              <input
                type="text"
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                placeholder="ornek-kanal-adi"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Açıklama */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Açıklama (İsteğe Bağlı)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Bu kanalın amacı nedir?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Üye Davet Seçimi */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Users size={12} className="text-indigo-400" /> Üye Davet Et
              </label>
              <span className="text-[10px] text-slate-500">
                {selectedUserIds.length} kişi seçildi
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
              {availableUsers.length === 0 ? (
                <div className="text-[11px] text-slate-500 text-center py-2">
                  Davet edilecek başka ekip üyesi bulunamadı.
                </div>
              ) : (
                availableUsers.map(user => {
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
              disabled={isSubmitting || !channelName.trim()}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Oluşturuluyor...
                </>
              ) : (
                "Kanalı Oluştur"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
