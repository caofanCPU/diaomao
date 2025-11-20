import { Montserrat as GoogleMontserrat } from 'next/font/google';

export const fontSourceLabel = 'Google Montserrat (next/font/google)';

// Remote Google font loader used for production/default.
export const montserrat = GoogleMontserrat({
  weight: ['400'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});
