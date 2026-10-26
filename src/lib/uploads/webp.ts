import sharp from "sharp";

const CONVERTIBLE_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const FORMAT_TYPES: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};
const WEBP_QUALITY = 85;
const SVG_LONG_EDGE = 1024;

export class UnreadableImageError extends Error {
  constructor(message = "That file isn't a readable image.") {
    super(message);
    this.name = "UnreadableImageError";
  }
}

export type PreparedImage = { file: File; width?: number; height?: number };

function webpFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.webp`;
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input)
    .metadata()
    .catch(() => {
      throw new UnreadableImageError();
    });
  if (!metadata.format || FORMAT_TYPES[metadata.format] !== file.type) {
    throw new UnreadableImageError("The file's contents don't match its image type.");
  }
  if (!CONVERTIBLE_TYPES.includes(file.type)) return { file, width: metadata.width, height: metadata.height };

  const pipeline = sharp(input, { density: file.type === "image/svg+xml" ? 300 : undefined }).rotate();
  if (file.type === "image/svg+xml") pipeline.resize(SVG_LONG_EDGE, SVG_LONG_EDGE, { fit: "inside" });
  const { data, info } = await pipeline
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new UnreadableImageError();
    });
  return {
    file: new File([new Uint8Array(data)], webpFileName(file.name), { type: "image/webp" }),
    width: info.width,
    height: info.height,
  };
}
