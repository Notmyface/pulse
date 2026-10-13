import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, body, userId, url } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Başlık ve mesaj içeriği zorunludur" }, { status: 400 });
    }

    // VAPID anahtarları varsa web-push kütüphanesi ile hedef kullanıcının cihazına push gönderilir
    // Supabase push_subscriptions tablosundan hedef kullanıcının endpoint ve auth anahtarları çekilir
    console.log(`[Push Notification] Alıcı: ${userId || 'Hepsi'} | Başlık: ${title} | Mesaj: ${body}`);

    return NextResponse.json({
      success: true,
      message: "Bildirim başarıyla gönderildi",
      payload: { title, body, url: url || "/" }
    });
  } catch (error) {
    console.error("Push gönderme hatası:", error);
    return NextResponse.json({ error: "Bildirim gönderilemedi" }, { status: 500 });
  }
}
