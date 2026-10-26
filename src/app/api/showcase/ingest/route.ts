import { NextResponse } from "next/server";

import { IngestError, ingestSubmission } from "@/lib/cms/showcase";

export async function POST(request: Request) {
  try {
    const result = await ingestSubmission(await request.text(), request.headers.get("x-ingest-secret"));
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    if (error instanceof IngestError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
