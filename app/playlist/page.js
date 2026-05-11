'use client';

import SongList from '../../components/SongList';
import MusicPlayer from '../../components/MusicPlayer';
import BatchDownloader from '../../components/BatchDownloader';
import { useApp } from '../../components/AppContext';
import { Music } from 'lucide-react';

export default function PlaylistPage() {
  const {
    songs,
    setSongs,
    selectedSongs,
    setSelectedSongs,
    currentSong,
    setCurrentSong,
    incrementDownload,
    handlePlay,
    highQuality,
  } = useApp();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Music size={24} style={{ marginRight: '8px' }} />
          我的歌单
        </h1>
        <div className="section-count">{songs.length}</div>
      </div>

      <BatchDownloader
        songs={songs}
        selectedSongs={selectedSongs}
        onDownload={incrementDownload}
      />

      <SongList
        songs={songs}
        onSongsChange={setSongs}
        selectedSongs={selectedSongs}
        onSelectionChange={setSelectedSongs}
        onDownload={incrementDownload}
        onPlay={handlePlay}
        highQuality={highQuality}
      />

      <MusicPlayer
        currentSong={currentSong}
        onClose={() => setCurrentSong(null)}
      />
    </div>
  );
}
