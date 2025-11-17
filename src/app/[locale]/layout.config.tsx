import { i18n } from '@/i18n';
import { appConfig } from '@/lib/appConfig';
import { SiteIcon } from '@/lib/site-config';
import { globalLucideIcons as icons } from '@windrun-huaiin/base-ui/components/server';
import { ClerkUser } from '@windrun-huaiin/third-ui/clerk/server';
import { type LinkItemType } from 'fumadocs-ui/layouts/docs';
import { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getTranslations } from 'next-intl/server';
import { CreditPopover } from '@/components/credit-popover';

type ExtendedLinkItem = LinkItemType & { mobilePinned?: boolean };
// home page normal menu
export async function homeNavLinks(locale: string): Promise<ExtendedLinkItem[]> {
  const t1 = await getTranslations({ locale: locale, namespace: 'linkPreview' });
  return [
    {
      icon: <icons.BugOff />,
      text: t1('blog'),
      url: `/${locale}/blog`,
    },
    {
      icon: <icons.BTC />,
      text: t1('pricing'),
      url: `/${locale}/pricing`,
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

// level special menu
export async function levelNavLinks(locale: string): Promise<ExtendedLinkItem[]> {
  console.log('levelNavLinks TODO: add links here', locale);
  return [];
}

export async function baseOptions(locale: string): Promise<BaseLayoutProps> {
  const t = await getTranslations({ locale: locale, namespace: 'home' });
  return {
    nav: {
      url: `/${locale}`,
      title: (
        <>
          <SiteIcon />
          <span className="font-medium in-[.uwu]:hidden in-[header]:text-[15px]">
            {t('title')}
          </span>
        </>
      ),
      transparentMode: 'none',
    },
    i18n,
    githubUrl: appConfig.github,
  };
}