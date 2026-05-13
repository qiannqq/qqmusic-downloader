import express from 'express';
import next from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
import QQMusic from './src/qqMusic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;
const QM_COOKIES = process.env.QM_COOKIES || '';

// 检测是否运行在云函数/Serverless 环境
function isFunctionEnv() {
  return !!(
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.CF_PAGES ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_ENV ||
    process.env.EDGEONE
  );
}

// 服务端 Cookie 验证状态
let serverCookieStatus = {
  hasCookie: false,
  isValid: false,
  checkedAt: null
};

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

const server = express();

server.use(express.json());

// 验证服务端 Cookie
async function validateServerCookie() {
  if (!QM_COOKIES) {
    serverCookieStatus = { hasCookie: false, isValid: false, checkedAt: new Date() };
    console.log('[Cookie] 未配置 QM_COOKIES 环境变量');
    return;
  }

  try {
    const qqMusic = new QQMusic({ cookie: QM_COOKIES });
    // 使用查询用户信息验证（搜索不需要有效Cookie也能工作）
    const isValid = await qqMusic.validateCookie();
    if (isValid) {
      serverCookieStatus = { hasCookie: true, isValid: true, checkedAt: new Date() };
      console.log('[Cookie] 服务端 Cookie 验证通过 ✓');
    } else {
      serverCookieStatus = { hasCookie: true, isValid: false, checkedAt: new Date() };
      console.log('[Cookie] 服务端 Cookie 验证失败：Cookie 已失效');
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

server.get('/api/search', async (req, res) => {
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

server.post('/api/song/url', async (req, res) => {
  try {
    const { mid, highQuality = 'false' } = req.query;
    if (!mid) {
      return res.status(400).json({ error: 'mid 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    
    // 如果请求体中有 song 数据，使用它
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

server.post('/api/song/batch-url', async (req, res) => {
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

server.get('/api/song/detail', async (req, res) => {
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

server.get('/api/song/lyric', async (req, res) => {
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

server.get('/api/playlist', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: '歌单 ID 不能为空' });
    }
    const qqMusic = getQQMusic(req);
    const body = {
      comm: { uin: '0', authst: '', ct: 29 },
      req_0: {
        module: 'srf_diss_info.DissInfoServer',
        method: 'CgiGetDiss',
        param: {
          disstid: Number(id),
          dirid: 0,
          onlysonglist: 0,
          song_begin: 0,
          song_num: 500,
          userinfo: 1,
          pic_dpi: 800,
          orderlist: 1
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

server.post('/api/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL 不能为空' });
    }
    
    const trimmedUrl = url.trim();
    
    // 支持多种URL格式
    // 格式1: https://y.qq.com/n/ryqq/playlist/1234567890
    // 格式2: https://i2.y.qq.com/n3/other/pages/details/playlist.html?id=1234567890
    // 格式3: playlist/1234567890.html
    const playlistPatterns = [
      /playlist\/(\d+)/,                                    // playlist/1234567890 或 playlist/1234567890.html
      /[?&]id=(\d+)/,                                       // ?id=1234567890 或 &id=1234567890
    ];
    
    // 格式1: https://y.qq.com/n/yqq/song/003aCYLn3L8H17
    // 格式2: song/003aCYLn3L8H17.html
    const songPatterns = [
      /song\/(\w+)\.html/,                                  // song/xxx.html
      /song\/(\w+)$/,                                       // song/xxx (无.html)
    ];
    
    // 专辑格式
    const albumPatterns = [
      /album\/(\w+)\.html/,
      /album\/(\w+)$/,
    ];
    
    // 尝试匹配歌单
    for (const pattern of playlistPatterns) {
      const match = trimmedUrl.match(pattern);
      if (match && match[1]) {
        return res.json({ code: 0, data: { type: 'playlist', id: match[1] } });
      }
    }
    
    // 尝试匹配歌曲
    for (const pattern of songPatterns) {
      const match = trimmedUrl.match(pattern);
      if (match && match[1]) {
        return res.json({ code: 0, data: { type: 'song', id: match[1] } });
      }
    }
    
    // 尝试匹配专辑
    for (const pattern of albumPatterns) {
      const match = trimmedUrl.match(pattern);
      if (match && match[1]) {
        return res.json({ code: 0, data: { type: 'album', id: match[1] } });
      }
    }
    
    // 纯数字视为歌单ID
    if (/^\d+$/.test(trimmedUrl)) {
      return res.json({ code: 0, data: { type: 'playlist', id: trimmedUrl } });
    }
    
    res.status(400).json({ error: '无法识别的 URL 格式' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.post('/api/song/download', async (req, res) => {
  try {
    const { song, filename } = req.body;
    console.log('[下载] 收到请求, mid:', song?.mid, '文件名:', filename, '环境:', isFunctionEnv() ? '云函数' : '自部署');
    
    if (!song || !song.mid) {
      return res.status(400).json({ error: 'song.mid 不能为空' });
    }

    const qqMusic = getQQMusic(req);
    
    // 使用完整的歌曲对象获取 URL（包含 raw 数据）
    console.log('[下载] 正在获取 URL...');
    const playUrl = await qqMusic.getMusicUrl(song, { highQuality: true });
    if (!playUrl) {
      return res.status(500).json({ error: '无法获取播放链接' });
    }
    
    console.log('[下载] 获取到 URL:', playUrl.substring(0, 200));
    
    // 云函数环境：302 重定向，避免 6MB 限制
    if (isFunctionEnv()) {
      console.log('[下载] 云函数环境，使用 302 重定向');
      return res.redirect(playUrl);
    }
    
    // 自部署环境：流式传输
    console.log('[下载] 自部署环境，开始流式传输...');
    const response = await fetch(playUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
        'Cookie': qqMusic.cookie
      },
      redirect: 'follow'
    });

    console.log('[下载] 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法获取错误详情');
      console.error('[下载] 失败:', response.status, errorText.substring(0, 500));
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
    
    const reader = response.body.getReader();
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      res.write(Buffer.from(value));
    }
    console.log('[下载] 传输完成, 总字节数:', totalBytes);
    res.end();
  } catch (error) {
    console.error('[下载] 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 图片代理接口
server.get('/api/proxy/image', async (req, res) => {
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
    console.error('[图片代理] 错误:', error);
    res.status(500).send('图片加载失败');
  }
});

// 音频代理接口（用于试听）
server.get('/api/proxy/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    const targetUrl = decodeURIComponent(url);
    console.log('[音频代理] 代理URL:', targetUrl.substring(0, 150), '环境:', isFunctionEnv() ? '云函数' : '自部署');

    // 优先使用有效的服务端 Cookie
    const cookie = (serverCookieStatus.isValid ? QM_COOKIES : '') || req.headers['x-qqmusic-cookie'] || '';

    // 云函数环境：302 重定向，避免 6MB 限制
    if (isFunctionEnv()) {
      console.log('[音频代理] 云函数环境，使用 302 重定向');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.redirect(targetUrl);
    }

    // 自部署环境：流式传输
    console.log('[音频代理] 自部署环境，开始流式传输...');
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookie
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error('[音频代理] 下载失败:', response.status);
      return res.status(response.status).send('获取音频失败');
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    
    console.log('[音频代理] Content-Type:', contentType);
    console.log('[音频代理] Content-Length:', contentLength);

    // 如果内容太小，可能是错误响应
    if (contentLength && parseInt(contentLength) < 1000) {
      console.log('[音频代理] 警告: 文件过小，可能不是有效音频');
      const text = await response.text();
      console.log('[音频代理] 响应内容:', text.substring(0, 200));
      return res.status(500).send('音频文件无效');
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'none');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // 流式传输音频数据
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
    console.log('[音频代理] 传输完成');

  } catch (error) {
    console.error('[音频代理] 错误:', error);
    res.status(500).send('音频加载失败');
  }
});

// Cookie 状态接口（不暴露 Cookie 值）
server.get('/api/cookie-status', (req, res) => {
  res.json({
    code: 0,
    data: {
      hasServerCookie: serverCookieStatus.hasCookie,
      isValid: serverCookieStatus.isValid,
      // 如果服务端 Cookie 有效，前端不需要填写
      needClientCookie: !serverCookieStatus.isValid
    }
  });
});

// 旧版下载代理（兼容）
// 旧版下载代理（兼容）
server.get('/api/download', async (req, res) => {
  try {
    const { url, filename } = req.query;
    console.log('[下载代理-旧版] 收到请求, URL:', url, '环境:', isFunctionEnv() ? '云函数' : '自部署');
    
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    let targetUrl;
    try {
      targetUrl = decodeURIComponent(url);
    } catch (e) {
      targetUrl = url;
    }
    
    // 云函数环境：302 重定向，避免 6MB 限制
    if (isFunctionEnv()) {
      console.log('[下载代理] 云函数环境，使用 302 重定向');
      return res.redirect(targetUrl);
    }
    
    // 自部署环境：流式传输
    console.log('[下载代理] 自部署环境，开始流式传输...');
    // 优先使用有效的服务端 Cookie
    const cookie = (serverCookieStatus.isValid ? QM_COOKIES : '') || req.headers['x-qqmusic-cookie'] || '';
    
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookie
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
    console.error('[下载代理] 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 所有非 API 请求交给 Next.js 处理
server.use((req, res) => {
  return handle(req, res);
});

app.prepare().then(async () => {
  // 启动时验证服务端 Cookie
  await validateServerCookie();

  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> ${dev ? '开发' : '生产'}模式`);
  });
});
