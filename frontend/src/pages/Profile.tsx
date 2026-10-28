import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI } from '../services/api';
import {
  GraduationCap,
  User,
  Hash,
  Mail,
  Phone,
  Building2,
  Calendar,
  Code2,
  Target,
  Edit3,
  Check,
  X,
  Plus,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../components/common/UIComponents';

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Computer Science and Business Systems',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Biomedical Engineering',
  'Mechatronics Engineering',
];

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await studentAPI.getProfile();
      setFullName(data.full_name || user?.full_name || '');
      setRegisterNumber(data.register_number || '');
      setCollegeEmail(data.email || user?.email || '');
      setMobileNumber(data.mobile_number || '');
      setDepartment(data.department || '');
      setAcademicYear(data.academic_year || '');
      setCareerGoal(data.career_goal || '');
      setTechnicalSkills(Array.isArray(data.technical_skills) ? data.technical_skills : []);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Unable to load profile from server. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!technicalSkills.includes(trimmed)) {
      setTechnicalSkills((prev) => [...prev, trimmed]);
    }
    setCustomSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setTechnicalSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full Name is required (minimum 2 characters).');
      return;
    }
    if (!registerNumber.trim() || registerNumber.trim().length < 3) {
      setError('Register Number is required.');
      return;
    }
    const cleanMobile = mobileNumber.replace(/[\s\-()]/g, '');
    if (!cleanMobile || (!/^[6-9]\d{9}$/.test(cleanMobile) && !/^\+?[0-9]{10,14}$/.test(cleanMobile))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!department) {
      setError('Please select your department.');
      return;
    }
    if (!academicYear) {
      setError('Please select your academic year.');
      return;
    }
    if (!careerGoal.trim()) {
      setError('Career Goal is required.');
      return;
    }

    setSaving(true);
    try {
      await studentAPI.updateProfile({
        full_name: fullName.trim(),
        register_number: registerNumber.trim().toUpperCase(),
        mobile_number: cleanMobile,
        department,
        academic_year: academicYear,
        career_goal: careerGoal.trim(),
        technical_skills: technicalSkills,
      });

      await refreshUser();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Profile update error:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update profile. Please try again.';
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#142B4A] animate-spin" />
        <p className="text-xs text-[#5A6A80] font-medium">Loading your profile information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-[#DCE3EC] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-[#142B4A] text-white flex items-center justify-center text-xl font-extrabold shadow-md">
            {fullName.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold text-[#142B4A]">{fullName || 'Student'}</h1>
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Student</span>
              </span>
            </div>
            <p className="text-xs text-[#5A6A80] mt-0.5 flex items-center space-x-3">
              <span>{registerNumber || 'No Register Number'}</span>
              <span>•</span>
              <span>{department || 'Department Not Set'}</span>
              <span>•</span>
              <span>{academicYear || 'Year Not Set'}</span>
            </p>
          </div>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                setError(null);
              }}
              className="px-4 py-2 bg-[#142B4A] hover:bg-[#1E3E6B] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-2"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false);
                setError(null);
                fetchProfile();
              }}
              className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#142B4A] text-xs font-bold rounded-xl border border-[#DCE3EC] transition-all flex items-center space-x-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error updating profile:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="font-bold">{success}</p>
        </div>
      )}

      {/* Main Details Card / Form */}
      <Card className="bg-white border-[#DCE3EC] shadow-sm p-6 sm:p-8 rounded-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-4">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-[#315B8A]" />
              <span>Academic & Contact Information</span>
            </h2>
            <span className="text-[11px] text-[#64748B]">
              {isEditing ? 'Editing Mode Active' : 'Read-Only Overview'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]"
                  />
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-medium flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#315B8A]" />
                  <span>{fullName || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* Register Number */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Register Number <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Hash className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs uppercase font-mono focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]"
                  />
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-mono font-medium flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-[#315B8A]" />
                  <span>{registerNumber || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* College Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                College Email Address
              </label>
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#5A6A80] font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <Mail className="w-4 h-4 text-[#315B8A] shrink-0" />
                  <span className="truncate">{collegeEmail}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  Institute Verified
                </span>
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]"
                  />
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-medium flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-[#315B8A]" />
                  <span>{mobileNumber || 'Not provided'}</span>
                </div>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A]"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-medium flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-[#315B8A]" />
                  <span>{department || 'Not specified'}</span>
                </div>
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                  <select
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A]"
                  >
                    <option value="">Select Academic Year</option>
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-medium flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-[#315B8A]" />
                  <span>{academicYear || 'Not specified'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Career Goal */}
          <div className="pt-4 border-t border-[#DCE3EC]">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#315B8A]" />
              <span>Target Career Goal <span className="text-rose-500">*</span></span>
            </h2>
            {isEditing ? (
              <input
                type="text"
                required
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="e.g. Full Stack Developer, Data Scientist, DevOps Engineer"
                className="w-full px-4 py-2.5 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]"
              />
            ) : (
              <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#142B4A] font-semibold flex items-center space-x-2">
                <Target className="w-4 h-4 text-[#315B8A]" />
                <span>{careerGoal || 'No career goal defined yet'}</span>
              </div>
            )}
          </div>

          {/* Section: Technical Skills */}
          <div className="pt-4 border-t border-[#DCE3EC]">
            <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-[#315B8A]" />
              <span>Technical Skills</span>
            </h2>

            {isEditing && (
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(customSkillInput);
                    }
                  }}
                  placeholder="Add skill (e.g., Python, Docker, Spring Boot) and press Add"
                  className="flex-1 px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A]"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill(customSkillInput)}
                  className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#142B4A] font-bold text-xs rounded-xl border border-[#DCE3EC] transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            )}

            <div className="p-3.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl min-h-[50px] flex flex-wrap gap-2 items-center">
              {technicalSkills.length === 0 ? (
                <span className="text-xs text-[#94A3B8] italic">No technical skills added yet.</span>
              ) : (
                technicalSkills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center space-x-1.5 bg-white border border-[#DCE3EC] text-[#142B4A] font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm"
                  >
                    <span>{sk}</span>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="text-[#94A3B8] hover:text-rose-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Action Button when Editing */}
          {isEditing && (
            <div className="pt-4 border-t border-[#DCE3EC] flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#142B4A] font-bold text-xs rounded-xl border border-[#DCE3EC] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#142B4A] hover:bg-[#1E3E6B] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};
