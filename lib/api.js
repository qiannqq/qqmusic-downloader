const API_BASE = typeof window !== 'undefined' ? '' : '';

function getHeaders() {
  if (typeof window === 'undefined') return {};
  const cookie = localStorage.getItem('qqmusic_cookie') || '';
  return {
    'Content-Type': 'application/json',
    'X-QQMusic-Cookie': cookie
  };
}

async function fetchApi(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `请求失败: ${response.status}`);
  }
  
  return response.json();
}

export function downloadUrl(url, filename) {
  // 使用 mid 直接下载，避免 URL 过期
  const match = url.match(/M800(\w+)\.mp3/);
  if (match) {
    const mid = match[1];
    downloadByMid(mid, filename);
    return;
  }
  
  // 备用：通过代理下载
  const cookie = localStorage.getItem('qqmusic_cookie') || '';
  const downloadLink = `${API_BASE}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  
  fetch(downloadLink, {
    headers: {
      'X-QQMusic-Cookie': cookie
    }
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw new Error(err.error || `下载失败: ${response.status}`); });
    }
    return response.blob();
  })
  .then(blob => {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  })
  .catch(err => {
    alert('下载失败: ' + err.message);
  });
}

export function downloadSong(song, filename) {
  const cookie = localStorage.getItem('qqmusic_cookie') || '';
  const downloadLink = `${API_BASE}/api/song/download`;
  
  fetch(downloadLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-QQMusic-Cookie': cookie
    },
    body: JSON.stringify({ song, filename })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => { throw new Error(err.error || `下载失败: ${response.status}`); });
    }
    return response.blob();
  })
  .then(blob => {
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  })
  .catch(err => {
    alert('下载失败: ' + err.message);
  });
}

export function getProxyImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/proxy/image')) return url;
  return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
}

export const api = {
  search: (keyword, page = 1, pageSize = 20) => 
    fetchApi(`${API_BASE}/api/search?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`),
  
  getSongUrl: (mid, highQuality = false) =>
    fetchApi(`${API_BASE}/api/song/url?mid=${encodeURIComponent(mid)}&highQuality=${highQuality}`),
  
  getBatchUrls: (songs, highQuality = false) =>
    fetchApi(`${API_BASE}/api/song/batch-url`, {
      method: 'POST',
      body: JSON.stringify({ songs, highQuality })
    }),
  
  getSongDetail: (mid, highQuality = false) =>
    fetchApi(`${API_BASE}/api/song/detail?mid=${encodeURIComponent(mid)}&highQuality=${highQuality}`),
  
  getLyric: (mid) =>
    fetchApi(`${API_BASE}/api/song/lyric?mid=${encodeURIComponent(mid)}`),
  
  getPlaylist: (id) =>
    fetchApi(`${API_BASE}/api/playlist?id=${encodeURIComponent(id)}`),
  
  parseUrl: (url) =>
    fetchApi(`${API_BASE}/api/parse-url`, {
      method: 'POST',
      body: JSON.stringify({ url })
    })
};
