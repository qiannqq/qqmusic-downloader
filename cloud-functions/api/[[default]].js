import express from 'express';
import QQMusic from '../../src/qqMusic.js';

const app = express();

app.use(express.json());

// 服务端 Cookie 配置
const QM_COOKIES = process.env.QM_COOKIES || '';

// 服务端 Cookie 验证状态
let serverCookieStatus = {
  hasCookie: false,
  isValid: false,
  checkedAt: null
};

// 验证服务端 Cookie
async function validateServerCookie() {
  if (!QM_COOKIES) {
    serverCookieStatus = { hasCookie: false, isValid: false, checkedAt: new Date() };
    console.log('[Cookie] 未配置 QM_COOKIES 环境变量');
    return;
  }

  try {
    const qqMusic = new QQMusic({ cookie: QM_COOKIES });
    const results = await qqMusic.search('周杰伦', 1, 5);
    if (results && results.length > 0) {
      serverCookieStatus = { hasCookie: true, isValid: true, checkedAt: new Date() };
      console.log('[Cookie] 服务端 Cookie 验证通过 ✓');
    } else {
      serverCookieStatus = { hasCookie: true, isValid: false, checkedAt: new Date() };
      console.log('[Cookie] 服务端 Cookie 验证失败：搜索无结果');
    }
  } catch (error) {
    serverCookieStatus = { hasCookie: true, isValid: false, checkedAt: new Date() };
    console.log('[Cookie] 服务端 Cookie 验证失败：', error.message);
  }
}

function getQQMusic(req) {
  // 优先使用有效的服务端 Cookie
  const cookie = (serverCookieStatus.isValid ? QM_COOKIES : '') || req.headers['x-qqmusic-cookie'] || '';
  return new QQMusic({
    cookie,
    highQuality: req.query.highQuality === 'true'
  });
}

// Cookie 状态接口（不暴露 Cookie 值）
app.get('/cookie-status', (req, res) => {
  res.json({
    code: 0,
    data: {
      hasServerCookie: serverCookieStatus.hasCookie,
      isValid: serverCookieStatus.isValid,
      needClientCookie: !serverCookieStatus.isValid
    }
  });
});

