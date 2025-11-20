// Default: dev 用本地，生产用 Google；可通过 env 显式覆盖。
// - NEXT_USE_LOCAL_FONT=1 -> 强制本地
// - NEXT_USE_LOCAL_FONT=0 -> 强制 Google
// - 未设置 -> dev 本地，production Google
const envFlag = process.env.NEXT_USE_LOCAL_FONT;
const useLocal =
  envFlag === '1' ||
  (envFlag === undefined && process.env.NODE_ENV !== 'production');

// Load only the branch we need so the other loader never runs during build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { montserrat, fontSourceLabel } = useLocal
  ? require('./fonts.local')
  : require('./fonts.google');

// Helpful log to know which font source the runtime resolved to.
console.log('='.repeat(30));
console.log(`[fonts] Using: ${fontSourceLabel}; NEXT_USE_LOCAL_FONT=${process.env.NEXT_USE_LOCAL_FONT ?? 'undefined'}`);
console.log('='.repeat(30));

export { montserrat };
