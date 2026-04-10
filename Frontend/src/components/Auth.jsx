import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/components/Auth.css';

const animatedRoles = ['Users', 'Divers', 'Mates'];
const desktopMediaQuery = '(min-width: 769px)';
const desktopBackgroundSrc = '/Backgrounds/desktop.mp4';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const getIsDesktopViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(desktopMediaQuery).matches;
const getSocialAuthBaseUrl = () => {
  if (/^https?:\/\//i.test(API_BASE_URL)) return API_BASE_URL;
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    API_BASE_URL.startsWith('/')
  ) {
    return `http://${window.location.hostname}:5000${API_BASE_URL}`;
  }
  return API_BASE_URL;
};
const getSocialRedirectTarget = () =>
  typeof window === 'undefined'
    ? '/'
    : `${window.location.origin}${window.location.pathname}`;
const getBackendUnavailableMessage = () =>
  'Backend server is off. Start the backend first for login or social sign-in.';

// ── Ship SVG icon ─────────────────────────────────────────────────────────────
const ShipIcon = () => (
  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Hull */}
    <path d="M8 35 L11 43 Q27 50 43 43 L46 35 Z" fill="rgba(255,255,255,0.96)" />
    {/* Body */}
    <path d="M13 35 L13 26 L32 26 L41 35 Z" fill="rgba(255,255,255,0.92)" />
    {/* Cabin */}
    <rect x="15" y="18" width="14" height="10" rx="2.5" fill="rgba(255,255,255,0.88)" />
    {/* Mast */}
    <line x1="22" y1="7" x2="22" y2="18" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" />
    {/* Flag */}
    <path d="M22 7 L31 11 L22 15 Z" fill="#e040fb" />
    {/* Porthole */}
    <circle cx="34" cy="30" r="3.2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" />
    {/* Waves */}
    <path d="M5 46 Q12 44 19 46 Q26 48 33 46 Q40 44 49 46" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M8 50 Q16 48 24 50 Q32 52 42 50" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </svg>
);

// ── Splash / Welcome screen ───────────────────────────────────────────────────
const MobileWelcomeScreen = ({ onGetStarted }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(triggerExit, 3000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerExit = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    // Wait for CSS slide-out (600 ms) then unmount + show login
    setTimeout(onGetStarted, 600);
  };

  return (
    <div className={`ds-splash${exiting ? ' ds-splash--exit' : ''}`}>
      <div className="ds-splash__glow ds-splash__glow--tl" aria-hidden="true" />
      <div className="ds-splash__glow ds-splash__glow--br" aria-hidden="true" />
      <div className="ds-splash__logo">
        <ShipIcon />
        <div className="ds-splash__wordmark">
          <span className="ds-splash__name">Data Suite</span>
          <span className="ds-splash__tag">Route Intelligence</span>
        </div>
      </div>
    </div>
  );
};

MobileWelcomeScreen.propTypes = {
  onGetStarted: PropTypes.func.isRequired,
};

// ── Everything below is 100% UNTOUCHED from original ─────────────────────────

const MobileHeaderCube = () => (
  <div className="mobile-auth-cube-wrap" aria-hidden="true">
    <div className="mobile-auth-cube-scene">
      <div className="mobile-auth-cube">
        <span className="mobile-auth-cube-face mobile-auth-cube-front" />
        <span className="mobile-auth-cube-face mobile-auth-cube-back" />
        <span className="mobile-auth-cube-face mobile-auth-cube-right" />
        <span className="mobile-auth-cube-face mobile-auth-cube-left" />
        <span className="mobile-auth-cube-face mobile-auth-cube-top" />
        <span className="mobile-auth-cube-face mobile-auth-cube-bottom" />
      </div>
    </div>
  </div>
);

