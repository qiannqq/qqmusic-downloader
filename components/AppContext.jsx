'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [stats, setStats] = useState({ downloaded: 0 });
  const [highQuality, setHighQuality] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('qqmusic_downloaded_count');
    if (saved) setStats(prev => ({ ...prev, downloaded: parseInt(saved) }));
    const savedHQ = localStorage.getItem('qqmusic_high_quality');
    if (savedHQ) setHighQuality(savedHQ === 'true');
    const savedSongs = localStorage.getItem('qqmusic_songs');
    if (savedSongs) {
      try {
        setSongs(JSON.parse(savedSongs));
      } catch (e) {
        console.error('Failed to parse saved songs', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('qqmusic_songs', JSON.stringify(songs));
  }, [songs]);

  const handleAddToList = (song) => {
    setSongs(prev => {
      if (prev.find(s => s.mid === song.mid)) return prev;
      return [...prev, song];
    });
  };

  const handleImport = (importedSongs) => {
    const newSongs = [...songs];
    importedSongs.forEach(song => {
      if (!newSongs.find(s => s.mid === song.mid)) {
        newSongs.push(song);
      }
    });
    setSongs(newSongs);
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

  const toggleSelect = (mid) => {
    if (selectedSongs.includes(mid)) {
      setSelectedSongs(selectedSongs.filter(id => id !== mid));
    } else {
      setSelectedSongs([...selectedSongs, mid]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSongs.length === songs.length) {
      setSelectedSongs([]);
    } else {
      setSelectedSongs(songs.map(s => s.mid));
    }
  };

  const handleDelete = (mid) => {
    setSongs(songs.filter(s => s.mid !== mid));
    setSelectedSongs(selectedSongs.filter(id => id !== mid));
  };

  const handleBatchDelete = () => {
    setSongs(songs.filter(s => !selectedSongs.includes(s.mid)));
    setSelectedSongs([]);
  };

  const handleClearAll = () => {
    setSongs([]);
    setSelectedSongs([]);
  };

  const setHighQualityPersist = (v) => {
    setHighQuality(v);
    localStorage.setItem('qqmusic_high_quality', v.toString());
  };

  return (
    <AppContext.Provider value={{
      songs, setSongs,
      searchResults, setSearchResults,
      selectedSongs, setSelectedSongs,
      currentSong, setCurrentSong,
      stats, setStats,
      highQuality, setHighQuality: setHighQualityPersist,
      handleAddToList,
      handleImport,
      incrementDownload,
      handlePlay,
      toggleSelect,
      toggleSelectAll,
      handleDelete,
      handleBatchDelete,
      handleClearAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
