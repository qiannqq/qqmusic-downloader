'use client';

import { useState } from 'react';
import CookieManager from './CookieManager';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import SongList from './SongList';
import BatchDownloader from './BatchDownloader';

export default function QQMusicDownloader() {
  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (results) => {
    setSearchResults(results);
  };

  const handleAddToList = (song) => {
    setSongs(prev => {
      if (prev.find(s => s.mid === song.mid)) {
        return prev;
      }
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
    alert(`成功导入 ${importedSongs.length} 首歌曲${source ? ` (${source})` : ''}`);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>QQ音乐下载器</h1>
        <p>支持高音质下载、批量下载、多种导入模式</p>
      </div>

      <CookieManager />

      <SearchBar 
        onSearch={handleSearch} 
        onImport={handleImport}
        onLoading={setLoading} 
      />

      <SearchResults 
        results={searchResults} 
        onAddToList={handleAddToList}
        songs={songs}
      />

      <BatchDownloader 
        songs={songs} 
        selectedSongs={selectedSongs}
      />

      <SongList 
        songs={songs} 
        onSongsChange={setSongs}
        selectedSongs={selectedSongs}
        onSelectionChange={setSelectedSongs}
      />

      {loading && (
        <div className="loading">加载中...</div>
      )}
    </div>
  );
}
