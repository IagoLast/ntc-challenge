import { NextResponse } from "next/server";
import { getParticipantByVoteToken } from "@/lib/db";
import { VOTER_COOKIE, VOTER_COOKIE_MAX_AGE } from "@/lib/voting";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;
  const participant = await getParticipantByVoteToken(token);
  const url = new URL("/votar", request.url);

  if (!participant) {
    url.searchParams.set("error", "token");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: VOTER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE,
  });

  return response;
}
