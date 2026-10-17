"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, AlertCircle, Sparkles } from "lucide-react";

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Service Worker'ı kaydet
      navigator.serviceWorker.register("/sw.js").catch(err => {
        console.warn("Service worker kayıt hatası:", err);
      });
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!isSupported) {
      alert("Tarayıcınız bildirim özelliğini desteklemiyor.");
      return;
    }

    try {
      setIsSubscribing(true);
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) throw new Error("VAPID public key yapılandırılmamış");

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });
        if (!response.ok) {
          throw new Error("Push aboneliği sunucuya kaydedilemedi");
        }
      } else if (result === "denied") {
        alert("Bildirim izni reddedildi. Tarayıcı ayarlarınızdan izin verebilirsiniz.");
      }
    } catch (err) {
      console.error("Bildirim izni istenirken hata:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="p-3.5 bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-lg space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
            {permission === "granted" ? <Check size={18} className="text-emerald-400" /> : <Bell size={18} />}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-100 flex items-center gap-1">
              Kilit Ekranı Bildirimleri
              {permission === "granted" && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded-full font-bold">
                  Aktif
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {permission === "granted" 
                ? "Görev tamamlandığında telefonunuza anlık sesli bildirim gelir."
                : "Uygulama kapalıyken bile anında haberdar olmak için izin verin."}
            </p>
          </div>
        </div>

        {permission !== "granted" && (
          <button
            onClick={handleRequestPermission}
            disabled={isSubscribing}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/30 transition shrink-0"
          >
            {isSubscribing ? "Açılıyor..." : "İzin Ver"}
          </button>
        )}
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}
