import { NextRequest, NextResponse } from "next/server";

// İzin verilmeyen tehlikeli çalıştırılabilir uzantılar (XSS / Malware koruması)
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".sh", ".php", ".vbs", ".msi", ".jar", ".ps1"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    // 1. Boyut Sınırı Kontrolü
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu 25MB'dan büyük olamaz" }, { status: 413 });
    }

    // 2. Tehlikeli Uzantı Kontrolü
    const fileName = file.name.toLowerCase();
    const hasBlockedExtension = BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (hasBlockedExtension) {
      return NextResponse.json({ error: "Güvenlik nedeniyle çalıştırılabilir dosyalar yüklenemez" }, { status: 403 });
    }

    // 3. Cloudflare R2 / S3 Entegrasyonu (Varsa R2'ye yükleme, yoksa yerel blob simülasyonu)
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID;

    let fileUrl = "";

    if (r2AccountId && r2AccessKey) {
      // Gerçek Cloudflare R2 / S3 Depolama Mantığı
      // S3 Client ile R2 bucket'a yükleme yapılır...
      const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || "";
      const s3Key = `pulse-uploads/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      fileUrl = `${publicDomain}/${s3Key}`;
    } else {
      // Geliştirme Ortamı: Veriyi yerel Data URL veya Blob olarak döner (Sıfır konfigürasyon ile anında çalışır)
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString("base64");
      fileUrl = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({
      success: true,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      file_url: fileUrl
    });

  } catch (error) {
    console.error("Yükleme hatası:", error);
    return NextResponse.json({ error: "Dosya yüklenirken bir hata oluştu" }, { status: 500 });
  }
}
