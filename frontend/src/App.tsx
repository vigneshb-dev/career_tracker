import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/Login';
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
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public authentication route */}
        <Route path="/login" element={<Login />} />

        {/* Protected application shell routes */}
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trainees" element={<Trainees />} />
          <Route path="/trainees/:id" element={<TraineeDetail />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/skill-gaps" element={<SkillGaps />} />
          <Route path="/career-path" element={<CareerPathView />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/employers" element={<Employers />} />
          <Route path="/employer-portal" element={<Employers />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
