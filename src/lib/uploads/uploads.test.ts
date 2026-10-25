import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { safeFileName, uploadFolder } from "./folders";
import { checkImage, UploadError, uploadToImageKit, type Fetcher } from "./imagekit";

const config = { privateKey: "private_test", urlEndpoint: "https://ik.imagekit.io/gdgsiliguri1" };

async function image(format: "png" | "jpeg", name: string) {
  const bytes = await sharp({
    create: { width: 40, height: 30, channels: 4, background: { r: 66, g: 133, b: 244, alpha: 0.5 } },
  })
    .toFormat(format)
    .toBuffer();
  return new File([new Uint8Array(bytes)], name, { type: `image/${format}` });
}

const png = (name = "Speaker Photo (1).PNG") => image("png", name);

async function sentFile(calls: { init: RequestInit }[]) {
  const body = calls[0].init.body as FormData;
  const file = body.get("file") as File;
  return { body, file, metadata: await sharp(Buffer.from(await file.arrayBuffer())).metadata() };
}

function recordingFetcher(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, fetcher };
}

describe("upload folders", () => {
  it("follows the existing ImageKit folder conventions", () => {
    expect(uploadFolder("team", 2026)).toBe("/teams");
    expect(uploadFolder("speaker", 2026)).toBe("/speakers/2026");
    expect(uploadFolder("sponsor", 2026)).toBe("/Sponsors");
    expect(uploadFolder("partner", 2026)).toBe("/community partners/2026");
    expect(uploadFolder("branding", 2026)).toBe("/Logos and Banners");
  });

  it("makes file names safe", () => {
    expect(safeFileName("Speaker Photo (1).PNG")).toBe("Speaker-Photo-1.png");
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\photos\\me.jpg")).toBe("me.jpg");
    expect(safeFileName(".png")).toBe("image.png");
  });
});

describe("checkImage", () => {
  it("accepts common image types", () => {
    expect(() => checkImage({ type: "image/webp", size: 10 })).not.toThrow();
  });

  it("rejects other types, empty files and large files", () => {
    expect(() => checkImage({ type: "application/pdf", size: 10 })).toThrow(UploadError);
    expect(() => checkImage({ type: "image/png", size: 0 })).toThrow(/empty/);
    expect(() => checkImage({ type: "image/png", size: 6 * 1024 * 1024 })).toThrow(/5 MB/);
  });
});

describe("uploadToImageKit", () => {
  it("sends the file with private-key basic auth and returns the URL", async () => {
    const url = "https://ik.imagekit.io/gdgsiliguri1/speakers/2026/Speaker-Photo-1_abc.png";
    const { calls, fetcher } = recordingFetcher(Response.json({ url }));

    expect(await uploadToImageKit(await png(), "/speakers/2026", config, fetcher)).toBe(url);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://upload.imagekit.io/api/v1/files/upload");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("private_test:").toString("base64")}`,
    );
    const { body } = await sentFile(calls);
    expect(body.get("folder")).toBe("/speakers/2026");
    expect(body.get("useUniqueFileName")).toBe("true");
  });

  it("converts PNG and JPEG images to WebP and keeps transparency", async () => {
    for (const [original, expectedName, alpha] of [
      [await png(), "Speaker-Photo-1.webp", true],
      [await image("jpeg", "team.jpg"), "team.webp", false],
    ] as const) {
      const { calls, fetcher } = recordingFetcher(Response.json({ url: "https://ik.imagekit.io/x.webp" }));
      await uploadToImageKit(original, "/teams", config, fetcher);
      const { body, file, metadata } = await sentFile(calls);
      expect(body.get("fileName")).toBe(expectedName);
      expect(file.type).toBe("image/webp");
      expect(metadata).toMatchObject({ format: "webp", width: 40, height: 30, hasAlpha: alpha });
    }
  });

  it("uploads other formats such as SVG unchanged", async () => {
    const svg = new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "logo.svg", { type: "image/svg+xml" });
    const { calls, fetcher } = recordingFetcher(Response.json({ url: "https://ik.imagekit.io/logo.svg" }));
    await uploadToImageKit(svg, "/Sponsors", config, fetcher);
    const body = calls[0].init.body as FormData;
    expect(body.get("fileName")).toBe("logo.svg");
    expect(body.get("file")).toBe(svg);
  });

  it("refuses files that only claim to be PNG or JPEG", async () => {
    const { calls, fetcher } = recordingFetcher(Response.json({}));
    const fake = new File([new Uint8Array(1024)], "fake.png", { type: "image/png" });
    await expect(uploadToImageKit(fake, "/teams", config, fetcher)).rejects.toMatchObject({
      message: "That file isn't a readable image.",
      status: 415,
    });
    expect(calls).toHaveLength(0);
  });

  it("reports ImageKit errors", async () => {
    const { fetcher } = recordingFetcher(Response.json({ message: "Your account is suspended" }, { status: 403 }));
    await expect(uploadToImageKit(await png(), "/teams", config, fetcher)).rejects.toThrow(
      "ImageKit rejected the upload: Your account is suspended",
    );
  });

  it("never sends files that fail the checks", async () => {
    const { calls, fetcher } = recordingFetcher(Response.json({}));
    const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });
    await expect(uploadToImageKit(pdf, "/teams", config, fetcher)).rejects.toThrow(UploadError);
    expect(calls).toHaveLength(0);
  });
});
