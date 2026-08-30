import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PackingSheetData } from '../types/calculator';
import { Language } from '../utils/translations';
import { 
  saveSheetToCloud, 
  fetchUserCloudSheets, 
  deleteCloudSheet, 
  CloudSheetRecord 
} from '../utils/cloudSync';
import { 
  X, 
  LogIn, 
  LogOut, 
  User, 
  Mail, 
  Lock, 
  Cloud, 
  CloudUpload, 
  Trash2, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Link,
  Unlink,
  Layers,
  Database
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSheetData: PackingSheetData;
  onLoadSheetData: (loaded: PackingSheetData) => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentSheetData,
  onLoadSheetData,
  lang,
}) => {
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    error, 
    clearError,
    loginWithGoogle, 
    loginWithGithub, 
    loginWithEmail, 
    signupWithEmail, 
    loginAsGuest,
    connectProvider,
    disconnectProvider,
    logout 
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cloud sheets
  const [cloudSheets, setCloudSheets] = useState<CloudSheetRecord[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'cloud_sheets' | 'connected_accounts'>('profile');

  useEffect(() => {
    if (isOpen) {
      clearError();
      setSuccessMsg(null);
      if (user) {
        loadSheets();
      }
    }
  }, [isOpen, user]);

  const loadSheets = async () => {
    if (!user) return;
    setLoadingSheets(true);
    try {
      const sheets = await fetchUserCloudSheets(user.uid);
      setCloudSheets(sheets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSheets(false);
    }
  };

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setActionLoading(true);
    setSuccessMsg(null);
    const u = await loginWithGoogle();
    setActionLoading(false);
    if (u) {
      setSuccessMsg(lang === 'en' ? 'Logged in with Google successfully!' : 'গুগল দিয়ে সফলভাবে লগইন সম্পন্ন হয়েছে!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleGithubLogin = async () => {
    setActionLoading(true);
    setSuccessMsg(null);
    const u = await loginWithGithub();
    setActionLoading(false);
    if (u) {
      setSuccessMsg(lang === 'en' ? 'Logged in with GitHub successfully!' : 'গিটহাব দিয়ে লগইন সফল হয়েছে!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleGuestLogin = async () => {
    setActionLoading(true);
    setSuccessMsg(null);
    const u = await loginAsGuest();
    setActionLoading(false);
    if (u) {
      setSuccessMsg(lang === 'en' ? 'Guest session activated!' : 'গেস্ট একাউন্ট সক্রিয় করা হয়েছে!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setActionLoading(true);
    setSuccessMsg(null);
    if (authMode === 'signin') {
      const u = await loginWithEmail(email, password);
      if (u) setSuccessMsg(lang === 'en' ? 'Welcome back!' : 'স্বাগতম!');
    } else {
      const u = await signupWithEmail(email, password, displayName);
      if (u) setSuccessMsg(lang === 'en' ? 'Account created successfully!' : 'নতুন একাউন্ট সফলভাবে তৈরি হয়েছে!');
    }
    setActionLoading(false);
  };

  const handleSaveCurrentToCloud = async () => {
    if (!user) return;
    setActionLoading(true);
    const res = await saveSheetToCloud(user.uid, currentSheetData);
    setActionLoading(false);
    if (res.success) {
      setSuccessMsg(lang === 'en' ? 'Current packing sheet saved to Cloud!' : 'বর্তমান প্যাকিং শিট ক্লাউডে সেভ হয়েছে!');
      loadSheets();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDeleteCloudSheet = async (sheetId: string) => {
    if (!user) return;
    if (!confirm(lang === 'en' ? 'Delete this cloud backup?' : 'এই ক্লাউড ব্যাকআপটি ডিলিট করতে চান?')) return;
    await deleteCloudSheet(user.uid, sheetId);
    loadSheets();
  };

  const handleRestoreCloudSheet = (sheet: CloudSheetRecord) => {
    if (confirm(lang === 'en' ? `Load "${sheet.ref}" into calculator?` : `"${sheet.ref}" ক্যালকুলেটরে লোড করবেন?`)) {
      onLoadSheetData(sheet.sheetData);
      onClose();
    }
  };

  const hasGoogle = user?.providerData.some(p => p.providerId === 'google.com');
  const hasGithub = user?.providerData.some(p => p.providerId === 'github.com');
  const hasPassword = user?.providerData.some(p => p.providerId === 'password');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {user ? (lang === 'en' ? 'Account & Cloud Sync' : 'একাউন্ট ও ক্লাউড সিঙ্ক') : (lang === 'en' ? 'Login or Connect Account' : 'লগইন ও একাউন্ট সংযোগ')}
              </h3>
              <p className="text-xs text-slate-400">
                {user 
                  ? (lang === 'en' ? 'Manage your Google login & cloud database' : 'গুগল লগইন ও ক্লাউড ডাটাবেস পরিচালনা করুন')
                  : (lang === 'en' ? 'Sign in to sync your packing sheets securely across devices' : 'শিটগুলো ক্লাউডে সেভ ও সিঙ্ক করতে সাইন ইন করুন')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-700 font-bold">×</button>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5">
          {user ? (
            /* Logged In View */
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="User avatar" 
                      className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover shadow-xs" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {user.displayName || (user.isAnonymous ? 'Guest User' : 'Packing Specialist')}
                      {user.isAnonymous && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">
                          Guest
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {user.email || 'Anonymous session'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {hasGoogle && (
                        <span className="text-[9px] bg-red-50 text-red-700 font-semibold px-1.5 py-0.5 rounded border border-red-200">
                          Google
                        </span>
                      )}
                      {hasGithub && (
                        <span className="text-[9px] bg-slate-200 text-slate-800 font-semibold px-1.5 py-0.5 rounded">
                          GitHub
                        </span>
                      )}
                      {hasPassword && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                          Email
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                  title="Logout from all devices"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Sign Out' : 'লগআউট'}</span>
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Overview' : 'বিবরণ'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('cloud_sheets')}
                  className={`px-3 py-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'cloud_sheets'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Cloud Sheets' : 'ক্লাউড শিট'}</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full font-mono">
                    {cloudSheets.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('connected_accounts')}
                  className={`px-3 py-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'connected_accounts'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Connect Accounts' : 'অন্যান্য একাউন্ট'}</span>
                </button>
              </div>

              {/* Tab 1: Overview & Quick Save */}
              {activeTab === 'profile' && (
                <div className="space-y-3 pt-2">
                  <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <CloudUpload className="w-4 h-4 text-indigo-600" />
                        {lang === 'en' ? 'Backup Active Sheet to Cloud' : 'বর্তমান শিট ক্লাউডে ব্যাকআপ নিন'}
                      </h5>
                      <p className="text-[11px] text-indigo-800/80 mt-0.5 font-mono">
                        Ref: {currentSheetData.ref || 'Untitled'} | Cartons: {currentSheetData.cartons.length}
                      </p>
                    </div>
                    <button
                      onClick={handleSaveCurrentToCloud}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>{actionLoading ? 'Saving...' : (lang === 'en' ? 'Save to Cloud' : 'ক্লাউডে সেভ')}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{lang === 'en' ? 'Firebase Project:' : 'ফায়ারবেস প্রজেক্ট:'}</span>
                      <span className="font-mono font-semibold text-slate-800">aerobic-fold-mxctm</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{lang === 'en' ? 'Database Type:' : 'ডাটাবেস:'}</span>
                      <span className="font-mono font-semibold text-emerald-700">Firestore Cloud DB</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{lang === 'en' ? 'IndexedDB Local Sync:' : 'লোকাল ব্যাকআপ:'}</span>
                      <span className="font-semibold text-slate-800">Active</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Cloud Sheets List */}
              {activeTab === 'cloud_sheets' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {lang === 'en' ? 'Your Firestore Cloud Backups' : 'ক্লাউডে সংরক্ষিত শিটসমূহ'}
                    </span>
                    <button
                      onClick={loadSheets}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingSheets ? 'animate-spin' : ''}`} />
                      <span>{lang === 'en' ? 'Refresh' : 'রিফ্রেশ'}</span>
                    </button>
                  </div>

                  {loadingSheets ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                      Loading cloud sheets...
                    </div>
                  ) : cloudSheets.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      {lang === 'en' ? 'No cloud backups found. Save your current sheet above!' : 'কোন ক্লাউড ব্যাকআপ পাওয়া যায়নি। উপরে সেভ বাটনে ক্লিক করুন!'}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                      {cloudSheets.map(sheet => (
                        <div
                          key={sheet.id}
                          className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 transition"
                        >
                          <div>
                            <span className="text-xs font-bold font-mono text-slate-900 block">
                              {sheet.ref}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>Buyer: <b>{sheet.buyer}</b></span>
                              <span>•</span>
                              <span>{sheet.totalCtn} CTN</span>
                              <span>•</span>
                              <span>{sheet.totalNetWt} Kg</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleRestoreCloudSheet(sheet)}
                              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer text-xs flex items-center gap-1"
                              title="Load this sheet"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-semibold">{lang === 'en' ? 'Load' : 'লোড'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCloudSheet(sheet.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete from cloud"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Connected Accounts */}
              {activeTab === 'connected_accounts' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600">
                    {lang === 'en'
                      ? 'Connect multiple sign-in providers to access your packing data with any account.'
                      : 'যেকোনো একাউন্ট দিয়ে লগইন করতে গুগল বা গিটহাব একাউন্ট যুক্ত করুন।'}
                  </p>

                  {/* Google Connection Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">Google Account</h5>
                        <p className="text-[11px] text-slate-500">
                          {hasGoogle ? (lang === 'en' ? 'Connected' : 'সংযুক্ত আছে') : (lang === 'en' ? 'Not connected' : 'সংযুক্ত নেই')}
                        </p>
                      </div>
                    </div>

                    {hasGoogle ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Connected' : 'সংযুক্ত'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => connectProvider('google')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Connect' : 'যুক্ত করুন'}</span>
                      </button>
                    )}
                  </div>

                  {/* GitHub Connection Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">GitHub Account</h5>
                        <p className="text-[11px] text-slate-500">
                          {hasGithub ? (lang === 'en' ? 'Connected' : 'সংযুক্ত আছে') : (lang === 'en' ? 'Not connected' : 'সংযুক্ত নেই')}
                        </p>
                      </div>
                    </div>

                    {hasGithub ? (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Connected' : 'সংযুক্ত'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => connectProvider('github')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Connect' : 'যুক্ত করুন'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out / Login View */
            <div className="space-y-4">
              {/* Primary OAuth Options: Google & GitHub */}
              <div className="space-y-2">
                <button
                  onClick={handleGoogleLogin}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-3 transition cursor-pointer hover:shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{lang === 'en' ? 'Continue with Google Account' : 'গুগল একাউন্ট দিয়ে এগিয়ে যান'}</span>
                </button>

                <button
                  onClick={handleGithubLogin}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-3 transition cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>{lang === 'en' ? 'Continue with GitHub' : 'গিটহাব একাউন্ট দিয়ে এগিয়ে যান'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400">
                  {lang === 'en' ? 'or use email' : 'অথবা ইমেইল ব্যবহার করুন'}
                </span>
              </div>

              {/* Mode Switcher: Sign In vs Sign Up */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    authMode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang === 'en' ? 'Sign In' : 'সাইন ইন'}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                    authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lang === 'en' ? 'Create Account' : 'নতুন একাউন্ট'}
                </button>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {lang === 'en' ? 'Full Name' : 'পূর্ণ নাম'}
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'en' ? 'Email Address' : 'ইমেইল এড্রেস'}
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="user@garmentsfactory.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'en' ? 'Password' : 'পাসওয়ার্ড'}
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {actionLoading 
                      ? 'Processing...' 
                      : authMode === 'signin' 
                        ? (lang === 'en' ? 'Sign In with Email' : 'ইমেইল দিয়ে সাইন ইন') 
                        : (lang === 'en' ? 'Register Account' : 'একাউন্ট রেজিস্টার করুন')}
                  </span>
                </button>
              </form>

              {/* Guest Instant Access Button */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-medium underline underline-offset-2 cursor-pointer"
                >
                  {lang === 'en' ? 'Or continue as Guest (Instant Access)' : 'অথবা অতিথি হিসেবে ব্যবহার করুন (গেস্ট মোড)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
