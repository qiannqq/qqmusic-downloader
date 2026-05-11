import crypto from 'crypto';

const MUSICU_URL = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
const STREAM_HOST = 'http://ws.stream.qqmusic.qq.com/';
const LYRIC_URL = 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg';

export default class QQMusic {
  constructor(options = {}) {
    this.highQuality = Boolean(options.highQuality);
    this.cookieMap = new Map();
    this.cookie = '';
    this.uin = String(options.uin || '0');
    this.guid = this.#md5(`${this.uin || '000000'}music`);

    if (options.cookie) {
      this.setCookie(options.cookie);
    }
  }

  setCookie(cookie) {
    this.cookieMap = QQMusic.parseCookie(cookie);
    this.cookie = QQMusic.stringifyCookie(this.cookieMap);
    this.uin = String(this.cookieMap.get('uin') || this.cookieMap.get('wxuin') || this.uin || '0');
    this.guid = this.#md5(`${this.uin || '000000'}music`);
    return this;
  }

  async search(keyword, page = 1, pageSize = 10) {
    if (!keyword || !String(keyword).trim()) {
      throw new Error('keyword 不能为空');
    }

    const body = {
      comm: { uin: '0', authst: '', ct: 29 },
      search: {
        method: 'DoSearchForQQMusicMobile',
        module: 'music.search.SearchCgiService',
        param: {
          grp: 1,
          num_per_page: pageSize,
          page_num: page,
          query: String(keyword).trim(),
          remoteplace: 'miniapp.1109523715',
          search_type: 0,
          searchid: String(Math.floor(Math.random() * 10000000))
        }
      }
    };

    const res = await this.#requestMusicu(body, {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)'
    });

    if (!this.#isOkCode(res.code)) {
      return [];
    }

    const data = res.search?.data?.body || {};
    const list = data.song?.list || data.item_song || [];
    return list.map(item => this.normalizeSong(item));
  }

  normalizeSong(data) {
    const mid = data.mid || data.songmid || '';
    const singers = Array.isArray(data.singer) ? data.singer : [];
    const artist = singers.map(item => item.name).filter(Boolean).join('/');
    const albumMid = data.album?.mid || '';
    const singerMid = singers[0]?.mid || '';
    const vsPic = data.vs?.[1] || '';
    const picKey = vsPic
      ? `T062R150x150M000${vsPic}`
      : albumMid
        ? `T002R150x150M000${albumMid}`
        : singerMid
          ? `T001R150x150M000${singerMid}`
          : '';

    return {
      id: mid,
      mid,
      mediaMid: data.file?.media_mid || '',
      name: String(data.title || data.name || '').replace(/<\/?em>/g, ''),
      artist,
      pic: picKey ? `http://y.gtimg.cn/music/photo_new/${picKey}.jpg` : '',
      link: mid ? `https://y.qq.com/n/yqq/song/${mid}.html` : '',
      source: 'qq',
      raw: data,
      data
    };
  }

  async getMusicUrl(song, options = {}) {
    const data = this.#getRawSong(song);
    const mid = this.#getSongMid(song);

    if (!mid) {
      throw new Error('song.mid 不能为空，请传入 search() 返回的歌曲对象或 songmid 字符串');
    }

    let playUrl = this.#createLegacyPlayUrl(mid);
    const highQuality = options.highQuality ?? this.highQuality;
    const needVkey = Boolean(
      options.forceVkey ||
      highQuality ||
      (data.sa === 0 && data.pay?.price_track === 0) ||
      data.pay?.pay_play === 1
    );

    if (!needVkey) {
      return playUrl;
    }

    const result = await this.getVkey(song, { highQuality });
    if (result.url) {
      playUrl = result.url;
    }

    return playUrl;
  }

  async getVkey(song, options = {}) {
    const data = this.#getRawSong(song);
    const mid = this.#getSongMid(song);

    if (!mid) {
      throw new Error('song.mid 不能为空');
    }

    const param = {
      guid: this.#md5(String(Date.now())),
      songmid: [mid],
      songtype: [0],
      uin: this.uin || '0',
      ctx: 1
    };

    if (options.highQuality) {
      const mediaMid = data.file?.media_mid || data.mediaMid || data.strMediaMid || mid;
      const qualityList = [
        ['size_320mp3', 'M800', 'mp3'],
        ['size_192ogg', 'O600', 'ogg'],
        ['size_128mp3', 'M500', 'mp3'],
        ['size_96aac', 'C400', 'm4a']
      ];

      const filename = [];
      const songmid = [];
      const songtype = [];

      for (const quality of qualityList) {
        const [sizeKey, prefix, ext] = quality;
        if (data.file && Number(data.file[sizeKey] || 0) < 1) {
          continue;
        }
        songmid.push(mid);
        songtype.push(0);
        filename.push(`${prefix}${mediaMid}.${ext}`);
      }

      if (filename.length > 0) {
        param.filename = filename;
        param.songmid = songmid;
        param.songtype = songtype;
      }
    }

    const body = {
      comm: this.#createQQMusicComm(),
      req_0: {
        module: 'vkey.GetVkeyServer',
        method: 'CgiGetVkey',
        param
      }
    };

    const res = await this.#requestMusicu(body, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (!this.#isOkCode(res.req_0?.code)) {
      return { url: '', purl: '', raw: res };
    }

    const midurlinfo = res.req_0?.data?.midurlinfo || [];
    const item = midurlinfo.find(info => info?.purl);
    const purl = item?.purl || '';

    return {
      url: purl ? `${STREAM_HOST}${purl}` : '',
      purl,
      raw: item || res
    };
  }

  async getFirstSong(keyword, options = {}) {
    const list = await this.search(keyword, options.page || 1, options.pageSize || 10);
    const song = list[0];

    if (!song) {
      return null;
    }

    return {
      ...song,
      url: await this.getMusicUrl(song, { highQuality: options.highQuality })
    };
  }

  async getLyric(song) {
    const mid = this.#getSongMid(song);

    if (!mid) {
      throw new Error('song.mid 不能为空');
    }

    const url = `${LYRIC_URL}?_=${Date.now()}&cv=4747474&ct=24&format=json&inCharset=utf-8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=1&uin=0&g_tk_new_20200303=5381&g_tk=5381&loginUin=0&songmid=${encodeURIComponent(mid)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
        'Referer': 'https://y.qq.com/',
        'Cookie': this.cookie
      }
    });
    const res = await response.json();

    return {
      lyric: res.lyric ? Buffer.from(res.lyric, 'base64').toString('utf8') : '',
      trans: res.trans ? Buffer.from(res.trans, 'base64').toString('utf8') : '',
      raw: res
    };
  }

  async refreshCookie() {
    const loginType = this.cookieMap.get('wxunionid') ? 'wx' : this.cookieMap.get('psrf_qqunionid') ? 'qq' : '';

    if (!loginType) {
      throw new Error('cookie 中缺少 wxunionid 或 psrf_qqunionid，无法判断 QQ音乐登录类型');
    }

    const body = {
      comm: this.#createQQMusicComm(),
      req_0: {
        method: 'Login',
        module: 'music.login.LoginServer',
        param: {
          access_token: '',
          expired_in: 0,
          forceRefreshToken: 0,
          musicid: 0,
          musickey: this.cookieMap.get('qqmusic_key') || this.cookieMap.get('qm_keyst') || '',
          onlyNeedAccessToken: 0,
          openid: '',
          refresh_token: '',
          unionid: ''
        }
      }
    };

    const param = body.req_0.param;
    if (loginType === 'qq') {
      param.appid = 100497308;
      param.access_token = this.cookieMap.get('psrf_qqaccess_token') || '';
      param.musicid = Number(this.cookieMap.get('uin') || '0');
      param.openid = this.cookieMap.get('psrf_qqopenid') || '';
      param.refresh_token = this.cookieMap.get('psrf_qqrefresh_token') || '';
      param.unionid = this.cookieMap.get('psrf_qqunionid') || '';
    } else {
      param.strAppid = 'wx48db31d50e334801';
      param.access_token = this.cookieMap.get('wxaccess_token') || '';
      param.str_musicid = this.cookieMap.get('wxuin') || '0';
      param.openid = this.cookieMap.get('wxopenid') || '';
      param.refresh_token = this.cookieMap.get('wxrefresh_token') || '';
      param.unionid = this.cookieMap.get('wxunionid') || '';
    }

    const res = await this.#requestMusicu(body, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (!this.#isOkCode(res.req_0?.code)) {
      throw new Error('QQ音乐 cookie 刷新失败');
    }

    const data = res.req_0?.data || {};
    const map = new Map(this.cookieMap);

    if (loginType === 'qq') {
      map.set('psrf_qqopenid', data.openid);
      map.set('psrf_qqrefresh_token', data.refresh_token);
      map.set('psrf_qqaccess_token', data.access_token);
      map.set('psrf_access_token_expiresAt', data.expired_at);
      map.set('uin', String(data.str_musicid || data.musicid || '0'));
      map.set('psrf_qqunionid', data.unionid);
      map.set('login_type', 1);
      map.set('tmeLoginType', 2);
    } else {
      map.set('wxopenid', data.openid);
      map.set('wxrefresh_token', data.refresh_token);
      map.set('wxaccess_token', data.access_token);
      map.set('wxuin', String(data.str_musicid || data.musicid || '0'));
      map.set('wxunionid', data.unionid);
      map.set('login_type', 2);
      map.set('tmeLoginType', 1);
    }

    map.set('qqmusic_key', data.musickey);
    map.set('qm_keyst', data.musickey);
    map.set('psrf_musickey_createtime', data.musickeyCreateTime);
    map.set('euin', data.encryptUin);

    this.setCookie(map);

    return {
      cookie: this.cookie,
      map: this.cookieMap,
      raw: data
    };
  }

  static parseCookie(cookie = '') {
    if (cookie instanceof Map) {
      return new Map(cookie);
    }

    if (typeof cookie === 'object' && cookie !== null) {
      return new Map(Object.entries(cookie));
    }

    const map = new Map();
    String(cookie).split(';').forEach(item => {
      const text = item.trim();
      if (!text) {
        return;
      }

      const index = text.indexOf('=');
      if (index < 0) {
        return;
      }

      map.set(text.slice(0, index).trim(), text.slice(index + 1).trim());
    });

    return map;
  }

  static stringifyCookie(cookie = '') {
    if (typeof cookie === 'string') {
      return cookie;
    }

    const map = cookie instanceof Map ? cookie : new Map(Object.entries(cookie || {}));
    return [...map.entries()]
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  async #requestMusicu(body, headers = {}) {
    const response = await fetch(MUSICU_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookie,
        ...headers
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`QQ音乐接口请求失败：${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  #createQQMusicComm() {
    const loginType = this.cookieMap.get('wxunionid') ? 1 : Number(this.cookieMap.get('tmeLoginType') || '2');
    const qqUnionId = this.cookieMap.get('psrf_qqunionid') || '';
    const wxUnionId = this.cookieMap.get('wxunionid') || '';

    return {
      _channelid: '19',
      _os_version: '6.2.9200-2',
      authst: this.cookieMap.get('qqmusic_key') || this.cookieMap.get('qm_keyst') || '',
      ct: '19',
      cv: '1891',
      guid: this.guid,
      patch: '118',
      psrf_access_token_expiresAt: Number(this.cookieMap.get('psrf_access_token_expiresAt') || 0),
      psrf_qqaccess_token: this.cookieMap.get('psrf_qqaccess_token') || '',
      psrf_qqopenid: this.cookieMap.get('psrf_qqopenid') || '',
      psrf_qqunionid: qqUnionId || wxUnionId,
      tmeAppID: 'qqmusic',
      tmeLoginType: loginType,
      uin: this.cookieMap.get('uin') || '0',
      wid: this.cookieMap.get('wxuin') || '0'
    };
  }

  #createLegacyPlayUrl(mid) {
    const code = this.#md5(`${mid}q;z(&l~sdf2!nK`).substring(0, 5).toUpperCase();
    return `http://c6.y.qq.com/rsc/fcgi-bin/fcg_pyq_play.fcg?songid=&songmid=${encodeURIComponent(mid)}&songtype=1&fromtag=50&uin=${encodeURIComponent(this.uin || '0')}&code=${code}`;
  }

  #getRawSong(song) {
    if (typeof song === 'string') {
      return { mid: song };
    }

    return song?.raw || song?.data || song || {};
  }

  #getSongMid(song) {
    if (typeof song === 'string') {
      return song;
    }

    return song?.mid || song?.id || song?.raw?.mid || song?.data?.mid || '';
  }

  #isOkCode(code) {
    return code === 0 || code === '0';
  }

  #md5(text) {
    return crypto.createHash('md5').update(String(text)).digest('hex');
  }
}
