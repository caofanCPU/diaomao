import { getTranslations } from 'next-intl/server'
import { globalLucideIcons as icons} from '@windrun-huaiin/base-ui/components/server'
import { themeHeroEyesOnClass } from '@windrun-huaiin/base-ui/lib'
import { cn } from "@windrun-huaiin/lib"
import { GradientButton } from "@windrun-huaiin/third-ui/fuma/mdx"
import { DelayedImg } from "@windrun-huaiin/third-ui/main"

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'hero' });

  return (
    <section className="mx-auto mt-12 flex max-w-6xl flex-col gap-10 px-6 py-8 md:min-w-[calc(100vw-22rem)] md:px-4 md:flex-row md:items-center md:gap-12">
      <div className="space-y-6 md:w-1/2">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          {t('mainTitle')}<br />{" "}
          <span className={cn("text-transparent bg-clip-text", themeHeroEyesOnClass)}>{t('mainEyesOn')}</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl">
          {t('description')}
        </p>
        <GradientButton
          title={t('button')}
          href="https://newspaper-template.org/"
          align="center"
          className="md:w-full"
        />
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <icons.Zap className="h-4 w-4" />
          <span>{t('about')}</span>
        </div>
      </div>
      <div className="relative flex justify-center md:w-1/2 md:justify-end">
        <div className="w-full max-w-[500px]">
          <div className="group relative aspect-890/569 overflow-hidden rounded-lg shadow-purple-500/20">
            <DelayedImg
              src={t('heroImageUrl')}
              alt={t('heroImageAlt')}
              fill
              preload
              sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 35vw"
              className="rounded-lg object-cover group-hover:scale-105"
              wrapperClassName="h-full w-full"
              placeholderClassName="rounded-lg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
