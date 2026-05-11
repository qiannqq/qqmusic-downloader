'use client';

import { useState } from 'react';
import { 
  Play, Pause, Download, Plus, Check, Loader2, 
  Music, ExternalLink, Headphones, ChevronLeft, ChevronRight
} from 'lucide-react';
import { api, downloadSong, getProxyImageUrl } from '../lib/api';

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
      downloadSong(song, `${song.name} - ${song.artist}.mp3`);
      onDownload?.();
    } catch (err) { alert('下载失败: ' + err.message); }
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
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>{song.name}</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>{song.artist}</div>
                <a 
                  href={song.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: 'var(--accent-2)', 
                    fontSize: '0.7rem', 
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  在QQ音乐打开 <ExternalLink size={10} />
                </a>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
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
