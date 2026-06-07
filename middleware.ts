import { clerkMiddleware } from "@clerk/nextjs/server"

export default clerkMiddleware(async (auth, req) => {
  const url = new URL(req.url)
  const path = url.pathname

  // Protect profile, dashboard, and trips (except previews)
  const isProtected =
    path.startsWith("/profile") ||
    path.startsWith("/dashboard") ||
    (path.startsWith("/trips") && !path.endsWith("/preview") && !path.includes("/preview/"))

  if (isProtected) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
