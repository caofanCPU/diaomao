import localFont from 'next/font/local';

export const fontSourceLabel = 'local Montserrat (montserrat-fonts/Montserrat-Regular.otf)';

// Local font loader used for offline/dev builds.
export const montserrat = localFont({
  src: [
    { path: '../../../montserrat-fonts/Montserrat-Regular.otf', weight: '400', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});
