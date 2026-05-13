'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Settings, ListMusic, Play, Pause, 
  Download, Plus, Check, Trash2, Music, X,
  Volume2, FileText, AlertCircle, Loader2, Menu
} from 'lucide-react';
import CustomCursor from './CustomCursor';
import Drawer from './Drawer';
import MusicPlayer from './MusicPlayer';
import CookieManager from './CookieManager';
import SearchResults from './SearchResults';
import SongList from './SongList';
import ToastContainer, { showToast } from './Toast';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('qqmusic_downloaded_count');
    if (saved) setStats(prev => ({ ...prev, downloaded: parseInt(saved) }));
    const savedHQ = localStorage.getItem('qqmusic_high_quality');
    if (savedHQ) setHighQuality(savedHQ === 'true');
  }, []);

  // 点击外部关闭移动端菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMobileMenu && !e.target.closest('.top-bar-nav-mobile')) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMobileMenu]);

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
    let importCount = 0;
    importedSongs.forEach(song => {
      if (!newSongs.find(s => s.mid === song.mid)) {
        newSongs.push(song);
        importCount++;
      }
    });
    setSongs(newSongs);
    setHasSearched(true);
    
    if (importCount > 0) {
      showToast(`成功导入 ${importCount} 首歌曲`, 'success');
    }
  };

  const incrementDownload = () => {
    setStats(prev => {
      const newCount = prev.downloaded + 1;
      localStorage.setItem('qqmusic_downloaded_count', newCount.toString());
      return { ...prev, downloaded: newCount };
    });
  };

  const handlePlay = async (song) => {
    if (song.url) {
      setCurrentSong(song);
      return;
    }
    try {
      const { api } = await import('../lib/api');
      const res = await api.getSongUrl(song.mid, true, song);
      if (res.data?.url) {
        setCurrentSong({ ...song, url: res.data.url });
      } else {
        showToast('无法获取播放链接，可能需要登录', 'error');
      }
    } catch (err) {
      showToast('播放失败: ' + err.message, 'error');
    }
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
        showToast('已经是最后一页了', 'info');
      }
    } catch (error) {
      showToast('加载失败: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef}>
      <CustomCursor />
      <div className="noise-overlay" />
      <ToastContainer />

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
          M
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
          {/* Desktop buttons */}
          <div className="top-bar-nav-desktop">
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
          </div>
          
          {/* Mobile menu */}
          <div className="top-bar-nav-mobile">
            <button 
              className="top-bar-btn"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              title="菜单"
            >
              <Menu size={18} />
              {songs.length > 0 && <span className="top-bar-badge">{songs.length}</span>}
            </button>
            
            {showMobileMenu && (
              <div className="mobile-menu-dropdown">
                <button 
                  className="mobile-menu-item"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowCookieDrawer(true);
                  }}
                >
                  <Settings size={16} />
                  <span>Cookie 设置</span>
                </button>
                <button 
                  className="mobile-menu-item"
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowListDrawer(true);
                  }}
                >
                  <ListMusic size={16} />
                  <span>下载列表 ({songs.length})</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      <div className="main-content" style={currentSong ? { paddingBottom: '90px' } : undefined}>
        {/* Hero - 仅在无搜索结果且无导入歌曲时显示 */}
        {!hasSearched && songs.length === 0 && (
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

        {/* 导入歌曲列表（当有歌曲但无搜索结果时显示） */}
        {songs.length > 0 && searchResults.length === 0 && !loading && (
          <section className="imported-songs">
            <div className="section-header">
              <h2 className="section-title">已导入的歌曲</h2>
              <span className="section-count">{songs.length}</span>
            </div>
            <div className="results-grid">
              {songs.map((song, index) => (
                <div key={song.mid || index} className="result-cell">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {song.pic && (
                      <img 
                        src={song.pic} 
                        alt={song.name}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', border: '2px solid var(--border)' }}
                      />
                    )}
                    <div className="result-info">
                      <div className="result-name">{song.name}</div>
                      <div className="result-artist">{song.artist}</div>
                    </div>
                    <div className="result-actions">
                      <button 
                        className="btn-play"
                        onClick={() => handlePlay(song)}
                        title="播放"
                      >
                        <Play size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
    let m = url.match(/playlist\/(\d+)/);
    if (m) return m[1];
    m = url.match(/[?&]id=(\d+)/);
    if (m) return m[1];
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
      const { api } = await import('../lib/api');
      if (isPlaylistUrl(input)) {
        const id = extractPlaylistId(input);
        if (!id) { showToast('无法识别的歌单链接格式', 'error'); return; }
        const res = await api.getPlaylist(id);
        if (res.data?.list?.length > 0) {
          onImport?.(res.data.list, `歌单: ${res.data.name || ''}`);
          onSearch?.([]);
        } else { showToast('歌单为空或获取失败', 'error'); }
      } else if (isSongUrl(input)) {
        const id = extractSongId(input);
        if (!id) { showToast('无法识别的歌曲链接格式', 'error'); return; }
        const res = await api.getSongDetail(id);
        if (res.data) {
          onImport?.([res.data], `单曲: ${res.data.name || ''}`);
          onSearch?.([]);
        } else { showToast('歌曲不存在', 'error'); }
      } else {
        const res = await api.search(input);
        onSearch?.(res.data || [], input, 1);
      }
    } catch (error) {
      showToast('操作失败: ' + error.message, 'error');
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
        placeholder="搜索歌曲、歌手、专辑 或 粘贴歌单链接"
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
