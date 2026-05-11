'use client';

import { useState } from 'react';
import { api, downloadSong, getProxyImageUrl } from '../lib/api';

export default function SearchResults({ results, onAddToList, songs }) {
  const [adding, setAdding] = useState({});

  const isAdded = (mid) => songs.some(s => s.mid === mid);

  const handleAdd = (song) => {
    if (isAdded(song.mid)) return;
    setAdding(prev => ({ ...prev, [song.mid]: true }));
    onAddToList(song);
    setTimeout(() => {
      setAdding(prev => ({ ...prev, [song.mid]: false }));
    }, 500);
  };

  const handleAddAll = () => {
    results.forEach(song => {
      if (!isAdded(song.mid)) {
        onAddToList(song);
      }
    });
  };

  const handleDownload = async (song) => {
    try {
      downloadSong(song, `${song.name} - ${song.artist}.mp3`);
    } catch (err) {
      alert('下载失败: ' + err.message);
    }
  };

  if (!results || results.length === 0) return null;

  const addedCount = results.filter(s => isAdded(s.mid)).length;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }} >
        <h2>搜索结果 ({results.length})</h2>
        <button 
          className="btn-primary" 
          onClick={handleAddAll}
          disabled={addedCount === results.length}
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          {addedCount === results.length ? '已全部添加' : `添加全部 (${results.length - addedCount})`}
        </button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }} >
        <table className="song-list">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>封面</th>
              <th>歌曲</th>
              <th>歌手</th>
              <th style={{ width: '150px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {results.map(song => (
              <tr key={song.mid}>
                <td>
                  {song.pic ? (
                    <img src={getProxyImageUrl(song.pic)} alt={song.name} style={{ width: '50px', height: '50px', borderRadius: '4px', objectFit: 'cover' }} />
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
                  <div style={{ display: 'flex', gap: '5px' }} >
                    <button 
                      className="btn-success" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDownload(song)}
                    >
                      下载
                    </button>
                    <button 
                      className={isAdded(song.mid) ? 'btn-secondary' : 'btn-primary'} 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleAdd(song)}
                      disabled={isAdded(song.mid) || adding[song.mid]}
                    >
                      {adding[song.mid] ? '添加中...' : isAdded(song.mid) ? '已添加' : '添加'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
