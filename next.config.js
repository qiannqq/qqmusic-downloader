/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true
  },
  allowedDevOrigins: ['127.0.0.1'],
  // Cloud Functions 静态导出配置
  output: 'export',
  trailingSlash: true,
  distDir: 'dist'
};

export default nextConfig;
