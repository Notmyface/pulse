import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — Ekip İş Takip & İletişim",
  description: "20-25 kişilik ekipler için hızlı, hafif iş takip ve anlık mesajlaşma platformu",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulse",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        {children}
      </body>
    </html>
  );
}
