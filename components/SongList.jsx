'use client';

import { useState } from 'react';
import { api, downloadSong, getProxyImageUrl } from '../lib/api';

export default function SongList({ songs, onSongsChange, selectedSongs, onSelectionChange }) {
  const [loadingLyric, setLoadingLyric] = useState(null);
  const [lyricData, setLyricData] = useState(null);
  const [showLyric, setShowLyric] = useState(false);

  const toggleSelectAll = () => {
    if (selectedSongs.length === songs.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(songs.map(s => s.mid));
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
      downloadSong(song, `${song.name} - ${song.artist}.mp3`);
    } catch (err) {
      alert('下载失败: ' + err.message);
    }
  };

  if (songs.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p>暂无歌曲，请搜索或导入</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }} >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }} >
            <h2>歌曲列表 ({songs.length})</h2>
            <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => {
              if (confirm('确定清空所有歌曲吗？')) {
                onSongsChange([]);
                onSelectionChange([]);
              }
            }}>清空列表</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} >
            <input
              type="checkbox"
              className="checkbox"
              checked={selectedSongs.length > 0 && selectedSongs.length === songs.length}
              onChange={toggleSelectAll}
            />
            全选 ({selectedSongs.length})
          </label>
        </div>

        <div style={{ overflowX: 'auto' }} >
          <table className="song-list">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '60px' }}>封面</th>
                <th>歌曲</th>
                <th>歌手</th>
                <th style={{ width: '120px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {songs.map(song => (
                <tr key={song.mid}>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedSongs.includes(song.mid)}
                      onChange={() => toggleSelect(song.mid)}
                    />
                  </td>
                  <td>
                    {song.pic ? (
                      <img src={getProxyImageUrl(song.pic)} alt={song.name} />
                    ) : (
                      <div style={{ 
                        width: '50px', 
                        height: '50px', 
                        background: '#e0e0e0', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '12px'
                      }}>
                        无封面
                      </div>
                    )}
                  </td>
                  <td>
                    <div>{song.name}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }} >
                      <a href={song.link} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }} >
                        在 QQ音乐打开
                      </a>
                    </div>
                  </td>
                  <td>{song.artist}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }} >
                      <button 
                        className="btn-success" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDownload(song)}
                      >
                        下载
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleViewLyric(song.mid)}
                        disabled={loadingLyric === song.mid}
                      >
                        {loadingLyric === song.mid ? '加载中...' : '歌词'}
                      </button>
                      <button 
                        className="btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleDelete(song.mid)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showLyric && lyricData && (
        <div className="modal-overlay" onClick={() => setShowLyric(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }} >
            <div className="modal-header">
              <h3>歌词</h3>
              <button className="close-btn" onClick={() => setShowLyric(false)}>&times;</button>
            </div>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordWrap: 'break-word',
              maxHeight: '60vh',
              overflow: 'auto',
              lineHeight: '2',
              fontSize: '14px'
            }}>
              {lyricData.lyric || '暂无歌词'}
            </pre>
            {lyricData.trans && (
              <>
                <hr style={{ margin: '20px 0' }} />
                <h4 style={{ marginBottom: '10px' }}>翻译</h4>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordWrap: 'break-word',
                  maxHeight: '40vh',
                  overflow: 'auto',
                  lineHeight: '2',
                  fontSize: '14px'
                }}>
                  {lyricData.trans}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
