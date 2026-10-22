// Ảnh đại diện con vật 3D (assets/avatars/*.webp): mỗi tên người chơi ứng với một con cố định.

const URLS = Object.entries(
  import.meta.glob<string>("./assets/avatars/*.webp", { eager: true, query: "?url", import: "default" }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

/** Băm chuỗi cho ra số nguyên không âm, ổn định giữa các lần chạy */
function hashOf(text: string): number {
  let h = 5381;
  for (const ch of text) h = (h * 33 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

/** Ảnh con vật của `name`; cùng tên luôn ra cùng một con. Chuỗi rỗng nếu chưa có ảnh nào */
export function avatarUrlOf(name: string): string {
  if (URLS.length === 0) return "";
  return URLS[hashOf(name.trim().toLowerCase()) % URLS.length] ?? "";
}
