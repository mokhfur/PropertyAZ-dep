import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { useSearchParams } from 'react-router-dom';
import { auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import { Building2, User, ShieldCheck, Wrench, ArrowRight, Mail, Lock, UserCircle, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Login: React.FC = () => {
  const { setRole, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup' || mode === 'login') {
      setAuthMode(mode as 'login' | 'signup');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      setError('Please select a role first');
      return;
    }

    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      await setRole(selectedRole);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/cancelled-popup-request') {
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please keep the popup open to sign in.');
      } else if (err.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError('A login process is already in progress. Please wait or refresh.');
      } else {
        setError(`Login failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a role first');
      return;
    }
    if (!email || !password || (authMode === 'signup' && !fullName)) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        await setRole(selectedRole);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Role is fetched in AuthContext onAuthStateChanged
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const roles = [
    { id: 'tenant', title: 'Tenant', icon: User, desc: 'Find a home and manage your rent' },
    { id: 'landlord', title: 'Landlord', icon: Building2, desc: 'Manage your properties and tenants' },
    { id: 'manager', title: 'Property Manager', icon: ShieldCheck, desc: 'Manage properties for landlords' },
    { id: 'vendor', title: 'Service Provider', icon: Wrench, desc: 'Find maintenance and repair jobs' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        {/* Left Side - Branding */}
        <div className="bg-[#0f2a4a] p-12 text-white flex flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">PropertyAZ</h1>
            <p className="text-white/60 text-lg leading-relaxed">
              The complete property management ecosystem for Bangladesh. Trusted, transparent, and hassle-free.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Secure OTP Signing</p>
                <p className="text-xs text-white/40">Legally binding digital contracts</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">bKash & Nagad Integrated</p>
                <p className="text-xs text-white/40">Automated rent collection</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Role Selection & Login */}
        <div className="p-12 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {authMode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-slate-500 text-sm">Select your role to continue</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setAuthMode('login')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  authMode === 'login' ? "bg-white shadow-sm text-blue-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                  authMode === 'signup' ? "bg-white shadow-sm text-blue-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Sign Up
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedRole(role.id as UserRole);
                  setError(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all",
                  selectedRole === role.id 
                    ? "border-blue-900 bg-blue-50/50" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedRole === role.id ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <role.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-slate-900">{role.title}</p>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 ml-1">Full Name</label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4 border border-red-100">
                {error}
                {error.includes('auth/operation-not-allowed') && (
                  <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-900">
                    <p className="font-bold mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Action Required: Enable Email/Password
                    </p>
                    <p className="text-sm leading-relaxed">
                      To use email login, you must enable the "Email/Password" sign-in provider in your Firebase Console:
                    </p>
                    <ol className="list-decimal ml-5 mt-2 text-sm space-y-1">
                      <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Firebase Console</a></li>
                      <li>Select your project: <strong>{firebaseConfig.projectId}</strong></li>
                      <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
                      <li>Click <strong>Add new provider</strong> and select <strong>Email/Password</strong></li>
                      <li>Enable it and click <strong>Save</strong></li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !selectedRole}
              className="w-full py-3.5 bg-blue-900 text-white rounded-xl font-semibold hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                authMode === 'login' ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={!selectedRole || isLoggingIn}
            className="w-full py-3.5 bg-white border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoggingIn ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900"></div>
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
            )}
            Google
          </button>

          <p className="mt-6 text-center text-[10px] text-slate-400">
            By continuing, you agree to PropertyAZ's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
