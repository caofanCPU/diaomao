/* eslint-disable @typescript-eslint/no-explicit-any */

import { type NextRequest, NextResponse } from 'next/server';

import { appConfig } from '@/lib/appConfig';
import { LLMCopyHandler } from '@windrun-huaiin/third-ui/fuma/server';
import { blogSource } from '@/lib/source-blog';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') ?? appConfig.i18n.defaultLocale;
  const requestedPath = searchParams.get('path');

  if (!requestedPath) {
    console.error('API llm-content: Missing path query parameter');
    return new NextResponse('Missing path query parameter', { status: 400 });
  }

  const result = await LLMCopyHandler({
    sourceDir: appConfig.mdxSourceDir['blog'],
    dataSource: blogSource,
    requestedPath,
    locale,
  });

  if (result.error) {
    console.error(`API llm-content: ${result.error}`);
    return new NextResponse(result.error, { status: result.status });
  }
  return new NextResponse(result.text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}