
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Languages } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'pin'>('pin');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithPassword, signUp, signInAnonymously } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (loginMethod === 'pin') {
        if (pin === '654321') {
          await signInAnonymously();
        } else {
          setError('Invalid passcode');
          setLoading(false);
        }
        return;
      }

      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <Languages size={40} color="white" />
          </div>
          <h1>Maximus Alvaro</h1>
          <p>Real-time Speech Translation by Eburon AI</p>
        </div>

        <div className="login-tabs">
          <button 
            className={loginMethod === 'pin' ? 'active' : ''} 
            disabled={loading}
            onClick={() => { setLoginMethod('pin'); setError(null); }}
          >
            Passcode
          </button>
          <button 
            className={loginMethod === 'email' ? 'active' : ''} 
            disabled={loading}
            onClick={() => { setLoginMethod('email'); setError(null); }}
          >
            Email
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {loginMethod === 'pin' ? (
            <>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Enter 6-digit Passcode"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Authenticating...' : 'Enter with Passcode'}
              </button>
              <div className="divider">OR</div>
              <button 
                type="button" 
                className="guest-button"
                disabled={loading}
                onClick={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    await signInAnonymously();
                  } catch (err: any) {
                    setError(err.message || 'Failed to sign in as guest');
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Linking...' : 'Access as Guest'}
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </>
          )}
          
          {error && <div className="auth-error">{error}</div>}
        </form>

        {loginMethod === 'email' && !loading && (
          <div className="auth-toggle">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button onClick={() => setIsSignUp(!isSignUp)} disabled={loading}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          font-family: 'Inter', sans-serif;
        }
        .login-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          padding: 2.5rem;
          border-radius: 1.5rem;
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .login-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .logo-circle {
          background: #3b82f6;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }
        .login-header p {
          color: #94a3b8;
          font-size: 0.875rem;
        }
        .login-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.25rem;
          border-radius: 0.75rem;
        }
        .login-tabs button {
          flex: 1;
          padding: 0.5rem;
          border: none;
          background: none;
          color: #94a3b8;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .login-tabs button.active {
          background: #3b82f6;
          color: white;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: white;
          outline: none;
          transition: all 0.2s;
          text-align: inherit;
        }
        .form-group input:focus {
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.1);
        }
        .auth-button {
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }
        .auth-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .guest-button {
          width: 100%;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .guest-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1rem 0;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .divider:not(:empty)::before {
          margin-right: .75rem;
        }
        .divider:not(:empty)::after {
          margin-left: .75rem;
        }
        .auth-toggle {
          margin-top: 1.5rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.875rem;
        }
        .auth-toggle button {
          background: none;
          border: none;
          color: #3b82f6;
          font-weight: 600;
          cursor: pointer;
          margin-left: 0.25rem;
        }
        .auth-error {
          color: #ef4444;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .auth-toggle button:hover {
          text-decoration: underline;
        }
      ` }} />
    </div>
  );
}
