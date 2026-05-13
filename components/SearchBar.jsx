'use client';

import { useState } from 'react';
import { api } from '../lib/api';

export default function SearchBar({ onSearch, onImport, onLoading }) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const isPlaylistUrl = (url) => {
    return /playlist\/(\d+)/.test(url) || 
           /y\.qq\.com.*playlist/.test(url) ||
           /[?&]id=\d+/.test(url) ||
           /^\d+$/.test(url.trim());
  };
  
  const isSongUrl = (url) => {
    return /song\/(\w+)/.test(url) || /y\.qq\.com.*song/.test(url);
  };
  
  const extractPlaylistId = (url) => {
    // 格式1: playlist/1234567890 或 playlist/1234567890.html
    let m = url.match(/playlist\/(\d+)/);
    if (m) return m[1];
    
    // 格式2: ?id=1234567890 或 &id=1234567890
    m = url.match(/[?&]id=(\d+)/);
    if (m) return m[1];
    
    // 格式3: 纯数字
    if (/^\d+$/.test(url.trim())) return url.trim();
    
    return null;
  };
  
  const extractSongId = (url) => {
    const m = url.match(/song\/(\w+)/);
    return m ? m[1] : null;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const input = keyword.trim();
    
    setLoading(true);
    onLoading?.(true);
    
    try {
      if (isPlaylistUrl(input)) {
        const id = extractPlaylistId(input);
        if (!id) { alert('无法识别的歌单链接格式'); return; }
        const res = await api.getPlaylist(id);
        if (res.data?.list?.length > 0) {
          onImport?.(res.data.list, `歌单: ${res.data.name || ''}`);
          onSearch?.([]);
        } else { alert('歌单为空或获取失败'); }
      } else if (isSongUrl(input)) {
        const id = extractSongId(input);
        if (!id) { alert('无法识别的歌曲链接格式'); return; }
        const res = await api.getSongDetail(id);
        if (res.data) {
          onImport?.([res.data], `单曲: ${res.data.name || ''}`);
          onSearch?.([]);
        } else { alert('歌曲不存在'); }
      } else {
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
    <div>
      <form onSubmit={handleSearch} className="search-container">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑 或 粘贴歌单链接"
          disabled={loading}
          className="search-input"
        />
        <button 
          type="submit" 
          className="search-btn"
          disabled={loading}
        >
          {loading ? '...' : '搜索'}
        </button>
      </form>
      
      <div className="search-tags">
        <span className="search-tag">关键词搜索</span>
        <span className="search-tag">歌曲链接导入</span>
        <span className="search-tag">歌单链接导入</span>
      </div>
    </div>
  );
}
