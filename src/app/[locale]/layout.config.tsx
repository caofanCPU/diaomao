import Preview from '@/../public/banner.webp';
import { CreditPopover } from '@/components/credit-popover';
import { appConfig, defaultLocale, localePrefixAsNeeded } from '@/lib/appConfig';
import { SiteIcon } from '@/lib/site-config';
import {
  ShieldUserIcon,
  SnippetsIcon
} from '@windrun-huaiin/base-ui/icons';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib';
import { ClerkUser } from '@windrun-huaiin/third-ui/clerk/server';
import {
  HomeTitle,
  createSiteBaseLayoutConfig,
  createSiteNavGroup,
  type CreateSiteNavItemContext,
  type SiteBaseLayoutConfig,
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

function createNavContext(locale: string): CreateSiteNavItemContext {
  return {
    resolveUrl(path: string) {
      return getAsNeededLocalizedUrl(locale, path, localePrefixAsNeeded, defaultLocale);
    },
  };
}

const blogLinks: SiteMenuLeafConfig[] = [
  {
    text: 'Index',
    description: 'Index',
    path: '/blog',
    icon: <ShieldUserIcon />,
    className: 'lg:col-start-2 lg:row-start-1',
  },
  {
    text: 'About Me',
    description: 'About Me',
    path: '/blog/readme',
    icon: <SnippetsIcon />,
    className: 'lg:col-start-2 lg:row-start-2',
  }
];

const levelMenus: SiteMenuGroupConfig[] = [
  {
    text: 'blog',
    path: '/blog',
    landing: {
      text: 'Diaomao Site',
      description: 'Diaomao is great!.',
      path: '/blog',
    },
    items: blogLinks,
  }
];

// 首页普通菜单
export async function homeNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t1 = await getTranslations({ locale: locale, namespace: 'linkPreview' });
  return [
    {
      text: t1('blog'),
      url: getAsNeededLocalizedUrl(locale, '/blog', localePrefixAsNeeded, defaultLocale),
    },
    {
      text: t1('pricing'),
      url: getAsNeededLocalizedUrl(locale, '/pricing', localePrefixAsNeeded, defaultLocale),
    },
    {
      type: 'custom',
      secondary: true,
      mobilePinned: true,
      children: <CreditPopover locale={locale} />,
    },
    {
      type: 'custom',
      // false就先排左边的菜单, true就先排右边的按钮
      secondary: true,
      // true代表在移动端也会出现在主菜单栏上，不会被折叠
      mobilePinned: true,
      children: <ClerkUser locale={locale} clerkAuthInModal={appConfig.style.clerkAuthInModal} showSignUp={true}/>
    },
  ];
}

// 层级特殊菜单
export async function levelNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t1 = await getTranslations({ locale: locale, namespace: 'linkPreview' });
  const context = createNavContext(locale);
  return levelMenus.map((item) =>
    createSiteNavGroup(
      {
        ...item,
        text: t1(item.text as string),
      },
      context,
      {
        featuredBanner: renderMenuBanner(),
      },
    ),
  );
}

export async function baseOptions(locale: string): Promise<SiteBaseLayoutConfig> {
  const t = await getTranslations({ locale: locale, namespace: 'home' });
  return createSiteBaseLayoutConfig({
    homeUrl: getAsNeededLocalizedUrl(locale, '/', localePrefixAsNeeded, defaultLocale),
    title: (
      <>
        <SiteIcon />
        <HomeTitle>
          {t('title')}
        </HomeTitle>
      </>
    ),
    transparentMode: 'none',
  });
}
