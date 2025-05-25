import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Function to check if a string matches QR ID format
function isValidQRId(path: string): boolean {
  return /^\/[0-9a-f]{8}$/.test(path) || /^\/b\d{6}$/.test(path);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path matches a QR ID format
  if (isValidQRId(pathname)) {
    // Create a new URL with the /box/ prefix
    const url = request.nextUrl.clone();
    url.pathname = `/box${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match paths that could be QR IDs
    "/:path([0-9a-f]{8}|b[0-9]{6})",
  ],
};