app.get('/search', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: 'keyword 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const list = await qqMusic.search(keyword, Number(page), Number(pageSize));
    res.json({ code: 0, data: list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/song/url', async (req, res) => {
  try {
    const { mid, highQuality = 'false' } = req.query;
    if (!mid) {
      return res.status(400).json({ error: 'mid 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    
    let songData = { mid, raw: {} };
    if (req.body && req.body.song) {
      songData = req.body.song;
    }
    
    const url = await qqMusic.getMusicUrl(songData, { highQuality: highQuality === 'true' });
    res.json({ code: 0, data: { url, mid } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/song/batch-url', async (req, res) => {
  try {
    const { songs, highQuality = false } = req.body;
    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({ error: 'songs 必须是数组且不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const results = await Promise.all(
      songs.map(async (song) => {
        try {
          const url = await qqMusic.getMusicUrl(song, { highQuality });
          return { ...song, url, success: true };
        } catch (err) {
          return { ...song, url: '', success: false, error: err.message };
        }
      })
    );
    res.json({ code: 0, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/song/detail', async (req, res) => {
  try {
    const { mid } = req.query;
    if (!mid) {
      return res.status(400).json({ error: 'mid 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const song = await qqMusic.getFirstSong(mid, { pageSize: 1 });
    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' });
    }
    const url = await qqMusic.getMusicUrl(song, { highQuality: req.query.highQuality === 'true' });
    res.json({ code: 0, data: { ...song, url } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/song/lyric', async (req, res) => {
  try {
    const { mid } = req.query;
    if (!mid) {
      return res.status(400).json({ error: 'mid 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const lyric = await qqMusic.getLyric(mid);
    res.json({ code: 0, data: lyric });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/playlist', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: '歌单 ID 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const body = {
      comm: { uin: '0', authst: '', ct: 29 },
      req_0: {
        method: 'GetPlaylistById',
        module: 'music.srfDissInfo.aiDissInfo',
        param: {
          disstid: Number(id),
          dirid: 0,
          tag: 0,
          song_begin: 0,
          song_num: 100,
          userinfo: 1
        }
      }
    };
    
    const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
    const response = await fetch(MUSICU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': qqMusic.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    if (data.req_0?.code !== 0 && data.req_0?.code !== '0') {
      return res.status(500).json({ error: '获取歌单失败' });
    }
    
    const songList = data.req_0?.data?.songlist || [];
    const list = songList.map(item => qqMusic.normalizeSong(item));
    
    res.json({ 
      code: 0, 
      data: {
        list,
        name: data.req_0?.data?.dirname || '',
        desc: data.req_0?.data?.desc || '',
        pic: data.req_0?.data?.dir_pic_url2 || ''
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL 不能为空' });
    }
    
    const songMatch = url.match(/song\/(\w+)\.html/);
    const playlistMatch = url.match(/playlist\/(\d+)\.html/);
    const albumMatch = url.match(/album\/(\w+)\.html/);
    
    if (songMatch) {
      res.json({ code: 0, data: { type: 'song', id: songMatch[1] } });
    } else if (playlistMatch) {
      res.json({ code: 0, data: { type: 'playlist', id: playlistMatch[1] } });
    } else if (albumMatch) {
      res.json({ code: 0, data: { type: 'album', id: albumMatch[1] } });
    } else {
      res.status(400).json({ error: '无法识别的 URL 格式' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/song/download', async (req, res) => {
  try {
    const { song, filename } = req.body;
    console.log('[download] 收到请求, mid:', song?.mid, '文件名:', filename);
    
    if (!song || !song.mid) {
      return res.status(400).json({ error: 'song.mid 不能为空' });
    }

    const qqMusic = getQQMusic(req);
    
    console.log('[download] 正在获取 URL...');
    const playUrl = await qqMusic.getMusicUrl(song, { highQuality: true });
    if (!playUrl) {
      return res.status(500).json({ error: '无法获取播放链接' });
    }
    
    console.log('[download] 获取到 URL:', playUrl.substring(0, 200));
    
    console.log('[download] 开始下载音频...');
    const response = await fetch(playUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });

    console.log('[download] 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法获取错误详情');
      console.error('[download] 失败:', response.status, errorText.substring(0, 500));
      return res.status(500).json({ 
        error: `获取音频失败: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    const safeFilename = filename || `${song.name} - ${song.artist}.mp3`;
    const encodedFilename = encodeURIComponent(safeFilename);
    const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    console.log('[download] 开始流式传输...');
    
    const reader = response.body.getReader();
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      res.write(Buffer.from(value));
    }
    console.log('[download] 传输完成, 总字节数:', totalBytes);
    res.end();
  } catch (error) {
    console.error('[download] 错误:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// 图片代理接口
app.get('/proxy/image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send('获取图片失败');
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    console.error('[proxy image] 错误:', error);
    res.status(500).send('图片加载失败');
  }
});

// 音频代理接口（用于试听）
app.get('/proxy/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    const targetUrl = decodeURIComponent(url);
    console.log('[proxy audio] 代理URL:', targetUrl.substring(0, 150));

    const cookie = req.headers['x-qqmusic-cookie'] || '';

    console.log('[proxy audio] 开始下载音频...');
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookie
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error('[proxy audio] 下载失败:', response.status);
      return res.status(response.status).send('获取音频失败');
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    
    console.log('[proxy audio] Content-Type:', contentType);
    console.log('[proxy audio] Content-Length:', contentLength);

    if (contentLength && parseInt(contentLength) < 1000) {
      console.log('[proxy audio] 警告: 文件过小，可能不是有效音频');
      const text = await response.text();
      console.log('[proxy audio] 响应内容:', text.substring(0, 200));
      return res.status(500).send('音频文件无效');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'none');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
    console.log('[proxy audio] 传输完成');

  } catch (error) {
    console.error('[proxy audio] 错误:', error);
    res.status(500).send('音频加载失败');
  }
});

// 旧版下载代理（兼容）
app.get('/download', async (req, res) => {
  try {
    const { url, filename } = req.query;
    console.log('[download proxy] 收到请求, URL:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url);
    } catch (e) {
      targetUrl = url;
    }
    
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法获取错误详情');
      return res.status(500).json({ 
        error: `获取音频失败: ${response.status}`,
        details: errorText.substring(0, 500)
      });
    }

    const safeFilename = filename || 'download.mp3';
    const encodedFilename = encodeURIComponent(safeFilename);
    const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
    
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error('[download proxy] 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 初始化验证
validateServerCookie().catch(console.error);

export default app;
