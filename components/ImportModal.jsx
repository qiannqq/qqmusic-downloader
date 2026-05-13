'use client';

import { useState } from 'react';
import { api } from '../lib/api';

export default function ImportModal({ onImport, onClose }) {
  const [activeTab, setActiveTab] = useState('playlist');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!url.trim()) {
      setError('请输入链接');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trimmedUrl = url.trim();
      
      if (activeTab === 'playlist') {
        // 支持多种歌单链接格式
        // 格式1: playlist/1234567890 或 playlist/1234567890.html
        // 格式2: ?id=1234567890 或 &id=1234567890
        // 格式3: 纯数字ID
        let playlistId = null;
        
        let match = trimmedUrl.match(/playlist\/(\d+)/);
        if (match) {
          playlistId = match[1];
        }
        
        if (!playlistId) {
          match = trimmedUrl.match(/[?&]id=(\d+)/);
          if (match) {
            playlistId = match[1];
          }
        }
        
        if (!playlistId && /^\d+$/.test(trimmedUrl)) {
          playlistId = trimmedUrl;
        }
        
        if (!playlistId) {
          // 尝试调用parse-url API
          const parseRes = await api.parseUrl(trimmedUrl);
          if (parseRes.data.type !== 'playlist') {
            throw new Error('无法识别的歌单链接');
          }
          playlistId = parseRes.data.id;
        }
        
        const res = await api.getPlaylist(playlistId);
        onImport(res.data.list || [], `歌单: ${res.data.name || ''}`);
        
      } else if (activeTab === 'song') {
        let songId = null;
        
        let match = trimmedUrl.match(/song\/(\w+)/);
        if (match) {
          songId = match[1];
        }
        
        if (!songId) {
          const parseRes = await api.parseUrl(trimmedUrl);
          if (parseRes.data.type !== 'song') {
            throw new Error('无法识别的单曲链接');
          }
          songId = parseRes.data.id;
        }
        
        const res = await api.getSongDetail(songId);
        onImport([res.data], `单曲: ${res.data.name || ''}`);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导入歌曲</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlist')}
          >
            歌单导入
          </button>
          <button 
            className={`tab ${activeTab === 'song' ? 'active' : ''}`}
            onClick={() => setActiveTab('song')}
          >
            单曲导入
          </button>
        </div>

        {activeTab === 'playlist' && (
          <div>
            <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }} >
              支持 QQ音乐歌单链接，例如：https://y.qq.com/n/ryqq/playlist/1234567890
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴歌单链接..."
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </div>
        )}

        {activeTab === 'song' && (
          <div>
            <p style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }} >
              支持 QQ音乐单曲链接，例如：https://y.qq.com/n/ryqq/song/001QJyJ32zyNEN
            </p>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴单曲链接..."
              style={{ width: '100%', marginBottom: '10px' }}
            />
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button 
          className="btn-primary" 
          onClick={handleImport}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? '导入中...' : '导入'}
        </button>
      </div>
    </div>
  );
}
