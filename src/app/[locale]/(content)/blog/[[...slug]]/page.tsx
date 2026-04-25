import { getMDXComponents } from '@/components/mdx-components';
import { appConfig } from '@/lib/appConfig';
import { NotFoundPage } from '@windrun-huaiin/base-ui/components';
import { getContentSource } from '@/lib/content-source';
import { createFumaPage } from '@windrun-huaiin/third-ui/fuma/server';
import { SiteIcon } from '@/lib/site-config';
import { LLMCopyButton } from '@windrun-huaiin/third-ui/fuma/mdx';

const sourceKey = 'blog';
const { Page, generateStaticParams, generateMetadata } = createFumaPage({
  sourceKey: sourceKey,
  mdxContentSource: () => getContentSource('blog'),
  getMDXComponents,
  mdxSourceDir: appConfig.mdxSourceDir[sourceKey],
  githubBaseUrl: appConfig.githubBaseUrl,
  copyButtonComponent: <LLMCopyButton />,
  siteIcon: <SiteIcon />,
  FallbackPage: NotFoundPage,
  showBreadcrumb: false,
  showTableOfContent: true,
  showTableOfContentPopover: false,
  tocRenderMode: 'portable-clerk'
});

export default async function BlogPage(props: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale, slug } = await props.params;
  console.log('[blog page] entered', { locale, slug });
  return <Page {...props} />;
}
export { generateStaticParams, generateMetadata };