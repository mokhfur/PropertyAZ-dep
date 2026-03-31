import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ShieldCheck, Mail, Lock, ArrowRight, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';

const AdminLogin: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResendOtp = () => {
    setResendStatus('OTP Resent! (Demo: 123456)');
    setTimeout(() => setResendStatus(null), 5000);
  };
  const [step, setStep] = useState<'login' | '2fa' | 'reset'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) return null;
  if (user && profile?.userType === 'admin') return <Navigate to="/admin/dashboard" />;

  const logActivity = async (action: string, status: 'success' | 'failed', details?: string) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        adminId: 'system',
        adminName: email || 'Unknown Admin',
        action,
        status,
        details,
        ip: '127.0.0.1', // Mock IP
        device: navigator.userAgent,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      // In a real app, we'd check if 2FA is enabled for this user first
      // For this demo, we'll just simulate it
      await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, move to 2FA step
      setStep('2fa');
      await logActivity('admin_login_attempt', 'success', 'Password verified, awaiting 2FA');
    } catch (err: any) {
      setError(err.message || 'Login failed');
      await logActivity('admin_login_attempt', 'failed', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    // Mock OTP verification (any 6 digits works for demo)
    if (otp.length === 6) {
      await logActivity('admin_2fa_verify', 'success');
      // AuthContext will handle the profile fetch and redirection logic
    } else {
      setError('Invalid verification code');
      await logActivity('admin_2fa_verify', 'failed', 'Invalid OTP');
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Reset link sent to your email');
      await logActivity('admin_password_reset_request', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      await logActivity('admin_password_reset_request', 'failed', err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="bg-slate-900 p-8 text-center text-white">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 'login' ? 'Authorized Personnel Only' : 
             step === '2fa' ? 'Two-Factor Authentication' : 'Reset Admin Password'}
          </p>
        </div>

        <div className="p-8">
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@propertyaz.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secret Key</label>
                  <button 
                    type="button"
                    onClick={() => setStep('reset')}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoggingIn ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                <p className="text-xs text-blue-700 leading-relaxed">
                  A verification code has been sent to your registered device. Please enter the 6-digit code to continue.
                </p>
                <p className="text-[10px] text-amber-600 font-bold uppercase mt-2">
                  Demo Mode: Use any 6 digits (e.g. 123456)
                </p>
              </div>

              {resendStatus && (
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-xs border border-emerald-100 flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4" />
                  {resendStatus}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Verification Code</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all tracking-[0.5em] font-mono text-center"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  type="button"
                  onClick={handleResendOtp}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                >
                  Didn't receive code? Resend
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isLoggingIn ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
              >
                Back to Login
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@propertyaz.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-xs border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoggingIn ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
              >
                Back to Login
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Security Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
