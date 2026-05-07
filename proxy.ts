/**
 * This proxy file protects private routes with Clerk auth checks while
 * excluding static assets and framework internals through matcher patterns.
 * It is the gatekeeper for the `/library` area.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/library(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  { clockSkewInMs: 30000 },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
