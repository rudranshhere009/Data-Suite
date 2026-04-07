import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import '../styles/components/Auth.css';

const animatedRoles = ['Users','Divers','Mates'];
const desktopMediaQuery = '(min-width: 769px)';
const desktopBackgroundSrc = '/Backgrounds/desktop.mp4';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const getIsDesktopViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(desktopMediaQuery).matches;

const Auth = ({ onAuthSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [currentRole, setCurrentRole] = useState(animatedRoles[0]);
  const [roleIndex, setRoleIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(getIsDesktopViewport);
  const [isDesktopBackgroundLoaded, setIsDesktopBackgroundLoaded] = useState(() => !getIsDesktopViewport());
  const desktopBackgroundRef = useRef(null);

  const showDesktopOverlay = isDesktopViewport && isDesktopBackgroundLoaded;
  const showDesktopCard = !isDesktopViewport || isDesktopBackgroundLoaded;

  useEffect(() => {
    // Add class to body for specific styling
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(desktopMediaQuery);
    const handleViewportChange = (event) => {
      setIsDesktopViewport(event.matches);
    };

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const endpoint = isSignup ? `${API_BASE_URL}/auth/signup` : `${API_BASE_URL}/auth/signin`;
      const payload = isSignup 
        ? { username: formData.username, email: formData.email, password: formData.password }
        : { identifier: formData.username, password: formData.password };

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
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok) {
        if (isSignup) {
          setIsSignup(false);
          setFormData({ username: formData.username, email: '', password: '' });
          setSuccessMessage('Account created! Please sign in.');
        } else {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userData', JSON.stringify(data.user || { username: formData.username }));
          onAuthSuccess(data.user || { username: formData.username });
        }
      } else {
        setError(data.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Backend may be sleeping, please try again.');
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
    setFormData({ username: '', email: '', password: '' });
  };

  const toggleInfoPopup = () => {
    setShowInfoPopup((prev) => !prev);
  };

  const handleDesktopBackgroundReady = () => {
    setIsDesktopBackgroundLoaded(true);
  };

  return (
    <div
      className={`auth-container ${isDesktopViewport ? (isDesktopBackgroundLoaded ? 'desktop-background-ready' : 'desktop-background-loading') : 'mobile-background-ready'}`}
    >
      <div className="auth-desktop-video-wrap" aria-hidden="true">
        <video
          ref={desktopBackgroundRef}
          className="auth-desktop-video"
          src={desktopBackgroundSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/Backgrounds/desktop-bg.jpg"
          onLoadedData={handleDesktopBackgroundReady}
          onCanPlay={handleDesktopBackgroundReady}
          onError={handleDesktopBackgroundReady}
        />
      </div>
      <div className="auth-mobile-video-wrap" aria-hidden="true">
        <video
          className="auth-mobile-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/Backgrounds/mobile.mp4" type="video/mp4" />
        </video>
      </div>
      <div className={`auth-desktop-stage ${showDesktopCard ? 'desktop-ui-ready' : ''}`.trim()}>
        <div className={`desktop-welcome-overlay ${showDesktopOverlay ? 'active' : ''}`}>
          <div className="desktop-welcome-box">
            <div className="desktop-welcome-kicker">
              <span className="desktop-welcome-kicker-line" aria-hidden="true"></span>
              <span className="desktop-welcome-kicker-text">Route intelligence suite</span>
              <span className="desktop-welcome-kicker-line" aria-hidden="true"></span>
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
        {!isDesktopViewport && (
          <div className="mobile-welcome-banner">
            <span className="mobile-welcome-banner-line" aria-hidden="true"></span>
            <span className="mobile-welcome-banner-text">
              {isSignup ? 'Start Your Journey' : 'Welcome Back'}
            </span>
            <span className="mobile-welcome-banner-line" aria-hidden="true"></span>
          </div>
        )}
        <div className={`auth-card ${showDesktopCard ? 'desktop-active' : ''} ${isSignup ? 'signup-mode' : 'signin-mode'}`.trim()}>
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
                autoComplete={isSignup ? 'username' : 'username'}
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
                  <span className="loading-spinner"></span>
                  Processing...
                </span>
              ) : (
                isSignup ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="auth-toggle">
            <button type="button" className="toggle-link" onClick={toggleAuthMode}>
              {isSignup ? 'Sign In' : 'Create New Account'}
            </button>
          </div>
        </div>
      </div>

      <div className={`auth-info-panel ${showDesktopCard ? 'desktop-ui-ready' : ''} ${showInfoPopup ? 'active' : ''}`.trim()}>
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
