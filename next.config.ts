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
  // Ensure MDX files for the llm-content API route are included in the serverless function
  // Adjust the key if your API route path is different in the output structure
  outputFileTracingIncludes: {
    '/api/blog/llm-content': ['./src/mdx/blog/**/*', './src/mdx/**/*'],
    '/api/legal/llm-content': ['./src/mdx/legal/**/*', './src/mdx/**/*'],

    '/blog': ['./src/mdx/blog/**/*', './src/mdx/**/*'],
    '/blog/[[...slug]]': ['./src/mdx/blog/**/*', './src/mdx/**/*'],
    '/[locale]/blog': ['./src/mdx/blog/**/*', './src/mdx/**/*'],
    '/[locale]/blog/[[...slug]]': ['./src/mdx/blog/**/*', './src/mdx/**/*'],

    '/legal': ['./src/mdx/legal/**/*', './src/mdx/**/*'],
    '/legal/[[...slug]]': ['./src/mdx/legal/**/*', './src/mdx/**/*'],
    '/[locale]/legal': ['./src/mdx/legal/**/*', './src/mdx/**/*'],
    '/[locale]/legal/[[...slug]]': ['./src/mdx/legal/**/*', './src/mdx/**/*'],
  }
};

export default withNextIntl(nextConfig);
