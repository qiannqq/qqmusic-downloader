'use client';

import { useState } from 'react';
import { 
  Play, Pause, Download, Plus, Check, Loader2, 
  Music, FileText, Trash2, X, Headphones, Zap
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

export default function SongList({ songs, onSongsChange, selectedSongs, onSelectionChange, onDownload, onPlay, highQuality }) {
  const [loadingLyric, setLoadingLyric] = useState(null);
  const [lyricData, setLyricData] = useState(null);
  const [showLyric, setShowLyric] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const toggleSelectAll = () => {
    if (selectedSongs.length === songs.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(songs.map(s => s.mid));
    }
  };

  const toggleInvertSelection = () => {
    const allMids = songs.map(s => s.mid);
    const inverted = allMids.filter(mid => !selectedSongs.includes(mid));
    onSelectionChange(inverted);
  };

  const handleBatchDelete = () => {
    if (confirm(`确定删除选中的 ${selectedSongs.length} 首歌曲吗？`)) {
      onSongsChange(songs.filter(s => !selectedSongs.includes(s.mid)));
      onSelectionChange([]);
    }
  };

  const toggleSelect = (mid) => {
    if (selectedSongs.includes(mid)) {
      onSelectionChange(selectedSongs.filter(id => id !== mid));
    } else {
      onSelectionChange([...selectedSongs, mid]);
    }
  };

  const handleDelete = (mid) => {
    onSongsChange(songs.filter(s => s.mid !== mid));
    onSelectionChange(selectedSongs.filter(id => id !== mid));
  };

  const handleViewLyric = async (mid) => {
    setLoadingLyric(mid);
    try {
      const res = await api.getLyric(mid);
      setLyricData(res.data);
      setShowLyric(true);
    } catch (err) {
      alert('获取歌词失败: ' + err.message);
    } finally {
      setLoadingLyric(null);
    }
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

  const handleBatchDownload = async () => {
    const selectedSongList = songs.filter(s => selectedSongs.includes(s.mid));
    if (selectedSongList.length === 0) {
      alert('请先选择要下载的歌曲（在歌曲列表中勾选）');
      return;
    }

    setBatchLoading(true);
    setBatchProgress(0);

    try {
      const res = await api.getBatchUrls(selectedSongList, highQuality);
      const urls = res.data;
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < urls.length; i++) {
        const item = urls[i];
        setBatchProgress(Math.round(((i + 1) / urls.length) * 100));

        if (item.url) {
          try {
            triggerDownload(item.url, `${item.name} - ${item.artist}.mp3`);
            successCount++;
            onDownload?.();
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (err) {
            console.error('下载失败:', err);
            failCount++;
          }
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount > 0) {
          alert(`成功下载 ${successCount} 首，${failCount} 首失败\n\n失败原因可能是：\n• 文件过大（云函数限制 6MB）\n• Cookie 过期或需要 VIP`);
        } else {
          alert(`成功下载 ${successCount} 首歌曲`);
        }
      } else {
        alert('下载失败，请检查 Cookie 设置或选择其他歌曲\n\n可能原因：\n• 文件过大（云函数限制 6MB）\n• Cookie 已过期\n• 所选歌曲需要 VIP 权限');
      }
    } catch (err) {
      alert('批量下载失败: ' + err.message);
    } finally {
      setBatchLoading(false);
      setBatchProgress(0);
    }
  };

  if (songs.length === 0) {
    return (
      <div className="empty-brutal">
        <div className="empty-brutal-icon">
          <Music size={48} color="var(--fg-muted)" />
        </div>
        <div className="empty-brutal-title">暂无歌曲</div>
        <div className="empty-brutal-desc">搜索或导入歌曲到列表中</div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'none', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            className="checkbox-brutal"
            checked={selectedSongs.length > 0 && selectedSongs.length === songs.length}
            onChange={toggleSelectAll}
          />
          <span style={{ color: 'var(--fg-muted)' }}>全选 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>({selectedSongs.length})</span></span>
        </label>
        
        <button 
          className="btn-brutal"
          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          onClick={() => {
            if (confirm('确定清空所有歌曲吗？')) {
              onSongsChange([]);
              onSelectionChange([]);
            }
          }}
        >
          <Trash2 size={14} /> 清空
        </button>
      </div>

      <div>
        {songs.map((song) => (
          <div key={song.mid} className="song-list-item">
            <input
              type="checkbox"
              className="checkbox-brutal"
              checked={selectedSongs.includes(song.mid)}
              onChange={() => toggleSelect(song.mid)}
            />
            
            {song.pic ? (
              <img 
                src={getProxyImageUrl(song.pic)} 
                alt={song.name} 
                className="song-list-cover"
              />
            ) : (
              <div style={{ 
                width: '48px', 
                height: '48px', 
                border: '2px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-elevated)',
                flexShrink: 0
              }}>
                <Music size={20} color="var(--fg-muted)" />
              </div>
            )}
            
            <div className="song-list-info">
              <div className="song-list-name">{song.name}</div>
              <div className="song-list-artist">{song.artist}</div>
            </div>
            
            <div className="song-list-actions">
              <button 
                className="btn-play"
                style={{ width: '36px', height: '36px' }}
                onClick={() => handlePreview(song)}
                disabled={previewing === song.mid}
                title="试听"
              >
                {previewing === song.mid ? <Loader2 size={16} className="spin" /> : <Headphones size={16} />}
              </button>
              <button 
                className="btn-brutal accent-2"
                style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                onClick={() => handleDownload(song)}
                title="下载"
              >
                <Download size={14} />
              </button>
              <button 
                className="btn-brutal"
                style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                onClick={() => handleViewLyric(song.mid)}
                disabled={loadingLyric === song.mid}
                title="歌词"
              >
                {loadingLyric === song.mid ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
              </button>
              <button 
                className="btn-brutal"
                style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                onClick={() => handleDelete(song.mid)}
                title="删除"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Batch Download FAB */}
      {selectedSongs.length > 0 && (
        <div className="song-list-batch-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <span style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
              已选择 <strong style={{ color: 'var(--accent)' }}>{selectedSongs.length}</strong> 首
            </span>
            {highQuality && <span className="badge-brutal hq">HQ</span>}
          </div>
          
          <button 
            className="btn-brutal"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            onClick={toggleInvertSelection}
            disabled={batchLoading}
            title="反选"
          >
            反选
          </button>
          <button 
            className="btn-brutal"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            onClick={handleBatchDelete}
            disabled={batchLoading}
            title="删除"
          >
            <Trash2 size={14} /> 删除
          </button>
          <button 
            className="btn-brutal"
            onClick={handleBatchDownload}
            disabled={batchLoading}
          >
            {batchLoading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
            {batchLoading ? ` 下载中 ${batchProgress}%` : ' 批量下载'}
          </button>
        </div>
      )}

      {batchLoading && (
        <div className="batch-progress" style={{ marginTop: '16px' }}>
          <div className="batch-progress-fill" style={{ width: `${batchProgress}%` }} />
        </div>
      )}

      {/* Lyrics Modal */}
      {showLyric && lyricData && (
        <div className="modal-overlay-brutal" onClick={() => setShowLyric(false)}>
          <div className="modal-brutal" onClick={e => e.stopPropagation()}>
            <div className="modal-brutal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} /> 歌词
              </h3>
              <button className="modal-close" onClick={() => setShowLyric(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-brutal-body">
              <div className="lyrics-brutal">{lyricData.lyric || '暂无歌词'}</div>
              
              {lyricData.trans && (
                <>
                  <div style={{ margin: '24px 0', height: '2px', background: 'var(--accent-2)' }} />
                  <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--accent-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} /> 翻译
                  </h4>
                  <div className="lyrics-brutal">{lyricData.trans}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
