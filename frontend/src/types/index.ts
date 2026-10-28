export type UserRole = 'student' | 'mentor' | 'staff' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  mentor_status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null;
  onboarding_completed?: boolean;
  avatar_url?: string;
  language_preference?: string;
  profile?: StudentProfile;
}

export interface StudentProfile {
  id?: number;
  user_id?: number;
  name?: string;
  full_name?: string;
  register_number?: string;
  mobile_number?: string;
  department?: string;
  academic_year?: string;
  career_goal?: string;
  target_role?: string;
  technical_skills?: string[];
  target_company_tier?: string;
  target_timeline_months?: number;
  daily_commitment_hours?: number;
  learning_style?: string;
  college_name?: string;
  onboarding_completed: boolean;
  current_readiness_score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  description?: string;
  difficulty_level?: number;
}

export interface StudentSkill {
  id: number;
  user_id: number;
  skill_id: number;
  skill?: Skill;
  self_rating: number;
  assessment_score: number;
  verified_level: number;
  blended_level: number;
  source: string;
  last_assessed_at?: string;
}

export interface SkillGap {
  skill_id: number;
  skill_name: string;
  category: string;
  required_level: number;
  current_level: number;
  gap_amount: number;
  gap_percentage: number;
  impact_on_readiness: number;
  status: 'critical' | 'moderate' | 'minor' | 'met';
}

export interface SkillGapAnalysis {
  overall_gap_percentage: number;
  met_skills_count: number;
  total_skills_count: number;
  gaps: SkillGap[];
  top_priority_skill?: SkillGap;
}

export interface AssessmentQuestion {
  id: number;
  assessment_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  explanation?: string;
  difficulty: string | number;
}

export interface Assessment {
  id: number;
  title: string;
  description?: string;
  skill_id: number;
  skill_name?: string;
  category?: string;
  total_questions: number;
  question_bank_size?: number;
  pass_percentage: number;
  time_limit_minutes: number;
  created_at: string;
}

export interface QuestionAnswerSubmit {
  question_id: number;
  selected_option: string;
  time_taken_seconds?: number;
}

export interface AssessmentResult {
  attempt_id: number;
  assessment_id: number;
  score: number;
  passed: boolean;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  previous_blended_level: number;
  new_blended_level: number;
  breakdown: Array<{
    question_id: number;
    question_text: string;
    selected_option: string;
    correct_option: string;
    is_correct: boolean;
    explanation?: string;
  }>;
}

export interface LearningResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'practice';
}

export interface ProofData {
  type: 'quiz' | 'github' | 'note';
  data: any;
  verified: boolean;
  completed_at?: string;
  feedback?: string;
}

export interface RoadmapItem {
  id: number;
  user_id?: number;
  roadmap_id?: number;
  title: string;
  description?: string;
  skill_id?: number;
  skill_name?: string;
  skill_gap_id?: number;
  category?: string;
  week_number: number;
  sequence_order?: number;
  estimated_hours: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'revision';
  item_type?: 'learn' | 'practice' | 'build' | 'interview_prep' | 'assess' | 'revision';
  type?: 'learn' | 'practice' | 'build' | 'interview_prep' | 'assess' | 'revision';
  difficulty?: 'easy' | 'medium' | 'hard';
  target_improvement?: string;
  phase?: string;
  resources?: LearningResource[];
  proof?: ProofData;
  resource_url?: string;
  completed_at?: string;
  target_score?: number;
  priority?: string;
}

export interface Roadmap {
  id?: number;
  user_id?: number;
  target_role: string;
  total_weeks: number;
  total_hours: number;
  items: RoadmapItem[];
  progress_percentage: number;
  completed_items: number;
  total_items: number;
  days_behind?: number;
  streak_days?: number;
}


export interface PlacementReadinessBreakdown {
  skills_score: number;
  assessments_score: number;
  projects_score: number;
  consistency_score: number;
  mentor_score: number;
  resume_score: number;
  mock_interview_score: number;
  overall_score: number;
  limiter_reason: string;
  readiness_tier: 'Ready' | 'Almost Ready' | 'Needs Work' | 'Beginning';
  recommendations: string[];
}

export interface ProjectTask {
  id: string;
  text: string;
  description?: string;
}

export interface ProjectMilestone {
  id: number;
  title: string;
  description: string;
  estimated_hours: number;
  tasks: ProjectTask[];
}

export interface ProjectLearningResource {
  title: string;
  url: string;
  type: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  estimated_hours: number;
  category?: string;
  domain?: string;
  tech_stack: string[];
  repo_template_url?: string;
  target_skills?: string[];
  gap_relevance_score?: number;
  student_status?: 'not_started' | 'in_progress' | 'completed' | string;
  progress_pct?: number;
  completed_milestones?: number[];
  completed_tasks?: string[];
}

export interface ProjectDetail extends Project {
  problem_statement?: string;
  objectives?: string[];
  prerequisites?: string[];
  expected_outcome?: string;
  required_tools?: string[];
  setup_instructions?: string[];
  learning_resources?: ProjectLearningResource[];
  testing_steps?: string[];
  roadmap_steps?: string[];
  milestones?: ProjectMilestone[];
  student_project_id?: number | null;
  notes?: string;
  github_url?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface Mentor {
  id: number;
  user_id: number;
  full_name: string;
  company: string;
  designation: string;
  bio?: string;
  skills_expertise: string[];
  expertise?: string[];
  years_experience?: number;
  max_students?: number;
  hourly_rate?: number;
  available_slots?: string[];
  match_percentage?: number;
  match_reasons?: string[];
  rating?: number;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'gap_alert' | 'roadmap_update' | 'mentor_request' | 'system' | 'drop_warning';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface WeeklyProgress {
  id: number;
  user_id: number;
  week_start_date: string;
  readiness_score: number;
  hours_spent: number;
  tasks_completed: number;
  assessments_passed: number;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  language?: string;
}
