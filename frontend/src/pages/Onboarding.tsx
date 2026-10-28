import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
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

const POPULAR_SKILLS = [
  'Python',
  'Java',
  'C++',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'FastAPI',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'Data Structures & Algorithms',
  'System Design',
  'Docker',
  'Machine Learning',
  'Git',
  'REST APIs',
  'Cloud Computing',
];

const POPULAR_GOALS = [
  'Software Development Engineer (SDE)',
  'Full Stack Web Developer',
  'Data Scientist / AI Engineer',
  'Backend Systems Engineer',
  'DevOps & Cloud Engineer',
  'Cybersecurity Analyst',
  'Mobile Application Developer',
  'Embedded Systems & IoT Engineer',
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  // Redirect if returning student already has completed profile
  useEffect(() => {
    if (user?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Form Fields State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [registerNumber, setRegisterNumber] = useState('');
  const [collegeEmail, setCollegeEmail] = useState(user?.email || '');
  const [mobileNumber, setMobileNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Python', 'Data Structures & Algorithms']);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [careerGoal, setCareerGoal] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Load existing profile if user had partial data
  useEffect(() => {
    studentAPI
      .getStatus()
      .then((res) => {
        if (res?.profile) {
          if (res.profile.name) setFullName(res.profile.name);
          if (res.profile.register_number) setRegisterNumber(res.profile.register_number);
          if (res.profile.mobile_number) setMobileNumber(res.profile.mobile_number);
          if (res.profile.department) setDepartment(res.profile.department);
          if (res.profile.academic_year) setAcademicYear(res.profile.academic_year);
          if (res.profile.career_goal) setCareerGoal(res.profile.career_goal);
          if (Array.isArray(res.profile.technical_skills) && res.profile.technical_skills.length > 0) {
            setSelectedSkills(res.profile.technical_skills);
          }
        }
      })
      .catch(() => {
        // Fall back to authenticated user context
      })
      .finally(() => {
        setFetchingExisting(false);
      });
  }, []);

  // Sync email from user context
  useEffect(() => {
    if (user?.email) {
      setCollegeEmail(user.email);
    }
    if (user?.full_name && !fullName) {
      setFullName(user.full_name);
    }
  }, [user]);

  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      if (fieldErrors.technicalSkills) {
        setFieldErrors((prev) => ({ ...prev, technicalSkills: '' }));
      }
    }
    setCustomSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Full Name is required (minimum 2 characters).';
    }

    if (!registerNumber.trim() || registerNumber.trim().length < 3) {
      errs.registerNumber = 'Please enter a valid college register number.';
    }

    const cleanMobile = mobileNumber.replace(/[\s\-()]/g, '');
    if (!cleanMobile || (!/^[6-9]\d{9}$/.test(cleanMobile) && !/^\+?[0-9]{10,14}$/.test(cleanMobile))) {
      errs.mobileNumber = 'Please enter a valid 10-digit mobile number.';
    }

    if (!department) {
      errs.department = 'Please select your academic department.';
    }

    if (!academicYear) {
      errs.academicYear = 'Please select your current academic year.';
    }

    if (!careerGoal.trim()) {
      errs.careerGoal = 'Please select or specify your primary career goal.';
    }

    if (selectedSkills.length === 0) {
      errs.technicalSkills = 'Please select or add at least one technical skill.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isValid = validateForm();
    if (!isValid) {
      setError('Please resolve the errors highlighted below.');
      return;
    }

    setLoading(true);
    try {
      await studentAPI.submitOnboarding({
        full_name: fullName.trim(),
        register_number: registerNumber.trim().toUpperCase(),
        college_email: collegeEmail.trim(),
        mobile_number: mobileNumber.trim(),
        department,
        academic_year: academicYear,
        career_goal: careerGoal.trim(),
        technical_skills: selectedSkills,
      });

      setSuccess(true);
      await refreshUser();

      // Smooth redirection to student dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save your student profile. Please verify your details and try again.';
      setError(detail);
      // If error mentions duplicate register number, highlight field
      if (typeof detail === 'string' && detail.toLowerCase().includes('register number')) {
        setFieldErrors((prev) => ({ ...prev, registerNumber: detail }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#142B4A] py-10 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-3xl">
        {/* Header Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#EAF0F7] border border-[#DCE3EC] rounded-full text-[#142B4A] text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#315B8A]" />
            <span>First-Time Student Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
            Complete Your Student Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#5A6A80] mt-1.5 max-w-xl mx-auto">
            Welcome to SkillNova! Please complete your academic details once so our AI engine can calculate your skill
            gaps and generate your personalized placement roadmap.
          </p>
        </div>

        {/* Card Form */}
        <Card className="bg-white border-[#DCE3EC] shadow-md p-6 sm:p-8 rounded-2xl">
          {fetchingExisting ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#142B4A] animate-spin" />
              <p className="text-xs text-[#5A6A80] font-medium">Loading your student account context...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message Box */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-3 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Please check the entered information:</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Notification */}
              {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Your profile has been saved successfully!</p>
                    <p className="text-[11px] text-emerald-700">Redirecting to your Student Dashboard...</p>
                  </div>
                </div>
              )}

              {/* Section 1: Academic Identity */}
              <div>
                <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-[#315B8A]" />
                  <span>Academic Identification</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                        }}
                        placeholder="e.g., Alex Johnson"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs focus:outline-none transition-all ${
                          fieldErrors.fullName
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                        }`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* Register Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      Register Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Hash className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={registerNumber}
                        onChange={(e) => {
                          setRegisterNumber(e.target.value.toUpperCase());
                          if (fieldErrors.registerNumber) setFieldErrors((prev) => ({ ...prev, registerNumber: '' }));
                        }}
                        placeholder="e.g., 7376211CS101"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs uppercase font-mono focus:outline-none transition-all ${
                          fieldErrors.registerNumber
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                        }`}
                      />
                    </div>
                    {fieldErrors.registerNumber && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.registerNumber}</p>
                    )}
                  </div>

                  {/* College Email Address (Authenticated & Read-only) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      College Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                      <input
                        type="email"
                        readOnly
                        value={collegeEmail}
                        className="w-full pl-9 pr-24 py-2.5 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl text-[#64748B] text-xs cursor-not-allowed select-none"
                      />
                      <span className="absolute right-2.5 top-2.5 inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1">Bound to your authenticated @bitsathy.ac.in account</p>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => {
                          setMobileNumber(e.target.value);
                          if (fieldErrors.mobileNumber) setFieldErrors((prev) => ({ ...prev, mobileNumber: '' }));
                        }}
                        placeholder="10-digit mobile number"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs focus:outline-none transition-all ${
                          fieldErrors.mobileNumber
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                        }`}
                      />
                    </div>
                    {fieldErrors.mobileNumber && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.mobileNumber}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                      <select
                        required
                        value={department}
                        onChange={(e) => {
                          setDepartment(e.target.value);
                          if (fieldErrors.department) setFieldErrors((prev) => ({ ...prev, department: '' }));
                        }}
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs focus:outline-none transition-all cursor-pointer ${
                          fieldErrors.department
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                        }`}
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.department && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.department}</p>
                    )}
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-semibold text-[#142B4A] mb-1.5">
                      Academic Year <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3 pointer-events-none" />
                      <select
                        required
                        value={academicYear}
                        onChange={(e) => {
                          setAcademicYear(e.target.value);
                          if (fieldErrors.academicYear) setFieldErrors((prev) => ({ ...prev, academicYear: '' }));
                        }}
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs focus:outline-none transition-all cursor-pointer ${
                          fieldErrors.academicYear
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                            : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                        }`}
                      >
                        <option value="">Select Academic Year</option>
                        {ACADEMIC_YEARS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.academicYear && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.academicYear}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Career Goal */}
              <div className="pt-2 border-t border-[#DCE3EC]">
                <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <Target className="w-4 h-4 text-[#315B8A]" />
                  <span>Target Career Goal <span className="text-rose-500">*</span></span>
                </h2>
                <p className="text-xs text-[#5A6A80] mb-3">
                  Select a common career trajectory or type your specific target role.
                </p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {POPULAR_GOALS.map((goal) => {
                    const isSelected = careerGoal.toLowerCase() === goal.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={goal}
                        onClick={() => {
                          setCareerGoal(goal);
                          if (fieldErrors.careerGoal) setFieldErrors((prev) => ({ ...prev, careerGoal: '' }));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left font-medium ${
                          isSelected
                            ? 'bg-[#142B4A] text-white border-[#142B4A] shadow-sm'
                            : 'bg-[#F8FAFC] text-[#142B4A] border-[#DCE3EC] hover:bg-[#EAF0F7]'
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  required
                  value={careerGoal}
                  onChange={(e) => {
                    setCareerGoal(e.target.value);
                    if (fieldErrors.careerGoal) setFieldErrors((prev) => ({ ...prev, careerGoal: '' }));
                  }}
                  placeholder="Or type custom career goal (e.g. Cloud Security Architect)"
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-[#142B4A] text-xs focus:outline-none transition-all ${
                    fieldErrors.careerGoal
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-[#DCE3EC] focus:border-[#142B4A] focus:ring-1 focus:ring-[#142B4A]'
                  }`}
                />
                {fieldErrors.careerGoal && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.careerGoal}</p>
                )}
              </div>

              {/* Section 3: Technical Skills */}
              <div className="pt-2 border-t border-[#DCE3EC]">
                <h2 className="text-sm font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-[#315B8A]" />
                  <span>Technical Skills <span className="text-rose-500">*</span></span>
                </h2>
                <p className="text-xs text-[#5A6A80] mb-3">
                  Select or type the programming languages, frameworks, and technical skills you currently know.
                </p>

                {/* Popular Skill Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {POPULAR_SKILLS.map((sk) => {
                    const isSelected = selectedSkills.includes(sk);
                    return (
                      <button
                        type="button"
                        key={sk}
                        onClick={() => (isSelected ? handleRemoveSkill(sk) : handleAddSkill(sk))}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-all flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#142B4A] text-white border-[#142B4A]'
                            : 'bg-white text-[#142B4A] border-[#DCE3EC] hover:bg-[#EAF0F7]'
                        }`}
                      >
                        <span>{sk}</span>
                        {isSelected ? <X className="w-3 h-3 ml-1" /> : <Plus className="w-3 h-3 ml-1 text-[#64748B]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom skill add input */}
                <div className="flex gap-2 mb-3">
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
                    placeholder="Add custom skill (e.g. Flutter, Rust, GraphQL) and press Enter"
                    className="flex-1 px-3.5 py-2 bg-white border border-[#DCE3EC] rounded-xl text-[#142B4A] text-xs focus:outline-none focus:border-[#142B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(customSkillInput)}
                    className="px-4 py-2 bg-[#EAF0F7] hover:bg-[#DCE3EC] text-[#142B4A] font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Skills Chips */}
                <div
                  className={`p-3 bg-[#F8FAFC] border rounded-xl min-h-[50px] flex flex-wrap gap-1.5 items-center ${
                    fieldErrors.technicalSkills ? 'border-rose-400' : 'border-[#DCE3EC]'
                  }`}
                >
                  {selectedSkills.length === 0 ? (
                    <span className="text-xs text-[#94A3B8] italic">No skills selected yet. Click or type above to add.</span>
                  ) : (
                    selectedSkills.map((sk) => (
                      <span
                        key={sk}
                        className="inline-flex items-center space-x-1.5 bg-white border border-[#DCE3EC] text-[#142B4A] font-semibold text-xs px-2.5 py-1 rounded-lg shadow-sm"
                      >
                        <span>{sk}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(sk)}
                          className="text-[#94A3B8] hover:text-rose-600 transition-colors"
                          title="Remove skill"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                {fieldErrors.technicalSkills && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.technicalSkills}</p>
                )}
              </div>

              {/* Submit and Continue Button */}
              <div className="pt-4 border-t border-[#DCE3EC] flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#64748B]">
                  All fields marked with <span className="text-rose-500 font-bold">*</span> are mandatory for career roadmap generation.
                </p>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full sm:w-auto px-8 py-3 bg-[#142B4A] hover:bg-[#1E3E6B] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving Student Details...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Your profile has been saved successfully!</span>
                    </>
                  ) : (
                    <>
                      <span>Submit and Continue</span>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
