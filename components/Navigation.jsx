'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ListMusic, Settings, Info, Music } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/search', label: '搜索', icon: Search },
  { href: '/playlist', label: '歌单', icon: ListMusic },
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/about', label: '关于', icon: Info },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="nav-bar">
      <div className="nav-logo">
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={20} />
          <span>MUSIC</span>
        </Link>
      </div>
      
      <div className="nav-links">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
