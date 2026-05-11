import './globals.css';

export const metadata = {
  title: 'QQ音乐下载器',
  description: '支持高音质下载、批量下载、多种导入模式',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
