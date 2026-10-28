import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { isAllowedInstituteEmail, isValidEmailFormat, normalizeEmail, ALLOWED_DOMAIN } from '../utils/validateEmail';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
];

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student', desc: 'Personalized AI path & assessments' },
  { value: 'mentor', label: 'Mentor', desc: 'Mentor students & schedule reviews (@bitsathy.ac.in only)' },
  { value: 'admin', label: 'Admin', desc: 'Platform control & management' },
];

export const Register: React.FC = () => {
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  const handleGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response?.credential) {
        setError('Google sign-in was cancelled or returned no credentials.');
        return;
      }
      setError('');
      setGoogleLoading(true);
      try {
        const user = await googleLogin(response.credential, role);
        if (user?.role === 'admin') {
          navigate('/admin');
        } else if (user?.role === 'mentor') {
          navigate('/mentor-dashboard');
        } else if (user?.role === 'staff') {
          navigate('/staff-dashboard');
        } else {
          if (!user?.onboarding_completed) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || '';
        setError(detail || 'Google registration failed. Please ensure you use your @bitsathy.ac.in account.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [googleLogin, role, navigate]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const tryInitGsi = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
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
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 360,
          });

          setGsiReady(true);
        } catch (e) {
          console.warn('GSI render error:', e);
        }
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
        'Google Identity Services is currently loading or restricted by your browser. You can also sign up directly with your college email below.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = normalizeEmail(email);

    if (role === 'mentor') {
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

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      await register({ email: cleanEmail, password, full_name: fullName, role });
      if (role === 'student') navigate('/onboarding');
      else if (role === 'mentor') navigate('/mentor-dashboard');
      else navigate('/admin');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isFormBusy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white border border-[#DCE3EC] rounded-3xl p-8 shadow-sm my-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#142B4A] flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-[#142B4A] font-extrabold text-2xl tracking-tight">SkillNova</span>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-[#142B4A] tracking-tight">Create Account</h1>
          <p className="text-[#64748B] text-xs mt-1">Register your institutional college profile</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0F7] border border-[#DCE3EC] text-[11px] text-[#142B4A] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>Institutional access · @{ALLOWED_DOMAIN}</span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-in Section */}
        {GOOGLE_CLIENT_ID && (
          <div className="mb-5">
            {/* Native GSI rendered container */}
            <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />

            {/* Instant fallback button if Google GSI iframe is delayed or blocked */}
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
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>
            )}

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-[#DCE3EC]" />
              <span className="text-[11px] text-[#64748B] font-bold uppercase tracking-wider">or register with email</span>
              <div className="flex-1 h-px bg-[#DCE3EC]" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label htmlFor="reg-fullname" className="block text-xs font-bold text-[#142B4A] mb-1">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                id="reg-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                disabled={isFormBusy}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-medium focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-[#142B4A] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`you@${ALLOWED_DOMAIN}`}
                disabled={isFormBusy}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DCE3EC] focus:border-[#142B4A] rounded-xl text-[#142B4A] text-xs font-medium focus:outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 pl-1">
              Only <span className="text-[#142B4A] font-semibold">@{ALLOWED_DOMAIN}</span> addresses allowed.
            </p>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="block text-xs font-bold text-[#142B4A] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Password strength */}
            {password.length > 0 && (
              <div className="mt-2 flex gap-3 flex-wrap">
                {PASSWORD_RULES.map((rule, i) => {
                  const ok = rule.test(password);
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      <span className={`text-[10px] font-medium ${ok ? 'text-emerald-700' : 'text-[#64748B]'}`}>
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-bold text-[#142B4A] mb-1.5">Account Role</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((r) => {
                const isSelected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    disabled={isFormBusy}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#142B4A] bg-[#EAF0F7] shadow-sm'
                        : 'border-[#DCE3EC] bg-[#F5F7FA] hover:bg-[#EAF0F7]/60'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isSelected ? 'text-[#142B4A]' : 'text-[#64748B]'}`}>
                      {r.label}
                    </p>
                    <p className="text-[10px] text-[#64748B] mt-0.5 leading-tight">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isFormBusy}
            className="w-full py-3 bg-[#142B4A] hover:bg-[#1E3A5F] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#64748B] mt-5">
          Already registered?{' '}
          <Link to="/login" className="text-[#142B4A] font-bold hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
};
