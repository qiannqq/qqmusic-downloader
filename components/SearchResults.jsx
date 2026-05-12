'use client';

import { useState } from 'react';
import { 
  Play, Pause, Download, Plus, Check, Loader2, 
  Music, ExternalLink, Headphones, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api, downloadSong, getProxyImageUrl } from '../lib/api';

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showDownloadError(message, song) {
  const url = song.link || `https://y.qq.com/n/yqq/song/${song.mid}.html`;
  const msg = `下载遇到问题：${message}\n\n可能原因：\n1. 文件过大（云函数限制 6MB）\n2. 当前 Cookie 已过期\n3. 该歌曲需要 VIP 权限\n\n您可以尝试：\n• 刷新页面后重试\n• 更新 Cookie 设置\n• 在 QQ 音乐网页版打开下载`;
  
  if (confirm(msg)) {
    window.open(url, '_blank');
  }
}

export default function SearchResults({ results, onAddToList, songs, onDownload, onPlay, searchKeyword, currentPage, onPageChange, loading }) {
  const [adding, setAdding] = useState({});
  const [previewing, setPreviewing] = useState(null);

  const isAdded = (mid) => songs.some(s => s.mid === mid);

  const handleAdd = (song) => {
    if (isAdded(song.mid)) return;
    setAdding(prev => ({ ...prev, [song.mid]: true }));
    onAddToList(song);
    setTimeout(() => setAdding(prev => ({ ...prev, [song.mid]: false })), 500);
  };

  const handleAddAll = () => {
    results.forEach(song => { if (!isAdded(song.mid)) onAddToList(song); });
  };

  const handleDownload = async (song) => {
    try {
      const { url } = await downloadSong(song, `${song.name} - ${song.artist}.mp3`);
      if (url) {
        triggerDownload(url, `${song.name} - ${song.artist}.mp3`);
      }
      onDownload?.();
    } catch (err) {
      showDownloadError(err.message, song);
    }
  };

  const handlePreview = async (song) => {
    if (previewing === song.mid) return;
    setPreviewing(song.mid);
    try {
      // 传入完整 song 对象，让后端获取 raw 数据来计算 vkey
      const res = await api.getSongUrl(song.mid, true, song); 
      if (res.data?.url) {
        onPlay?.({ ...song, url: res.data.url });
      } else {
        alert('无法获取试听链接，可能需要登录');
      }
    } catch (err) {
      alert('试听失败: ' + err.message);
    } finally {
      setPreviewing(null);
    }
  };

  if (!results || results.length === 0) return null;

  const addedCount = results.filter(s => isAdded(s.mid)).length;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">
          <Music size={20} style={{ marginRight: '8px' }} />
          搜索结果
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="section-count">{results.length}</div>
          <button 
            className="btn-brutal"
            onClick={handleAddAll}
            disabled={addedCount === results.length}
          >
            <Plus size={14} />
            {addedCount === results.length ? ' 已添加' : ` 全部 (${results.length - addedCount})`}
          </button>
        </div>
      </div>

      <div className="results-grid">
        {results.map((song) => (
          <div key={song.mid} className="result-cell">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {song.pic ? (
                <img 
                  src={getProxyImageUrl(song.pic)} 
                  alt={song.name}
                  style={{ 
                    width: '64px', 
                    height: '64px', 
                    objectFit: 'cover',
                    border: '2px solid var(--border)'
                  }}
                />
              ) : (
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  border: '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-elevated)'
                }}
              >
                <Music size={24} color="var(--fg-muted)" />
                </div>
              )}
              
              <div className="result-info">
                <div className="result-name">{song.name}</div>
                <div className="result-artist">{song.artist}</div>
                <a 
                  href={song.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="result-link"
                >
                  <ExternalLink size={10} />
                  <span className="result-link-text">QQ音乐</span>
                </a>
              </div>
            </div>
            
            <div className="result-actions">
              <button 
                className="btn-play"
                onClick={() => handlePreview(song)}
                disabled={previewing === song.mid}
                title="试听"
              >
                {previewing === song.mid ? <Loader2 size={16} className="spin" /> : <Headphones size={16} />}
              </button>
              
              <button 
                className="btn-brutal accent-2"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                onClick={() => handleDownload(song)}
              >
                <Download size={14} /> 下载
              </button>
              <button 
                className={isAdded(song.mid) ? 'btn-brutal' : 'btn-brutal accent-3'}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                onClick={() => handleAdd(song)}
                disabled={isAdded(song.mid) || adding[song.mid]}
              >
                {adding[song.mid] ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                {adding[song.mid] ? ' 添加中' : isAdded(song.mid) ? ' 已添加' : ' 添加'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {searchKeyword && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '16px',
          marginTop: '32px',
          marginBottom: '16px'
        }}>
          <button
            className="btn-brutal"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={loading || currentPage <= 1}
            style={{ 
              minWidth: '120px',
              justifyContent: 'center',
              padding: '12px 20px'
            }}
          >
            <ChevronLeft size={16} style={{ marginRight: '6px' }} />
            上一页
          </button>

          <span style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            minWidth: '60px',
            textAlign: 'center',
            letterSpacing: '1px'
          }}>
            第 {currentPage} 页
          </span>

          <button
            className="btn-brutal"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={loading}
            style={{ 
              minWidth: '120px',
              justifyContent: 'center',
              padding: '12px 20px'
            }}
          >
            {loading ? (
              <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} />
            ) : (
              <ChevronRight size={16} style={{ marginRight: '6px' }} />
            )}
            {loading ? '加载中...' : '下一页'}
          </button>
        </div>
      )}
    </div>
  );
}
