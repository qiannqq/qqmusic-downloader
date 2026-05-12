'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import SearchResults from '../../components/SearchResults';
import MusicPlayer from '../../components/MusicPlayer';
import { useApp } from '../../components/AppContext';
import { api } from '../../lib/api';

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    songs,
    searchResults,
    setSearchResults,
    currentSong,
    setCurrentSong,
    handleAddToList,
    incrementDownload,
    handlePlay,
    handleImport: appImport,
  } = useApp();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.search(keyword.trim());
      setSearchResults(res.data || []);
      setCurrentPage(1);
    } catch (error) {
      alert('搜索失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (!keyword.trim() || newPage < 1) return;
    setLoading(true);
    try {
      const res = await api.search(keyword.trim(), newPage);
      const newResults = res.data || [];
      if (newResults.length > 0 || newPage === 1) {
        setSearchResults(newResults);
        setCurrentPage(newPage);
      } else {
        alert('已经是最后一页了');
      }
    } catch (error) {
      alert('加载失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (input) => {
    const isPlaylistUrl = (url) => /playlist\/(\d+)/.test(url) || /y\.qq\.com.*playlist/.test(url);
    const isSongUrl = (url) => /song\/(\w+)/.test(url) || /y\.qq\.com.*song/.test(url);
    const extractPlaylistId = (url) => { const m = url.match(/playlist\/(\d+)/); return m ? m[1] : null; };
    const extractSongId = (url) => { const m = url.match(/song\/(\w+)/); return m ? m[1] : null; };

    setLoading(true);
    try {
      if (isPlaylistUrl(input)) {
        const id = extractPlaylistId(input);
        if (!id) { alert('无法识别的歌单链接格式'); return; }
        const res = await api.getPlaylist(id);
        if (res.data?.list?.length > 0) {
          appImport(res.data.list);
          alert(`已导入歌单: ${res.data.name || ''}`);
        } else { alert('歌单为空或获取失败'); }
      } else if (isSongUrl(input)) {
        const id = extractSongId(input);
        if (!id) { alert('无法识别的歌曲链接格式'); return; }
        const res = await api.getSongDetail(id);
        if (res.data) {
          appImport([res.data]);
          alert(`已导入单曲: ${res.data.name || ''}`);
        } else { alert('歌曲不存在'); }
      }
    } catch (error) {
      alert('导入失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">搜索音乐</h1>
      </div>

      <form onSubmit={handleSearch} className="header-search-form page-search-form">
        <Search size={16} className="header-search-icon" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑，或粘贴 QQ音乐链接..."
          disabled={loading}
          className="header-search-input"
        />
        <button
          type="submit"
          className="header-search-btn"
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
        </button>
      </form>

      {!hasSearched && (
        <div className="empty-brutal">
          <div className="empty-brutal-title">输入关键词开始搜索</div>
          <div className="empty-brutal-desc">支持歌曲名、歌手、专辑搜索</div>
        </div>
      )}

      <SearchResults
        results={searchResults}
        onAddToList={handleAddToList}
        songs={songs}
        onDownload={incrementDownload}
        onPlay={handlePlay}
        searchKeyword={keyword}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {loading && searchResults.length === 0 && (
        <div className="loading-brutal">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-bar" />
          ))}
        </div>
      )}

      <MusicPlayer
        currentSong={currentSong}
        onClose={() => setCurrentSong(null)}
      />
    </div>
  );
}
