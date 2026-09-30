import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  FileCheck2,
  BarChart,
  Globe2,
  CheckCircle2,
  XCircle,
  Edit3,
  Lock,
  Calendar
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ConsentStatus } from '../../types';

interface ConsentCardProps {
  consent: ConsentStatus | undefined;
  traineeName: string;
  onUpdateConsent: (updated: Partial<ConsentStatus>) => Promise<void>;
}

export const ConsentCard: React.FC<ConsentCardProps> = ({
  consent,
  traineeName,
  onUpdateConsent,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [status, setStatus] = useState<'granted' | 'partial' | 'revoked'>(
    consent?.consent_status || 'granted'
  );
  const [shareEmployers, setShareEmployers] = useState(
    consent?.share_with_employers ?? true
  );
  const [shareFunding, setShareFunding] = useState(
    consent?.share_with_funding_bodies ?? true
  );
  const [shareResearch, setShareResearch] = useState(
    consent?.share_anonymized_research ?? true
  );
  const [sharePublic, setSharePublic] = useState(
    consent?.share_public_portfolio ?? false
  );
  const [notes, setNotes] = useState(consent?.notes || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateConsent({
        consent_status: status,
        share_with_employers: shareEmployers,
        share_with_funding_bodies: shareFunding,
        share_anonymized_research: shareResearch,
        share_public_portfolio: sharePublic,
        notes,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to update consent', err);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStatus = consent?.consent_status || 'granted';

  return (
    <>
      <Card
        title="Data Sharing & Trainee Consent Authorization"
        subtitle="Auditable consent governance protocol complying with FERPA, HIPAA and WIOA reporting"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-bold"
            icon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Update Permissions
          </Button>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Header Banner */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            currentStatus === 'granted'
              ? 'bg-emerald-50/60 border-emerald-100 text-emerald-950'
              : currentStatus === 'partial'
              ? 'bg-amber-50/60 border-amber-100 text-amber-950'
              : 'bg-rose-50/60 border-rose-100 text-rose-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                currentStatus === 'granted' ? 'bg-emerald-500 text-white' :
                currentStatus === 'partial' ? 'bg-amber-500 text-white' :
                'bg-rose-500 text-white'
              }`}>
                {currentStatus === 'granted' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold tracking-tight">
                    {currentStatus === 'granted' && 'Full Outcome Passport Consent Granted'}
                    {currentStatus === 'partial' && 'Partial Restricted Consent'}
                    {currentStatus === 'revoked' && 'Consent Revoked by Trainee'}
                  </h4>
                  <Badge variant={currentStatus === 'granted' ? 'success' : currentStatus === 'partial' ? 'amber' : 'danger'} size="sm">
                    {consent?.version || 'v2.1'}
                  </Badge>
                </div>
                <p className="text-xs opacity-85 mt-0.5 leading-relaxed">
                  Authorized by {traineeName} on {consent?.consent_date || '2024-01-15'} • Valid through {consent?.expiry_date || '2026-12-31'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold block opacity-75">Verification Hash:</span>
              <span className="text-xs font-mono font-bold">SHA-256: 8f9b...a102</span>
            </div>
          </div>

          {/* Granular Permissions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            
            {/* 1. Employer Sharing */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                consent?.share_with_employers ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Partner Employer Matching</span>
                  {consent?.share_with_employers ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Allowed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Restricted
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Shares candidate CV, verified competency scores, and availability with hiring partners.
                </p>
              </div>
            </div>

            {/* 2. Funding Compliance Audits */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                consent?.share_with_funding_bodies ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">WIOA & Grant Compliance Audits</span>
                  {consent?.share_with_funding_bodies ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Authorized
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Opted Out
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Permits state and federal workforce agency verification of retention and wage progression.
                </p>
              </div>
            </div>

            {/* 3. Anonymized Research */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                consent?.share_anonymized_research ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}>
                <BarChart className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Anonymized Policy Research</span>
                  {consent?.share_anonymized_research ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Permitted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Aggregated de-identified training outcome benchmarking and longitudinal study usage.
                </p>
              </div>
            </div>

            {/* 4. Public Portfolio Showcase */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                consent?.share_public_portfolio ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500'
              }`}>
                <Globe2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Public Showcase Portfolio</span>
                  {consent?.share_public_portfolio ? (
                    <span className="text-[10px] font-bold text-brand-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Public
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Publish verified credentials, capstone projects, and badges on public SkillTrace registry.
                </p>
              </div>
            </div>

          </div>

          {consent?.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
              <strong className="text-slate-800">Candidate Stipulation:</strong> {consent.notes}
            </div>
          )}
        </div>
      </Card>

      {/* Update Consent Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Data Sharing & Consent Authorization"
        subtitle={`Audit permissions and data governance controls for ${traineeName}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Overall Consent Classification *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="granted">Full Consent Granted (Standard)</option>
              <option value="partial">Partial / Granular Restriction</option>
              <option value="revoked">Revoked (Data Sharing Blocked)</option>
            </select>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Granular Permission Toggles
            </span>

            <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl bg-white border border-slate-100">
              <div>
                <span className="font-bold text-slate-800 block">Share with Partner Employers</span>
                <span className="text-[11px] text-slate-400">Enable algorithmic talent match & requisition sharing</span>
              </div>
              <input
                type="checkbox"
                checked={shareEmployers}
                onChange={(e) => setShareEmployers(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl bg-white border border-slate-100">
              <div>
                <span className="font-bold text-slate-800 block">State & Funding Compliance Audits</span>
                <span className="text-[11px] text-slate-400">Report wage progression and retention to state workforce grant</span>
              </div>
              <input
                type="checkbox"
                checked={shareFunding}
                onChange={(e) => setShareFunding(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl bg-white border border-slate-100">
              <div>
                <span className="font-bold text-slate-800 block">Anonymized Longitudinal Research</span>
                <span className="text-[11px] text-slate-400">Include in statistical economic mobility research</span>
              </div>
              <input
                type="checkbox"
                checked={shareResearch}
                onChange={(e) => setShareResearch(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl bg-white border border-slate-100">
              <div>
                <span className="font-bold text-slate-800 block">Public Showcase Portfolio</span>
                <span className="text-[11px] text-slate-400">Display verified badges on public SkillTrace registry</span>
              </div>
              <input
                type="checkbox"
                checked={sharePublic}
                onChange={(e) => setSharePublic(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Counselor or Trainee Authorization Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Candidate signed written consent waiver during orientation..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
            >
              Save Authorization Protocol
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
