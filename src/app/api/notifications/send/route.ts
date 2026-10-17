import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { title, body, userId, url } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Başlık ve mesaj içeriği zorunludur" }, { status: 400 });
    }

    // VAPID anahtarları varsa web-push kütüphanesi ile hedef kullanıcının cihazına push gönderilir
    // Supabase push_subscriptions tablosundan hedef kullanıcının endpoint ve auth anahtarları çekilir
    const authorization = req.headers.get("authorization");
    const supabase = authorization
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authorization } } }
        )
      : await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "VAPID anahtarları yapılandırılmamış" }, { status: 503 });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    const admin = createAdminClient();
    let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
    if (userId) query = query.eq("user_id", userId);
    const { data: subscriptions, error: subscriptionError } = await query;
    if (subscriptionError) throw subscriptionError;

    const payload = JSON.stringify({ title, body, url: url || "/" });
    const results = await Promise.allSettled((subscriptions || []).map(async subscription => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        }, payload);
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        }
        throw error;
      }
    }));

    return NextResponse.json({
      success: true,
      message: "Bildirim gönderildi",
      sent: results.filter(result => result.status === "fulfilled").length
    });
  } catch (error) {
    console.error("Push gönderme hatası:", error);
    return NextResponse.json({ error: "Bildirim gönderilemedi" }, { status: 500 });
  }
}
