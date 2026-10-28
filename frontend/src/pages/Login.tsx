import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  ShieldCheck,
  Shield,
  Users,
  ChevronDown,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { isAllowedInstituteEmail, isValidEmailFormat, normalizeEmail, ALLOWED_DOMAIN } from '../utils/validateEmail';

// ── Google Identity Services type shim ──────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

export const DEMO_STUDENT_EMAIL = 'student@bitsathy.ac.in';
export const DEMO_STUDENT_PASSWORD = 'password123';
export const DEMO_STAFF_EMAIL = 'staff@bitsathy.ac.in';
export const DEMO_STAFF_PASSWORD = 'Faculty@123';
export const DEMO_MENTOR_EMAIL = 'faculty.demo@bitsathy.ac.in';
export const DEMO_MENTOR_PASSWORD = 'Faculty@123';
export const DEMO_ADMIN_EMAIL = 'admin@bitsathy.ac.in';
export const DEMO_ADMIN_PASSWORD = 'password123';

export const Login: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [accountType, setAccountType] = useState<'student' | 'mentor' | 'staff' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const handleAccountTypeChange = useCallback((newType: 'student' | 'mentor' | 'staff' | 'admin') => {
    setAccountType(newType);
    setError('');

    if (newType === 'staff') {
      setEmail(DEMO_STAFF_EMAIL);
      setPassword(DEMO_STAFF_PASSWORD);
    } else if (newType === 'admin') {
      setEmail(DEMO_ADMIN_EMAIL);
      setPassword(DEMO_ADMIN_PASSWORD);
    } else if (newType === 'mentor') {
      if (email === DEMO_STAFF_EMAIL || email === DEMO_ADMIN_EMAIL || !email) {
        setEmail(DEMO_MENTOR_EMAIL);
        setPassword(DEMO_MENTOR_PASSWORD);
      }
    } else {
      if (email === DEMO_STAFF_EMAIL || email === DEMO_MENTOR_EMAIL || email === DEMO_ADMIN_EMAIL) {
        setEmail('');
        setPassword('');
      }
    }
  }, [email]);

  useEffect(() => {
    const roleParam = searchParams.get('role') || searchParams.get('type') || searchParams.get('portal');
    if (roleParam === 'staff') {
      handleAccountTypeChange('staff');
    } else if (roleParam === 'mentor') {
      handleAccountTypeChange('mentor');
    } else if (roleParam === 'admin') {
      handleAccountTypeChange('admin');
    }
  }, [searchParams, handleAccountTypeChange]);

  const navigateByAccountType = (loggedUser: any, targetType?: 'student' | 'mentor' | 'staff' | 'admin') => {
    const role = loggedUser?.role;

    if (targetType === 'admin' || role === 'admin') {
      navigate('/admin');
    } else if (targetType === 'staff' || role === 'staff') {
      navigate('/staff-dashboard');
    } else if (targetType === 'mentor' || role === 'mentor') {
      navigate('/mentor-dashboard');
    } else {
      // Student
      if (!loggedUser?.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  };

  // ── Google callback ────────────────────────────────────────────────────────
  const handleGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        setError('Google sign-in was cancelled or returned no credentials.');
        return;
      }
      setError('');
      setGoogleLoading(true);
      try {
        const user = await googleLogin(response.credential, accountType);
        navigateByAccountType(user, accountType);
      } catch (err: any) {
        const detail: string = err?.response?.data?.detail || err?.message || '';
        setError(detail || 'Google sign-in failed. Please check your credentials.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleLogin, accountType, navigate]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const tryInitGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 350,
        });

        setGsiReady(true);
      }
    };

    if (window.google?.accounts?.id) {
      tryInitGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          tryInitGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [handleGoogleCredential]);

  const handleManualGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      setError(
        'Google Identity Services is currently loading or restricted by your browser. You can also sign in directly with your email below.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = normalizeEmail(email);

    // College email restriction applies to student, mentor, and staff accounts
    if (accountType === 'student' || accountType === 'mentor' || accountType === 'staff') {
      if (!isAllowedInstituteEmail(cleanEmail)) {
        setError('Please use your official @bitsathy.ac.in email address.');
        return;
      }
    } else {
      if (!isValidEmailFormat(cleanEmail)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(cleanEmail, password, accountType);
      navigateByAccountType(user, accountType);
    } catch (err: any) {
      console.error(err);
      const detail: string = err?.response?.data?.detail || err?.message || '';
      setError(detail || 'Sign-in failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const isFormBusy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[430px] bg-white border border-[#DCE3EC] rounded-3xl p-8 shadow-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-[#142B4A] font-extrabold text-2xl tracking-tight">SkillNova</span>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Sign In</h1>
          <p className="text-[#64748B] text-xs mt-1">Sign in to access your institutional portal</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0F7] border border-[#DCE3EC] text-[11px] text-[#142B4A] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>
              {accountType === 'mentor'
                ? 'Mentor Portal · @bitsathy.ac.in required'
                : accountType === 'staff'
                ? 'Staff Portal · @bitsathy.ac.in required'
                : accountType === 'admin'
                ? 'Administrator Access'
                : 'Student Portal · @bitsathy.ac.in required'}
            </span>
          </div>
        </div>

        {/* Account Type Selection Dropdown */}
        <div className="mb-4">
          <label htmlFor="login-account-type" className="block text-xs font-bold text-[#142B4A] mb-1.5 flex items-center justify-between">
            <span>Account Type</span>
            <span className="text-[11px] text-[#315B8A] font-semibold capitalize">{accountType}</span>
          </label>
          <div className="relative">
            <select
              id="login-account-type"
              aria-label="Account Type"
              value={accountType}
              onChange={(e) => {
                const newType = e.target.value as 'student' | 'mentor' | 'staff' | 'admin';
                handleAccountTypeChange(newType);
              }}
              disabled={isFormBusy}
              className="w-full appearance-none pl-10 pr-10 py-2.5 bg-[#F5F7FA] border border-[#DCE3EC] hover:border-[#142B4A] focus:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-semibold focus:outline-none transition-all cursor-pointer"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#142B4A]">
              {accountType === 'student' && <GraduationCap className="w-4 h-4" />}
              {(accountType === 'staff' || accountType === 'mentor') && <Users className="w-4 h-4" />}
              {accountType === 'admin' && <Shield className="w-4 h-4" />}
            </div>
            <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B]" />
          </div>

          {accountType === 'staff' && (
            <div className="mt-2.5 p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-[#142B4A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#315B8A] shrink-0" />
                <span className="text-[11px] font-medium text-[#142B4A]">
                  Auto-filled dummy credentials (<strong>{DEMO_STAFF_EMAIL}</strong>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail(DEMO_STAFF_EMAIL);
                  setPassword(DEMO_STAFF_PASSWORD);
                }}
                className="text-[11px] font-bold text-[#315B8A] hover:underline shrink-0 ml-2"
              >
                Re-fill
              </button>
            </div>
          )}

          {accountType === 'admin' && (
            <div className="mt-2.5 p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-[#142B4A]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#315B8A] shrink-0" />
                <span className="text-[11px] font-medium text-[#142B4A]">
                  Auto-filled dummy credentials (<strong>{DEMO_ADMIN_EMAIL}</strong>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail(DEMO_ADMIN_EMAIL);
                  setPassword(DEMO_ADMIN_PASSWORD);
                }}
                className="text-[11px] font-bold text-[#315B8A] hover:underline shrink-0 ml-2"
              >
                Re-fill
              </button>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google section if available */}
        {GOOGLE_CLIENT_ID && (
          <div className="mb-4">
            <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />
            {!gsiReady && (
              <button
                type="button"
                onClick={handleManualGoogleClick}
                disabled={isFormBusy}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#DCE3EC] hover:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#142B4A]" />
                    <span>Signing in with Google…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            )}
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#DCE3EC]" />
              <span className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 h-px bg-[#DCE3EC]" />
            </div>
          </div>
        )}

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-[#142B4A] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${emailFocused ? 'text-[#142B4A]' : 'text-[#64748B]'}`} />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder={`you@${ALLOWED_DOMAIN}`}
                disabled={isFormBusy}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-medium focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-xs font-bold text-[#142B4A]">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${passwordFocused ? 'text-[#142B4A]' : 'text-[#64748B]'}`} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="••••••••"
                disabled={isFormBusy}
                className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-medium focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#142B4A] p-0.5 rounded"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isFormBusy}
            className="w-full py-3 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-xs text-[#64748B] mt-5">
          Need an account?{' '}
          <Link to="/register" className="text-[#142B4A] font-bold hover:underline">
            Register here →
          </Link>
        </p>
      </div>
    </div>
  );
};
