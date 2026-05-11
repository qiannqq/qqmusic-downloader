'use client';

import { useState } from 'react';
import { api, downloadSong } from '../lib/api';

export default function BatchDownloader({ songs, selectedSongs, onComplete }) {
  const [highQuality, setHighQuality] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const selectedSongList = songs.filter(s => selectedSongs.includes(s.mid));

  const handleBatchDownload = async () => {
    if (selectedSongList.length === 0) {
      alert('请先选择要下载的歌曲');
      return;
    }

    setLoading(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    try {
      const res = await api.getBatchUrls(selectedSongList, highQuality);
      const urls = res.data;
      
      let successCount = 0;
      const downloadResults = [];

      for (let i = 0; i < urls.length; i++) {
        const item = urls[i];
        setProgress(Math.round(((i + 1) / urls.length) * 100));

        if (item.url) {
          try {
            // 使用完整的歌曲对象下载
            downloadSong(item, `${item.name} - ${item.artist}.mp3`);
            
            successCount++;
            downloadResults.push({ ...item, status: 'success' });
            
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            downloadResults.push({ ...item, status: 'error', error: err.message });
          }
        } else {
          downloadResults.push({ ...item, status: 'failed', error: '无法获取下载链接' });
        }
      }

      setResults(downloadResults);
      setShowResults(true);
      
      if (successCount > 0) {
        alert(`成功下载 ${successCount}/${selectedSongList.length} 首歌曲`);
      } else {
        alert('下载失败，请检查 Cookie 设置或选择其他歌曲');
      }
    } catch (err) {
      alert('批量下载失败: ' + err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="card">
        <h2>批量下载</h2>
        
        <div style={{ marginBottom: '15px' }} >
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} >
            <input
              type="checkbox"
              checked={highQuality}
              onChange={(e) => setHighQuality(e.target.checked)}
              disabled={loading}
            />
            <span>优先下载高品质 (320kbps)</span>
            {highQuality && <span className="quality-badge quality-hq">HQ</span>}
          </label>
        </div>

        <div className="actions">
          <button 
            className="btn-primary" 
            onClick={handleBatchDownload}
            disabled={loading || selectedSongList.length === 0}
          >
            {loading ? `下载中... (${progress}%)` : `批量下载 (${selectedSongList.length})`}
          </button>
          
          <button 
            className="btn-secondary" 
            onClick={() => setShowResults(!showResults)}
            disabled={results.length === 0}
          >
            {showResults ? '隐藏结果' : '查看结果'}
          </button>
        </div>

        {loading && (
          <div style={{ marginTop: '15px' }} >
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }} >
              {progress}%
            </p>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="card">
          <h2>下载结果</h2>
          <div style={{ maxHeight: '400px', overflow: 'auto' }} >
            <table className="song-list">
              <thead>
                <tr>
                  <th>歌曲</th>
                  <th>歌手</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.artist}</td>
                    <td>
                      {item.status === 'success' && (
                        <span style={{ color: '#28a745', fontWeight: 600 }}>成功</span>
                      )}
                      {item.status === 'failed' && (
                        <span style={{ color: '#dc3545', fontWeight: 600 }}>失败</span>
                      )}
                      {item.status === 'error' && (
                        <span style={{ color: '#ffc107', fontWeight: 600 }}>错误</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
