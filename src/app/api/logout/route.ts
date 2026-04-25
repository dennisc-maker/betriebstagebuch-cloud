import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";

function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isValidOrigin(req)) {
    return new NextResponse("Forbidden: invalid origin", { status: 403 });
  }
  await clearSession();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
