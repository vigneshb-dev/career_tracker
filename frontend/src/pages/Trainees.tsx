import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Building,
  GraduationCap,
  Sparkles,
  Rocket,
  Wrench,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Table, Column } from '../components/common/Table';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { api } from '../services/api';
import { Trainee, OutcomeType } from '../types';

export const Trainees: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<string>('all');

  const fetchTrainees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getTraineesPaginated({
        search,
        status: statusFilter,
        program: programFilter,
        outcome_type: outcomeFilter,
        consent_status: consentFilter,
        page,
        page_size: pageSize,
      });
      setTrainees(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      setError('Failed to fetch trainees outcome records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainees();
  }, [search, statusFilter, programFilter, outcomeFilter, consentFilter, page, pageSize]);

  const outcomeBadgeConfig: Record<OutcomeType, { label: string; variant: BadgeVariant; icon: any }> = {
    employment: { label: 'Employment', variant: 'success', icon: Briefcase },
    self_employment: { label: 'Self-Employed', variant: 'purple', icon: Building },
    freelancing: { label: 'Freelancing', variant: 'brand', icon: Wrench },
    apprenticeship: { label: 'Apprenticeship', variant: 'amber', icon: GraduationCap },
    entrepreneurship: { label: 'Entrepreneurship', variant: 'danger', icon: Rocket },
    further_education: { label: 'Further Education', variant: 'neutral', icon: BookOpen },
  };

  const columns: Column<Trainee>[] = [
    {
      key: 'fullName',
      header: 'Trainee Passport',
      render: (trainee) => {
        const name = trainee.fullName || trainee.full_name || 'Trainee';
        const avatar = trainee.avatarUrl || trainee.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt={name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div>
              <span className="font-bold text-slate-900 block hover:text-brand-600 transition-colors">
                {name}
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{trainee.email}</span>
                {trainee.location && (
                  <>
                    <span>•</span>
                    <span>{trainee.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'primary_outcome_type',
      header: 'Outcome Category',
      render: (trainee) => {
        const outcomeType = (trainee.primary_outcome_type || 'employment') as OutcomeType;
        const config = outcomeBadgeConfig[outcomeType] || { label: outcomeType, variant: 'neutral', icon: Briefcase };
        const Icon = config.icon;
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant={config.variant} size="sm">
              <Icon className="w-3 h-3" />
              <span>{config.label}</span>
            </Badge>
            <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[160px]">
              {trainee.currentRole || trainee.current_role || 'Placed'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'program',
      header: 'Training Track & Provider',
      render: (trainee) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{trainee.program}</span>
          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
            {trainee.training_details?.provider_name || trainee.cohort}
          </span>
        </div>
      ),
    },
    {
      key: 'compensation',
      header: 'Reported Wage / Band',
      render: (trainee) => (
        <div className="text-xs">
          <span className="font-bold text-emerald-700 block">
            {trainee.placementSalary || trainee.placement_salary || 'Market Rate'}
          </span>
          <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
            {trainee.currentEmployer || trainee.current_employer || 'Active'}
          </span>
        </div>
      ),
    },
    {
      key: 'consent',
      header: 'Consent Status',
      render: (trainee) => {
        const consent = trainee.consent_status?.consent_status || 'granted';
        return (
          <Badge
            variant={
              consent === 'granted' ? 'success' :
              consent === 'partial' ? 'amber' : 'danger'
            }
            size="sm"
            dot
          >
            {consent === 'granted' ? 'Full Consent' : consent === 'partial' ? 'Partial' : 'Revoked'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (trainee) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/trainees/${trainee.id}`);
          }}
          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
        >
          <Eye className="w-4 h-4" />
          <span>Outcome Passport</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Trainee Outcome Passports
            </h1>
            <Badge variant="brand" size="sm">
              FERPA & WIOA Verified
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse, filter, and audit verified career trajectories across Employment, Self-Employment, Freelancing, Apprenticeship, Entrepreneurship, and Higher Education.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="md">
            {total} Verified Profiles
          </Badge>
        </div>
      </div>

      {/* Outcome Category Pill Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Outcomes' },
          { key: 'employment', label: 'Employment (Direct Hire)' },
          { key: 'self_employment', label: 'Self-Employment' },
          { key: 'freelancing', label: 'Freelancing' },
          { key: 'apprenticeship', label: 'Apprenticeship' },
          { key: 'entrepreneurship', label: 'Entrepreneurship' },
          { key: 'further_education', label: 'Further Education' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setOutcomeFilter(tab.key);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              outcomeFilter === tab.key
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
              if (val) setSearchParams({ search: val });
              else setSearchParams({});
            }}
            placeholder="Search by name, provider, role, or skill..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Program Filter */}
          <select
            value={programFilter}
            onChange={(e) => {
              setProgramFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Program Tracks</option>
            <option value="Full-Stack">Full-Stack Engineering</option>
            <option value="Backend">Backend & Cloud</option>
            <option value="Data">Data & AI</option>
            <option value="Cybersecurity">Cybersecurity</option>
          </select>

          {/* Consent Filter */}
          <select
            value={consentFilter}
            onChange={(e) => {
              setConsentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Consent Statuses</option>
            <option value="granted">Full Consent Granted</option>
            <option value="partial">Partial Consent</option>
            <option value="revoked">Consent Revoked</option>
          </select>

          {(search || programFilter !== 'all' || outcomeFilter !== 'all' || consentFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setProgramFilter('all');
                setOutcomeFilter('all');
                setConsentFilter('all');
                setPage(1);
                setSearchParams({});
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchTrainees} />
      ) : (
        <>
          <Table<Trainee>
            columns={columns}
            data={trainees}
            isLoading={isLoading}
            keyExtractor={(t) => t.id}
            onRowClick={(t) => navigate(`/trainees/${t.id}`)}
            emptyTitle="No trainee outcome passports found"
            emptyDescription="Try adjusting your outcome category, program track, or search query."
          />

          {/* Pagination Controls */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-bold text-slate-600">
              <div>
                Showing <span className="text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="text-slate-900">{Math.min(page * pageSize, total)}</span> of{' '}
                <span className="text-slate-900">{total}</span> outcome records
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-colors ${
                        page === p
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
