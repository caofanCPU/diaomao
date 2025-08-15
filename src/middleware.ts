import { appConfig } from "@/lib/appConfig";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { handleUserAuth, setAuthHeaders } from "@/lib/auth-utils";
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: appConfig.i18n.locales,
  defaultLocale: appConfig.i18n.defaultLocale,
  localePrefix: "always",
  localeDetection: false
});

// 需要身份认证的路由（页面路由）
const protectedPageRoutes = createRouteMatcher([
  '/(.*)/(dashboard|settings|profile)/(.*)',
  '/(.*)/(subscriptions|billing)/(.*)',
]);

// 需要身份认证的API路由
const protectedApiRoutes = createRouteMatcher([
  // 订阅相关API
  '/api/subscriptions/(.*)',
  // 积分相关API  
  '/api/credits/(.*)',
  // 交易记录API
  '/api/transactions/(.*)',
  // 用户资料API
  '/api/user/profile/(.*)',
  '/api/user/settings/(.*)',
]);

// 免认证的API路由（webhook、匿名用户初始化等）
const publicApiRoutes = createRouteMatcher([
  // Stripe webhook
  '/api/webhook/stripe',
  // Clerk webhook
  '/api/webhook/clerk/user',
  // 匿名用户初始化
  '/api/user/anonymous/init',
  // 健康检查等
  '/api/health',
]);


export default clerkMiddleware(async (auth, req: NextRequest) => {
  // 1. 处理需要认证的页面路由
  if (protectedPageRoutes(req)) {
    const { userId, shouldRedirect, authContext } = await handleUserAuth(auth, req);
    
    if (shouldRedirect) {
      const { redirectToSignIn } = await auth();
      return redirectToSignIn();
    }
    
    if (userId && authContext) {
      const response = intlMiddleware(req);
      if (response) {
        setAuthHeaders(response, authContext);
        console.log('Set user_id for protected page:', userId);
      }
      return response;
    }
  }
  
  // 2. 处理需要认证的API路由
  if (protectedApiRoutes(req)) {
    const { userId, shouldRedirect, authContext } = await handleUserAuth(auth, req);
    
    if (shouldRedirect || !userId) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    if (authContext) {
      const response = NextResponse.next();
      setAuthHeaders(response, authContext);
      console.log('Set user_id for protected API:', userId);
      return response;
    }
  }
  
  // 3. 免认证的API路由，直接通过
  if (publicApiRoutes(req)) {
    console.log('Public API route, no auth required:', req.nextUrl.pathname);
    return NextResponse.next();
  }

  // 4. 其他路由使用默认的国际化中间件处理
  
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

  // 默认处理其他路由（公开页面路由）
  return intlMiddleware(req);
}, { debug: appConfig.clerk.debug }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params, skip api and trpc
    "/((?!api|trpc|_next|sitemap.xml?|robots.txt?|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};