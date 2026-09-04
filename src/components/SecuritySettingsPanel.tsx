import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Lock, 
  Eye, 
  Check, 
  AlertCircle, 
  Copy, 
  Trash2, 
  User, 
  Globe, 
  RefreshCw, 
  Mail, 
  Building2,
  SlidersHorizontal,
  KeyRound,
  FileSpreadsheet
} from 'lucide-react';
import { Language } from '../utils/translations';
import { useAuth } from '../context/AuthContext';
import { TeamMemberAccess, TeamAccessRole, SecuritySettingsData } from '../types/security';
import { 
  loadTeamMembers, 
  saveTeamMember, 
  removeTeamMember, 
  loadSecuritySettings, 
  saveSecuritySettings 
} from '../utils/securitySettingsService';

interface SecuritySettingsPanelProps {
  lang: Language;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ lang }) => {
  const { user, userProfile } = useAuth();
  const ownerUid = user?.uid || 'anonymous_user';

  const [members, setMembers] = useState<TeamMemberAccess[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsData>({
    ownerUid,
    ownerEmail: user?.email || null,
    enforceViewOnlyForGuest: true,
    allowPublicViewOnlyLink: true,
    requireAuthForViewing: false,
    updatedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [department, setDepartment] = useState<string>('Quality Assurance');
  const [role, setRole] = useState<TeamAccessRole>('view-only');
  const [notes, setNotes] = useState<string>('');
  const [modules, setModules] = useState({
    packingSheets: true,
    factorySchedules: true,
    dispatchChallans: true,
    stickerLabels: true,
    analytics: false,
  });

  // Load team members and security settings
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      try {
        const [loadedMembers, loadedSettings] = await Promise.all([
          loadTeamMembers(ownerUid),
          loadSecuritySettings(ownerUid),
        ]);
        if (isMounted) {
          setMembers(loadedMembers);
          if (loadedSettings) {
            setSecuritySettings(loadedSettings);
          }
        }
      } catch (err: any) {
        console.error('Failed to load security settings:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [ownerUid]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(lang === 'en' ? 'Please enter a valid team member email address.' : 'দয়া করে একটি সঠিক টিম মেম্বার ইমেইল লিখুন।');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const newMember: TeamMemberAccess = {
      id: `member_${Date.now()}`,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim() || email.split('@')[0],
      role,
      department: department.trim() || 'Factory Team',
      addedAt: new Date().toISOString(),
      addedByUid: ownerUid,
      addedByEmail: user?.email || 'Owner',
      status: 'active',
      allowedModules: modules,
      notes: notes.trim(),
    };

    try {
      await saveTeamMember(ownerUid, newMember);
      setMembers(prev => [newMember, ...prev.filter(m => m.email !== newMember.email)]);
      setSuccessMsg(
        lang === 'en' 
          ? `Added ${newMember.displayName} with ${role.toUpperCase()} access!` 
          : `${newMember.displayName}-কে ${role === 'view-only' ? 'ভিউ-অনলি' : role} অ্যাক্সেস দেওয়া হয়েছে!`
      );
      // Reset form
      setEmail('');
      setDisplayName('');
      setNotes('');
      setShowAddForm(false);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const confirmPrompt = lang === 'en'
      ? `Revoke access for ${memberName}?`
      : `${memberName}-এর অ্যাক্সেস বাতিল করতে চান?`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      await removeTeamMember(ownerUid, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setSuccessMsg(lang === 'en' ? 'Access revoked successfully.' : 'অ্যাক্সেস সফলভাবে বাতিল করা হয়েছে।');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Failed to revoke access');
    }
  };

  // Handle Role Toggle
  const handleToggleMemberRole = async (member: TeamMemberAccess) => {
    const nextRole: TeamAccessRole = member.role === 'view-only' ? 'editor' : 'view-only';
    const updatedMember: TeamMemberAccess = { ...member, role: nextRole };

    try {
      await saveTeamMember(ownerUid, updatedMember);
      setMembers(prev => prev.map(m => m.id === member.id ? updatedMember : m));
      setSuccessMsg(
        lang === 'en'
          ? `Updated ${member.displayName} to ${nextRole.toUpperCase()}`
          : `${member.displayName}-এর রোল পরিবর্তন করে ${nextRole === 'view-only' ? 'ভিউ-অনলি' : 'এডিটর'} করা হয়েছে`
      );
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setErrorMsg('Failed to update role');
    }
  };

  // Copy View-Only Secure Link
  const handleCopyViewOnlyLink = (memberEmail?: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = memberEmail 
      ? `${baseUrl}?mode=view-only&userEmail=${encodeURIComponent(memberEmail)}`
      : `${baseUrl}?mode=view-only`;
    
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(memberEmail || 'general');
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Add Quick Sample Member
  const handleAddSampleMember = () => {
    setEmail('supervisor.qc@garments-hub.com');
    setDisplayName('Farhan Ahmed (Floor Lead)');
    setDepartment('Quality Assurance (Q.C.)');
    setRole('view-only');
    setShowAddForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Firebase Auth Account Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {lang === 'en' ? 'Firebase Auth Integration' : 'ফায়ারবেস অথেনটিকেশন ইন্টিগ্রেশন'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {user?.isAnonymous ? 'Active Session' : 'Secured Cloud'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                <span>{user?.displayName || (user?.isAnonymous ? 'Factory Specialist (Session)' : 'Admin Specialist')}</span>
                <span className="text-slate-400 font-mono text-xs font-normal">
                  ({user?.email || 'Session Authenticated'})
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {lang === 'en' 
                  ? 'Define granular view-only and edit privileges for specific team members.'
                  : 'টিম মেম্বারদের জন্য সুরক্ষিত ভিউ-অনলি (শুধুমাত্র দেখা) ও এডিট পারমিশন নির্ধারণ করুন।'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopyViewOnlyLink()}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition shrink-0 cursor-pointer"
          >
            {copiedLink === 'general' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-300" />}
            <span>{copiedLink === 'general' ? (lang === 'en' ? 'Copied!' : 'কপি হয়েছে!') : (lang === 'en' ? 'Copy View-Only Link' : 'ভিউ-অনলি লিঙ্ক কপি')}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Bar: Add Member Button */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {lang === 'en' ? 'Team Members & Access Levels' : 'টিম মেম্বার ও অ্যাক্সেস পারমিশন'}
          </h4>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {members.length} {lang === 'en' ? 'Members' : 'জন'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
            showAddForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showAddForm ? (lang === 'en' ? 'Cancel' : 'বাতিল') : (lang === 'en' ? 'Add Team Member' : 'টিম মেম্বার যুক্ত করুন')}</span>
        </button>
      </div>

      {/* Add Team Member Form */}
      {showAddForm && (
        <form onSubmit={handleAddMember} className="p-4 rounded-xl bg-slate-50 border border-indigo-200 shadow-xs space-y-3.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <h5 className="text-xs font-bold text-slate-800">
                {lang === 'en' ? 'Configure Team Member Access' : 'নতুন টিম মেম্বার অ্যাক্সেস কনফিগার করুন'}
              </h5>
            </div>
            <button
              type="button"
              onClick={handleAddSampleMember}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {lang === 'en' ? 'Fill Sample (Q.C. Lead)' : 'নমুনা পূরণ করুন (Q.C. Lead)'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500" />
                <span>{lang === 'en' ? 'Member Email Address *' : 'মেম্বারের ইমেইল অ্যাড্রেস *'}</span>
              </label>
              <input
                type="email"
                required
                placeholder="supervisor@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>{lang === 'en' ? 'Full Name / Designation' : 'নাম ও পদবি'}</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Asif Rahman (Floor Manager)"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span>{lang === 'en' ? 'Department / Unit' : 'বিভাগ / শাখা'}</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Quality Inspection / Finishing"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {lang === 'en' ? 'Access Level Role *' : 'অ্যাক্সেস লেভেল রোল *'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('view-only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    role === 'view-only'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'en' ? 'View-Only (Safe)' : 'ভিউ-অনলি (নিরাপদ)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('editor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    role === 'editor'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'en' ? 'Editor / Operator' : 'এডিটর / অপারেটর'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Granular Module Access Checklist */}
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'en' ? 'Allowed Modules for this Member:' : 'এই মেম্বার যে মডিউলগুলো দেখতে পারবেন:'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.packingSheets}
                  onChange={e => setModules({ ...modules, packingSheets: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{lang === 'en' ? 'Packing Sheets' : 'প্যাকিং শিট'}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.factorySchedules}
                  onChange={e => setModules({ ...modules, factorySchedules: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{lang === 'en' ? 'Production Schedule' : 'ফ্যাক্টরি শিডিউল'}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.dispatchChallans}
                  onChange={e => setModules({ ...modules, dispatchChallans: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{lang === 'en' ? 'Delivery Challans' : 'ডেলিভারি চালান'}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.stickerLabels}
                  onChange={e => setModules({ ...modules, stickerLabels: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{lang === 'en' ? 'Carton Barcodes' : 'কার্টন বারকোড'}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.analytics}
                  onChange={e => setModules({ ...modules, analytics: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">{lang === 'en' ? 'Financial Analytics' : 'আর্থিক এনালিটিক্স'}</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              {lang === 'en' ? 'Cancel' : 'বাতিল'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{lang === 'en' ? 'Save Team Member' : 'মেম্বার সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Team Members List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>{lang === 'en' ? 'Loading team security permissions...' : 'টিম সিকিউরিটি লোড হচ্ছে...'}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300">
            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              {lang === 'en' ? 'No specific team members configured yet.' : 'এখনও কোনো টিম মেম্বার যুক্ত করা হয়নি।'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1 mb-3">
              {lang === 'en'
                ? 'Add inspectors, floor managers, or client auditors to grant them safe, view-only access to garment packing sheets.'
                : 'ইন্সপেক্টর, ফ্লোর ম্যানেজার বা বায়ার প্রতিনিধিদের সুরক্ষিত ভিউ-অনলি অ্যাক্সেস দিতে উপরে যুক্ত করুন।'}
            </p>
            <button
              type="button"
              onClick={handleAddSampleMember}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Add Sample Q.C. Team Member' : 'স্যাম্পল Q.C. মেম্বার যুক্ত করে পরীক্ষা করুন'}</span>
            </button>
          </div>
        ) : (
          members.map(member => (
            <div
              key={member.id}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  member.role === 'view-only' 
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {member.displayName ? member.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-xs font-bold text-slate-800">{member.displayName}</h5>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                      member.role === 'view-only'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {member.role === 'view-only' ? <Lock className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      <span>{member.role === 'view-only' ? (lang === 'en' ? 'View-Only' : 'ভিউ-অনলি') : (lang === 'en' ? 'Editor' : 'এডিটর')}</span>
                    </span>
                    {member.department && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {member.department}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{member.email}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {lang === 'en' ? 'Added:' : 'যুক্ত হয়েছে:'} {new Date(member.addedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleToggleMemberRole(member)}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  title="Toggle Role (View-Only / Editor)"
                >
                  {member.role === 'view-only' ? (lang === 'en' ? 'Switch to Editor' : 'এডিটর করুন') : (lang === 'en' ? 'Switch to View-Only' : 'ভিউ-অনলি করুন')}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyViewOnlyLink(member.email)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                  title="Copy Individual View-Only Link"
                >
                  {copiedLink === member.email ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id, member.displayName)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Revoke Access"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Global Access Controls Policy Box */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-slate-700">
              {lang === 'en' ? 'Zero-Trust View-Only Policy' : 'জিরো-ট্রাস্ট ভিউ-অনলি নীতিমালা'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {lang === 'en'
            ? 'Team members with View-Only access can inspect real-time carton measurements, verify barcodes, and generate delivery reports, but are cryptographically prevented from modifying tare weights, changing buyers, or deleting production data.'
            : 'ভিউ-অনলি মেম্বারগণ রিয়েল-টাইমে কার্টনের গ্রস ও নেট ওজন এবং বারকোড দেখতে পারবেন ও রিপোর্ট এক্সপোর্ট করতে পারবেন, কিন্তু কোনো ডেটা পরিবর্তন, কার্টন ডিলিট বা ওভাররাইট করতে পারবেন না।'}
        </p>
      </div>
    </div>
  );
};
