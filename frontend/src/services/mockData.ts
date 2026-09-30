import { Trainee, Skill, Job, Employer, SkillGapAnalysis, CareerPath, FollowUpItem, DashboardMetrics } from '../types';

export const mockDashboardMetrics: DashboardMetrics = {
  totalTrainees: 1248,
  traineesPlaced: 986,
  placementRate: 79.0,
  activeJobOpenings: 142,
  avgMatchRate: 84.5,
  overdueFollowUps: 4,
  retentionRate: 91.2,
  monthlyPlacementTrend: [
    { month: 'May', placed: 42, target: 40 },
    { month: 'Jun', placed: 58, target: 50 },
    { month: 'Jul', placed: 65, target: 60 },
    { month: 'Aug', placed: 74, target: 70 },
    { month: 'Sep', placed: 89, target: 80 },
    { month: 'Oct', placed: 95, target: 85 },
  ],
  skillsDemandSupply: [
    { skill: 'Python / FastAPI', demand: 92, supply: 68 },
    { skill: 'React / TypeScript', demand: 88, supply: 84 },
    { skill: 'Cloud & Docker', demand: 82, supply: 54 },
    { skill: 'PostgreSQL / SQL', demand: 78, supply: 72 },
    { skill: 'Data Pipelines', demand: 75, supply: 48 },
    { skill: 'AI / Semantic Search', demand: 85, supply: 40 },
  ],
  statusDistribution: [
    { status: 'placed', count: 986, label: 'Successfully Placed' },
    { status: 'in_training', count: 142, label: 'In Training' },
    { status: 'seeking_job', count: 78, label: 'Actively Interviewing' },
    { status: 'graduated', count: 28, label: 'Awaiting Matching' },
    { status: 'at_risk', count: 14, label: 'Requires Follow-up' },
  ]
};

