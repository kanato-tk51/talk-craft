import { NextResponse } from "next/server";
import { getCurrentActorId } from "@/modules/auth/application/current-actor";
import { CloudflareAccessAuthenticationError } from "@/modules/auth/infrastructure/cloudflare-access";

export async function GET() {
  try {
    await getCurrentActorId();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    if (error instanceof CloudflareAccessAuthenticationError) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
