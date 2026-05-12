'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Music, AlertCircle } from 'lucide-react';
import { getProxyImageUrl, getProxyAudioUrl } from '../lib/api';

export default function MusicPlayer({ currentSong, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (currentSong?.url && audioRef.current) {
      const proxyUrl = getProxyAudioUrl(currentSong.url);
      audioRef.current.src = proxyUrl;
      audioRef.current.load();
      setIsPlaying(false);
      setProgress(0);
      setError(null);
      
      // Auto play after load
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error('Auto play failed:', err);
          });
        }
      }, 100);
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('音频加载失败，可能需要登录或该歌曲暂不支持试听');
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setError(null);
        }).catch(err => {
          console.error('Play failed:', err);
          setError('播放失败: ' + err.message);
        });
      }
    }
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <audio ref={audioRef} crossOrigin="anonymous" />
      <div className="player-bar">
        <div className="player-info">
          {currentSong.pic ? (
            <img 
              src={getProxyImageUrl(currentSong.pic)} 
              alt={currentSong.name}
              className="player-cover"
              style={{ 
                animation: isPlaying ? 'rotate-slow 10s linear infinite' : 'none'
              }}
            />
          ) : (
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Music size={24} />
            </div>
          )}
          
          <div className="player-meta">
            <div className="player-name">{currentSong.name}</div>
            <div className="player-artist">{currentSong.artist}</div>
          </div>
        </div>

        <div className="player-controls">
          <button className="player-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          <div className="player-progress" onClick={handleProgressClick}>
            <div 
              className="player-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="player-time">
            {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(duration)}
          </div>
        </div>

        <div className="player-volume">
          <Volume2 size={16} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="volume-slider"
          />
          <button className="player-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ 
            position: 'absolute', 
            top: '-50px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: '#000',
            padding: '10px 20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            border: '2px solid #000',
            boxShadow: '4px 4px 0 #000',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>
    </>
  );
}
