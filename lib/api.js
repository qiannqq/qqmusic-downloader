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

async function downloadByMid(mid, filename) {
  const res = await fetchApi(`${API_BASE}/api/song/url?mid=${encodeURIComponent(mid)}&highQuality=true`);
  return { url: res.data?.url, filename };
}

export async function downloadUrl(url, filename) {
  // 使用 mid 直接下载，避免 URL 过期
  const match = url.match(/M800(\w+)\.mp3/);
  if (match) {
    const mid = match[1];
    return downloadByMid(mid, filename);
  }
  
  // 备用：通过服务端获取直链
  const cookie = localStorage.getItem('qqmusic_cookie') || '';
  const res = await fetch(`${API_BASE}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`, {
    headers: {
      'X-QQMusic-Cookie': cookie
    }
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '下载失败' }));
    throw new Error(err.error || `下载失败: ${res.status}`);
  }
  
  const { data } = await res.json();
  return data;
}

export async function downloadSong(song, filename) {
  const cookie = localStorage.getItem('qqmusic_cookie') || '';
  const res = await fetch(`${API_BASE}/api/song/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-QQMusic-Cookie': cookie
    },
    body: JSON.stringify({ song, filename })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '下载失败' }));
    throw new Error(err.error || `下载失败: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  
  // 云函数环境：返回 JSON 直链
  if (contentType.includes('application/json')) {
    const { data } = await res.json();
    return data;
  }
  
  // 自部署环境：返回文件流
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
  return { url: null, filename };
}

export function getProxyImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/api/proxy/image')) return url;
  return `${API_BASE}/api/proxy/image?url=${encodeURIComponent(url)}`;
}

export function getProxyAudioUrl(url) {
  if (!url) return '';
  // QQ 音乐直链（带 vkey）可直接访问，无需代理
  if (url.includes('stream.qqmusic.qq.com') || url.includes('isure.stream.qqmusic.qq.com')) {
    return url;
  }
  if (url.startsWith('/api/proxy/audio')) return url;
  return `${API_BASE}/api/proxy/audio?url=${encodeURIComponent(url)}`;
}

export async function verifyCookie(cookie) {
  const headers = {
    'Content-Type': 'application/json',
    'X-QQMusic-Cookie': cookie
  };

  // 使用固定歌曲（周杰伦 - 稻香）验证 Cookie
  // 直接请求歌曲 URL，只有有效 Cookie 才能获取高品质链接
  const TEST_MID = '003aCYLn3L8H17';
  
  const urlRes = await fetch(
    `${API_BASE}/api/song/url?mid=${encodeURIComponent(TEST_MID)}&highQuality=true`,
    { 
      method: 'POST',
      headers,
      body: JSON.stringify({})
    }
  );
  
  if (!urlRes.ok) {
    const status = urlRes.status;
    const error = await urlRes.json().catch(() => ({ error: '验证请求失败' }));
    
    if (status === 403) {
      throw new Error('Cookie 已过期或无效，请重新获取');
    } else if (status === 401) {
      throw new Error('Cookie 认证失败，请检查 Cookie 是否完整');
    } else if (status === 404) {
      throw new Error('验证接口不可用，请检查服务是否正常');
    } else if (status === 429) {
      throw new Error('请求过于频繁，请稍后再试');
    } else if (status >= 500) {
      throw new Error('服务器内部错误，请稍后重试');
    } else {
      throw new Error(error.error || `验证失败 (${status})`);
    }
  }

  const urlData = await urlRes.json();
  
  // 如果获取到了 URL，说明 Cookie 有效
  if (urlData.data?.url) {
    return true;
  }
  
  // 如果没获取到 URL，可能是 Cookie 无效或歌曲无版权
  throw new Error('Cookie 验证未通过，无法获取歌曲链接');
}

export const api = {
  search: (keyword, page = 1, pageSize = 20) => 
    fetchApi(`${API_BASE}/api/search?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`),
  
  getSongUrl: (mid, highQuality = false, songData = null) => {
    const url = `${API_BASE}/api/song/url?mid=${encodeURIComponent(mid)}&highQuality=${highQuality}`;
    if (songData) {
      return fetchApi(url, {
        method: 'POST',
        body: JSON.stringify({ song: songData })
      });
    }
    return fetchApi(url);
  },
  
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
