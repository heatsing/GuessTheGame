/** @type {import('next').NextConfig} */
const nextConfig = {
  // `output: 'export'` is temporarily disabled due to a Windows-only bug
  // where the `_not-found` chunk copyfile fails with ENOENT during export.
  // Re-enable in Linux CI or when the bug is fixed.
  // See: https://github.com/vercel/next.js/issues/68993
  // output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
