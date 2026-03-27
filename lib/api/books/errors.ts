/**
 * This module centralizes common JSON error responses for book-related routes
 * and maps known auth/profile exceptions into consistent HTTP response shapes.
 */
import { NextResponse } from "next/server";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function unexpectedServerErrorResponse() {
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export function profileResolutionFailedResponse() {
  return NextResponse.json(
    { error: "Failed to resolve user profile. Check Supabase table permissions." },
    { status: 500 }
  );
}

export function handleCommonApiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return unauthorizedResponse();
  }
  if (error instanceof Error && error.message === "PROFILE_RESOLUTION_FAILED") {
    return profileResolutionFailedResponse();
  }
  return unexpectedServerErrorResponse();
}
