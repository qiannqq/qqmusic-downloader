'use client';

import CookieManager from '../../components/CookieManager';
import { useApp } from '../../components/AppContext';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const { highQuality, setHighQuality, serverCookieStatus } = useApp();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Settings size={24} style={{ marginRight: '8px' }} />
          设置
        </h1>
      </div>

      <CookieManager
        highQuality={highQuality}
        onHighQualityChange={setHighQuality}
        serverCookieStatus={serverCookieStatus}
      />
    </div>
  );
}
