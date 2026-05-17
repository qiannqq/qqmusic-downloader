import express from 'express';
import QQMusic from '../../src/qqMusic.js';

const app = express();

app.use(express.json());

// 从逐字段环境变量组装 Cookie
// 支持的字段：QM_UIN, QM_QQUNIONID, QM_TMELOGINTYPE, QM_QQMUSIC_KEY, 
//             QM_ACCESS_TOKEN, QM_OPENID, QM_REFRESH_TOKEN, QM_EXPIRES_AT
function getServerCookie() {
  // 向后兼容：如果配置了 QM_COOKIES，优先使用旧格式
  const legacyCookie = process.env.QM_COOKIES || '';
  if (legacyCookie) {
    return legacyCookie;
  }

  const fields = [];

  // 核心字段
  const uin = process.env.QM_UIN || '';
  const unionid = process.env.QM_QQUNIONID || '';
  const loginType = process.env.QM_TMELOGINTYPE || '';
  const musicKey = process.env.QM_QQMUSIC_KEY || '';

  if (!uin || !musicKey) {
    return '';
  }

  fields.push(`uin=${uin}`);

  if (unionid) {
    fields.push(`psrf_qqunionid=${unionid}`);
  }

  if (loginType) {
    fields.push(`tmeLoginType=${loginType}`);
  }

  fields.push(`qqmusic_key=${musicKey}`);

  // 兼容字段：qm_keyst 与 qqmusic_key 相同
  fields.push(`qm_keyst=${musicKey}`);

  // Token 字段（可选）
  const accessToken = process.env.QM_ACCESS_TOKEN || '';
  const openid = process.env.QM_OPENID || '';
  const refreshToken = process.env.QM_REFRESH_TOKEN || '';
  const expiresAt = process.env.QM_EXPIRES_AT || '';

  if (accessToken) fields.push(`psrf_qqaccess_token=${accessToken}`);
  if (openid) fields.push(`psrf_qqopenid=${openid}`);
  if (refreshToken) fields.push(`psrf_qqrefresh_token=${refreshToken}`);
  if (expiresAt) fields.push(`psrf_access_token_expiresAt=${expiresAt}`);

  // 辅助字段
  const euin = process.env.QM_EUIN || '';
  const createTime = process.env.QM_MUSICKEY_CREATETIME || '';

  if (euin) fields.push(`euin=${euin}`);
  if (createTime) fields.push(`psrf_musickey_createtime=${createTime}`);

  return fields.join(';');
}

// 服务端 Cookie 验证状态
let serverCookieStatus = {
  hasCookie: false,
  isValid: false,
  checkedAt: null,
  cookieLength: 0,
  errorMsg: ''
};

// 是否已经尝试过验证
let validationAttempted = false;

// 验证服务端 Cookie（在请求时调用，确保环境变量已注入）
async function validateServerCookie() {
  const cookie = getServerCookie();
  const envKeys = Object.keys(process.env).filter(k => k.startsWith('QM_'));

  console.log('[Cookie] 环境变量读取结果:', {
    hasValue: !!cookie,
    length: cookie.length,
    envKeys,
    source: envKeys.length > 0 ? '逐字段' : (process.env.QM_COOKIES ? '旧格式' : '未配置')
  });

  if (!cookie) {
    serverCookieStatus = { hasCookie: false, isValid: false, checkedAt: new Date(), cookieLength: 0, errorMsg: '环境变量未设置，请配置 QM_UIN 和 QM_QQMUSIC_KEY' };
    console.log('[Cookie] 未配置环境变量');
    return;
  }

  try {
    const qqMusic = new QQMusic({ cookie });
    // 使用查询用户信息验证（搜索不需要有效Cookie也能工作）
    const isValid = await qqMusic.validateCookie();
    if (isValid) {
      serverCookieStatus = { hasCookie: true, isValid: true, checkedAt: new Date(), cookieLength: cookie.length, errorMsg: '' };
      console.log('[Cookie] 服务端 Cookie 验证通过 ✓');
    } else {
      serverCookieStatus = { hasCookie: true, isValid: false, checkedAt: new Date(), cookieLength: cookie.length, errorMsg: 'Cookie 已失效' };
      console.log('[Cookie] 服务端 Cookie 验证失败：Cookie 已失效');
    }
  } catch (error) {
    serverCookieStatus = { hasCookie: true, isValid: false, checkedAt: new Date(), cookieLength: cookie.length, errorMsg: error.message };
    console.log('[Cookie] 服务端 Cookie 验证失败：', error.message);
  }
}

// 延迟验证：在第一次请求时触发
async function ensureValidated() {
  if (!validationAttempted) {
    validationAttempted = true;
    await validateServerCookie();
  }
}

