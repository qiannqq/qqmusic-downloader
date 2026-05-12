'use client';

import { useState, useEffect } from 'react';
import { Check, X, HelpCircle, Save, Trash2, AlertCircle, Loader2, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { verifyCookie } from '../lib/api';

export default function CookieManager({ highQuality, onHighQualityChange, serverCookieStatus }) {
  const [cookie, setCookie] = useState('');
  const [savedCookie, setSavedCookie] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [verifyError, setVerifyError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showCookie, setShowCookie] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('qqmusic_cookie');
    if (saved) {
      setCookie(saved);
      setSavedCookie(saved);
      setVerifyStatus('success');
    }
  }, []);

  const showStatus = (msg) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleVerify = async () => {
    const trimmed = cookie.trim();
    if (!trimmed) return;
    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyError('');
    try {
      await verifyCookie(trimmed);
      setVerifyStatus('success');
    } catch (err) {
      setVerifyStatus('error');
      setVerifyError(err.message || '验证失败');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    const trimmed = cookie.trim();
    if (!trimmed) return;
    localStorage.setItem('qqmusic_cookie', trimmed);
    setSavedCookie(trimmed);
    showStatus('Cookie 已保存');
  };

  const handleClear = () => {
    localStorage.removeItem('qqmusic_cookie');
    setCookie('');
    setSavedCookie('');
    setVerifyStatus('idle');
    setVerifyError('');
    showStatus('Cookie 已删除');
  };

  const hasInput = cookie.trim().length > 0;
  const isSaved = savedCookie && cookie.trim() === savedCookie.trim();
  const showActions = hasInput || savedCookie;

  const hasServerCookie = serverCookieStatus?.isValid;

  return (
    <div className="cookie-section">
      {/* Server Cookie Status */}
      {hasServerCookie && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '14px 18px',
          border: '3px solid var(--accent-2)',
          background: 'rgba(5, 217, 232, 0.06)',
          transition: 'all 0.3s ease'
        }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} color="var(--accent-2)" />
            服务端 Cookie
          </span>
          <span style={{
            color: 'var(--accent-2)',
            fontWeight: 900,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-2)',
              display: 'inline-block',
              boxShadow: '0 0 8px var(--accent-2)'
            }} />
            已配置
          </span>
        </div>
      )}

      {hasServerCookie && (
        <p style={{ color: 'var(--fg-muted)', marginBottom: '20px', fontSize: '0.85rem', lineHeight: 1.6 }}>
          服务端已配置 Cookie，无需手动填写
        </p>
      )}

      {/* Status Card */}
      {!hasServerCookie && (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '14px 18px',
            border: `3px solid ${savedCookie ? 'var(--accent-2)' : 'var(--border)'}`,
            background: savedCookie ? 'rgba(5, 217, 232, 0.06)' : 'var(--bg-elevated)',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color={savedCookie ? 'var(--accent-2)' : 'var(--fg-muted)'} />
              Cookie 状态
            </span>
            <span style={{
              color: savedCookie ? 'var(--accent-2)' : 'var(--fg-muted)',
              fontWeight: 900,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: savedCookie ? 'var(--accent-2)' : 'var(--fg-muted)',
                display: 'inline-block',
                boxShadow: savedCookie ? '0 0 8px var(--accent-2)' : 'none'
              }} />
              {savedCookie ? '已配置' : '未配置'}
            </span>
          </div>

          <p style={{ color: 'var(--fg-muted)', marginBottom: '20px', fontSize: '0.85rem', lineHeight: 1.6 }}>
            设置 QQ音乐 Cookie 以获取会员/高品质资源
          </p>
        </>
      )}

      {/* High Quality Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        padding: '14px 18px',
        border: `3px solid ${highQuality ? 'var(--accent-2)' : 'var(--border)'}`,
        background: highQuality ? 'rgba(5, 217, 232, 0.05)' : 'transparent',
        transition: 'all 0.3s ease'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'none', flex: 1 }}>
          <input
            type="checkbox"
            className="checkbox-brutal"
            checked={highQuality}
            onChange={(e) => onHighQualityChange?.(e.target.checked)}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>高品质 (320kbps)</div>
            <div style={{ color: 'var(--fg-muted)', fontSize: '0.75rem' }}>需会员 Cookie</div>
          </div>
          {highQuality && <span className="badge-brutal hq">HQ</span>}
        </label>
      </div>

      {!hasServerCookie && (
        <>
          {/* Help Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <button
              className="btn-brutal"
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              onClick={() => setShowHelp(!showHelp)}
            >
              <HelpCircle size={14} style={{ marginRight: '6px' }} />
              {showHelp ? '隐藏帮助' : '查看帮助'}
            </button>
          </div>

          {/* Help Content */}
          <div style={{
            maxHeight: showHelp ? '500px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease, opacity 0.35s ease, margin 0.35s ease',
            opacity: showHelp ? 1 : 0,
            marginBottom: showHelp ? '20px' : '0px'
          }}>
            <div className="help-brutal">
              <p><strong>QQ 登录常用字段</strong> uin、psrf_qqopenid、psrf_qqunionid、psrf_qqrefresh_token、qqmusic_key / qm_keyst</p>
              <p style={{ marginTop: '10px' }}><strong>微信登录常用字段</strong> wxuin、wxopenid、wxunionid、wxrefresh_token、qqmusic_key / qm_keyst</p>
              <p style={{ marginTop: '10px', color: 'var(--fg-muted)' }}>在浏览器中登录 y.qq.com，按 F12 打开开发者工具，在 Application {'>'} Cookies 中复制 Cookie 字符串</p>
            </div>
          </div>

          {/* Cookie Input */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={cookie}
              onChange={(e) => {
                setCookie(e.target.value);
                if (e.target.value.trim() !== savedCookie.trim()) {
                  setVerifyStatus('idle');
                  setVerifyError('');
                }
              }}
              placeholder={savedCookie ? '已保存 Cookie，可在此修改...' : '粘贴 QQ音乐 Cookie 字符串...'}
              className="cookie-input"
              style={{
                height: '480px',
                borderColor: verifyStatus === 'error' ? 'var(--accent)' : verifyStatus === 'success' ? 'var(--accent-2)' : undefined,
                boxShadow: verifyStatus === 'error' ? '4px 4px 0 rgba(255, 42, 109, 0.3)' : verifyStatus === 'success' ? '4px 4px 0 rgba(5, 217, 232, 0.3)' : undefined,
                color: showCookie ? 'var(--fg)' : 'transparent',
                caretColor: showCookie ? 'var(--fg)' : 'transparent',
              }}
            />
            {!showCookie && cookie && (
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                right: '3px',
                bottom: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'var(--bg-elevated)',
                border: '3px solid var(--border)',
                fontSize: '0.9rem',
                color: 'var(--fg-muted)',
                pointerEvents: 'none',
                zIndex: 1,
              }}>
                <ShieldCheck size={16} />
                Cookie 内容已隐藏
              </div>
            )}
            <button
              onClick={() => setShowCookie(!showCookie)}
              style={{
                position: 'absolute',
                top: '12px',
                right: cookie ? '12px' : '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                background: 'var(--bg)',
                border: '2px solid var(--border)',
                color: 'var(--fg-muted)',
                cursor: 'none',
                zIndex: 2,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--fg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--fg-muted)';
              }}
              title={showCookie ? '隐藏 Cookie' : '显示 Cookie'}
            >
              {showCookie ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {isSaved && (
              <div style={{
                position: 'absolute',
                top: '52px',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'var(--accent-2)',
                color: '#000',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                border: '2px solid #000',
                zIndex: 2,
              }}>
                <Check size={12} />
                已保存
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '16px',
              flexWrap: 'wrap',
              animation: 'fadeInUp 0.3s ease'
            }}>
              {verifyStatus !== 'success' && (
                <button
                  className="btn-brutal"
                  onClick={handleVerify}
                  disabled={isVerifying || !hasInput}
                  style={{ minWidth: '100px', justifyContent: 'center' }}
                >
                  {isVerifying ? (
                    <Loader2 size={14} className="spin" style={{ marginRight: '6px' }} />
                  ) : verifyStatus === 'error' ? (
                    <ShieldAlert size={14} style={{ marginRight: '6px' }} />
                  ) : (
                    <ShieldCheck size={14} style={{ marginRight: '6px' }} />
                  )}
                  {isVerifying ? '验证中' : verifyStatus === 'error' ? '重新验证' : '验证'}
                </button>
              )}

              {verifyStatus === 'success' && (
                <button
                  className="btn-brutal"
                  onClick={handleSave}
                  disabled={isSaved}
                  style={{
                    minWidth: '100px',
                    justifyContent: 'center',
                    opacity: isSaved ? 0.5 : 1
                  }}
                >
                  <Save size={14} style={{ marginRight: '6px' }} />
                  {isSaved ? '已保存' : '保存'}
                </button>
              )}

              <button
                className="btn-brutal accent-2"
                onClick={handleClear}
                style={{ minWidth: '100px', justifyContent: 'center' }}
              >
                <Trash2 size={14} style={{ marginRight: '6px' }} />
                删除
              </button>
            </div>
          )}

          {/* Error Message */}
          {verifyStatus === 'error' && verifyError && (
            <div className="status-brutal error" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              {verifyError}
            </div>
          )}

          {/* Success Toast */}
          {showSuccess && (
            <div className="status-brutal success" style={{ animation: 'fadeInUp 0.3s ease' }}>
              <Check size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              {successMsg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
