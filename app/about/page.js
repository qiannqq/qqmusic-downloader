import { Music, Github, ExternalLink, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Music size={24} style={{ marginRight: '8px' }} />
          关于
        </h1>
      </div>

      <div className="about-card">
        <div className="about-logo">QQ音乐下载器</div>
        <p className="about-desc">
          一个简洁高效的 QQ 音乐下载工具，支持搜索、试听、批量下载等功能。
        </p>

        <div className="about-features">
          <h3>功能特性</h3>
          <ul>
            <li>支持歌曲、歌手、专辑搜索</li>
            <li>支持高品质音乐下载 (320kbps)</li>
            <li>支持批量下载</li>
            <li>支持歌单/单曲链接导入</li>
            <li>支持在线试听</li>
            <li>支持歌词查看</li>
          </ul>
        </div>

        <div className="about-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Heart size={14} color="var(--accent)" />
            <span>开源项目，仅供学习交流使用</span>
          </div>
          <div className="about-version">版本 1.0.0</div>
        </div>
      </div>
    </div>
  );
}
