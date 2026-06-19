import { put, del } from "@vercel/blob";

// base64 data URL эсэхийг шалгана (клиент талаас compressImageToDataUrl-аар ирдэг)
function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

// Энэ URL манай Vercel Blob store-д хадгалагдсан эсэх
export function isBlobUrl(value: string | null | undefined): boolean {
  return !!value && value.includes(".blob.vercel-storage.com");
}

/**
 * Зураг хадгалах. Хэрэв `photo` нь base64 data URL бол Vercel Blob руу байршуулж,
 * нийтэд нээлттэй URL буцаана. Аль хэдийн URL (http) бол шууд буцаана. Хоосон бол null.
 * DB-д цаашид base64 биш, зөвхөн URL хадгална.
 */
export async function storePhoto(
  photo: string | null | undefined
): Promise<string | null> {
  if (!photo) return null;
  if (!isDataUrl(photo)) return photo; // аль хэдийн URL — өөрчлөхгүй

  const match = photo.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;

  const contentType = match[1] || "image/jpeg";
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.includes("png") ? "png" : "jpg";

  const { url } = await put(`members/photo.${ext}`, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
    // dev-д статик RW токен ашиглана; production-д undefined → OIDC автоматаар
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return url;
}

/** Манай Blob store-д байгаа зургийг устгана. Бусад тохиолдолд юу ч хийхгүй. */
export async function deletePhoto(url: string | null | undefined): Promise<void> {
  if (!isBlobUrl(url)) return;
  try {
    await del(url as string, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    // устгаж чадаагүй ч гол урсгалыг зогсоохгүй
  }
}
