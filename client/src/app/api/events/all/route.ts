import { NextRequest, NextResponse } from "next/server";
import { BackendUrlError, getBackendUrl } from "@/config/backend";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/events/all${request.nextUrl.search}`);

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: body || "Failed to fetch events" },
        { status: res.status },
      );
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    if (error instanceof BackendUrlError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
