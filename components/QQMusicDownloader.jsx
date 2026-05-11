'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Settings, ListMusic, Play, Pause, 
  Download, Plus, Check, Trash2, Music, X,
  Volume2, FileText, AlertCircle, Loader2
} from 'lucide-react';
import CustomCursor from './CustomCursor';
import Drawer from './Drawer';
import MusicPlayer from './MusicPlayer';
import CookieManager from './CookieManager';
import SearchResults from './SearchResults';
import SongList from './SongList';
import { useHoverScale } from '../hooks/useHoverScale';
import { useApp } from './AppContext';

export default function QQMusicDownloader() {
  const containerRef = useHoverScale(1.05);
  const { serverCookieStatus } = useApp();
  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ downloaded: 0 });
  const [currentSong, setCurrentSong] = useState(null);
  const [showCookieDrawer, setShowCookieDrawer] = useState(false);
  const [showListDrawer, setShowListDrawer] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [highQuality, setHighQuality] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('qqmusic_downloaded_count');
    if (saved) setStats(prev => ({ ...prev, downloaded: parseInt(saved) }));
    const savedHQ = localStorage.getItem('qqmusic_high_quality');
    if (savedHQ) setHighQuality(savedHQ === 'true');
  }, []);

  const handleSearch = (results, kw, page = 1) => {
    setSearchResults(results);
    setSearchKeyword(kw || '');
    setCurrentPage(page);
    setHasSearched(true);
  };

  const handleAddToList = (song) => {
    setSongs(prev => {
      if (prev.find(s => s.mid === song.mid)) return prev;
      return [...prev, song];
    });
  };

  const handleImport = (importedSongs, source) => {
    const newSongs = [...songs];
    importedSongs.forEach(song => {
      if (!newSongs.find(s => s.mid === song.mid)) {
        newSongs.push(song);
      }
    });
    setSongs(newSongs);
    setHasSearched(true);
  };

  const incrementDownload = () => {
    setStats(prev => {
      const newCount = prev.downloaded + 1;
      localStorage.setItem('qqmusic_downloaded_count', newCount.toString());
      return { ...prev, downloaded: newCount };
    });
  };

  const handlePlay = (song) => {
    setCurrentSong(song);
  };

  const handlePageChange = async (newPage) => {
    if (!searchKeyword || newPage < 1) return;
    setLoading(true);
    try {
      const { api } = await import('../lib/api');
      const res = await api.search(searchKeyword, newPage);
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

  return (
    <div ref={containerRef}>
      <CustomCursor />
      <div className="noise-overlay" />
      <div className="scan-line" />

      {/* Top Bar with Search */}
      <header className="top-bar">
        <div
          className="top-bar-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setKeyword('');
            setSearchResults([]);
            setHasSearched(false);
            setCurrentPage(1);
            setSearchKeyword('');
          }}
          title="返回主页"
        >
          MUSIC
        </div>
        
        <div className="top-bar-search">
          <SearchBar 
            keyword={keyword}
            setKeyword={setKeyword}
            onSearch={handleSearch}
            onImport={handleImport}
            onLoading={setLoading}
          />
        </div>
        
        <nav className="top-bar-nav">
          <button 
            className="top-bar-btn"
            onClick={() => setShowCookieDrawer(true)}
            title="Cookie设置"
          >
            <Settings size={18} />
          </button>
          <button 
            className="top-bar-btn"
            onClick={() => setShowListDrawer(true)}
            title={`歌曲列表 (${songs.length})`}
          >
            <ListMusic size={18} />
            <span className="top-bar-badge">{songs.length}</span>
          </button>
        </nav>
      </header>

      <div className="main-content">
        {/* Hero - hidden after search */}
        {!hasSearched && (
          <section className="hero">
            <div className="hero-content">
              <h1 className="hero-title">
                <span>QQ音乐</span>
                <span style={{ color: 'black', backgroundColor: 'var(--accent)' }}>下载器</span>
              </h1>
            </div>
          </section>
        )}

        {/* Search Results */}
        <section id="results">
          <SearchResults 
            results={searchResults} 
            onAddToList={handleAddToList}
            songs={songs}
            onDownload={incrementDownload}
            onPlay={handlePlay}
            searchKeyword={searchKeyword}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </section>

        {/* Loading */}
        {loading && (
          <div className="loading-brutal">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="loading-bar" />
            ))}
          </div>
        )}
      </div>

      {/* Cookie Drawer */}
      <Drawer 
        isOpen={showCookieDrawer} 
        onClose={() => setShowCookieDrawer(false)}
        title="Cookie 设置"
        icon={<Settings size={20} />}
      >
        <CookieManager 
          highQuality={highQuality}
          onHighQualityChange={(v) => {
            setHighQuality(v);
            localStorage.setItem('qqmusic_high_quality', v.toString());
          }}
          serverCookieStatus={serverCookieStatus}
        />
      </Drawer>

      {/* Song List Drawer */}
      <Drawer 
        isOpen={showListDrawer} 
        onClose={() => setShowListDrawer(false)}
        title="歌曲列表"
        icon={<ListMusic size={20} />}
      >
        <SongList 
          songs={songs} 
          onSongsChange={setSongs}
          selectedSongs={selectedSongs}
          onSelectionChange={setSelectedSongs}
          onDownload={incrementDownload}
          onPlay={handlePlay}
          highQuality={highQuality}
        />
      </Drawer>

      {/* Music Player */}
      <MusicPlayer 
        currentSong={currentSong} 
        onClose={() => setCurrentSong(null)}
      />
    </div>
  );
}

function SearchBar({ keyword, setKeyword, onSearch, onImport, onLoading }) {
  const [loading, setLoading] = useState(false);

  const isPlaylistUrl = (url) => /playlist\/(\d+)/.test(url) || /y\.qq\.com.*playlist/.test(url);
  const isSongUrl = (url) => /song\/(\w+)/.test(url) || /y\.qq\.com.*song/.test(url);
  const extractPlaylistId = (url) => { const m = url.match(/playlist\/(\d+)/); return m ? m[1] : null; };
  const extractSongId = (url) => { const m = url.match(/song\/(\w+)/); return m ? m[1] : null; };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    const input = keyword.trim();
    
    setLoading(true);
    onLoading?.(true);
    
    try {
      const { api } = await import('../lib/api');
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
        onSearch?.(res.data || [], input, 1);
      }
    } catch (error) {
      alert('操作失败: ' + error.message);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="header-search-form">
      <Search size={16} className="header-search-icon" />
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索歌曲、歌手、专辑..."
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
  );
}
