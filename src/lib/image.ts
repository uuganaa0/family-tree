// Зургийг canvas ашиглан жижигрүүлж, base64 (JPEG) data URL болгоно.
// DB-д хадгалах тул хэмжээг хязгаарлана. Томруулж харах боломжтой байхаар
// max 720px (default), quality 0.82 — base64 хэмжээ ~60-120KB орчим.
export async function compressImageToDataUrl(
  file: File,
  max = 720,
  quality = 0.82
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Файл уншиж чадсангүй"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Зураг ачаалж чадсангүй"));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width >= height && width > max) {
    height = Math.round((height * max) / width);
    width = max;
  } else if (height > width && height > max) {
    width = Math.round((width * max) / height);
    height = max;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}
