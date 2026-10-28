import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Skills } from './pages/Skills';
import { Assessments } from './pages/Assessments';
import { AssessmentTake } from './pages/AssessmentTake';
import { Roadmap } from './pages/Roadmap';
import { PlacementReadiness } from './pages/PlacementReadiness';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Mentors } from './pages/Mentors';
import { AIChat } from './pages/AIChat';
import { CareerGPS } from './pages/CareerGPS';
import { ResumeUpload } from './pages/ResumeUpload';
import { Notifications } from './pages/Notifications';
import { MentorDashboard } from './pages/MentorDashboard';
import { StaffDashboard } from './pages/StaffDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { PendingMentorApproval } from './pages/PendingMentorApproval';
import { Profile } from './pages/Profile';
import { LoadingState } from './components/common/UIComponents';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  allowUncompleted?: boolean;
}> = ({
  children,
  allowedRoles,
  allowUncompleted = false,
}) => {
  const { user, loading, token } = useAuth();

  if (loading) return <LoadingState message="Verifying security credentials..." />;
  if (!token || !user) return <Navigate to="/login" replace />;

  // Pending mentors see only the awaiting-approval screen
  if (
    user.role === 'mentor' &&
    user.mentor_status === 'pending'
  ) {
    return <PendingMentorApproval />;
  }

  // If student has not completed onboarding, force them to /onboarding
  if (user.role === 'student' && user.onboarding_completed === false && !allowUncompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Dedicated role-based fallback redirects
    const fallback =
      user.role === 'staff'
        ? '/staff-dashboard'
        : user.role === 'mentor'
        ? '/mentor-dashboard'
        : user.role === 'admin'
        ? '/admin'
        : user.onboarding_completed === false
        ? '/onboarding'
        : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Layout>{children}</Layout>;
};

const RootRedirect: React.FC = () => {
  const { user, loading, token } = useAuth();
  if (loading) return <LoadingState message="Connecting to SkillNova..." />;
  if (!token || !user) return <Navigate to="/login" replace />;
  // Pending mentors go to approval page
  if (user.role === 'mentor' && user.mentor_status === 'pending') {
    return <Navigate to="/pending-approval" replace />;
  }
  if (user.role === 'staff') return <Navigate to="/staff-dashboard" replace />;
  if (user.role === 'mentor') return <Navigate to="/mentor-dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.onboarding_completed === false) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root and Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pending-approval" element={<PendingMentorApproval />} />
          <Route path="/register" element={<Register />} />

          {/* Onboarding Route */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowUncompleted={true}>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* My Profile Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Core Protected Student Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skills"
            element={
              <ProtectedRoute>
                <Skills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedRoute>
                <Assessments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments/:id"
            element={
              <ProtectedRoute>
                <AssessmentTake />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmap"
            element={
              <ProtectedRoute>
                <Roadmap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/placement-readiness"
            element={
              <ProtectedRoute>
                <PlacementReadiness />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentors"
            element={
              <ProtectedRoute>
                <Mentors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute>
                <AIChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/career-gps"
            element={
              <ProtectedRoute>
                <CareerGPS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume-upload"
            element={
              <ProtectedRoute>
                <ResumeUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* Role-based Routes */}
          <Route
            path="/mentor-dashboard"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'staff', 'admin']}>
                <MentorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'staff', 'admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-dashboard"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'staff', 'admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
