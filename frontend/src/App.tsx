import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyOtp } from './pages/VerifyOtp';
import { MyResume } from './pages/MyResume';

// Platform Pages
import { Dashboard } from './pages/Dashboard';
import { Trainees } from './pages/Trainees';
import { TraineeDetail } from './pages/TraineeDetail';
import { Skills } from './pages/Skills';
import { Jobs } from './pages/Jobs';
import { SkillGaps } from './pages/SkillGaps';
import { CareerPathView } from './pages/CareerPath';
import { FollowUps } from './pages/FollowUps';
import { Employers } from './pages/Employers';
import { Analytics } from './pages/Analytics';
import { DigitalTwin } from './pages/DigitalTwin';
import { CareerSimulator } from './pages/CareerSimulator';
import { OutcomeRisks } from './pages/OutcomeRisks';
import { AdminSkillIntelligence } from './pages/AdminSkillIntelligence';
import { TraineeSkillGapDashboard } from './pages/TraineeSkillGapDashboard';
import { CourseSkillAnalysis } from './pages/CourseSkillAnalysis';
import { NotFound } from './pages/NotFound';

const RootRedirect: React.FC = () => {
  const { user, role, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'TRAINEE') {
    const target = user?.trainee_id ? `/trainees/${user.trainee_id}` : '/my-resume';
    return <Navigate to={target} replace />;
  }
  if (role === 'EMPLOYER') return <Navigate to="/employers" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />

          {/* Protected Application Shell Routes */}
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route path="/" element={<RootRedirect />} />
            
            {/* Admin / Coach Executive Views */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><Dashboard /></ProtectedRoute>} />
            <Route path="/trainees" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><Trainees /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><Analytics /></ProtectedRoute>} />
            <Route path="/follow-ups" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><FollowUps /></ProtectedRoute>} />

            {/* Trainee Self-Service Resume Portal */}
            <Route path="/my-resume" element={<ProtectedRoute allowedRoles={['TRAINEE', 'ADMIN']}><MyResume /></ProtectedRoute>} />

            {/* Shared / Multi-Role Views */}
            <Route path="/trainees/:id" element={<TraineeDetail />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/skill-gaps" element={<SkillGaps />} />
            <Route path="/career-path" element={<CareerPathView />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/digital-twin/:id" element={<DigitalTwin />} />
            <Route path="/career-simulator" element={<CareerSimulator />} />
            <Route path="/outcome-risks" element={<OutcomeRisks />} />

            {/* Skill & Outcome Intelligence Innovation Modules */}
            <Route path="/admin/skill-intelligence" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><AdminSkillIntelligence /></ProtectedRoute>} />
            <Route path="/trainee/skill-gap" element={<TraineeSkillGapDashboard />} />
            <Route path="/admin/courses/:courseId/skill-analysis" element={<ProtectedRoute allowedRoles={['ADMIN', 'COACH']}><CourseSkillAnalysis /></ProtectedRoute>} />
            
            {/* Employer Views */}
            <Route path="/employers" element={<ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}><Employers /></ProtectedRoute>} />
            <Route path="/employer-portal" element={<ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}><Employers /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
