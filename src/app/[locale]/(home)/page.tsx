'use client';

import { Hero } from "@/components/hero";
import { pricePlanConfig } from "@/lib/price-config";
import { CTA, FAQ, Features, PricePlan, SeoContent, Tips, Usage } from "@windrun-huaiin/third-ui/main";

export default function Home() {
  return (
    <>
      <Hero />
      <Usage />
      <Features />
      <Tips />
      <FAQ />
      <PricePlan pricePlanConfig={pricePlanConfig} currency="￥" />
      <SeoContent />
      <CTA />
    </>
  )
}

