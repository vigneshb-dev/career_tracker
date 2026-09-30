import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { api } from '../../services/api';

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Trainee Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    program: 'Full-Stack Software Engineering',
    cohort: 'Cohort 2024-C',
    status: 'in_training' as const,
    notes: '',
  });

  const handleCreateTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    setIsSubmitting(true);
    try {
      const created = await api.createTrainee({
        ...formData,
        overallScore: 88,
        matchScore: 85,
        skills: [
          { skillId: 'sk-1', name: 'React', level: 'intermediate', verified: true, score: 85 },
          { skillId: 'sk-6', name: 'Python', level: 'intermediate', verified: true, score: 80 }
        ]
      });
      setIsAddModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        program: 'Full-Stack Software Engineering',
        cohort: 'Cohort 2024-C',
        status: 'in_training',
        notes: '',
      });
      navigate(`/trainees/${created.id}`);
    } catch (err) {
      console.error('Failed to create trainee', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Desktop Sidebar Navigation */}
      <DesktopSidebar followUpsCount={4} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-10">
        {/* Top Header Navigation */}
        <TopNav
          onOpenMobileMenu={() => setMobileDrawerOpen(true)}
          onOpenAddTraineeModal={() => setIsAddModalOpen(true)}
        />

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>

        {/* Mobile Navigation Drawer & Bottom Bar */}
        <MobileNav
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          onOpenDrawer={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Global Add Trainee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Trainee"
        subtitle="Enroll candidate into the workforce tracking and placement pipeline"
      >
        <form onSubmit={handleCreateTrainee} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Jordan Miller"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jordan.m@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 019-2831"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Program Track
              </label>
              <select
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Full-Stack Software Engineering">Full-Stack Software Engineering</option>
                <option value="Backend & Cloud DevOps">Backend & Cloud DevOps</option>
                <option value="Data Intelligence & AI Integration">Data Intelligence & AI Integration</option>
                <option value="Cybersecurity & Infrastructure">Cybersecurity & Infrastructure</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Cohort
              </label>
              <input
                type="text"
                value={formData.cohort}
                onChange={(e) => setFormData({ ...formData, cohort: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Initial Counselor Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Candidate background, career interests, prior qualifications..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Enroll Trainee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
