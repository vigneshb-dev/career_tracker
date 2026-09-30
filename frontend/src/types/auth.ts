export type UserRole = 'TRAINEE' | 'COACH' | 'EMPLOYER' | 'ADMIN';

export interface UserProfileDetails {
  headline?: string;
  bio?: string;
  education?: string;
  resume_url?: string;
  resume_filename?: string;
  resume_parsed_skills?: string[];
  title?: string;
  organization?: string;
  specialization?: string;
  assigned_trainee_ids?: string[];
  company_name?: string;
  designation?: string;
  authorized_candidate_ids?: string[];
  [key: string]: any;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  is_active: boolean;
  is_verified: boolean;
  profile_id?: string | null;
  trainee_id?: string | null;
  employer_id?: string | null;
  details?: UserProfileDetails;
}

export interface AuthResponse {
  token: string;
  token_type: string;
  user: AuthUser;
  requires_verification: boolean;
  demo_otp?: string | null;
}

export interface SignupPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'TRAINEE' | 'COACH' | 'EMPLOYER';
  phone?: string;
  program?: string;
  cohort?: string;
  location?: string;
  headline?: string;
  bio?: string;
  education?: string;
  title?: string;
  organization?: string;
  specialization?: string;
  company_name?: string;
  designation?: string;
  employer_id?: string;
}
