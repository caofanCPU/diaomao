/* eslint-disable @typescript-eslint/no-explicit-any */

import { type NextRequest, NextResponse } from 'next/server';

import { legalSource } from '@/lib/source-legal';
import { appConfig } from '@/lib/appConfig';
import { LLMCopyHandler } from '@windrun-huaiin/third-ui/fuma/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') ?? appConfig.i18n.defaultLocale;
  const requestedPath = searchParams.get('path') || '';
  
  const result = await LLMCopyHandler({
    sourceDir: appConfig.mdxSourceDir.legal,
    dataSource: legalSource,
    requestedPath,
    locale,
  });

  if (result.error) {
    console.error(`API llm-content: ${result.error}`);
    return new NextResponse(result.error, { status: result.status });
  }
  return new NextResponse(result.text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}