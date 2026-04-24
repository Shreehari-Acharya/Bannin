import { NextRequest, NextResponse } from "next/server";
import { BackendUrlError, getBackendUrl } from "@/config/backend";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/events/${encodeURIComponent(id)}`);

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: body || "Event not found" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendUrlError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
