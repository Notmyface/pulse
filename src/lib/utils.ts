import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return "şimdi";
  if (diffInMinutes < 60) return `${diffInMinutes}d önce`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}s önce`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
