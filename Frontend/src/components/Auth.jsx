import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../styles/components/Auth.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

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

  useEffect(() => {
    // Add class to body for specific styling
    document.body.classList.add('auth-page');
    return () => {
      document.body.classList.remove('auth-page');
    };
  }, []);

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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

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
      setError('Network error. Could not connect to the server.');
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
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
          <p>{isSignup ? 'Already have an account?' : "Don't have an account?"}</p>
          <button type="button" className="toggle-link" onClick={toggleAuthMode}>
            {isSignup ? 'Sign In' : 'Create New Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
Auth.propTypes = {
  onAuthSuccess: PropTypes.func.isRequired,
};

export default Auth;
