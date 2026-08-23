/**
 * Next.js Configuration Guide for @ffmpeg/ffmpeg in App Router
 * 
 * If running in Next.js, add the following headers to `next.config.mjs` or `next.config.js`
 * to enable SharedArrayBuffer and cross-origin WebAssembly execution with zero server cost:
 * 
 * ```js
 * // next.config.mjs
 * /** @type {import('next').NextConfig} *\/
 * const nextConfig = {
 *   async headers() {
 *     return [
 *       {
 *         source: '/:path*',
 *         headers: [
 *           {
 *             key: 'Cross-Origin-Opener-Policy',
 *             value: 'same-origin',
 *           },
 *           {
 *             key: 'Cross-Origin-Embedder-Policy',
 *             value: 'credentialless', // or 'require-corp'
 *           },
 *         ],
 *       },
 *     ];
 *   },
 * };
 * 
 * export default nextConfig;
 * ```
 */

export const NEXT_JS_CONFIG_TEMPLATE = `
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
`;
