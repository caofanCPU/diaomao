
import { Hero } from "@/components/hero";
import { FingerprintStatus } from "@windrun-huaiin/third-ui/fingerprint";
import { CTA, FAQ, Features, MoneyPrice, SeoContent, Tips, Usage } from "@windrun-huaiin/third-ui/main/server";
import { moneyPriceConfig } from '@/lib/money-price-config';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true'
  const { locale } = await params;
  
  return (
    <>
      { (forceShow || isDev) && <FingerprintStatus />}
      <Hero locale={locale} />
      <Usage locale={locale} />
      <Features locale={locale} />
      <Tips locale={locale} />
      <FAQ locale={locale} />
      <MoneyPrice locale={locale} config={moneyPriceConfig} upgradeApiEndpoint="/api/subscriptions/create"/>
      <SeoContent locale={locale} />
      <CTA locale={locale} />
    </>
  )
}

