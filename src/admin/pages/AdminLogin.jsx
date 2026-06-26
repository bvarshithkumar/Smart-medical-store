import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdmin } from '../context/AdminContext';
import { Eye, EyeOff, Shield, Activity, Users, Package } from 'lucide-react';

const AdminLogin = () => {
  const { adminLogin, loginError, setLoginError } = useAdminAuth();
  const { theme } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => localStorage.getItem('svms_admin_remember') || '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const ok = await adminLogin(email, password, remember);
    setLoading(false);
    if (ok) navigate('/admin');
  };

  const handleForgot = (e) => {
    e.preventDefault();
    setForgotSent(true);
  };

  return (
    <div className="admin-root" data-admin-theme={theme}>
      <div className="admin-login-page">
        {/* Left panel */}
        <div className="admin-login-left">
          <div className="login-brand">
            <div className="login-brand-logo">💊</div>
            <h1>Sri Venkateshwara Medical & General Stores</h1>
            <p>Enterprise pharmacy management portal. Manage your entire business from one powerful dashboard.</p>
            <div className="login-features">
              {[
                { icon: '📊', text: 'Real-time sales & revenue analytics' },
                { icon: '📦', text: 'Complete inventory management' },
                { icon: '📋', text: 'Prescription review center' },
                { icon: '👥', text: 'Customer CRM & order management' },
                { icon: '🔔', text: 'Instant alerts for stock & orders' },
              ].map(f => (
                <div key={f.text} className="login-feature">
                  <div className="login-feature-icon">{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="admin-login-right">
          <div className="login-form-card">
            {!forgotOpen ? (
              <>
                <h1 className="login-form-title">Admin Login</h1>
                <p className="login-form-subtitle">Sign in to your management portal</p>

                {loginError && (
                  <div className="login-error" key={loginError}>{loginError}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="login-field">
                    <label htmlFor="admin-email">Email Address</label>
                    <div className="login-input-wrap">
                      <input
                        id="admin-email"
                        type="email"
                        placeholder="admin@svms.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setLoginError(''); }}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="admin-password">Password</label>
                    <div className="login-input-wrap">
                      <input
                        id="admin-password"
                        type={showPw ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                        required
                        autoComplete="current-password"
                        style={{ paddingRight: 44 }}
                      />
                      <button type="button" className="login-eye-btn" onClick={() => setShowPw(v => !v)}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="login-options">
                    <label className="login-remember">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                      Remember me
                    </label>
                    <span className="login-forgot" onClick={() => { setForgotOpen(true); setLoginError(''); }}>
                      Forgot password?
                    </span>
                  </div>

                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? '⏳ Signing in…' : '🔐 Sign In to Admin Panel'}
                  </button>
                </form>

                <div className="login-creds-hint">
                  <strong>Demo:</strong> admin@svms.com &nbsp;/&nbsp; Admin@1234
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => { setForgotOpen(false); setForgotSent(false); }}>
                  ← Back to Login
                </button>
                <h1 className="login-form-title">Reset Password</h1>
                <p className="login-form-subtitle">Enter your admin email to receive reset instructions.</p>
                {!forgotSent ? (
                  <form onSubmit={handleForgot}>
                    <div className="login-field">
                      <label>Admin Email</label>
                      <div className="login-input-wrap">
                        <input type="email" placeholder="admin@svms.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                      </div>
                    </div>
                    <button type="submit" className="login-submit">Send Reset Link</button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: 48 }}>📧</div>
                    <h3 style={{ marginTop: 12, color: 'var(--text-primary)' }}>Email Sent!</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
                      Password reset instructions have been sent to <strong>{forgotEmail}</strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
