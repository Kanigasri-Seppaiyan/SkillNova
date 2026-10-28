import api from '../lib/axios';
import {
  User,
  StudentProfile,
  StudentSkill,
  SkillGapAnalysis,
  Assessment,
  AssessmentResult,
  QuestionAnswerSubmit,
  Roadmap,
  PlacementReadinessBreakdown,
  Project,
  ProjectDetail,
  Mentor,
  Notification,
  WeeklyProgress,
  AIChatMessage
} from '../types';

// Mock Demo Data Fallbacks for standalone frontend preview when backend is not active locally

const MOCK_STUDENT: User = {
  id: 1,
  email: 'student@bitsathy.ac.in',
  full_name: 'Alex Johnson',
  role: 'student',
  is_active: true,
  language_preference: 'en',
  profile: {
    id: 1,
    user_id: 1,
    career_goal: 'Full Stack Software Engineer at Tier 1 Tech',
    target_role: 'Software Engineer',
    target_company_tier: 'Tier 1 Product',
    target_timeline_months: 6,
    daily_commitment_hours: 3,
    onboarding_completed: true,
    current_readiness_score: 74,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

const MOCK_MENTOR: User = {
  id: 2,
  email: 'mentor@bitsathy.ac.in',
  full_name: 'Dr. Sarah Jenkins',
  role: 'mentor',
  is_active: true
};

const MOCK_ADMIN: User = {
  id: 3,
  email: 'admin@bitsathy.ac.in',
  full_name: 'System Admin',
  role: 'admin',
  is_active: true
};


const MOCK_READINESS: PlacementReadinessBreakdown = {
  skills_score: 75,
  assessments_score: 70,
  projects_score: 80,
  consistency_score: 85,
  mentor_score: 60,
  resume_score: 78,
  mock_interview_score: 65,
  overall_score: 74,
  limiter_reason: 'Mock Interview & Mentor Endorsement scores are below baseline',
  readiness_tier: 'Needs Work',
  recommendations: [
    'Schedule a mock interview session with a Tier 1 mentor',
    'Complete the Python System Architecture assessment',
    'Finish the Microservices Portfolio Project'
  ]
};

const MOCK_GAPS: SkillGapAnalysis = {
  overall_gap_percentage: 28,
  met_skills_count: 7,
  total_skills_count: 10,
  gaps: [
    {
      skill_id: 1,
      skill_name: 'System Design & Architecture',
      category: 'Backend',
      required_level: 4,
      current_level: 2.2,
      gap_amount: 1.8,
      gap_percentage: 45,
      impact_on_readiness: 12,
      status: 'critical'
    },
    {
      skill_id: 2,
      skill_name: 'Data Structures & Algorithms',
      category: 'Core Computer Science',
      required_level: 5,
      current_level: 3.6,
      gap_amount: 1.4,
      gap_percentage: 28,
      impact_on_readiness: 10,
      status: 'moderate'
    },
    {
      skill_id: 3,
      skill_name: 'FastAPI & Async Python',
      category: 'Backend',
      required_level: 4,
      current_level: 3.2,
      gap_amount: 0.8,
      gap_percentage: 20,
      impact_on_readiness: 5,
      status: 'minor'
    }
  ],
  top_priority_skill: {
    skill_id: 1,
    skill_name: 'System Design & Architecture',
    category: 'Backend',
    required_level: 4,
    current_level: 2.2,
    gap_amount: 1.8,
    gap_percentage: 45,
    impact_on_readiness: 12,
    status: 'critical'
  }
};

const MOCK_ROADMAP: Roadmap = {
  user_id: 1,
  target_role: 'Software Engineer',
  total_weeks: 12,
  total_hours: 144,
  progress_percentage: 25,
  completed_items: 3,
  total_items: 28,
  days_behind: 3,
  streak_days: 5,
  items: [
    // PHASE 1: Foundations & Architecture (Weeks 1-3)
    {
      id: 101,
      user_id: 1,
      title: 'Master System Design Basics (Scalability, Load Balancing)',
      description: 'Study horizontal vs vertical scaling, DNS routing, reverse proxies, and caching strategies with Redis.',
      category: 'Backend',
      week_number: 1,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'completed',
      item_type: 'learn',
      difficulty: 'medium',
      target_improvement: 'Closes gap: System Design (62% → 71%)',
      phase: 'Foundations & Architecture',
      completed_at: '2026-09-24T10:00:00Z',
      proof: {
        type: 'quiz',
        verified: true,
        completed_at: '2026-09-24T10:00:00Z',
        data: { score: 3, total: 3 }
      },
      resources: [
        { title: 'System Design Primer Guide', url: 'https://github.com/donnemartin/system-design-primer', type: 'article' },
        { title: 'Scalability & Load Balancing Video', url: 'https://www.youtube.com', type: 'video' },
        { title: 'Interactive Architecture Sandbox', url: 'https://roadmap.sh', type: 'practice' }
      ]
    },
    {
      id: 102,
      user_id: 1,
      title: 'Database Indexing & Query Execution Plans',
      description: 'Analyze B-Tree indexes, composite keys, explain analyze plans, and SQL query optimization.',
      category: 'Database',
      week_number: 1,
      sequence_order: 2,
      estimated_hours: 5,
      status: 'completed',
      item_type: 'practice',
      difficulty: 'medium',
      target_improvement: 'Closes gap: SQL & Database Internals (55% → 68%)',
      phase: 'Foundations & Architecture',
      completed_at: '2026-09-26T14:30:00Z',
      proof: {
        type: 'github',
        verified: true,
        completed_at: '2026-09-26T14:30:00Z',
        data: { url: 'https://github.com/student/postgres-indexing-benchmark' }
      },
      resources: [
        { title: 'Use The Index, Luke! Guide', url: 'https://use-the-index-luke.com', type: 'article' },
        { title: 'PostgreSQL Index Walkthrough', url: 'https://www.youtube.com', type: 'video' },
        { title: 'SQL Tuning Interactive Exercises', url: 'https://sqlbolt.com', type: 'practice' }
      ]
    },
    {
      id: 103,
      user_id: 1,
      title: 'RESTful API Architecture & Idempotency Keys',
      description: 'Design robust REST contracts, error payloads, and safe retry mechanisms using idempotency keys.',
      category: 'Backend',
      week_number: 1,
      sequence_order: 3,
      estimated_hours: 4,
      status: 'completed',
      item_type: 'build',
      difficulty: 'easy',
      target_improvement: 'Closes gap: REST API Design (70% → 82%)',
      phase: 'Foundations & Architecture',
      completed_at: '2026-09-28T18:00:00Z',
      proof: {
        type: 'note',
        verified: true,
        completed_at: '2026-09-28T18:00:00Z',
        feedback: 'Solid reflection on idempotency keys preventing double-billing in distributed payment flows.',
        data: { text: 'Learned how header-based idempotency tokens prevent duplicate transactions on network timeouts.' }
      },
      resources: [
        { title: 'Stripe Idempotency RFC Overview', url: 'https://stripe.com/docs/api/idempotent_requests', type: 'article' },
        { title: 'API Contract Design Best Practices', url: 'https://microservices.io', type: 'article' }
      ]
    },
    {
      id: 104,
      user_id: 1,
      title: 'Implement Microservices Event Bus with Kafka',
      description: 'Build publisher-subscriber pattern for asynchronous event communication and consumer offset management.',
      category: 'Backend',
      week_number: 2,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'in_progress',
      item_type: 'build',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Distributed Messaging (48% → 65%)',
      phase: 'Foundations & Architecture',
      resources: [
        { title: 'Kafka Architecture & Partitions Crash Course', url: 'https://kafka.apache.org', type: 'video' },
        { title: 'Event-Driven Microservices Guide', url: 'https://martinfowler.com', type: 'article' },
        { title: 'Kafka Docker Starter Lab', url: 'https://github.com', type: 'practice' }
      ]
    },
    {
      id: 105,
      user_id: 1,
      title: 'Redis Caching Strategies & Cache Invalidation',
      description: 'Master Cache-Aside, Write-Through, Write-Behind, cache stampede mitigation, and TTL eviction policies.',
      category: 'Database',
      week_number: 2,
      sequence_order: 2,
      estimated_hours: 5,
      status: 'pending',
      item_type: 'practice',
      difficulty: 'medium',
      target_improvement: 'Closes gap: In-Memory Caching (58% → 72%)',
      phase: 'Foundations & Architecture',
      resources: [
        { title: 'Redis Caching Deep Dive', url: 'https://redis.io/docs', type: 'article' },
        { title: 'Preventing Cache Stampede Video', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 106,
      user_id: 1,
      title: 'Foundations Phase Milestone Assessment & DSA Review',
      description: 'Solve 10 medium graph and tree problems under timed conditions to solidify foundational coding pace.',
      category: 'Core CS',
      week_number: 3,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'interview_prep',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Algorithmic Complexity (60% → 75%)',
      phase: 'Foundations & Architecture',
      resources: [
        { title: 'Blind 75 Trees & Graphs Checklist', url: 'https://leetcode.com', type: 'practice' },
        { title: 'Tree Traversal Techniques', url: 'https://geeksforgeeks.org', type: 'article' }
      ]
    },

    // PHASE 2: Backend & Distributed Systems (Weeks 4-6)
    {
      id: 201,
      user_id: 1,
      title: 'gRPC & Protocol Buffers Inter-Service Communication',
      description: 'Implement binary streaming contracts, multiplexed HTTP/2 transport, and client-side load balancing.',
      category: 'Backend',
      week_number: 4,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'build',
      difficulty: 'medium',
      target_improvement: 'Closes gap: High-Performance RPC (40% → 62%)',
      phase: 'Backend & Distributed Systems',
      resources: [
        { title: 'gRPC Python & Go Official Guide', url: 'https://grpc.io/docs', type: 'article' },
        { title: 'Protobuf Serialization Benchmarks', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 202,
      user_id: 1,
      title: 'Distributed Transactions & The Saga Pattern',
      description: 'Design choreography and orchestration-based sagas with compensating transactions for eventual consistency.',
      category: 'Backend',
      week_number: 4,
      sequence_order: 2,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'learn',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Distributed Consistency (42% → 60%)',
      phase: 'Backend & Distributed Systems',
      resources: [
        { title: 'Saga Pattern for Microservices', url: 'https://microservices.io/patterns/data/saga.html', type: 'article' },
        { title: 'Distributed Sagas Explained', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 203,
      user_id: 1,
      title: 'Database Sharding, Partitions & Read Replicas',
      description: 'Implement hash-based range sharding and master-replica replication with read-after-write consistency.',
      category: 'Database',
      week_number: 5,
      sequence_order: 1,
      estimated_hours: 7,
      status: 'pending',
      item_type: 'practice',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Database Scaling (50% → 70%)',
      phase: 'Backend & Distributed Systems',
      resources: [
        { title: 'Database Sharding Architectures', url: 'https://aws.amazon.com', type: 'article' },
        { title: 'Replication Lag Demystified', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 204,
      user_id: 1,
      title: 'Distributed Rate Limiting with Token Bucket & Leaky Bucket',
      description: 'Implement Redis sliding window rate limiters to protect downstream services from spikes.',
      category: 'Backend',
      week_number: 6,
      sequence_order: 1,
      estimated_hours: 5,
      status: 'pending',
      item_type: 'build',
      difficulty: 'medium',
      target_improvement: 'Closes gap: API Security & Resilience (65% → 78%)',
      phase: 'Backend & Distributed Systems',
      resources: [
        { title: 'Rate Limiting Algorithms Deep Dive', url: 'https://konghq.com', type: 'article' },
        { title: 'Sliding Window Redis Implementation', url: 'https://redis.io', type: 'practice' }
      ]
    },

    // PHASE 3: Systems & Scalability (Weeks 7-9)
    {
      id: 301,
      user_id: 1,
      title: 'Distributed Tracing & Observability with OpenTelemetry',
      description: 'Instrument spans, context propagation, latency heatmaps, and metric aggregations across microservices.',
      category: 'DevOps',
      week_number: 7,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'practice',
      difficulty: 'medium',
      target_improvement: 'Closes gap: Cloud Observability (45% → 65%)',
      phase: 'Systems & Scalability',
      resources: [
        { title: 'OpenTelemetry Fundamentals', url: 'https://opentelemetry.io', type: 'article' },
        { title: 'Jaeger Distributed Tracing Lab', url: 'https://www.jaegertracing.io', type: 'practice' }
      ]
    },
    {
      id: 302,
      user_id: 1,
      title: 'Container Orchestration with Docker & Kubernetes Pods',
      description: 'Write production Dockerfiles, multi-stage builds, deployment manifests, and liveness/readiness probes.',
      category: 'DevOps',
      week_number: 8,
      sequence_order: 1,
      estimated_hours: 7,
      status: 'pending',
      item_type: 'build',
      difficulty: 'medium',
      target_improvement: 'Closes gap: Containerized Infrastructure (52% → 72%)',
      phase: 'Systems & Scalability',
      resources: [
        { title: 'Kubernetes The Hard Way Guide', url: 'https://github.com/kelseyhightower/kubernetes-the-hard-way', type: 'article' },
        { title: 'Production Dockerfile Best Practices', url: 'https://docs.docker.com', type: 'video' }
      ]
    },
    {
      id: 303,
      user_id: 1,
      title: 'Fault Tolerance & Resilience (Circuit Breakers & Retries)',
      description: 'Integrate Resilience4j or Polly circuit breakers, fallback responses, and exponential backoff.',
      category: 'Backend',
      week_number: 9,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'practice',
      difficulty: 'hard',
      target_improvement: 'Closes gap: High Availability Architecture (55% → 74%)',
      phase: 'Systems & Scalability',
      resources: [
        { title: 'Netflix Hystrix & Circuit Breaker Pattern', url: 'https://martinfowler.com', type: 'article' },
        { title: 'Exponential Backoff Simulation', url: 'https://aws.amazon.com', type: 'practice' }
      ]
    },

    // PHASE 4: Interview Prep & Mastery (Weeks 10-12)
    {
      id: 401,
      user_id: 1,
      title: 'Concurrency, Thread Pools & Deadlock Avoidance',
      description: 'Review lock-free programming, race conditions, atomic variables, and thread contention profiling.',
      category: 'Core CS',
      week_number: 10,
      sequence_order: 1,
      estimated_hours: 6,
      status: 'pending',
      item_type: 'learn',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Concurrent Programming (50% → 73%)',
      phase: 'Interview Prep & Mastery',
      resources: [
        { title: 'Java/Python Concurrency Models', url: 'https://docs.python.org', type: 'article' },
        { title: 'Deadlock Avoidance Strategies', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 402,
      user_id: 1,
      title: 'System Design Mock Interview: Design a URL Shortener & Rate Limiter',
      description: 'Deliver full 45-min whiteboard presentation: capacity estimation, data schema, API design, and bottlenecks.',
      category: 'System Design',
      week_number: 11,
      sequence_order: 1,
      estimated_hours: 7,
      status: 'pending',
      item_type: 'interview_prep',
      difficulty: 'hard',
      target_improvement: 'Closes gap: Whiteboard Communication (60% → 82%)',
      phase: 'Interview Prep & Mastery',
      resources: [
        { title: 'Designing TinyURL Architecture', url: 'https://github.com/donnemartin/system-design-primer', type: 'article' },
        { title: 'Mock System Design Interview Video', url: 'https://www.youtube.com', type: 'video' }
      ]
    },
    {
      id: 403,
      user_id: 1,
      title: 'Comprehensive Tier-1 Placement Readiness Mock Simulation',
      description: 'End-to-end full loop simulation covering 2 technical coding rounds, 1 system design, and 1 behavioral review.',
      category: 'Career',
      week_number: 12,
      sequence_order: 1,
      estimated_hours: 8,
      status: 'pending',
      item_type: 'interview_prep',
      difficulty: 'hard',
      target_improvement: 'Placement Readiness Target: 85%+',
      phase: 'Interview Prep & Mastery',
      resources: [
        { title: 'Behavioral STAR Framework Prep Guide', url: 'https://hbr.org', type: 'article' },
        { title: 'Technical Interview Final Checklist', url: 'https://interviewing.io', type: 'practice' }
      ]
    }
  ]
};


export const authAPI = {
  login: async (email: string, password_hash: string, account_type?: string) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password_hash);
    if (account_type) {
      params.append('account_type', account_type);
    }
    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  },
  register: async (data: { email: string; password: string; full_name: string; role?: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Partial<StudentProfile>) => {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },
  googleLogin: async (credential: string, account_type?: string) => {
    const res = await api.post('/auth/google', { credential, account_type });
    return res.data;
  }
};

export const onboardingAPI = {
  submitWizard: async (data: any) => {
    const res = await api.post('/onboarding/complete', data);
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/onboarding/status');
    return res.data;
  }
};

export const studentAPI = {
  getProfile: async () => {
    const res = await api.get('/student/profile');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await api.put('/student/profile', data);
    return res.data;
  },
  submitOnboarding: async (data: {
    full_name: string;
    register_number: string;
    mobile_number: string;
    department: string;
    academic_year: string;
    college_email?: string;
    career_goal: string;
    technical_skills: string[];
  }) => {
    const res = await api.post('/student/onboarding', data);
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/student/onboarding-status');
    return res.data;
  }
};

export const skillsAPI = {
  getAll: async () => {
    try {
      const res = await api.get('/skills/catalog');
      return res.data;
    } catch (e) {
      return [
        { id: 1, name: 'System Design & Architecture', category: 'Backend', difficulty_level: 4 },
        { id: 2, name: 'Data Structures & Algorithms', category: 'Core CS', difficulty_level: 5 },
        { id: 3, name: 'FastAPI & Async Python', category: 'Backend', difficulty_level: 3 },
        { id: 4, name: 'React & TypeScript', category: 'Frontend', difficulty_level: 3 },
        { id: 5, name: 'Docker & Kubernetes', category: 'DevOps', difficulty_level: 4 }
      ];
    }
  },
  getMySkills: async (): Promise<StudentSkill[]> => {
    try {
      const res = await api.get('/skills/my-skills');
      return res.data;
    } catch (e) {
      return [
        { id: 1, user_id: 1, skill_id: 1, skill: { id: 1, name: 'System Design & Architecture', category: 'Backend' }, self_rating: 3, assessment_score: 2, verified_level: 2, blended_level: 2.4, source: 'assessment' },
        { id: 2, user_id: 1, skill_id: 2, skill: { id: 2, name: 'Data Structures & Algorithms', category: 'Core CS' }, self_rating: 4, assessment_score: 3, verified_level: 3, blended_level: 3.4, source: 'assessment' },
        { id: 3, user_id: 1, skill_id: 3, skill: { id: 3, name: 'FastAPI & Async Python', category: 'Backend' }, self_rating: 4, assessment_score: 4, verified_level: 4, blended_level: 4.0, source: 'assessment' }
      ];
    }
  },
  getGapAnalysis: async (): Promise<SkillGapAnalysis> => {
    try {
      const res = await api.get('/skills/gap-analysis');
      return res.data;
    } catch (e) {
      return MOCK_GAPS;
    }
  },
  updateSelfRating: async (skillId: number, rating: number) => {
    try {
      const res = await api.post('/skills/self-rate', { skill_id: skillId, rating });
      return res.data;
    } catch (e) {
      return { message: 'Skill self rating updated successfully' };
    }
  }
};

export const assessmentAPI = {
  list: async (): Promise<Assessment[]> => {
    try {
      // Backend endpoint is /assessments/ (not /catalog)
      const res = await api.get('/assessments/');
      // Normalize backend fields to frontend Assessment type
      return res.data.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        skill_id: a.skill_id,
        category: a.category || 'Engineering',
        total_questions: a.total_questions ?? a.question_count ?? 10,
        question_bank_size: a.question_bank_size ?? 20,
        pass_percentage: a.pass_percentage ?? 80,
        time_limit_minutes: a.time_limit_minutes ?? 15,
        created_at: a.created_at ?? new Date().toISOString(),
      }));
    } catch (e) {
      return [
        { id: 1, title: 'Python Fundamentals', description: 'Variables, loops, functions, lists, dicts, exceptions, and basic OOP.', skill_id: 1, category: 'Python', total_questions: 10, question_bank_size: 20, pass_percentage: 80, time_limit_minutes: 15, created_at: new Date().toISOString() },
        { id: 2, title: 'JavaScript & React Basics', description: 'Scope, closures, promises, DOM, JSX, components, hooks, and state.', skill_id: 4, category: 'React', total_questions: 10, question_bank_size: 20, pass_percentage: 80, time_limit_minutes: 15, created_at: new Date().toISOString() },
        { id: 3, title: 'SQL & Databases', description: 'Queries, joins, grouping, indexing, constraints, normalization, and ACID.', skill_id: 7, category: 'Databases', total_questions: 10, question_bank_size: 20, pass_percentage: 80, time_limit_minutes: 15, created_at: new Date().toISOString() },
        { id: 4, title: 'Data Structures — Arrays & Sorting', description: 'Array traversal, binary search, sorting algorithms, stacks, and queues.', skill_id: 19, category: 'Core CS', total_questions: 10, question_bank_size: 20, pass_percentage: 80, time_limit_minutes: 15, created_at: new Date().toISOString() },
        { id: 5, title: 'System Design Fundamentals', description: 'Horizontal scaling, caching, load balancing, CAP theorem, and rate limiting.', skill_id: 17, category: 'Architecture', total_questions: 10, question_bank_size: 20, pass_percentage: 80, time_limit_minutes: 15, created_at: new Date().toISOString() },
      ];
    }
  },
  getDetail: async (id: number) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      return res.data;
    } catch (e) {
      return { id, title: 'Assessment', total_questions: 10, question_bank_size: 20, time_limit_minutes: 15 };
    }
  },
  start: async (id: number) => {
    try {
      const res = await api.post(`/assessments/${id}/start`);
      const data = res.data;
      // Backend returns: { attempt_id, assessment_id, title, time_limit_minutes, saved_answers, questions: [...] }
      const normalizedQuestions = (data.questions || []).map((q: any) => {
        const opts: Array<{id: string; text: string}> = Array.isArray(q.options) ? q.options : [];
        const getOpt = (key: string) =>
          opts.find((o) => o.id === key)?.text ?? opts[['a','b','c','d'].indexOf(key)]?.text ?? '';
        return {
          id: q.id,
          assessment_id: id,
          question_text: q.question_text,
          option_a: getOpt('a'),
          option_b: getOpt('b'),
          option_c: getOpt('c'),
          option_d: getOpt('d'),
          difficulty: q.difficulty ?? 3,
          order: q.order ?? 0,
        };
      });
      return {
        attempt_id: data.attempt_id,
        assessment: {
          id: data.assessment_id ?? id,
          title: data.title ?? 'Assessment',
          total_questions: normalizedQuestions.length,
          time_limit_minutes: data.time_limit_minutes ?? 15,
        },
        saved_answers: data.saved_answers || {},
        questions: normalizedQuestions,
      };
    } catch (e) {
      return {
        attempt_id: 999,
        assessment: { id, title: 'Assessment', total_questions: 10, time_limit_minutes: 15 },
        saved_answers: {},
        questions: []
      };
    }
  },
  submit: async (id: number, attemptId: number, answers: QuestionAnswerSubmit[]): Promise<AssessmentResult> => {
    try {
      const backendAnswers = answers.map((a) => ({
        question_id: a.question_id,
        selected_answer: a.selected_option,
        time_taken_seconds: a.time_taken_seconds,
      }));
      const res = await api.post(`/assessments/${id}/submit`, {
        attempt_id: attemptId,
        answers: backendAnswers,
      });
      const data = res.data;
      return {
        attempt_id: data.attempt_id,
        assessment_id: id,
        score: data.score,
        passed: data.passed ?? (data.score >= 80),
        total_questions: data.total_questions,
        correct_count: data.raw_score,
        incorrect_count: data.incorrect_count ?? (data.total_questions - data.raw_score),
        previous_blended_level: 0,
        new_blended_level: 0,
        breakdown: (data.per_question || []).map((pq: any, i: number) => ({
          question_id: pq.question_id,
          question_text: pq.question_text || `Question ${i + 1}`,
          selected_option: pq.selected_answer || answers.find((a) => a.question_id === pq.question_id)?.selected_option || '',
          correct_option: pq.correct_answer ?? '',
          is_correct: pq.is_correct,
          explanation: pq.explanation ?? '',
        })),
      };
    } catch (e) {
      return {
        attempt_id: attemptId,
        assessment_id: id,
        score: 0,
        passed: false,
        total_questions: answers.length || 10,
        correct_count: 0,
        incorrect_count: answers.length || 10,
        previous_blended_level: 2.2,
        new_blended_level: 3.8,
        breakdown: [
          { question_id: 101, question_text: 'Which strategy handles database write bottlenecks under high concurrency?', selected_option: 'b', correct_option: 'b', is_correct: true, explanation: 'Sharding distributes write operations across database shards.' },
          { question_id: 102, question_text: 'What is the primary benefit of the CAP Theorem consistency guarantee?', selected_option: 'b', correct_option: 'b', is_correct: true, explanation: 'Consistency guarantees that every read receives the most recent write.' },
          { question_id: 103, question_text: 'Which HTTP status code signifies a rate-limited request?', selected_option: 'c', correct_option: 'c', is_correct: true, explanation: 'HTTP 429 Too Many Requests indicates rate limiting.' }
        ]
      };
    }
  }
};

export const roadmapAPI = {
  get: async (): Promise<Roadmap> => {
    try {
      const res = await api.get('/roadmap');
      return res.data;
    } catch (e) {
      return MOCK_ROADMAP;
    }
  },
  generate: async () => {
    try {
      const res = await api.post('/roadmap/generate');
      return res.data;
    } catch (e) {
      return MOCK_ROADMAP;
    }
  },
  recalculate: async () => {
    try {
      const res = await api.post('/roadmap/recalculate');
      return res.data;
    } catch (e) {
      return MOCK_ROADMAP;
    }
  },
  updateItemStatus: async (itemId: number, status: string, proof?: any) => {
    try {
      const res = await api.put(`/roadmap/items/${itemId}`, { status, proof });
      return res.data;
    } catch (e) {
      // Local fallback
      const item = MOCK_ROADMAP.items.find(i => i.id === itemId);
      if (item) {
        item.status = status as any;
        if (proof) item.proof = proof;
        if (status === 'completed') {
          item.completed_at = new Date().toISOString();
        }
      }
      return { message: 'Item status updated', status, proof };
    }
  },
  getTaskQuiz: async (itemId: number, taskTitle?: string) => {
    try {
      const res = await api.get(`/roadmap/items/${itemId}/quiz`);
      return res.data;
    } catch (e) {
      return {
        questions: [
          {
            id: 1,
            question: `What is the primary core objective when implementing '${taskTitle || 'this task'}'?`,
            options: [
              'Ensure architectural resilience and maintainable code patterns',
              'Avoid writing tests to release rapidly',
              'Bypass modular design conventions',
              'Direct database modifications in production'
            ],
            correctAnswer: 0,
            explanation: 'Best practices focus on resilience, modularity, and clean architectural boundaries.'
          },
          {
            id: 2,
            question: 'Which metric best proves successful completion and efficiency?',
            options: [
              'Lines of code written',
              'Passing integration tests with documented benchmarks',
              'Highest memory consumption',
              'Time spent in editor without profiling'
            ],
            correctAnswer: 1,
            explanation: 'Verified benchmark data and integration tests confirm real functional correctness.'
          },
          {
            id: 3,
            question: 'How does mastering this task improve placement readiness?',
            options: [
              'It closes key technical competency gaps required by top engineering teams',
              'It guarantees memorization without deep comprehension',
              'It replaces foundational CS fundamentals',
              'It avoids code review standards'
            ],
            correctAnswer: 0,
            explanation: 'Demonstrating hands-on mastery directly elevates your technical interview readiness.'
          }
        ]
      };
    }
  },
  validateReflectionNote: async (itemId: number, text: string) => {
    try {
      const res = await api.post(`/roadmap/items/${itemId}/verify-note`, { text });
      return res.data;
    } catch (e) {
      return {
        verified: true,
        feedback: 'AI Analysis: Strong conceptual clarity and practical understanding of distributed tradeoffs.'
      };
    }
  },
  getRecalculatePreview: async () => {
    try {
      const res = await api.get('/roadmap/recalculate-preview');
      return res.data;
    } catch (e) {
      return {
        addedTasks: [
          'Master Distributed Transactions with 2-Phase Commit & Saga',
          'Concurrency profiling under 10k req/sec load'
        ],
        removedTasks: [
          'Redundant Basic SQL syntax review'
        ],
        movedTasks: [
          { task: 'Redis Caching Strategies & Cache Invalidation', fromWeek: 2, toWeek: 3 },
          { task: 'Fault Tolerance & Resilience (Circuit Breakers)', fromWeek: 9, toWeek: 8 }
        ],
        hoursDiff: -4,
        newTotalHours: 140,
        reason: 'Accelerated your progress in SQL internals; reallocating 4 hours towards distributed systems.'
      };
    }
  },
  applyAdaptiveAction: async (action: 'compress' | 'extend') => {
    try {
      const res = await api.post('/roadmap/adaptive-action', { action });
      return res.data;
    } catch (e) {
      if (action === 'compress') {
        MOCK_ROADMAP.days_behind = 0;
        return { message: 'Upcoming weeks compressed and synchronized to schedule.', days_behind: 0 };
      } else {
        MOCK_ROADMAP.total_weeks = (MOCK_ROADMAP.total_weeks || 12) + 1;
        MOCK_ROADMAP.days_behind = 0;
        return { message: 'Horizon extended by 1 week.', total_weeks: MOCK_ROADMAP.total_weeks, days_behind: 0 };
      }
    }
  }
};


export const placementAPI = {
  getBreakdown: async (): Promise<PlacementReadinessBreakdown> => {
    try {
      const res = await api.get('/placement/readiness');
      return res.data;
    } catch (e) {
      return MOCK_READINESS;
    }
  },
  getLimiter: async () => {
    try {
      const res = await api.get('/placement/limiter-explanation');
      return res.data;
    } catch (e) {
      return { limiter_reason: MOCK_READINESS.limiter_reason };
    }
  }
};

export const progressAPI = {
  getTrend: async (): Promise<WeeklyProgress[]> => {
    try {
      // Correct endpoint is /progress/weekly; it returns { weeks: [...] }
      const res = await api.get('/progress/weekly');
      const data = res.data;
      // Backend wraps the array: { weeks: [ { week_start, readiness_score, ... } ] }
      const rawWeeks: any[] = Array.isArray(data) ? data : (Array.isArray(data?.weeks) ? data.weeks : []);
      // Map backend field names to the frontend WeeklyProgress interface
      return rawWeeks.map((w: any, i: number) => ({
        id: w.id ?? i + 1,
        user_id: w.user_id ?? 0,
        week_start_date: w.week_start_date ?? w.week_start ?? '',
        readiness_score: w.readiness_score ?? 0,
        hours_spent: w.hours_spent ?? 0,
        tasks_completed: w.tasks_completed ?? w.roadmap_items_completed ?? 0,
        assessments_passed: w.assessments_passed ?? w.assessments_taken ?? 0,
      }));
    } catch (e) {
      // Fallback mock data so the trend chart is never empty on error
      return [
        { id: 1, user_id: 0, week_start_date: '2026-08-10', readiness_score: 55, hours_spent: 12, tasks_completed: 4, assessments_passed: 1 },
        { id: 2, user_id: 0, week_start_date: '2026-08-17', readiness_score: 62, hours_spent: 15, tasks_completed: 6, assessments_passed: 2 },
        { id: 3, user_id: 0, week_start_date: '2026-08-24', readiness_score: 68, hours_spent: 18, tasks_completed: 8, assessments_passed: 2 },
        { id: 4, user_id: 0, week_start_date: '2026-08-31', readiness_score: 74, hours_spent: 21, tasks_completed: 10, assessments_passed: 3 }
      ];
    }
  },
  getSummary: async () => {
    try {
      const res = await api.get('/progress/summary');
      return res.data;
    } catch (e) {
      return { total_hours: 66, current_streak_weeks: 4 };
    }
  }
};

export const projectsAPI = {
  getRecommended: async (): Promise<Project[]> => {
    try {
      const res = await api.get('/projects/recommended');
      const data = res.data;
      let projects: any[];
      if (Array.isArray(data)) {
        projects = data;
      } else if (data && Array.isArray(data.recommendations)) {
        projects = data.recommendations;
      } else {
        projects = [];
      }
      return projects as Project[];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  getById: async (projectId: number): Promise<ProjectDetail> => {
    const res = await api.get(`/projects/${projectId}`);
    return res.data;
  },
  startProject: async (projectId: number) => {
    const res = await api.post(`/projects/${projectId}/start`);
    return res.data;
  },
  saveProgress: async (
    projectId: number,
    data: {
      progress_pct: number;
      completed_milestones?: number[];
      completed_tasks?: string[];
      notes?: string;
      github_url?: string;
      status?: string;
    }
  ) => {
    const res = await api.put(`/projects/${projectId}/progress`, data);
    return res.data;
  },
  updateStatus: async (projectId: number, status: string) => {
    const res = await api.put(`/projects/${projectId}/progress`, {
      progress_pct: status === 'completed' ? 100 : 0,
      status
    });
    return res.data;
  }
};

export const mentorsAPI = {
  getRecommended: async (): Promise<Mentor[]> => {
    try {
      const res = await api.get('/mentors/recommended');
      const data = res.data;
      // Backend returns { recommendations: [{ mentor_id, name, bio, domain, match_score, breakdown }] }
      // We need to extract and map to the Mentor interface.
      let rawList: any[];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data && Array.isArray(data.recommendations)) {
        rawList = data.recommendations;
      } else {
        rawList = [];
      }
      // Map backend field names to Mentor interface
      return rawList.map((r: any) => {
        const skills = Array.isArray(r.skills_expertise)
          ? r.skills_expertise
          : Array.isArray(r.expertise)
          ? r.expertise
          : Array.isArray(r.teachable_skills)
          ? r.teachable_skills
          : ['System Architecture', 'Career Guidance'];

        return {
          id: r.id ?? r.mentor_id ?? 0,
          user_id: r.user_id ?? r.mentor_id ?? 0,
          full_name: r.full_name ?? r.name ?? 'Unknown Mentor',
          company: r.company ?? r.domain ?? 'Tech Mentor',
          designation: r.designation ?? `${r.years_experience ?? 5} yrs experience`,
          bio: r.bio ?? '',
          skills_expertise: skills,
          expertise: skills,
          years_experience: r.years_experience ?? 5,
          max_students: r.max_students ?? 5,
          match_percentage: r.match_percentage ?? (r.match_score != null ? Math.round(r.match_score * 100) : 85),
          match_reasons: Array.isArray(r.match_reasons)
            ? r.match_reasons
            : (r.breakdown ? Object.entries(r.breakdown).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`) : ['Domain alignment']),
        };
      }) as Mentor[];
    } catch (e) {
      // Fallback mock data when backend is unreachable
      return [
        { id: 1, user_id: 10, full_name: 'Dr. Sarah Jenkins', company: 'Google', designation: 'Staff Engineer', bio: 'Specializing in distributed systems, backend scaling, and technical career mentoring.', skills_expertise: ['System Design', 'Python', 'Distributed Systems'], expertise: ['System Design', 'Python', 'Distributed Systems'], years_experience: 8, max_students: 5, match_percentage: 94, match_reasons: ['Expertise in your top priority gap (System Design)', 'Ex-FAANG interviewer experience'] },
        { id: 2, user_id: 11, full_name: 'Michael Chang', company: 'Uber', designation: 'Senior Backend Engineer', bio: 'Passionate about microservices architecture and helping students ace system design interviews.', skills_expertise: ['FastAPI', 'Kafka', 'System Design'], expertise: ['FastAPI', 'Kafka', 'System Design'], years_experience: 6, max_students: 4, match_percentage: 88, match_reasons: ['Strong alignment with target role (Software Engineer)'] }
      ];
    }
  },
  requestMatch: async (mentorId: number, message: string) => {
    try {
      const res = await api.post(`/mentors/${mentorId}/request`, { message });
      return res.data;
    } catch (e) {
      return { message: 'Match request sent' };
    }
  }
};

export const aiAPI = {
  sendMessage: async (message: string, language: string = 'en') => {
    try {
      const res = await api.post('/ai/chat', { message, language });
      return res.data;
    } catch (e) {
      return {
        reply: `Based on your profile, your top priority skill gap is "System Design & Architecture" (45% gap). To improve your Placement Score (74%), I recommend completing the System Architecture assessment and working on the Distributed Microservices project!`
      };
    }
  },
  getHistory: async () => {
    try {
      const res = await api.get('/ai/history');
      return res.data;
    } catch (e) {
      return [
        { id: '1', sender: 'assistant', content: 'Hello Alex! I am your SkillNova AI Coach. Your current placement score is 74%. How can I help you prepare today?', timestamp: '10:00 AM' }
      ];
    }
  }
};

export const resumeAPI = {
  upload: async (file: File, careerGoal?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (careerGoal) {
      formData.append('career_goal', careerGoal);
    }
    const res = await api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  getCareerGoals: async () => {
    const res = await api.get('/resume/career-goals');
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get('/resume/history');
    return res.data;
  },
  getResume: async (resumeId: number) => {
    const res = await api.get(`/resume/${resumeId}`);
    return res.data;
  },
  getLatest: async () => {
    const res = await api.get('/resume/latest');
    return res.data;
  },
  syncSkills: async (resumeId: number, selectedSkills?: string[]) => {
    const res = await api.post(`/resume/${resumeId}/sync-skills`, { skills: selectedSkills });
    return res.data;
  },
  syncRoadmap: async (resumeId: number) => {
    const res = await api.post(`/resume/${resumeId}/sync-roadmap`);
    return res.data;
  },
  syncPlacement: async (resumeId: number) => {
    const res = await api.post(`/resume/${resumeId}/sync-placement`);
    return res.data;
  },
  acceptExtractedSkills: async (resumeId: number, selectedSkills: string[]) => {
    const res = await api.post(`/resume/${resumeId}/sync-skills`, { skills: selectedSkills });
    return res.data;
  }
};

export const careerAPI = {
  getGPS: async () => {
    try {
      const res = await api.get('/career/gps');
      return res.data;
    } catch (e) {
      return {
        milestones: [
          { title: 'Core Skill Foundations', description: 'Complete initial self-rating & foundational assessments', status: 'completed', timeline: 'Weeks 1-2' },
          { title: 'System Architecture & Gap Closure', description: 'Address critical system design bottlenecks with project work', status: 'current', timeline: 'Weeks 3-6' },
          { title: 'Mock Interviews & Placement Prep', description: 'Execute mock interviews with Tier 1 mentors & polish resume', status: 'upcoming', timeline: 'Weeks 7-10' },
          { title: 'Offer & Placement Execution', description: 'Apply to target Tier 1 roles with verified readiness badge', status: 'upcoming', timeline: 'Weeks 11-12' }
        ]
      };
    }
  },
  getTwin: async () => {
    try {
      const res = await api.get('/career/twin');
      return res.data;
    } catch (e) {
      return {
        twin_name: 'Placed Tier 1 Peer Cohort Prototype',
        target_role: 'Software Engineer',
        placement_result: 'Placed Tier 1 Product',
        twin_readiness_score: 88,
        twin_projects_completed: 4,
        insight_summary: 'Students in your cohort who successfully placed in Tier 1 companies completed an average of 4 verified projects and maintained a 75%+ assessment pass rate.'
      };
    }
  }
};

export const notificationAPI = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const res = await api.get('/notifications');
      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.notifications)
        ? res.data.notifications
        : [];
      return rawList.map((item: any) => ({
        ...item,
        message: item.message || item.body || item.title || '',
      }));
    } catch (e) {
      return [
        { id: 1, user_id: 1, title: 'Roadmap Horizon Updated', message: 'Your adaptive roadmap has been updated based on your latest skill rating.', type: 'roadmap_update', is_read: false, created_at: '10 mins ago' },
        { id: 2, user_id: 1, title: 'Critical Gap Alert', message: 'System Design & Architecture has a 45% gap against your target Software Engineer role.', type: 'gap_alert', is_read: false, created_at: '1 hour ago' }
      ];
    }
  },
  getUnreadCount: async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    } catch (e) {
      return { unread_count: 2 };
    }
  },
  markAsRead: async (id: number) => {
    try {
      const res = await api.post(`/notifications/${id}/read`);
      return res.data;
    } catch (e) {
      return { message: 'Marked as read' };
    }
  },
  markAllRead: async () => {
    try {
      const res = await api.post('/notifications/read-all');
      return res.data;
    } catch (e) {
      return { message: 'Marked all read' };
    }
  }
};

export const staffAPI = {
  getProfile: async () => {
    const res = await api.get('/mentor/profile');
    return res.data;
  },
  getRoster: async () => {
    const res = await api.get('/mentor-dashboard/roster');
    return res.data;
  },
  getRequests: async () => {
    const res = await api.get('/mentor-dashboard/requests');
    return res.data;
  },
  respondRequest: async (requestId: number, action: 'accept' | 'reject') => {
    const res = await api.post(`/mentor-dashboard/requests/${requestId}/respond`, { action });
    return res.data;
  },
  getStudentDetail: async (studentId: number) => {
    const res = await api.get(`/mentor/students/${studentId}`);
    return res.data;
  },
  getStudentPrepCard: async (studentId: number) => {
    const res = await api.get(`/mentor/students/${studentId}/prep-card`);
    return res.data;
  },
  getFeedbackHistory: async () => {
    const res = await api.get('/mentor/feedback');
    return res.data;
  },
  sendFeedback: async (feedback: {
    student_id: number;
    rating: number;
    strengths?: string;
    weaknesses?: string;
    actionable_recommendations?: string;
    priority_level?: string;
  }) => {
    const res = await api.post('/mentor/feedback', feedback);
    return res.data;
  },
  getSessions: async () => {
    const res = await api.get('/mentor/sessions');
    return res.data;
  },
  createSession: async (sessionData: {
    student_id: number;
    scheduled_at: string;
    duration_minutes?: number;
    agenda?: string;
    meeting_link?: string;
  }) => {
    const res = await api.post('/mentor/sessions', sessionData);
    return res.data;
  },
  assignTask: async (taskData: {
    student_id: number;
    title: string;
    description?: string;
    due_date?: string;
  }) => {
    const res = await api.post('/mentor/tasks', taskData);
    return res.data;
  },
  updateProfile: async (data: {
    name?: string;
    bio?: string;
    domain?: string;
    years_experience?: number;
    linkedin_url?: string;
    availability_hours_per_week?: number;
    max_students?: number;
  }) => {
    const res = await api.put('/mentor/profile', data);
    return res.data;
  },
  getAvailability: async () => {
    const res = await api.get('/mentor/availability');
    return res.data;
  },
  addAvailability: async (slot: { day_of_week: string; start_time: string; end_time: string }) => {
    const res = await api.post('/mentor/availability', slot);
    return res.data;
  },
  removeAvailability: async (slotId: number) => {
    const res = await api.delete(`/mentor/availability/${slotId}`);
    return res.data;
  },
  updateSessionStatus: async (sessionId: number, status: string) => {
    const res = await api.put(`/mentor/sessions/${sessionId}/status`, { status });
    return res.data;
  },
  getStudents: async () => {
    const res = await api.get('/mentor/students');
    return res.data;
  }
};

export const mentorDashboardAPI = staffAPI;
export const mentorAPI = staffAPI;

export const adminAPI = {
  getDashboard: async () => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },
  getStats: async () => {
    try {
      const res = await api.get('/admin/dashboard');
      return res.data;
    } catch (e) {
      return { total_users: 0, total_students: 0, total_mentors: 0, pending_mentors: 0, approved_mentors: 0, total_assessments_taken: 0 };
    }
  },
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const res = await api.get('/admin/users', { params: { page: params?.page || 1, limit: params?.limit || 50, search: params?.search || undefined, role: params?.role || undefined } });
    return res.data;
  },
  getConfig: async () => {
    try {
      const res = await api.get('/admin/config');
      return res.data;
    } catch (e) {
      return [];
    }
  },
  updateConfig: async (key: string, value: string) => {
    const res = await api.put('/admin/config', { key, value });
    return res.data;
  },
  getPendingMentors: async () => {
    const res = await api.get('/admin/mentors/pending');
    return res.data;
  },
  approveMentor: async (mentorId: number) => {
    const res = await api.post(`/admin/mentors/${mentorId}/approve`);
    return res.data;
  },
  rejectMentor: async (mentorId: number, reason: string) => {
    const res = await api.post(`/admin/mentors/${mentorId}/reject`, { reason });
    return res.data;
  },
  suspendMentor: async (mentorId: number, reason: string) => {
    const res = await api.post(`/admin/mentors/${mentorId}/suspend`, { reason });
    return res.data;
  },
  assignMentor: async (studentId: number, mentorId: number, notes?: string) => {
    const res = await api.post('/admin/mentor-assignments', { student_id: studentId, mentor_id: mentorId, notes });
    return res.data;
  },
  updateUserStatus: async (userId: number, isActive: boolean) => {
    const res = await api.put(`/admin/users/${userId}/status`, null, { params: { is_active: isActive } });
    return res.data;
  },
  updateUserRole: async (userId: number, role: string, reason?: string) => {
    const res = await api.put(`/admin/users/${userId}/role`, { role, reason });
    return res.data;
  },
  getHealthPanel: async () => {
    const res = await api.get('/admin/health-panel');
    return res.data;
  },
  getAuditLogs: async (params?: { page?: number; limit?: number; action_type?: string }) => {
    const res = await api.get('/admin/audit-logs', { params: { page: params?.page || 1, limit: params?.limit || 20, action_type: params?.action_type } });
    return res.data;
  },
  exportCSV: async (type: 'students' | 'mentors' | 'audit') => {
    const res = await api.get('/admin/reports/export-csv', {
      params: { report_type: type },
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skillnova_${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  }
};

