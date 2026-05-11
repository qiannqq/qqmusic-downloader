'use client';

import { useState } from 'react';
import { api } from '../lib/api';

export default function SearchBar({ onSearch, onImport, onLoading }) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const isPlaylistUrl = (url) => {
    return /playlist\/(\d+)/.test(url) || /y\.qq\.com.*playlist/.test(url);
  };

  const isSongUrl = (url) => {
    return /song\/(\w+)/.test(url) || /y\.qq\.com.*song/.test(url);
  };

  const extractPlaylistId = (url) => {
    const match = url.match(/playlist\/(\d+)/);
    return match ? match[1] : null;
  };

  const extractSongId = (url) => {
    const match = url.match(/song\/(\w+)/);
    return match ? match[1] : null;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    
    const input = keyword.trim();
    
    setLoading(true);
    onLoading?.(true);
    
    try {
      if (isPlaylistUrl(input)) {
        // 导入歌单
        const id = extractPlaylistId(input);
        if (!id) {
          alert('无法识别的歌单链接格式');
          return;
        }
        
        const res = await api.getPlaylist(id);
        if (res.data?.list?.length > 0) {
          onImport?.(res.data.list, `歌单: ${res.data.name || ''}`);
          onSearch?.([]);
        } else {
          alert('歌单为空或获取失败');
        }
      } else if (isSongUrl(input)) {
        // 导入单曲
        const id = extractSongId(input);
        if (!id) {
          alert('无法识别的歌曲链接格式');
          return;
        }
        
        const res = await api.getSongDetail(id);
        if (res.data) {
          onImport?.([res.data], `单曲: ${res.data.name || ''}`);
          onSearch?.([]);
        } else {
          alert('歌曲不存在');
        }
      } else {
        // 正常搜索
        const res = await api.search(input);
        onSearch?.(res.data || []);
      }
    } catch (error) {
      alert('操作失败: ' + error.message);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <div className="card">
      <h2>搜索 / 导入</h2>
      <form onSubmit={handleSearch} className="input-group">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="输入歌曲名、歌手、专辑，或粘贴 QQ音乐歌曲/歌单链接..."
          disabled={loading}
          style={{ width: '100%' }}
        />
        <button 
          type="submit" 
          className="btn-primary"
          disabled={loading}
        >
          {loading ? '处理中...' : '搜索 / 导入'}
        </button>
      </form>
      <p style={{ marginTop: '8px', fontSize: '12px', color: '#999' }} >
        支持：关键词搜索 | 歌曲链接导入 | 歌单链接导入
      </p>
    </div>
  );
}
