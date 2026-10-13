"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Smartphone } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Zaten uygulama olarak mı açık?
    const isStandaloneMode = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    setIsStandalone(isStandaloneMode);

    // 2. iOS Safari tespiti
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Android / Chrome / Edge için beforeinstallprompt dinleyicisi
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  // Eğer zaten yüklüyse veya kullanıcı kapattıysa gösterme
  if (isStandalone || isDismissed) return null;

  // 1. Android / Masaüstü Chrome (beforeinstallprompt yakalandıysa)
  if (deferredPrompt) {
    return (
      <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 mb-3 border border-indigo-400/40 animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-white/20 rounded-xl shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold leading-tight">Pulse Uygulamasını Yükle</p>
            <p className="text-[10px] text-indigo-100">Ana ekrandan tek dokunuşla açın</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-white text-indigo-600 font-bold text-xs rounded-xl shadow-md hover:bg-indigo-50 transition"
          >
            Yükle
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/80 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // 2. iOS Safari (iPhone / iPad) Rehberi
  if (isIOS) {
    return (
      <div className="bg-slate-900 border border-indigo-500/30 p-3 rounded-2xl shadow-xl flex items-start justify-between gap-2.5 mb-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Share size={16} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white">iPhone'a Yükleyin</p>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
              Alttaki <span className="font-bold text-indigo-400">Paylaş (Paylaş simgesi)</span> butonuna basıp <span className="font-bold text-indigo-400">"Ana Ekrana Ekle"</span>yi seçin.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white p-1 shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return null;
}