async function getQQMusic(req) {
  // 确保已验证（第一次请求时触发）
  await ensureValidated();

  // 优先使用有效的服务端 Cookie
  const serverCookie = serverCookieStatus.isValid ? getServerCookie() : '';
  const clientCookie = req.headers['x-qqmusic-cookie'] || '';
  const cookie = serverCookie || clientCookie;
  return new QQMusic({
    cookie,
    highQuality: req.query.highQuality === 'true'
  });
}

// Cookie 状态接口（不暴露 Cookie 值，但返回调试信息）
app.get('/cookie-status', async (req, res) => {
  // 确保已验证（触发一次验证）
  await ensureValidated();

  const cookie = getServerCookie();

  // 检测当前使用的配置方式
  const hasLegacy = !!process.env.QM_COOKIES;
  const hasFields = !!(process.env.QM_UIN || process.env.QM_QQMUSIC_KEY);
  const configSource = hasLegacy ? 'legacy' : (hasFields ? 'fields' : 'none');

  // Cookie 存在即算 hasServerCookie，isValid 表示验证是否通过
  const hasCookie = !!cookie;

  res.json({
    code: 0,
    data: {
      hasServerCookie: hasCookie,
      isValid: serverCookieStatus.isValid,
      needClientCookie: !serverCookieStatus.isValid,
      configSource,
      // 调试信息
      debug: {
        envVarSet: hasCookie,
        cookieLength: cookie.length,
        checkedAt: serverCookieStatus.checkedAt,
        errorMsg: serverCookieStatus.errorMsg,
        // 显示已配置的环境变量（不包含值）
        configuredVars: Object.keys(process.env).filter(k => k.startsWith('QM_')),
        // 使用提示
        hint: !hasCookie
          ? '请配置环境变量: QM_UIN, QM_QQMUSIC_KEY 等（参考 .env.example）'
          : (!serverCookieStatus.isValid ? `验证未通过: ${serverCookieStatus.errorMsg}` : undefined)
      }
    }
  });
});

app.get('/search', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: 'keyword 不能为空' });
    }
    const qqMusic = await getQQMusic(req);
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
    const qqMusic = await getQQMusic(req);
    
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
    const qqMusic = await getQQMusic(req);
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
    const qqMusic = await getQQMusic(req);
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
    const qqMusic = await getQQMusic(req);
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
    const qqMusic = await getQQMusic(req);
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

app.post('/parse-url', async (req, res) => {
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

app.post('/song/download', async (req, res) => {
  try {
    const { song, filename } = req.body;
    console.log('[download] 收到请求, mid:', song?.mid, '文件名:', filename);
    
    if (!song || !song.mid) {
      return res.status(400).json({ error: 'song.mid 不能为空' });
    }

    const qqMusic = await getQQMusic(req);
    
    console.log('[download] 正在获取 URL...');
    const playUrl = await qqMusic.getMusicUrl(song, { highQuality: true });
    if (!playUrl) {
      return res.status(500).json({ error: '无法获取播放链接' });
    }
    
    console.log('[download] 获取到 URL:', playUrl.substring(0, 200));
    
    // 云函数环境：返回直链，前端处理下载（POST 请求不适合 302）
    const safeFilename = filename || `${song.name} - ${song.artist}.mp3`;
    res.json({ 
      code: 0, 
      data: { 
        url: playUrl, 
        filename: safeFilename 
      } 
    });
  } catch (error) {
    console.error('[download] 错误:', error);
    res.status(500).json({ error: error.message });
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

// 音频代理接口（用于试听）- 使用 302 重定向避免云函数 6MB 限制
app.get('/proxy/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'url 不能为空' });
    }

    const targetUrl = decodeURIComponent(url);
    console.log('[proxy audio] 代理URL:', targetUrl.substring(0, 150));

    // 优先使用有效的服务端 Cookie
    const serverCookie = serverCookieStatus.isValid ? getServerCookie() : '';
    const clientCookie = req.headers['x-qqmusic-cookie'] || '';
    const cookie = serverCookie || clientCookie;

    // 使用 HEAD 请求验证音频 URL 是否有效
    console.log('[proxy audio] 验证音频 URL...');
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      headers: {
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookie
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error('[proxy audio] URL 验证失败:', response.status);
      return res.status(response.status).send('获取音频失败');
    }

    const contentLength = response.headers.get('content-length');
    console.log('[proxy audio] URL 验证通过, Content-Length:', contentLength);

    // 302 重定向到原始 URL，避免云函数 6MB 限制
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.redirect(targetUrl);

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
    
    // 云函数环境：302 重定向，避免 6MB 限制
    console.log('[download proxy] 云函数环境，使用 302 重定向');
    return res.redirect(targetUrl);
  } catch (error) {
    console.error('[download proxy] 错误:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
