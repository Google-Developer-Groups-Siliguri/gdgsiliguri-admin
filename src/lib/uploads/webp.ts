import sharp from "sharp";

const CONVERTIBLE_TYPES = ["image/png", "image/jpeg"];
const WEBP_QUALITY = 85;

export class UnreadableImageError extends Error {
  constructor() {
    super("That file isn't a readable image.");
    this.name = "UnreadableImageError";
  }
}

function webpFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.webp`;
}

export async function convertToWebp(file: File): Promise<File> {
  if (!CONVERTIBLE_TYPES.includes(file.type)) return file;
  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
    .catch(() => {
      throw new UnreadableImageError();
    });
  return new File([new Uint8Array(output)], webpFileName(file.name), { type: "image/webp" });
}