export const mockTrainees: Trainee[] = [
  // 1. Employment
  {
    id: 'TRN-2024-001',
    fullName: 'Elena Rostova',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '+1 (555) 234-8901',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    location: 'Austin, TX',
    bio: 'Passionate software engineer transitioning from hospitality management to front-end enterprise engineering. Strong advocate for accessible design systems and type-safe architectures.',
    program: 'Full-Stack Software Engineering',
    cohort: 'Cohort 2024-B',
    status: 'placed',
    primary_outcome_type: 'employment',
    enrollmentDate: '2024-01-15',
    graduationDate: '2024-06-30',
    training_details: {
      provider_name: 'Austin Tech Institute of Technology',
      course_title: 'Full-Stack Enterprise React & Cloud Web Services',
      accreditation: 'Accredited State Workforce Commission (TWC)',
      instructor_name: 'Marcus Aurelius, Lead Instructor',
      modality: 'Hybrid (Austin Campus + Online Synchronous)',
      attendance_rate: '98.4%',
      hours_completed: 720,
    },
    currentRole: 'Junior Frontend Engineer',
    current_role: 'Junior Frontend Engineer',
    currentEmployer: 'Apex Cloud Solutions',
    current_employer: 'Apex Cloud Solutions',
    placementDate: '2024-07-22',
    placement_date: '2024-07-22',
    placementSalary: '$84,000 / yr',
    placement_salary: '$84,000 / yr',
    overallScore: 94,
    matchScore: 96,
    lastFollowUp: '2024-08-25',
    nextFollowUp: '2024-11-20',
    notes: 'Exemplary performance during 90-day internship. Transitioned to permanent salaried position with full medical & 401(k) benefits.',
    skills: [
      { skillId: 'sk-1', name: 'React.js', level: 'expert', verified: true, score: 96 },
      { skillId: 'sk-2', name: 'TypeScript', level: 'advanced', verified: true, score: 92 },
      { skillId: 'sk-3', name: 'Tailwind CSS', level: 'expert', verified: true, score: 98 },
      { skillId: 'sk-4', name: 'REST APIs', level: 'advanced', verified: true, score: 90 },
      { skillId: 'sk-17', name: 'Technical Communication', level: 'advanced', verified: true, score: 94 },
    ],
    certifications: [
      {
        id: 'CRT-001',
        title: 'AWS Certified Cloud Practitioner',
        issuing_organization: 'Amazon Web Services',
        issue_date: '2024-05-10',
        expiry_date: '2027-05-10',
        credential_id: 'AWS-CCP-98231',
        verification_url: 'https://aws.amazon.com/verification',
        status: 'Active'
      },
      {
        id: 'CRT-002',
        title: 'Meta Front-End Developer Professional Certificate',
        issuing_organization: 'Meta & Coursera',
        issue_date: '2024-06-15',
        credential_id: 'META-FED-4410',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-001',
        assessment_name: 'Full-Stack Capstone Defense: Enterprise Billing Dashboard',
        date: '2024-06-25',
        score: 96,
        max_score: 100,
        grade: 'A+',
        evaluator: 'Marcus Aurelius',
        feedback: 'Outstanding component architecture and test coverage (92% unit test branches). React query caching implemented cleanly.'
      },
      {
        id: 'ASM-002',
        assessment_name: 'TypeScript Algorithmic & Data Structure Audit',
        date: '2024-04-18',
        score: 92,
        max_score: 100,
        grade: 'A',
        evaluator: 'Dr. Sarah Stone',
        feedback: 'Deep grasp of generics, union discrimination, and asynchronous promise pipelines.'
      }
    ],
    career_preference: {
      target_roles: ['Frontend Engineer', 'UI Systems Engineer', 'Full-Stack Web Architect'],
      preferred_workplace: 'Hybrid',
      target_salary_min: '$80,000',
      target_salary_max: '$95,000',
      preferred_locations: ['Austin, TX', 'Dallas, TX', 'Remote USA'],
      target_industries: ['Enterprise SaaS', 'FinTech', 'HealthTech']
    },
    current_pathway: {
      pathway_id: 'CP-01',
      title: 'Modern Full-Stack Web Architecture',
      current_stage: 'Entry / Apprentice',
      progress_percent: 35,
      next_milestone: 'Software Engineer II (Target: Q1 2026)'
    },
    outcome_history: [
      {
        id: 'OUT-001',
        outcome_type: 'employment',
        organization_or_venture: 'Apex Cloud Solutions',
        role_or_course: 'Junior Frontend Engineer',
        compensation_or_funding: '$84,000 / yr',
        start_date: '2024-07-22',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'Official employment contract and W-2 payroll confirmation on file.'
      },
      {
        id: 'OUT-002',
        outcome_type: 'employment',
        organization_or_venture: 'Apex Cloud Solutions',
        role_or_course: 'Engineering Apprentice / Intern',
        compensation_or_funding: '$28.00 / hr',
        start_date: '2024-06-01',
        end_date: '2024-07-20',
        is_current: false,
        verification_status: 'verified',
        verification_notes: '10-week summer tech apprenticeship successfully completed.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-001',
        checkpoint_type: '30-Day Post-Placement Audit',
        date: '2024-08-25',
        counselor_name: 'Marcus Brody',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: false,
        counselor_notes: 'Met with Elena and VP of Talent Sarah Jenkins. Candidate has shipped 4 production UI PRs. Highly satisfied.'
      },
      {
        id: 'AUD-002',
        checkpoint_type: '60-Day Check-in',
        date: '2024-09-28',
        counselor_name: 'Marcus Brody',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: false,
        counselor_notes: 'All indicators positive. Elena is mentoring incoming interns.'
      },
      {
        id: 'AUD-003',
        checkpoint_type: '90-Day Retention Audit',
        date: '2024-11-20',
        counselor_name: 'Marcus Brody',
        status: 'scheduled',
        retention_confirmed: false,
        wage_progressed: false,
        counselor_notes: 'Scheduled 90-day WIOA performance benchmark audit.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: true,
      consent_date: '2024-01-15',
      expiry_date: '2026-01-15',
      version: 'v2.1',
      notes: 'Full consent granted to publish certified portfolio and verification badges.'
    }
  },

  // 2. Self-Employment
  {
    id: 'TRN-2024-002',
    fullName: 'Marcus Vance',
    full_name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    phone: '+1 (555) 872-1134',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    location: 'Chicago, IL',
    bio: 'Self-employed cloud infrastructure architect & DevOps consultant. Specializing in Docker containerization, PostgreSQL pgvector deployments, and CI/CD pipelines for Midwestern logistics startups.',
    program: 'Backend & Cloud DevOps',
    cohort: 'Cohort 2024-B',
    status: 'placed',
    primary_outcome_type: 'self_employment',
    enrollmentDate: '2024-02-01',
    graduationDate: '2024-07-15',
    training_details: {
      provider_name: 'Midwest Cloud Academy',
      course_title: 'Enterprise Cloud Architecture & Distributed Systems',
      accreditation: 'Illinois Board of Higher Education (IBHE)',
      instructor_name: 'Evelyn Reed, Principal Cloud Architect',
      modality: 'Online Synchronous & Virtual Labs',
      attendance_rate: '97.1%',
      hours_completed: 680,
    },
    currentRole: 'Principal Consultant & Owner',
    current_role: 'Principal Consultant & Owner',
    currentEmployer: 'Vance Cloud Architecture LLC',
    current_employer: 'Vance Cloud Architecture LLC',
    placementDate: '2024-08-01',
    placement_date: '2024-08-01',
    placementSalary: '$95,000 / yr (Projected Retainers)',
    placement_salary: '$95,000 / yr (Projected Retainers)',
    overallScore: 88,
    matchScore: 82,
    lastFollowUp: '2024-09-12',
    nextFollowUp: '2024-11-01',
    notes: 'Formed registered LLC in Illinois. Secured 3 recurring retainer agreements with regional logistics firms.',
    skills: [
      { skillId: 'sk-6', name: 'Python / FastAPI', level: 'expert', verified: true, score: 95 },
      { skillId: 'sk-8', name: 'PostgreSQL & pgvector', level: 'advanced', verified: true, score: 88 },
      { skillId: 'sk-9', name: 'Docker & Containerization', level: 'expert', verified: true, score: 94 },
    ],
    certifications: [
      {
        id: 'CRT-003',
        title: 'Certified Kubernetes Administrator (CKA)',
        issuing_organization: 'Cloud Native Computing Foundation (CNCF)',
        issue_date: '2024-07-02',
        expiry_date: '2027-07-02',
        credential_id: 'CKA-77821-IL',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-003',
        assessment_name: 'Multi-Region Cloud Kubernetes Failover Simulation',
        date: '2024-07-10',
        score: 90,
        max_score: 100,
        grade: 'A',
        evaluator: 'Evelyn Reed',
        feedback: 'Demonstrated master-level disaster recovery scripts and zero downtime migrations.'
      }
    ],
    career_preference: {
      target_roles: ['Cloud Consultant', 'DevOps Engineer', 'Site Reliability Architect'],
      preferred_workplace: 'Remote',
      target_salary_min: '$90,000',
      target_salary_max: '$120,000',
      preferred_locations: ['Chicago, IL', 'Remote USA'],
      target_industries: ['Logistics', 'Cloud Infrastructure', 'FinTech']
    },
    current_pathway: {
      pathway_id: 'CP-02',
      title: 'Cloud Data & AI Systems Engineer',
      current_stage: 'Mid-Level Practice',
      progress_percent: 55,
      next_milestone: 'Senior Cloud Consultancy Expansion (Target: Q2 2026)'
    },
    outcome_history: [
      {
        id: 'OUT-003',
        outcome_type: 'self_employment',
        organization_or_venture: 'Vance Cloud Architecture LLC',
        role_or_course: 'Principal Cloud Infrastructure Consultant',
        compensation_or_funding: '$95,000 / yr (Retainers)',
        start_date: '2024-08-01',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'Illinois Secretary of State LLC Certificate of Good Standing and client service contracts verified.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-004',
        checkpoint_type: '30-Day Self-Employment Audit',
        date: '2024-09-12',
        counselor_name: 'Sarah Sterling',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: true,
        counselor_notes: 'Audited business bank statements and invoices. Trainee billing exceeds $8,000 monthly.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: true,
      consent_date: '2024-02-01',
      expiry_date: '2026-02-01',
      version: 'v2.1',
      notes: 'Consented to sharing business case study for workforce self-employment outcomes.'
    }
  },

  // 3. Freelancing
  {
    id: 'TRN-2024-003',
    fullName: 'Sophia Martinez',
    full_name: 'Sophia Martinez',
    email: 'sophia.martinez@example.com',
    phone: '+1 (555) 319-8742',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    location: 'Denver, CO',
    bio: 'Full-stack freelance developer and digital contractor. Delivering rapid MVP builds, API integrations, and frontend dashboards for high-growth YC-backed startups across North America.',
    program: 'Full-Stack Software Engineering',
    cohort: 'Cohort 2024-A',
    status: 'placed',
    primary_outcome_type: 'freelancing',
    enrollmentDate: '2023-10-01',
    graduationDate: '2024-03-31',
    training_details: {
      provider_name: 'Rocky Mountain Code Academy',
      course_title: 'Agile Web Engineering & Freelance Professional Practice',
      accreditation: 'Colorado Department of Higher Education (DHE)',
      instructor_name: 'Liam Connor',
      modality: 'Hybrid',
      attendance_rate: '99.1%',
      hours_completed: 700,
    },
    currentRole: 'Senior Full-Stack Freelance Contractor',
    current_role: 'Senior Full-Stack Freelance Contractor',
    currentEmployer: 'Independent Freelance (Upwork Top Rated / Direct Clients)',
    current_employer: 'Independent Freelance (Upwork Top Rated / Direct Clients)',
    placementDate: '2024-04-15',
    placement_date: '2024-04-15',
    placementSalary: '$68.00 / hr ($85,000+ annualized)',
    placement_salary: '$68.00 / hr ($85,000+ annualized)',
    overallScore: 95,
    matchScore: 93,
    lastFollowUp: '2024-08-10',
    nextFollowUp: '2024-11-10',
    notes: 'Top Rated badge on Upwork Pro. Completed 14 high-value contract deliverables with 100% 5-star client ratings.',
    skills: [
      { skillId: 'sk-1', name: 'React.js', level: 'expert', verified: true, score: 98 },
      { skillId: 'sk-2', name: 'TypeScript', level: 'advanced', verified: true, score: 94 },
      { skillId: 'sk-6', name: 'Python / FastAPI', level: 'advanced', verified: true, score: 90 },
    ],
    certifications: [
      {
        id: 'CRT-004',
        title: 'Professional Scrum Master I (PSM I)',
        issuing_organization: 'Scrum.org',
        issue_date: '2024-03-12',
        credential_id: 'PSM-882190',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-004',
        assessment_name: 'Real-time Chat & WebSockets Implementation',
        date: '2024-03-20',
        score: 97,
        max_score: 100,
        grade: 'A+',
        evaluator: 'Liam Connor',
        feedback: 'Flawless bidirectional event handling with Redis Pub/Sub backend.'
      }
    ],
    career_preference: {
      target_roles: ['Freelance Web Engineer', 'Contract Frontend Developer', 'Technical MVP Builder'],
      preferred_workplace: 'Remote',
      target_salary_min: '$60/hr',
      target_salary_max: '$90/hr',
      preferred_locations: ['Remote Worldwide'],
      target_industries: ['Tech Startups', 'E-Commerce', 'Digital Media']
    },
    current_pathway: {
      pathway_id: 'CP-01',
      title: 'Modern Full-Stack Web Architecture',
      current_stage: 'Freelance Contractor Specialist',
      progress_percent: 60,
      next_milestone: 'Freelance Agency Transition (Target: 2026)'
    },
    outcome_history: [
      {
        id: 'OUT-004',
        outcome_type: 'freelancing',
        organization_or_venture: 'Independent Contractor / Upwork Pro Platform',
        role_or_course: 'Full-Stack React/FastAPI Specialist',
        compensation_or_funding: '$68.00 / hr average billable',
        start_date: '2024-04-15',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'Audited platform earnings ledger: $42,500 collected in first 5 months.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-005',
        checkpoint_type: '90-Day Freelance Revenue Verification',
        date: '2024-08-10',
        counselor_name: 'Marcus Brody',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: true,
        counselor_notes: 'Candidate average monthly net billings exceed $7,200. Fully self-sustaining freelancing career.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: true,
      consent_date: '2023-10-01',
      expiry_date: '2025-10-01',
      version: 'v2.1'
    }
  },

  // 4. Apprenticeship
  {
    id: 'TRN-2024-004',
    fullName: 'Devon Harper',
    full_name: 'Devon Harper',
    email: 'devon.harper@example.com',
    phone: '+1 (555) 912-3401',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    location: 'Boston, MA',
    bio: 'Registered state apprentice in hospital infrastructure cybersecurity. Transitioned from IT helpdesk to defending mission-critical clinical IoT and electronic medical records systems.',
    program: 'Cybersecurity & Infrastructure',
    cohort: 'Cohort 2024-B',
    status: 'placed',
    primary_outcome_type: 'apprenticeship',
    enrollmentDate: '2024-02-01',
    graduationDate: '2024-07-15',
    training_details: {
      provider_name: 'Commonwealth Cybersecurity Training Center',
      course_title: 'Healthcare Cyber Defense & Threat Intelligence',
      accreditation: 'U.S. Department of Labor (USDOL) Registered Apprenticeship Program',
      instructor_name: 'Col. James Sterling (Ret.)',
      modality: 'On-site Lab & Clinical Rotation',
      attendance_rate: '96.5%',
      hours_completed: 750,
    },
    currentRole: 'Healthcare Cybersecurity Systems Apprentice',
    current_role: 'Healthcare Cybersecurity Systems Apprentice',
    currentEmployer: 'Vanguard Health Systems',
    current_employer: 'Vanguard Health Systems',
    placementDate: '2024-08-01',
    placement_date: '2024-08-01',
    placementSalary: '$32.50 / hr ($67,600 / yr + Tuition Support)',
    placement_salary: '$32.50 / hr ($67,600 / yr + Tuition Support)',
    overallScore: 84,
    matchScore: 87,
    lastFollowUp: '2024-09-01',
    nextFollowUp: '2024-11-01',
    notes: 'Formal 2-year USDOL registered apprenticeship agreement signed. Progression schedule includes 3 wage step increases.',
    skills: [
      { skillId: 'sk-14', name: 'Network & Cloud Security', level: 'advanced', verified: true, score: 88 },
      { skillId: 'sk-9', name: 'Docker & Containerization', level: 'intermediate', verified: true, score: 78 },
    ],
    certifications: [
      {
        id: 'CRT-005',
        title: 'CompTIA Security+',
        issuing_organization: 'CompTIA',
        issue_date: '2024-06-20',
        expiry_date: '2027-06-20',
        credential_id: 'COMP-SEC-99214',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-005',
        assessment_name: 'Incident Response & Medical Device Triage Lab',
        date: '2024-07-05',
        score: 86,
        max_score: 100,
        grade: 'B+',
        evaluator: 'Col. James Sterling',
        feedback: 'Strong packet analysis skills. Remediated simulated ransomware exploit within 14 minutes.'
      }
    ],
    career_preference: {
      target_roles: ['Cybersecurity Analyst', 'SOC Analyst', 'Healthcare Privacy Systems Officer'],
      preferred_workplace: 'On-site',
      target_salary_min: '$65,000',
      target_salary_max: '$85,000',
      preferred_locations: ['Boston, MA', 'Providence, RI'],
      target_industries: ['Healthcare', 'Government', 'Defense Infrastructure']
    },
    current_pathway: {
      pathway_id: 'CP-02',
      title: 'Cloud Data & AI Systems Engineer',
      current_stage: 'Year 1 Registered Apprentice',
      progress_percent: 30,
      next_milestone: 'Senior SOC Analyst Promotion (Target: August 2025)'
    },
    outcome_history: [
      {
        id: 'OUT-005',
        outcome_type: 'apprenticeship',
        organization_or_venture: 'Vanguard Health Systems',
        role_or_course: 'Cybersecurity Operations Apprentice',
        compensation_or_funding: '$32.50 / hr',
        start_date: '2024-08-01',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'USDOL Apprenticeship Registration Document RAPIDS #81920 on file.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-006',
        checkpoint_type: '30-Day USDOL Apprenticeship Audit',
        date: '2024-09-01',
        counselor_name: 'Marcus Brody',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: false,
        counselor_notes: 'Apprenticeship mentor confirmed completion of first 160 hours on-the-job training.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: false,
      consent_date: '2024-02-01',
      expiry_date: '2026-02-01',
      version: 'v2.1',
      notes: 'Consented to USDOL and state apprentice wage reporting.'
    }
  },

  // 5. Entrepreneurship
  {
    id: 'TRN-2024-005',
    fullName: 'Tariq Al-Jamil',
    full_name: 'Tariq Al-Jamil',
    email: 'tariq.aljamil@example.com',
    phone: '+1 (555) 782-4419',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    location: 'San Jose, CA',
    bio: 'Technology entrepreneur and founder of OmniTrace Diagnostics, an AI-assisted oncology workflow tool. Formed startup team out of workforce accelerator capstone.',
    program: 'Data Intelligence & AI Integration',
    cohort: 'Cohort 2024-A',
    status: 'placed',
    primary_outcome_type: 'entrepreneurship',
    enrollmentDate: '2023-10-10',
    graduationDate: '2024-04-12',
    training_details: {
      provider_name: 'Silicon Valley Data Institute',
      course_title: 'Applied AI Engineering & Venture Commercialization',
      accreditation: 'California Bureau for Private Postsecondary Education (BPPE)',
      instructor_name: 'Dr. Aris Thorne',
      modality: 'Hybrid',
      attendance_rate: '98.9%',
      hours_completed: 720,
    },
    currentRole: 'Founder & Chief Executive Officer',
    current_role: 'Founder & Chief Executive Officer',
    currentEmployer: 'OmniTrace Diagnostics Inc. (Delaware C-Corp)',
    current_employer: 'OmniTrace Diagnostics Inc. (Delaware C-Corp)',
    placementDate: '2024-05-01',
    placement_date: '2024-05-01',
    placementSalary: '$250,000 Pre-Seed Grant + $75,000 Founder Draw',
    placement_salary: '$250,000 Pre-Seed Grant + $75,000 Founder Draw',
    overallScore: 97,
    matchScore: 95,
    lastFollowUp: '2024-08-01',
    nextFollowUp: '2024-11-01',
    notes: 'Incorporated Delaware C-Corp. Accepted into regional tech incubator with $250,000 grant and venture syndicate backing.',
    skills: [
      { skillId: 'sk-6', name: 'Python / FastAPI', level: 'expert', verified: true, score: 98 },
      { skillId: 'sk-8', name: 'PostgreSQL & pgvector', level: 'expert', verified: true, score: 96 },
    ],
    certifications: [
      {
        id: 'CRT-006',
        title: 'TensorFlow Developer Certificate',
        issuing_organization: 'Google',
        issue_date: '2024-03-30',
        credential_id: 'TF-DEV-10294',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-006',
        assessment_name: 'Computer Vision & Medical Imaging Pipeline Defense',
        date: '2024-04-05',
        score: 99,
        max_score: 100,
        grade: 'A+',
        evaluator: 'Dr. Aris Thorne',
        feedback: 'Venture-grade clinical prototype. Exceeded accuracy benchmarks of published commercial models.'
      }
    ],
    career_preference: {
      target_roles: ['Venture Founder', 'Chief Technology Officer', 'AI Research Scientist'],
      preferred_workplace: 'Flexible',
      target_salary_min: '$80,000',
      target_salary_max: '$150,000',
      preferred_locations: ['San Jose, CA', 'San Francisco, CA', 'Remote'],
      target_industries: ['AI / Machine Learning', 'Healthcare Tech', 'Venture Capital']
    },
    current_pathway: {
      pathway_id: 'CP-02',
      title: 'Cloud Data & AI Systems Engineer',
      current_stage: 'Venture Founder & Commercialization',
      progress_percent: 75,
      next_milestone: 'Seed Equity Round & 5 New Tech Hires (Target: Q1 2026)'
    },
    outcome_history: [
      {
        id: 'OUT-006',
        outcome_type: 'entrepreneurship',
        organization_or_venture: 'OmniTrace Diagnostics Inc.',
        role_or_course: 'Founder & CEO',
        compensation_or_funding: '$250,000 Pre-Seed Grant Funding',
        start_date: '2024-05-01',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'Delaware Certificate of Incorporation, IRS EIN letter, and incubator SAFE investment instrument on file.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-007',
        checkpoint_type: '90-Day Entrepreneurship Audit',
        date: '2024-08-01',
        counselor_name: 'Sarah Sterling',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: true,
        counselor_notes: 'OmniTrace has onboarded 2 workforce trainees as beta engineers. High economic multiplier outcome.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: true,
      consent_date: '2023-10-10',
      expiry_date: '2025-10-10',
      version: 'v2.1',
      notes: 'Full public consent granted to showcase company in workforce annual report.'
    }
  },

  // 6. Further Education
  {
    id: 'TRN-2024-006',
    fullName: 'Aisha Al-Mansoor',
    full_name: 'Aisha Al-Mansoor',
    email: 'aisha.m@example.com',
    phone: '+1 (555) 439-0192',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    location: 'Boston, MA',
    bio: 'Data intelligence graduate continuing into advanced graduate research. Awarded fully-funded fellowship to pursue Master of Science in Data Science with healthcare predictive analytics concentration.',
    program: 'Data Intelligence & AI Integration',
    cohort: 'Cohort 2024-A',
    status: 'placed',
    primary_outcome_type: 'further_education',
    enrollmentDate: '2023-10-10',
    graduationDate: '2024-04-12',
    training_details: {
      provider_name: 'Northeast Data Academy',
      course_title: 'Applied Statistical Learning & Neural Network Topologies',
      accreditation: 'Massachusetts Department of Higher Education (MDHE)',
      instructor_name: 'Prof. David Vance',
      modality: 'On-Campus & Computer Science Labs',
      attendance_rate: '99.4%',
      hours_completed: 720,
    },
    currentRole: 'Graduate Research Fellow (M.Sc. Candidate)',
    current_role: 'Graduate Research Fellow (M.Sc. Candidate)',
    currentEmployer: 'Northeastern University Khoury College of Computer Sciences',
    current_employer: 'Northeastern University Khoury College of Computer Sciences',
    placementDate: '2024-08-25',
    placement_date: '2024-08-25',
    placementSalary: '100% Tuition Waiver + $34,000 / yr Annualized Research Stipend',
    placement_salary: '100% Tuition Waiver + $34,000 / yr Annualized Research Stipend',
    overallScore: 98,
    matchScore: 97,
    lastFollowUp: '2024-09-15',
    nextFollowUp: '2024-12-01',
    notes: 'Secured competitive merit research fellowship in clinical NLP. Articulated 12 workforce bootcamp credits into Master degree curriculum.',
    skills: [
      { skillId: 'sk-6', name: 'Python / FastAPI', level: 'expert', verified: true, score: 99 },
      { skillId: 'sk-8', name: 'PostgreSQL & pgvector', level: 'expert', verified: true, score: 97 },
    ],
    certifications: [
      {
        id: 'CRT-007',
        title: 'DeepLearning.AI Machine Learning Specialization',
        issuing_organization: 'DeepLearning.AI & Stanford Online',
        issue_date: '2024-04-01',
        credential_id: 'DLAI-ML-44129',
        status: 'Active'
      }
    ],
    assessments: [
      {
        id: 'ASM-007',
        assessment_name: 'Biomedical Text Vectorization Capstone',
        date: '2024-04-08',
        score: 98,
        max_score: 100,
        grade: 'A+',
        evaluator: 'Prof. David Vance',
        feedback: 'Exemplary semantic vector search architecture utilizing pgvector for PubMed medical abstract classification.'
      }
    ],
    career_preference: {
      target_roles: ['Data Scientist', 'Biomedical AI Researcher', 'Machine Learning Systems Scientist'],
      preferred_workplace: 'Hybrid',
      target_salary_min: '$100,000',
      target_salary_max: '$140,000',
      preferred_locations: ['Boston, MA', 'Cambridge, MA'],
      target_industries: ['Academic Research', 'Pharmaceuticals', 'Healthcare AI']
    },
    current_pathway: {
      pathway_id: 'CP-02',
      title: 'Cloud Data & AI Systems Engineer',
      current_stage: 'Graduate Research & Advanced Specialization',
      progress_percent: 65,
      next_milestone: 'Master of Science Graduation & Industry Placement (Target: 2026)'
    },
    outcome_history: [
      {
        id: 'OUT-007',
        outcome_type: 'further_education',
        organization_or_venture: 'Northeastern University',
        role_or_course: 'M.Sc. in Data Science & Biomedical Informatics',
        compensation_or_funding: 'Full Tuition Fellowship + $34,000 Graduate Stipend',
        start_date: '2024-08-25',
        is_current: true,
        verification_status: 'verified',
        verification_notes: 'Official university letter of matriculation, bursar statement, and graduate assistantship award verified.'
      }
    ],
    follow_up_history: [
      {
        id: 'AUD-008',
        checkpoint_type: 'Fall Semester Higher Education Audit',
        date: '2024-09-15',
        counselor_name: 'Sarah Sterling',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: true,
        counselor_notes: 'Enrolled in 12 graduate credit hours. Research stipend active and paid bi-weekly.'
      }
    ],
    consent_status: {
      consent_status: 'granted',
      share_with_employers: true,
      share_with_funding_bodies: true,
      share_anonymized_research: true,
      share_public_portfolio: true,
      consent_date: '2023-10-10',
      expiry_date: '2025-10-10',
      version: 'v2.1',
      notes: 'Consented to higher education articulation reporting.'
    }
  }
];

export const mockSkills: Skill[] = [
  {
    id: 'sk-1',
    name: 'React.js',
    category: 'Technical',
    demandScore: 92,
    traineesProficient: 245,
    openJobDemands: 58,
    description: 'Declarative component-based UI engineering with modern hooks and state frameworks.',
    growthTrend: '+14% YoY'
  },
  {
    id: 'sk-2',
    name: 'TypeScript',
    category: 'Technical',
    demandScore: 95,
    traineesProficient: 210,
    openJobDemands: 64,
    description: 'Strongly typed JavaScript superset for mission-critical enterprise applications.',
    growthTrend: '+28% YoY'
  },
  {
    id: 'sk-6',
    name: 'Python / FastAPI',
    category: 'Technical',
    demandScore: 96,
    traineesProficient: 188,
    openJobDemands: 72,
    description: 'High performance async REST microservices, Pydantic validation and SQLAlchemy data layers.',
    growthTrend: '+35% YoY'
  },
  {
    id: 'sk-8',
    name: 'PostgreSQL & pgvector',
    category: 'Tools & Frameworks',
    demandScore: 89,
    traineesProficient: 165,
    openJobDemands: 53,
    description: 'Relational data modeling, indexing, and vector similarity embeddings for AI applications.',
    growthTrend: '+42% YoY'
  },
  {
    id: 'sk-9',
    name: 'Docker & Containerization',
    category: 'Cloud & DevOps',
    demandScore: 84,
    traineesProficient: 140,
    openJobDemands: 49,
    description: 'Multi-stage Docker builds, docker-compose local orchestrations and service isolation.',
    growthTrend: '+19% YoY'
  },
  {
    id: 'sk-14',
    name: 'Network & Cloud Security',
    category: 'Domain',
    demandScore: 91,
    traineesProficient: 120,
    openJobDemands: 45,
    description: 'Zero-trust access, TLS encryption, firewall configurations, and vulnerability scanning.',
    growthTrend: '+31% YoY'
  },
  {
    id: 'sk-17',
    name: 'Technical Communication',
    category: 'Soft Skills',
    demandScore: 98,
    traineesProficient: 310,
    openJobDemands: 110,
    description: 'Clear documentation, architectural trade-off presentations and stakeholder engagement.',
    growthTrend: '+12% YoY'
  }
];

export const mockJobs: Job[] = [
  {
    id: 'JOB-2024-101',
    title: 'Full-Stack Associate Engineer',
    employerId: 'EMP-01',
    employerName: 'Apex Cloud Solutions',
    location: 'Austin, TX (Hybrid)',
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    salaryRange: '$80,000 - $92,000',
    requiredSkills: ['React.js', 'TypeScript', 'Tailwind CSS', 'REST APIs'],
    openingsCount: 3,
    applicantsCount: 14,
    status: 'active',
    postedDate: '2024-09-15',
    closingDate: '2024-10-31',
    description: 'Join our customer platform team building reactive enterprise dashboards and customer workflows.'
  },
  {
    id: 'JOB-2024-102',
    title: 'Backend API Specialist',
    employerId: 'EMP-02',
    employerName: 'Meridian Health Tech',
    location: 'Chicago, IL (Remote)',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    salaryRange: '$85,000 - $98,000',
    requiredSkills: ['Python / FastAPI', 'PostgreSQL & pgvector', 'Docker & Containerization'],
    openingsCount: 2,
    applicantsCount: 9,
    status: 'active',
    postedDate: '2024-09-18',
    closingDate: '2024-11-15',
    description: 'Architecting patient data aggregation endpoints with strict privacy controls and vector retrieval.'
  }
];

export const mockEmployers: Employer[] = [
  {
    id: 'EMP-01',
    name: 'Apex Cloud Solutions',
    industry: 'Enterprise Software & SaaS',
    location: 'Austin, TX',
    contactPerson: 'Sarah Jenkins (VP of Talent)',
    contactEmail: 'sarah.j@apexcloud.io',
    contactPhone: '+1 (512) 555-0144',
    activeOpenings: 5,
    hiredTraineesCount: 38,
    retentionRate: 94.7,
    tier: 'Strategic Partner',
    websiteUrl: 'https://apexcloud.example.com'
  },
  {
    id: 'EMP-02',
    name: 'Meridian Health Tech',
    industry: 'Healthcare Technology',
    location: 'Chicago, IL',
    contactPerson: 'David Kalu (Engineering Manager)',
    contactEmail: 'd.kalu@meridianhealth.tech',
    contactPhone: '+1 (312) 555-0189',
    activeOpenings: 4,
    hiredTraineesCount: 22,
    retentionRate: 90.9,
    tier: 'Strategic Partner',
    websiteUrl: 'https://meridianhealth.example.com'
  },
  {
    id: 'EMP-03',
    name: 'OmniTrade FinTech',
    industry: 'Financial Technology',
    location: 'New York, NY',
    contactPerson: 'Rachel Sterling (Head of Recruiting)',
    contactEmail: 'r.sterling@omnitrade.com',
    contactPhone: '+1 (212) 555-0177',
    activeOpenings: 2,
    hiredTraineesCount: 17,
    retentionRate: 88.2,
    tier: 'Standard',
    websiteUrl: 'https://omnitrade.example.com'
  },
  {
    id: 'EMP-04',
    name: 'Vanguard Health Systems',
    industry: 'Hospital & Healthcare Networks',
    location: 'Boston, MA',
    contactPerson: 'Dr. Michael Chen (Operations Director)',
    contactEmail: 'mchen@vanguardhealth.org',
    contactPhone: '+1 (617) 555-0129',
    activeOpenings: 6,
    hiredTraineesCount: 45,
    retentionRate: 96.0,
    tier: 'Strategic Partner',
    websiteUrl: 'https://vanguardhealth.example.com'
  }
];

export const mockSkillGaps: SkillGapAnalysis[] = [
  {
    id: 'GAP-001',
    traineeId: 'TRN-2024-002',
    traineeName: 'Marcus Vance',
    targetJobTitle: 'Backend API Specialist',
    targetEmployer: 'Meridian Health Tech',
    gapScore: 18,
    matchScore: 82,
    missingSkills: [
      { skill: 'PostgreSQL & pgvector indexing', importance: 'Critical', suggestedModule: 'Advanced SQL & Embedding Search' },
      { skill: 'HIPAA Compliance', importance: 'Recommended', suggestedModule: 'Healthcare Data Privacy Fundamentals' }
    ],
    acquiredSkills: ['Python / FastAPI', 'Docker & Containerization', 'REST APIs'],
    recommendation: 'Complete a 1-week micro-credential in vector indexing and relational schema isolation.'
  }
];

export const mockCareerPaths: CareerPath[] = [
  {
    id: 'CP-01',
    title: 'Modern Full-Stack Web Architecture',
    track: 'Engineering',
    description: 'Progression from junior frontend/backend foundations to lead software systems architect.',
    projectedGrowth: '+22% Demand across next 5 years',
    targetIndustries: ['SaaS', 'FinTech', 'E-Commerce', 'Enterprise Software'],
    milestones: [
      {
        stage: 'Entry / Apprentice',
        role: 'Junior Software Engineer',
        typicalTimeframe: '0 - 18 months',
        expectedSalary: '$75,000 - $90,000',
        competencies: ['React & TypeScript components', 'FastAPI CRUD endpoints', 'Unit testing & Git branching']
      },
      {
        stage: 'Mid-Level',
        role: 'Software Engineer II',
        typicalTimeframe: '18 - 36 months',
        expectedSalary: '$95,000 - $125,000',
        competencies: ['Microservice architecture', 'Database query optimization', 'CI/CD pipeline management']
      }
    ]
  }
];

export const mockFollowUps: FollowUpItem[] = [
  {
    id: 'FLW-001',
    traineeId: 'TRN-2024-001',
    traineeName: 'Elena Rostova',
    traineeRole: 'Junior Frontend Engineer @ Apex',
    type: '90-Day Retention Audit',
    dueDate: '2024-11-20',
    status: 'pending',
    priority: 'Medium',
    assignedCounselor: 'Marcus Brody',
    notes: 'Assess 90-day retention and manager feedback on technical ramp-up.'
  },
  {
    id: 'FLW-002',
    traineeId: 'TRN-2024-004',
    traineeName: 'Devon Harper',
    traineeRole: 'Cybersecurity Systems Apprentice @ Vanguard',
    type: '60-Day Apprenticeship Audit',
    dueDate: '2024-11-01',
    status: 'pending',
    priority: 'High',
    assignedCounselor: 'Marcus Brody',
    notes: 'USDOL milestone verification check with Hospital SOC supervisor.'
  }
];
