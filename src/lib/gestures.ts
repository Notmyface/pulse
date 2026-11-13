/**
 * Mobil tek ve çift dokunuş (tap / double tap) ayrıştırma yöneticisi.
 * Harici ağır gesture kütüphaneleri kullanmadan 250ms gecikme ile
 * tek dokunuş ve çift dokunuşu hatasız ayırır.
 */

export function createDoubleTapHandler(
  onSingleTap: () => void,
  onDoubleTap: () => void,
  delayMs: number = 260
) {
  let timer: NodeJS.Timeout | null = null;
  let lastTapTime = 0;

  return (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    if (timeSinceLastTap < delayMs && timeSinceLastTap > 0) {
      // Çift dokunuş gerçekleşti
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTapTime = 0;
      onDoubleTap();
    } else {
      // İlk dokunuş, zamanlayıcı başlat
      lastTapTime = now;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        onSingleTap();
        timer = null;
        lastTapTime = 0;
      }, delayMs);
    }
  };
}
