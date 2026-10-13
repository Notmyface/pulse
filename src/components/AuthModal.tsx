"use client";

import { useState } from "react";
import { X, Lock, Mail, User, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string; full_name: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  if (!isOpen) return null;

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          onSuccess({
            id: data.user.id,
            email: data.user.email || email,
            full_name: fullName.trim() || email.split("@")[0]
          });
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;

        if (data.user) {
          onSuccess({
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split("@")[0]
          });
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Giriş yapılırken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
        
        {/* Kapatma Butonu */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white transition"
        >
          <X size={18} />
        </button>

        {/* Başlık & Logo */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/30 shadow-lg mx-auto mb-2 text-lg">
            ⚡
          </div>
          <h2 className="text-base font-bold text-white">
            {mode === "login" ? "Pulse'a Giriş Yap" : "Yeni Hesap Oluştur"}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === "login" ? "Ekip çalışma alanınıza bağlanın" : "20-25 kişilik ekibinize katılın"}
          </p>
        </div>

        {/* Hata Mesajı */}
        {errorMsg && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <User size={12} /> Ad Soyad
              </label>
              <input 
                type="text" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@ekip.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Lock size={12} /> Şifre
            </label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Giriş Yap" : "Kayıt Ol & Başla"}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Mod Değiştirme Linki */}
        <div className="text-center pt-1 border-t border-slate-800">
          {mode === "login" ? (
            <button
              onClick={() => { setMode("register"); setErrorMsg(""); }}
              className="text-[11px] text-slate-400 hover:text-indigo-400 transition"
            >
              Hesabınız yok mu? <span className="font-semibold text-indigo-400">Kayıt Olun</span>
            </button>
          ) : (
            <button
              onClick={() => { setMode("login"); setErrorMsg(""); }}
              className="text-[11px] text-slate-400 hover:text-indigo-400 transition"
            >
              Zaten hesabınız var mı? <span className="font-semibold text-indigo-400">Giriş Yapın</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
