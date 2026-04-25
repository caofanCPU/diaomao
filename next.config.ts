import createNextIntlPlugin from 'next-intl/plugin';
import { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Monorepo development config
  transpilePackages: [
    '@windrun-huaiin/base-ui',
    '@windrun-huaiin/third-ui',
    '@windrun-huaiin/lib',
    '@windrun-huaiin/fumadocs-local-md',
  ],
  // mdx config
  reactStrictMode: true,

  images: {
    unoptimized: true,
    // allow remote image host
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'favicon.im',
      }
    ],
    // allow remote svg image
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Ensuring outputFileTracingIncludes is a top-level property
  outputFileTracingIncludes: {
    // Ensure MDX files for the llm-content API route are included in the serverless function
    // Adjust the key if your API route path is different in the output structure
    '/api/blog/llm-content': ['./src/mdx/blog/**/*'],  
    '/api/legal/llm-content': ['./src/mdx/legal/**/*'],
    '/[locale]/blog/[[...slug]]': ['./src/mdx/blog/**/*'],
    '/[locale]/legal/[[...slug]]': ['./src/mdx/legal/**/*'],
    '/[locale]/(content)/blog/[[...slug]]': ['./src/mdx/blog/**/*'],
    '/[locale]/(home)/legal/[[...slug]]': ['./src/mdx/legal/**/*'],
  }
};

export default withNextIntl(nextConfig);
