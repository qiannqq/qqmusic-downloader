'use client';

import { useState, useEffect } from 'react';

export default function CookieManager() {
  const [cookie, setCookie] = useState('');
  const [saved, setSaved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const savedCookie = localStorage.getItem('qqmusic_cookie');
    if (savedCookie) {
      setCookie(savedCookie);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('qqmusic_cookie', cookie.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('qqmusic_cookie');
    setCookie('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card">
      <h2>Cookie 设置</h2>
      <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }} >
        设置 QQ音乐 Cookie 以获取会员/高品质资源
        <button 
          className="btn-secondary" 
          style={{ marginLeft: '10px', padding: '4px 10px', fontSize: '12px' }}
          onClick={() => setShowHelp(!showHelp)}
        >
          {showHelp ? '隐藏帮助' : '查看帮助'}
        </button>
      </p>
      
      {showHelp && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '6px', 
          marginBottom: '15px',
          fontSize: '13px'
        }}>
          <p><strong>QQ登录常用字段：</strong> uin、psrf_qqopenid、psrf_qqunionid、psrf_qqrefresh_token、qqmusic_key/qm_keyst</p>
          <p style={{ marginTop: '8px' }}><strong>微信登录常用字段：</strong> wxuin、wxopenid、wxunionid、wxrefresh_token、qqmusic_key/qm_keyst</p>
          <p style={{ marginTop: '8px', color: '#666' }}>在浏览器中登录 y.qq.com，按 F12 打开开发者工具，在 Application {'>'} Cookies 中复制 Cookie 字符串</p>
        </div>
      )}
      
      <textarea
        value={cookie}
        onChange={(e) => setCookie(e.target.value)}
        placeholder="粘贴 QQ音乐 Cookie 字符串..."
        style={{ width: '100%', marginBottom: '10px' }}
      />
      
      <div className="actions">
        <button className="btn-primary" onClick={handleSave}>保存 Cookie</button>
        <button className="btn-secondary" onClick={handleClear}>清除 Cookie</button>
      </div>
      
      {saved && <div className="success">操作成功！</div>}
    </div>
  );
}