const PasswordEyeIcon = ({ visible }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.25 12C3.95 8.8 7.36 6.75 12 6.75C16.64 6.75 20.05 8.8 21.75 12C20.05 15.2 16.64 17.25 12 17.25C7.36 17.25 3.95 15.2 2.25 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    {!visible && (
      <path
        d="M4 4L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )}
  </svg>
);

PasswordEyeIcon.propTypes = {
  visible: PropTypes.bool.isRequired,
};

const Auth = ({ onAuthSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [currentRole, setCurrentRole] = useState(animatedRoles[0]);
  const [roleIndex, setRoleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(getIsDesktopViewport);
  const [isDesktopBackgroundLoaded, setIsDesktopBackgroundLoaded] = useState(
    () => !getIsDesktopViewport()
  );
  const desktopBackgroundRef = useRef(null);

  const showDesktopOverlay = isDesktopViewport && isDesktopBackgroundLoaded;
  const showDesktopCard = !isDesktopViewport || isDesktopBackgroundLoaded;

  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => document.body.classList.remove('auth-page');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const authToken = searchParams.get('auth_token');
    const authUsername = searchParams.get('auth_username');
    const authEmail = searchParams.get('auth_email');
    const authError = searchParams.get('auth_error');

    if (!authToken && !authError) return;

    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);

    if (authError) {
      setShowWelcome(false);
      setSuccessMessage('');
      setError(authError);
      return;
    }

    if (authToken && authUsername) {
      const socialUser = {
        username: authUsername,
        email: authEmail || '',
      };

      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userData', JSON.stringify(socialUser));
      onAuthSuccess(socialUser);
    }
  }, [onAuthSuccess]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(desktopMediaQuery);
    const handleViewportChange = (event) => setIsDesktopViewport(event.matches);
    setIsDesktopViewport(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }
    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isDesktopViewport) {
      setIsDesktopBackgroundLoaded(true);
      return undefined;
    }
    const backgroundVideo = desktopBackgroundRef.current;
    const videoAlreadyReady = Boolean(backgroundVideo && backgroundVideo.readyState >= 2);
    setIsDesktopBackgroundLoaded(videoAlreadyReady);
    return undefined;
  }, [isDesktopViewport]);

  useEffect(() => {
    if (!showDesktopOverlay) return;
    const currentWord = animatedRoles[roleIndex];
    let timer;
    if (!isDeleting) {
      if (currentRole.length < currentWord.length) {
        timer = setTimeout(
          () => setCurrentRole(currentWord.slice(0, currentRole.length + 1)),
          120
        );
      } else {
        timer = setTimeout(() => setIsDeleting(true), 1000);
      }
    } else {
      if (currentRole.length > 0) {
        timer = setTimeout(
          () => setCurrentRole(currentWord.slice(0, currentRole.length - 1)),
          80
        );
      } else {
        setIsDeleting(false);
        setRoleIndex((prev) => (prev + 1) % animatedRoles.length);
      }
    }
    return () => clearTimeout(timer);
  }, [showDesktopOverlay, currentRole, isDeleting, roleIndex]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignup && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const loginIdentifier = (formData.email || formData.username).trim();
      const endpoint = isSignup
        ? `${API_BASE_URL}/auth/signup`
        : `${API_BASE_URL}/auth/signin`;
      const payload = isSignup
        ? { username: formData.username, email: formData.email, password: formData.password }
        : { identifier: loginIdentifier, password: formData.password };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      clearTimeout(timeoutId);

      let data = {};
      try { data = await response.json(); } catch { data = {}; }

      if (response.ok) {
        if (isSignup) {
          setIsSignup(false);
          setFormData({
            username: '',
            email: formData.email,
            password: '',
            confirmPassword: '',
          });
          setSuccessMessage('Account created! Please sign in.');
        } else {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem(
            'userData',
            JSON.stringify(data.user || { username: formData.username })
          );
          onAuthSuccess(data.user || { username: formData.username });
        }
      } else {
        setError(data.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Network error. Could not connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setSuccessMessage('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const toggleInfoPopup = () => setShowInfoPopup((prev) => !prev);
  const handleDesktopBackgroundReady = () => setIsDesktopBackgroundLoaded(true);
  const handleSocialAuth = async (provider) => {
    if (typeof window === 'undefined') return;
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const healthResponse = await fetch(`${getSocialAuthBaseUrl()}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!healthResponse || healthResponse.status >= 500) {
        setError(getBackendUnavailableMessage());
        return;
      }

      window.location.assign(
        `${getSocialAuthBaseUrl()}/auth/oauth/${provider}/start?frontend_redirect=${encodeURIComponent(
          getSocialRedirectTarget()
        )}`
      );
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      setError(getBackendUnavailableMessage());
    } finally {
      setLoading(false);
    }
  };

  // ── Mobile splash (3 s then auto-routes to login) ──
  if (!isDesktopViewport && showWelcome) {
    return (
      <div className="auth-container mobile-background-ready ds-splash-host">
        <MobileWelcomeScreen onGetStarted={() => setShowWelcome(false)} />
      </div>
    );
  }

  return (
    <div
      className={`auth-container ${
        isDesktopViewport
          ? isDesktopBackgroundLoaded
            ? 'desktop-background-ready'
            : 'desktop-background-loading'
          : 'mobile-background-ready'
      }`}
    >
      {/* Desktop video */}
      <div className="auth-desktop-video-wrap" aria-hidden="true">
        <video
          ref={desktopBackgroundRef}
          className="auth-desktop-video"
          src={desktopBackgroundSrc}
          autoPlay muted loop playsInline preload="auto"
          poster="/Backgrounds/desktop-bg.jpg"
          onLoadedData={handleDesktopBackgroundReady}
          onCanPlay={handleDesktopBackgroundReady}
          onError={handleDesktopBackgroundReady}
        />
      </div>

      <div className={`auth-desktop-stage ${showDesktopCard ? 'desktop-ui-ready' : ''}`.trim()}>

        {/* Desktop welcome overlay */}
        <div className={`desktop-welcome-overlay ${showDesktopOverlay ? 'active' : ''}`}>
          <div className="desktop-welcome-box">
            <div className="desktop-welcome-kicker">
              <span className="desktop-welcome-kicker-line" aria-hidden="true" />
              <span className="desktop-welcome-kicker-text">Route intelligence suite</span>
              <span className="desktop-welcome-kicker-line" aria-hidden="true" />
            </div>
            <h1>
              <span className="desktop-welcome-head">Welcome</span>
              <span className="desktop-welcome-head">Back,</span>
              <span className="desktop-welcome-dynamic">
                <span className="desktop-welcome-word">{currentRole}</span>
                <span className="desktop-welcome-cursor">|</span>
              </span>
            </h1>
            <p className="desktop-welcome-subtitle">
              Track traffic, weather, and route risk from one calm deck.
            </p>
          </div>
        </div>

        {/* ── Mobile auth form ── */}
        {!isDesktopViewport && (
          <div className="mobile-auth-wrapper">

            {/* Header row: title + cube */}
            <div className="mobile-auth-header">
              <div className="mobile-auth-header-row">
                <h1 className="mobile-auth-title">
                  {isSignup ? 'Create your account' : 'Login to your account'}
                </h1>
                <MobileHeaderCube />
              </div>
            </div>

            {/* Form */}
            <form className="mobile-auth-form" onSubmit={handleSubmit} noValidate>

              {/* Email */}
              <div className="mobile-form-group">
                <label className="mobile-form-label">Your email address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mobile-form-input"
                />
              </div>

              {/* Username (signup only) */}
              {isSignup && (
                <div className="mobile-form-group">
                  <label className="mobile-form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    minLength={3}
                    placeholder="Your username"
                    autoComplete="username"
                    className="mobile-form-input"
                  />
                </div>
              )}

              {/* Password */}
              <div className="mobile-form-group">
                <label className="mobile-form-label">Enter your password</label>
                <div className="mobile-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    placeholder="Enter password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    className="mobile-form-input mobile-password-input"
                  />
                  <button
                    type="button"
                    className="mobile-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <PasswordEyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              {/* Confirm password (signup only) */}
              {isSignup && (
                <div className="mobile-form-group">
                  <label className="mobile-form-label">Confirm your password</label>
                  <div className="mobile-input-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="mobile-form-input mobile-password-input"
                    />
                    <button
                      type="button"
                      className="mobile-password-toggle"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      aria-pressed={showConfirmPassword}
                    >
                      <PasswordEyeIcon visible={showConfirmPassword} />
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me */}
              <div className="mobile-remember-row">
                <label className="mobile-remember-label">
                  <input type="checkbox" className="mobile-checkbox" />
                  <span>Remember me</span>
                </label>
              </div>

              {error && <div className="auth-message error">{error}</div>}
              {successMessage && <div className="auth-message success">{successMessage}</div>}

              {/* Submit */}
              <button type="submit" className="mobile-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="loading-content">
                    <span className="loading-spinner" />
                    Processing...
                  </span>
                ) : isSignup ? 'Sign Up' : 'Log In'}
              </button>

              {/* Divider */}
              <div className="mobile-divider">
                <span className="mobile-divider-line" />
                <span className="mobile-divider-text">Or</span>
                <span className="mobile-divider-line" />
              </div>

              {/* Google */}
              <button
                type="button"
                className="mobile-social-btn"
                onClick={() => handleSocialAuth('google')}
              >
                <svg className="mobile-social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* GitHub */}
              <button
                type="button"
                className="mobile-social-btn"
                onClick={() => handleSocialAuth('github')}
              >
                <svg className="mobile-social-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 1.5C6.2 1.5 1.5 6.3 1.5 12.2C1.5 16.9 4.5 20.8 8.7 22.2C9.2 22.3 9.4 22 9.4 21.7V19.9C6.7 20.5 6.1 18.7 6.1 18.7C5.6 17.4 4.9 17 4.9 17C3.9 16.4 5 16.4 5 16.4C6.1 16.5 6.7 17.6 6.7 17.6C7.7 19.2 9.3 18.8 9.9 18.6C10 17.9 10.3 17.5 10.6 17.2C8.4 17 6.1 16.1 6.1 11.9C6.1 10.7 6.5 9.7 7.2 8.9C7.1 8.6 6.8 7.5 7.3 6.1C7.3 6.1 8.2 5.8 9.4 6.7C10.2 6.5 11.1 6.4 12 6.4C12.9 6.4 13.8 6.5 14.6 6.7C15.8 5.8 16.7 6.1 16.7 6.1C17.2 7.5 16.9 8.6 16.8 8.9C17.5 9.7 17.9 10.7 17.9 11.9C17.9 16.1 15.6 17 13.4 17.2C13.8 17.6 14.1 18.2 14.1 19.1V21.7C14.1 22 14.3 22.3 14.8 22.2C19 20.8 22 16.9 22 12.2C22 6.3 17.3 1.5 12 1.5Z"
                    fill="#F8F7FF"
                  />
                </svg>
                Continue with GitHub
              </button>

            </form>

            {/* Toggle auth mode */}
            <div className="mobile-auth-toggle">
              {isSignup ? (
                <p>
                  Already have an account?{' '}
                  <button type="button" className="mobile-toggle-link" onClick={toggleAuthMode}>
                    Login
                  </button>
                </p>
              ) : (
                <p>
                  Don&apos;t have an account?{' '}
                  <button type="button" className="mobile-toggle-link" onClick={toggleAuthMode}>
                    Create an account
                  </button>
                </p>
              )}
            </div>

          </div>
        )}
        {/* ── END mobile auth form ── */}

        {/* Desktop card */}
        <div
          className={`auth-card ${showDesktopCard ? 'desktop-active' : ''} ${
            isSignup ? 'signup-mode' : 'signin-mode'
          }`.trim()}
        >
          <div className={`auth-header ${isSignup ? '' : 'compact'}`.trim()}>
            {isSignup && <h1>Create Account</h1>}
            <p>{isSignup ? 'Join the fleet and start tracking' : 'Sign in to access the dashboard'}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="form-group">
                <i className="material-icons icon">email</i>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Email"
                  autoComplete="email"
                />
              </div>
            )}
            <div className="form-group">
              <i className="material-icons icon">person</i>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                minLength={isSignup ? 3 : 1}
                placeholder={isSignup ? 'Username' : 'Username or Email'}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <i className="material-icons icon">lock</i>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="6"
                placeholder="Password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <div className="auth-message error">{error}</div>}
            {successMessage && <div className="auth-message success">{successMessage}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? (
                <span className="loading-content">
                  <span className="loading-spinner" />
                  Processing...
                </span>
              ) : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="auth-toggle">
            <button type="button" className="toggle-link" onClick={toggleAuthMode}>
              {isSignup ? 'Sign In' : 'Create New Account'}
            </button>
          </div>
        </div>

      </div>

      {/* Info panel desktop only */}
      <div
        className={`auth-info-panel ${showDesktopCard ? 'desktop-ui-ready' : ''} ${
          showInfoPopup ? 'active' : ''
        }`.trim()}
      >
        <button
          type="button"
          className="auth-info-toggle"
          onClick={toggleInfoPopup}
          aria-expanded={showInfoPopup}
          aria-label="Toggle product info"
        >
          <span>{showInfoPopup ? 'Close' : 'Info'}</span>
        </button>
        <div className="auth-info-strip">
          {showInfoPopup ? 'Wanna know more?' : 'Need info?'}
        </div>
        {showInfoPopup && (
          <div className="auth-info-popup" role="dialog" aria-labelledby="auth-info-title">
            <h2 id="auth-info-title">What Data Suite does</h2>
            <p>
              Data Suite helps shipping teams forecast traffic, assess voyage risk,
              and choose safer routes using AIS tracking, weather-aware analytics,
              and route insights.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

Auth.propTypes = {
  onAuthSuccess: PropTypes.func.isRequired,
};

export default Auth;