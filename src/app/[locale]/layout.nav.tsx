import Preview from '@/../public/banner.webp';
import { defaultLocale, localePrefixAsNeeded } from '@/lib/appConfig';
import {
  HighlighterIcon,
  MmdIcon,
  ShieldUserIcon,
  SnippetsIcon
} from '@windrun-huaiin/base-ui/icons';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib/utils';
import {
  createLocalizedNavContext,
  createLocalizedNavGroup,
  createLocalizedNavLink,
  type SiteMenuGroupConfig,
  type SiteMenuLeafConfig,
  type SiteNavItemConfig,
} from '@windrun-huaiin/third-ui/fuma/base';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';

function renderMenuBanner() {
  return (
    <div className="-mx-3 -mt-3">
      <Image
        src={Preview}
        alt="Preview"
        className="rounded-t-lg object-cover"
        style={{
          maskImage: 'linear-gradient(to bottom,white 60%,transparent)',
        }}
      />
    </div>
  );
}

function createNavContext(locale: string) {
  return createLocalizedNavContext({
    locale,
    localePrefixAsNeeded,
    defaultLocale,
    localizeHref: getAsNeededLocalizedUrl,
  });
}

export async function primaryNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t1 = await getTranslations({ locale, namespace: 'linkPreview' });
  const context = createNavContext(locale);

  return [
    createLocalizedNavLink(
      {
        text: t1('pricing'),
        path: '/pricing',
        prefetch: false,
      },
      context,
    ),
  ];
}

export async function levelNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t2 = await getTranslations({ locale, namespace: 'linkPreview' });
  const context = createNavContext(locale);

  const blogsLinks: SiteMenuLeafConfig[] = [
    {
      text: 'async-architecture',
      description: 'async-architecture',
      path: '/blog/async-architecture',
      prefetch: false,
      icon: <ShieldUserIcon />,
      className: 'lg:col-start-2 lg:row-start-1',
    },
    {
      text: 'Blog List',
      description: 'MDX Snippets',
      path: '/blog',
      prefetch: false,
      icon: <SnippetsIcon />,
      className: 'lg:col-start-2 lg:row-start-2',
    },
    {
      text: 'IOC',
      description: 'IOC',
      path: '/blog/ioc',
      prefetch: false,
      icon: <HighlighterIcon />,
      className: 'lg:col-start-3 lg:row-start-1',
    },
    {
      text: 'Readme',
      description: 'Who am I?',
      path: '/blog/readme',
      prefetch: false,
      icon: <MmdIcon />,
      className: 'lg:col-start-3 lg:row-start-2',
    },
  ];
  
  const levelMenus: SiteMenuGroupConfig[] = [
    {
      text: t2('blog'),
      path: '/blog',
      prefetch: false,
      landing: {
        text: 'I like Diaomao',
        description: 'Docs Driven as a Service.',
        path: '/blog/readme',
        prefetch: false,
      },
      items: blogsLinks,
    },
  ];

  return levelMenus.map((item) =>
    createLocalizedNavGroup(
      {
        ...item,
        text: item.text as string,
      },
      context,
      {
        featuredBanner: renderMenuBanner(),
      },
    ),
  );
}
