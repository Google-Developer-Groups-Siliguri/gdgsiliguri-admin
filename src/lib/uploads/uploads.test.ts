import { describe, expect, it } from "vitest";

import { safeFileName, uploadFolder } from "./folders";
import { checkImage, UploadError, uploadToImageKit, type Fetcher } from "./imagekit";

const config = { privateKey: "private_test", urlEndpoint: "https://ik.imagekit.io/gdgsiliguri1" };

function png(name = "Speaker Photo (1).PNG", size = 1024) {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
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

    expect(await uploadToImageKit(png(), "/speakers/2026", config, fetcher)).toBe(url);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://upload.imagekit.io/api/v1/files/upload");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("private_test:").toString("base64")}`,
    );
    const body = calls[0].init.body as FormData;
    expect(body.get("folder")).toBe("/speakers/2026");
    expect(body.get("fileName")).toBe("Speaker-Photo-1.png");
    expect(body.get("useUniqueFileName")).toBe("true");
    expect((body.get("file") as File).size).toBe(1024);
  });

  it("reports ImageKit errors", async () => {
    const { fetcher } = recordingFetcher(Response.json({ message: "Your account is suspended" }, { status: 403 }));
    await expect(uploadToImageKit(png(), "/teams", config, fetcher)).rejects.toThrow(
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
