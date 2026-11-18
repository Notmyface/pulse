"use client";

import { useRef, useState } from "react";
import { Camera, LogOut, Mail, Shield, User } from "lucide-react";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface ProfileScreenProps {
  profile: Profile;
  onProfileUpdated: (profile: Profile) => void;
  onSignOut: () => void;
}

export default function ProfileScreen({ profile, onProfileUpdated, onSignOut }: ProfileScreenProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile.full_name);
  const [username, setUsername] = useState(profile.username || profile.email.split("@")[0].toLowerCase());
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("");

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("Lütfen bir görsel dosyası seçin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Profil fotoğrafı 5 MB'dan küçük olmalı.");
      return;
    }

    setIsUploading(true);
    setStatus("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", profile.id);
      if (profileError) throw profileError;

      onProfileUpdated({ ...profile, avatar_url: avatarUrl });
      setStatus("Profil fotoğrafı güncellendi.");
    } catch (error: any) {
      setStatus(error.message || "Profil fotoğrafı yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!normalizedUsername) {
      setStatus("Kullanıcı adı boş bırakılamaz.");
      return;
    }
    setIsSaving(true);
    setStatus("");
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), username: normalizedUsername }).eq("id", profile.id);
    if (error) {
      setStatus(error.code === "23505" ? "Bu kullanıcı adı başka bir kullanıcı tarafından alınmış." : error.message);
    } else {
      onProfileUpdated({ ...profile, full_name: fullName.trim(), username: normalizedUsername });
      setStatus("Profil bilgileriniz güncellendi.");
    }
    setIsSaving(false);
  };

  const roleLabel = profile.role === "admin" ? "Genel Yönetici" : profile.role === "manager" ? "Liste Yöneticisi" : "Üye";

  return (
    <div className="pb-24 pt-2 px-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-base font-bold text-slate-800">Profilim</h2>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-indigo-50 border border-slate-200 flex items-center justify-center shrink-0"
            title="Profil fotoğrafını değiştir"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600">{profile.full_name.charAt(0).toUpperCase()}</span>
            )}
            <span className="absolute right-1 bottom-1 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center border-2 border-white">
              <Camera size={13} />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleAvatarUpload(file);
              event.target.value = "";
            }}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Shield size={12} /> {roleLabel}</p>
            {isUploading && <p className="text-[11px] text-indigo-600 mt-1">Fotoğraf yükleniyor...</p>}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><User size={12} /> Ad Soyad</span>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-slate-500">Kullanıcı Adı</span>
            <div className="flex items-center px-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500/20">
              <span className="text-sm font-semibold text-indigo-600">@</span>
              <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="kullaniciadi" className="min-w-0 flex-1 px-1 py-2.5 bg-transparent text-sm text-slate-800 focus:outline-none" />
            </div>
            <span className="text-[10px] text-slate-400">Benzersizdir; mesajlarda @ kullanıcı adıyla bulunursunuz.</span>
          </label>
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Mail size={12} /> E-posta</span>
            <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500">{profile.email}</div>
          </div>
        </div>

        {status && <p className="text-[11px] text-slate-600">{status}</p>}

        <button onClick={handleSave} disabled={isSaving || !fullName.trim()} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold">
          {isSaving ? "Kaydediliyor..." : "Bilgileri Kaydet"}
        </button>
      </div>

      <button onClick={onSignOut} className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
        <LogOut size={14} /> Çıkış Yap
      </button>
    </div>
  );
}
