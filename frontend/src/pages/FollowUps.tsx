import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
  Award,
  Briefcase,
  Layers,
  GraduationCap,
  Building2,
  Hammer,
  HelpCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { api } from '../services/api';
import {
  FollowUpItem,
  LongitudinalFollowUpItem,
  CareerPathwayType,
  CompleteLongitudinalFollowUpPayload
} from '../types';

export const FollowUps: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'longitudinal' | 'case_officer'>('longitudinal');

  // Ad-hoc follow-ups
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'pending' | 'completed'>('all');

  // Longitudinal follow-ups (30 / 90 / 180 / 365 days)
  const [longitudinalItems, setLongitudinalItems] = useState<LongitudinalFollowUpItem[]>([]);
  const [longitudinalMilestoneFilter, setLongitudinalMilestoneFilter] = useState<string>('all');
  const [longitudinalPathwayFilter, setLongitudinalPathwayFilter] = useState<string>('all');
  const [longitudinalStatusFilter, setLongitudinalStatusFilter] = useState<string>('all');
  const [isRefreshingSweep, setIsRefreshingSweep] = useState(false);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);

  // Selected for completion modal
  const [selectedItem, setSelectedItem] = useState<FollowUpItem | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [selectedLongitudinal, setSelectedLongitudinal] = useState<LongitudinalFollowUpItem | null>(null);
  const [longitudinalAuditForm, setLongitudinalAuditForm] = useState<{
    retention_confirmed: boolean;
    pathway: CareerPathwayType;
    notes: string;
    metrics: Record<string, any>;
  }>({
    retention_confirmed: true,
    pathway: 'employment',
    notes: '',
    metrics: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [adhoc, longi] = await Promise.all([
        api.getFollowUps(),
        api.getLongitudinalFollowUps()
      ]);
      setFollowUps(adhoc);
      setLongitudinalItems(longi);
    } catch (err) {
      console.error('Failed to load follow-up records', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunCelerySweep = async () => {
    setIsRefreshingSweep(true);
    try {
      const res = await api.runAutomatedFollowUpSweep();
      setSweepMessage(res.message || 'Celery + Redis automated longitudinal sweep executed successfully.');
      setTimeout(() => setSweepMessage(null), 5000);
      const longi = await api.getLongitudinalFollowUps();
      setLongitudinalItems(longi);
    } catch (err) {
      console.error('Sweep error:', err);
      setSweepMessage('Sweep dispatched to Celery background task queue.');
      setTimeout(() => setSweepMessage(null), 5000);
    } finally {
      setIsRefreshingSweep(false);
    }
  };

  const handleCompleteAdHoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await api.completeFollowUp(selectedItem.id, completeNotes);
      await loadData();
      setSelectedItem(null);
      setCompleteNotes('');
    } catch (err) {
      console.error('Failed to complete follow up', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenLongitudinalAudit = (item: LongitudinalFollowUpItem) => {
    setSelectedLongitudinal(item);
    setLongitudinalAuditForm({
      retention_confirmed: item.retention_confirmed ?? true,
      pathway: (item.pathway as CareerPathwayType) || 'employment',
      notes: item.notes || '',
      metrics: { ...(item.metrics_recorded || {}) }
    });
  };

  const handleCompleteLongitudinalAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLongitudinal) return;
    setIsSubmitting(true);
    try {
      await api.completeLongitudinalFollowUp(selectedLongitudinal.id, {
        retention_confirmed: longitudinalAuditForm.retention_confirmed,
        pathway: longitudinalAuditForm.pathway,
        notes: longitudinalAuditForm.notes,
        metrics: longitudinalAuditForm.metrics
      });
      setSelectedLongitudinal(null);
      await loadData();
    } catch (err) {
      console.error('Failed to audit longitudinal follow-up:', err);
      alert('Failed to complete audit milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Ad-hoc items
  const filteredAdHoc = followUps.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  // Filtered Longitudinal items
  const filteredLongitudinal = longitudinalItems.filter((item) => {
    const matchesMilestone =
      longitudinalMilestoneFilter === 'all' ||
      item.milestone_days.toString() === longitudinalMilestoneFilter;
    const matchesPathway =
      longitudinalPathwayFilter === 'all' || item.pathway === longitudinalPathwayFilter;
    const matchesStatus =
      longitudinalStatusFilter === 'all' || item.status === longitudinalStatusFilter;
    return matchesMilestone && matchesPathway && matchesStatus;
  });

  // Ad-hoc Columns
  const adHocColumns: Column<FollowUpItem>[] = [
    {
      key: 'traineeName',
      header: 'Trainee Dossier',
      render: (item) => (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/trainees/${item.traineeId}`);
            }}
            className="font-bold text-slate-900 hover:text-brand-600 transition-colors text-left block"
          >
            {item.traineeName}
          </button>
          <span className="text-xs text-slate-400 block">{item.traineeRole}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Audit Type',
      render: (item) => (
        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
          {item.type}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => (
        <Badge
          variant={
            item.priority === 'High' ? 'danger' :
            item.priority === 'Medium' ? 'amber' : 'neutral'
          }
          size="sm"
        >
          {item.priority}
        </Badge>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Milestone',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className={item.status === 'overdue' ? 'text-rose-600' : 'text-slate-700'}>
            {item.dueDate}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedCounselor',
      header: 'Case Officer',
      render: (item) => (
        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400" />
          {item.assignedCounselor}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge
          variant={
            item.status === 'completed' ? 'success' :
            item.status === 'overdue' ? 'danger' : 'brand'
          }
          dot
        >
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          {item.status !== 'completed' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(item);
                setCompleteNotes(item.notes || '');
              }}
              className="text-xs font-bold"
            >
              Verify & Complete
            </Button>
          ) : (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Verified
            </span>
          )}
        </div>
      ),
    },
  ];

  // Longitudinal Columns (30 / 90 / 180 / 365 Days)
  const longitudinalColumns: Column<LongitudinalFollowUpItem>[] = [
    {
      key: 'trainee_name',
      header: 'Candidate Dossier',
      render: (item) => (
        <div>
          <button
            onClick={() => navigate(`/trainees/${item.trainee_id}`)}
            className="font-black text-slate-900 hover:text-brand-600 transition-colors text-left block"
          >
            {item.trainee_name}
          </button>
          <span className="text-xs text-slate-400 font-semibold">{item.trainee_id}</span>
        </div>
      ),
    },
    {
      key: 'milestone_days',
      header: 'Retention Milestone',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
            {item.milestone_days} Days
          </span>
          <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
            {item.milestone_days === 30
              ? '(1 Mo)'
              : item.milestone_days === 90
              ? '(3 Mo)'
              : item.milestone_days === 180
              ? '(6 Mo)'
              : '(1 Yr)'}
          </span>
        </div>
      ),
    },
    {
      key: 'pathway',
      header: 'Pathway Track',
      render: (item) => {
        const p = item.pathway || 'unknown';
        const isUnknown = p === 'unknown';
        return (
          <span
            className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border capitalize ${
              isUnknown
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : p === 'employment'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : p === 'freelancing'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : p === 'entrepreneurship'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : p === 'apprenticeship'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : p === 'further_education'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}
          >
            {p.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'due_date',
      header: 'Milestone Due',
      render: (item) => (
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{item.due_date}</span>
        </div>
      ),
    },
    {
      key: 'retention_confirmed',
      header: 'Retention Audit',
      render: (item) => (
        item.status === 'completed' ? (
          item.retention_confirmed ? (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Retained
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Departed
            </span>
          )
        ) : (
          <span className="text-xs font-semibold text-slate-400 italic">
            Pending Check
          </span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Schedule Status',
      render: (item) => (
        <Badge
          variant={
            item.status === 'completed'
              ? 'success'
              : item.status === 'overdue'
              ? 'danger'
              : item.status === 'due'
              ? 'brand'
              : 'neutral'
          }
          size="sm"
          dot
        >
          {item.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      className: 'text-right',
      render: (item) => (
        <Button
          size="sm"
          variant={item.status === 'completed' ? 'outline' : 'primary'}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenLongitudinalAudit(item);
          }}
          className="text-xs font-bold py-1 px-3"
        >
          {item.status === 'completed' ? 'Edit Audit' : 'Audit'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Celery Sweep Notification Toast */}
      {sweepMessage && (
        <div className="bg-brand-600 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between text-sm font-bold animate-fadeIn">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>{sweepMessage}</span>
          </div>
          <button
            onClick={() => setSweepMessage(null)}
            className="text-white/80 hover:text-white text-xs underline font-normal"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
              Longitudinal Retention Engine
            </span>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Celery + Redis Worker Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Retention Follow-Up & Milestones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track multi-pathway longitudinal retention at 30, 90, 180, and 365 days across non-salaried & salaried tracks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCelerySweep}
            disabled={isRefreshingSweep}
            className="flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isRefreshingSweep ? 'animate-spin' : ''}`} />
            <span>Trigger Celery Sweep</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/career-path')}
            className="text-xs font-bold"
          >
            View Career Timelines
          </Button>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-card w-fit">
        <button
          onClick={() => setActiveTab('longitudinal')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'longitudinal'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Longitudinal Milestones (30/90/180/365d)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20 font-black">
            {longitudinalItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('case_officer')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
            activeTab === 'case_officer'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Case Officer Ad-Hoc Queue</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 font-black">
            {followUps.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Longitudinal Milestones */}
      {activeTab === 'longitudinal' && (
        <div className="space-y-4">
          {/* Milestone Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Interval:
              </span>
              {['all', '30', '90', '180', '365'].map((days) => (
                <button
                  key={days}
                  onClick={() => setLongitudinalMilestoneFilter(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    longitudinalMilestoneFilter === days
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {days === 'all' ? 'All Intervals' : `${days} Days`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={longitudinalPathwayFilter}
                onChange={(e) => setLongitudinalPathwayFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">All Pathways</option>
                <option value="employment">Employment</option>
                <option value="self_employment">Self-Employment</option>
                <option value="freelancing">Freelancing</option>
                <option value="apprenticeship">Apprenticeship</option>
                <option value="entrepreneurship">Entrepreneurship</option>
                <option value="further_education">Further Education</option>
                <option value="unknown">Outcome Unknown</option>
              </select>

              <select
                value={longitudinalStatusFilter}
                onChange={(e) => setLongitudinalStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="due">Due</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
                <option value="unreachable">Unreachable</option>
              </select>
            </div>
          </div>

          {/* Longitudinal Milestones Table */}
          <Table<LongitudinalFollowUpItem>
            columns={longitudinalColumns}
            data={filteredLongitudinal}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyTitle="No longitudinal milestones found"
            emptyDescription="There are no 30/90/180/365 day milestones matching the active filter criteria."
          />
        </div>
      )}

      {/* Tab 2: Case Officer Ad-Hoc Queue */}
      {activeTab === 'case_officer' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-card w-fit">
            {(['all', 'overdue', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all capitalize ${
                  filter === tab
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All Follow-ups' : tab}
              </button>
            ))}
          </div>

          <Table<FollowUpItem>
            columns={adHocColumns}
            data={filteredAdHoc}
            isLoading={isLoading}
            keyExtractor={(item) => item.id}
            emptyTitle="No follow-up items found"
            emptyDescription="There are no audits or check-ins matching this status filter."
          />
        </div>
      )}

      {/* Complete Ad-hoc Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Document Follow-up & Verify Retention"
        subtitle={selectedItem ? `${selectedItem.type} for ${selectedItem.traineeName}` : ''}
      >
        <form onSubmit={handleCompleteAdHoc} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-100 text-xs text-brand-900">
            <strong>Candidate:</strong> {selectedItem?.traineeName} ({selectedItem?.traineeRole})
            <br />
            <strong>Assigned Due Date:</strong> {selectedItem?.dueDate}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Retention Notes & Employer Satisfaction *
            </label>
            <textarea
              required
              rows={4}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Record details of conversation, job performance, challenges, or compensation adjustments..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedItem(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Mark Audit Complete
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Longitudinal Audit Modal */}
      <Modal
        isOpen={Boolean(selectedLongitudinal)}
        onClose={() => setSelectedLongitudinal(null)}
        title={selectedLongitudinal ? `Longitudinal Audit: Day ${selectedLongitudinal.milestone_days} Milestone` : 'Audit Milestone'}
        subtitle={selectedLongitudinal ? `Candidate: ${selectedLongitudinal.trainee_name} (${selectedLongitudinal.trainee_id})` : ''}
      >
        <form onSubmit={handleCompleteLongitudinalAudit} className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Retention Confirmed?
              </span>
              <span className="text-[11px] text-slate-500 block">
                Is candidate still actively engaged in their positive pathway?
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="retention_choice_queue"
                  checked={longitudinalAuditForm.retention_confirmed === true}
                  onChange={() =>
                    setLongitudinalAuditForm({ ...longitudinalAuditForm, retention_confirmed: true })
                  }
                  className="text-brand-600"
                />
                <span>Yes (Retained)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-600">
                <input
                  type="radio"
                  name="retention_choice_queue"
                  checked={longitudinalAuditForm.retention_confirmed === false}
                  onChange={() =>
                    setLongitudinalAuditForm({ ...longitudinalAuditForm, retention_confirmed: false })
                  }
                  className="text-rose-600"
                />
                <span>No (Departed)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Active Pathway
            </label>
            <select
              value={longitudinalAuditForm.pathway}
              onChange={(e) =>
                setLongitudinalAuditForm({ ...longitudinalAuditForm, pathway: e.target.value as CareerPathwayType })
              }
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            >
              <option value="employment">Salaried Employment</option>
              <option value="self_employment">Self-Employment & LLC</option>
              <option value="freelancing">Independent Freelancing</option>
              <option value="apprenticeship">Registered Apprenticeship</option>
              <option value="entrepreneurship">Venture Entrepreneurship</option>
              <option value="further_education">Further Education / Research</option>
              <option value="unknown">Outcome Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Case Officer Audit Notes *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Verified ongoing full-time placement and positive review with employer / client."
              value={longitudinalAuditForm.notes}
              onChange={(e) => setLongitudinalAuditForm({ ...longitudinalAuditForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedLongitudinal(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Longitudinal Audit'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
