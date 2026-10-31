import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './LandingPage.css';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-body" style={{ minHeight: '100vh' }}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        padding: '40px 20px',
      }}>
        <div className="modal" style={{ position: 'relative', transform: 'none', opacity: 1, pointerEvents: 'auto', margin: '0 auto' }}>
        <div className="modal-logo">
          <img src="/logo.png" alt="VyaraHR" />
        </div>
        <h2>Create New Password</h2>
        <p className="modal-subtitle">Enter your new secure password below</p>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4" style={{ margin: '0 auto 16px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px' }}>Password Updated!</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Your password has been changed successfully. Redirecting you to login page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}
            
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter new password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Confirm new password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button className="modal-btn accent" type="submit" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Saving...' : 'Reset Password →'}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
