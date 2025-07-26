/* eslint-disable react/no-unescaped-entities */
'use client'

import Image from "next/image"
import { useTranslations } from 'next-intl'
import { globalLucideIcons as icons} from '@windrun-huaiin/base-ui/components/server'
import { GradientButton } from "@windrun-huaiin/third-ui/fuma/mdx"

export function Hero() {
  const t = useTranslations('hero');

  return (
    <section className="container mx-auto px-4 py-12 flex flex-col md:flex-row items-center gap-12">
      <div className="flex-[1.6] space-y-6">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight">
          {t('mainTitle')}<br />{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{t('mainEyesOn')}</span>
        </h1>
        <p className="text-base md:text-2xl leading-tight text-gray-400">
          {t('description')}
        </p>
        <GradientButton
          title={t('button')}
          href="https://preview.reve.art/"
        />
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <icons.Zap className="h-4 w-4" />
          <span>{t('about')}</span>
        </div>
      </div>
      <div className="flex-[1] relative flex justify-center md:justify-end">
        <div className="rounded-lg overflow-hidden shadow-purple-500/20 group">
          <Image
            src={t('heroImageUrl')}
            alt={t('heroImageAlt')}
            width={500}
            height={500}
            priority
            className="rounded-lg transition duration-300 group-hover:scale-105"
          />
        </div>
      </div>
    </section>
  )
}

