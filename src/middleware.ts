import { clerkMiddleware, ClerkMiddlewareAuth, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { appConfig } from "@/lib/appConfig";
import { extractFingerprintId, FINGERPRINT_CONSTANTS } from "@/lib/fingerprint";

const intlMiddleware = createMiddleware({
  locales: appConfig.i18n.locales,

  defaultLocale: appConfig.i18n.defaultLocale,
  localePrefix: "always",
  localeDetection: false
});

// TODO
const allowPassWhitelist = createRouteMatcher(['/(.*)'])

/**
 * 处理fingerprint ID的提取和验证
 */
async function handleFingerprintId(req: NextRequest): Promise<string | null> {
  // 从请求中提取fingerprint ID
  const headers = Object.fromEntries(req.headers.entries());
  const cookies = req.cookies.getAll().reduce((acc, cookie) => {
    acc[cookie.name] = cookie.value;
    return acc;
  }, {} as Record<string, string>);
  
  // 尝试提取fingerprint ID
  const fingerprintId = extractFingerprintId(headers, cookies);
  
  if (fingerprintId) {
    console.log('Fingerprint ID found in request:', fingerprintId);
    return fingerprintId;
  }

  // 如果是API路由或静态资源，不需要处理fingerprint
  if (req.nextUrl.pathname.startsWith('/api') || 
      req.nextUrl.pathname.startsWith('/_next') ||
      req.nextUrl.pathname.includes('.')) {
    return null;
  }

  console.log('No fingerprint ID found in request for path:', req.nextUrl.pathname);
  return null;
}

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  // 处理fingerprint ID
  const fingerprintId = await handleFingerprintId(req);
  
  if (!allowPassWhitelist(req)) {
      const { userId, redirectToSignIn } = await auth()
      if (!userId) {
          return redirectToSignIn()
      }
      console.log('User is authorized:', userId)
  }

  // handle root path to default locale permanent redirect
  if (req.nextUrl.pathname === '/') {
    const defaultLocale = appConfig.i18n.defaultLocale;
    return NextResponse.redirect(new URL(`/${defaultLocale}`, req.url), 301);
  }

  // handle trailing slash redirect
  if (req.nextUrl.pathname.length > 1 && req.nextUrl.pathname.endsWith('/')) {
    const newUrl = new URL(req.nextUrl.pathname.slice(0, -1), req.url);
    return NextResponse.redirect(newUrl, 301);
  }

  // 在响应中设置fingerprint ID (如果存在)
  const response = intlMiddleware(req);
  if (fingerprintId && response) {
    response.headers.set(FINGERPRINT_CONSTANTS.HEADER_NAME, fingerprintId);
  }

  return response;
}, { debug: appConfig.clerk.debug }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params, skip api and trpc
    "/((?!api|trpc|_next|sitemap.xml?|robots.txt?|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};