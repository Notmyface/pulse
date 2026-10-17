import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Geçersiz abonelik bilgisi" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;
    if (!p256dh || !auth) {
      return NextResponse.json({ error: "Eksik push anahtarı" }, { status: 400 });
    }

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth
    }, { onConflict: "endpoint" });

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Abonelik kaydedildi" });
  } catch (error) {
    console.error("Abonelik hatası:", error);
    return NextResponse.json({ error: "Abonelik kaydedilemedi" }, { status: 500 });
  }
}
