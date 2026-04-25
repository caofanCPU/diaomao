import type { ReactNode } from 'react';
import { getContentSource } from '@/lib/content-source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;
  const legalSource = await getContentSource('legal');
 
  return (
    <DocsLayout sidebar={{enabled: false}} searchToggle={{enabled: false}} tree={legalSource.pageTree[locale]}>
      {children}
    </DocsLayout>
  );
}