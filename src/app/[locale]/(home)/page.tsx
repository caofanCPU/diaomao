
import { Hero } from "@/components/hero";
import { pricePlanConfig } from "@/lib/price-config";
import { FingerprintStatus } from "@windrun-huaiin/third-ui/fingerprint";
import { CTA, FAQ, Features, PricePlan, SeoContent, Tips, Usage } from "@windrun-huaiin/third-ui/main/server";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const { locale } = await params;
  return (
    <>
      {isDev && <FingerprintStatus />}
      <Hero locale={locale} />
      <Usage locale={locale} />
      <Features locale={locale} />
      <Tips locale={locale} />
      <FAQ locale={locale} />
      <PricePlan locale={locale} pricePlanConfig={pricePlanConfig} currency="￥" />
      <SeoContent locale={locale} />
      <CTA locale={locale} />
    </>
  )
}

