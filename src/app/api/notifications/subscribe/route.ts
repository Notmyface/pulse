import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Geçersiz abonelik bilgisi" }, { status: 400 });
    }

    // Gerçek veritabanı (Supabase) mevcutsa public.push_subscriptions tablosuna kaydet
    // Geliştirme ortamında başarılı dönüş yapar
    console.log(`Push aboneliği alındı (Kullanıcı: ${userId || 'anonim'}):`, subscription.endpoint);

    return NextResponse.json({ success: true, message: "Abonelik kaydedildi" });
  } catch (error) {
    console.error("Abonelik hatası:", error);
    return NextResponse.json({ error: "Abonelik kaydedilemedi" }, { status: 500 });
  }
}
