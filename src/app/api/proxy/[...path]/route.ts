import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL = process.env.API_URL || "http://localhost:3001";
const API_KEY = process.env.API_KEY || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${UPSTREAM_URL}/api/${path.join("/")}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) {
    headers["x-api-key"] = API_KEY;
  }

  try {
    const res = await fetch(upstream, { headers, cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream API unreachable" },
      { status: 502 }
    );
  }
}
