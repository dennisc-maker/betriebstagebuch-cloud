import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "incident-attachments";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { path: parts } = await params;
  const safe = parts.join("/").replace(/\.\./g, "");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(safe, 60);
  if (error || !data?.signedUrl) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}
