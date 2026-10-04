# Longitudinal Outcome Intelligence Architecture

## 1. Overview & Core Philosophy

SkillTrace delivers an enterprise-grade, privacy-first **Longitudinal Outcome Intelligence Layer** engineered to track, analyze, and verify career and skill pathways of trainees across multi-year horizons.

Unlike traditional vocational dashboards that rely on static surveys, self-reported estimates, or hardcoded fallback KPIs, SkillTrace calculates **every metric strictly and deterministically from immutable database records**.

### Fundamental Principles:
1. **Zero Invented Numbers:** All confidence values, percentages, and wage trends are grounded in concrete verification artifacts and timestamps.
2. **Missing Data is `UNKNOWN`, Never `UNEMPLOYED`:** A lack of contact or missing post-training report must never be penalized as unemployment. It is explicitly categorized as `UNKNOWN` or `UNREACHABLE`.
3. **Append-Only Historical Integrity:** Career transitions, promotions, and wage milestones are permanently preserved as sequential events. Historical facts are never overwritten.
4. **Transparent Auditability:** Every record has an itemized data quality score explaining exactly why completeness, freshness, verification, or consistency deductions occurred.
5. **Strict Demo / Production Isolation:** Synthetic records are tagged as `DEMO/SYNTHETIC` and excluded from production intelligence by default.

---

## 2. Canonical Outcome States & State Normalization

SkillTrace standardizes workforce progression into **11 canonical outcome states**:

| State | Definition | Normalization Aliases / Ingestion Triggers |
| :--- | :--- | :--- |
| `EMPLOYED` | Salaried formal employment (full-time or part-time) | `placed`, `salaried`, `employment`, `full_time` |
| `SELF_EMPLOYED` | Independent registered business, LLC, or sole proprietorship | `self_employment`, `business_owner`, `llc` |
| `APPRENTICESHIP` | Formal industry apprenticeship or registered internship | `internship`, `naps`, `apprentice` |
| `FREELANCING` | Gig economy contractor, independent software consultant | `freelance`, `contractor`, `consultant` |
| `ENTREPRENEURSHIP` | High-growth venture founder or startup operator | `startup`, `founder`, `incubated` |
| `HIGHER_STUDIES` | Enrolled in formal degree program or advanced university track | `higher_education`, `further_education`, `degree` |
| `UNEMPLOYED` | Actively verified as not working and seeking employment | Verified survey indicating actively seeking |
| `SEEKING_EMPLOYMENT`| In transition, interviewing, or awaiting placement matching | `job_seeking`, `interviewing`, `in_training` |
| `UNKNOWN` | No outcome data reported yet (default for unverified records) | `outcome_unknown`, `null`, `unreported` |
| `UNREACHABLE` | Exhausted follow-up attempts (phone, SMS, email non-responsive) | `contact_failed`, `bounced`, `unreachable` |
| `WITHDRAWN_CONSENT` | Trainee exercised statutory right to withdraw tracking consent | `consent_revoked`, `withdrawn` |

### Special Rules:
- **Consent Precedence:** If a trainee's consent status is `WITHDRAWN` or `REVOKED`, the state resolves immediately to `WITHDRAWN_CONSENT`. Identifiable details are scrubbed or masked in longitudinal queries.
- **Reachability Precedence:** If communication attempts fail across all channels beyond statutory timeout thresholds, the state resolves to `UNREACHABLE` rather than assuming negative outcomes.

---

## 3. Evidence-Grounded Confidence Engine

SkillTrace rejects synthetic or arbitrary confidence scores. Every outcome score $C \in [0.0, 1.0]$ is computed using a deterministic formula based on:
1. Primary verification evidence tier
2. Multi-source corroboration
3. Temporal freshness decay

### Base Confidence by Verification Level:
- `DOCUMENT_VERIFIED`: **0.95** (Official offer letters, pay slips, government portal challan)
- `EMPLOYER_VERIFIED`: **0.90** (Direct employer confirmation via authenticated portal)
- `SYSTEM_VERIFIED`: **0.85** (Automated HRMS / EPFO / API integration)
- `PARTIALLY_VERIFIED`: **0.70** (Trainer evaluation, institution attestation)
- `SELF_REPORTED`: **0.50** (Trainee submission without supporting documentation)
- `UNVERIFIED` / `UNKNOWN` / `REJECTED`: **0.00**

### Corroboration Bonus (+0.05):
When an outcome is corroborated by multiple distinct sources (e.g., direct employer verification plus EPFO electronic challan confirmation or DigiLocker attestation), a **+0.05 bonus** is applied (capped at **1.00**).

### Temporal Freshness Decay:
Outcomes naturally change over time. If a record has not been verified recently, a penalty is assessed:
- **Inactive > 180 Days:** $-0.10$ penalty (bounded at minimum $0.30$)
- **Inactive > 365 Days:** $-0.20$ penalty (bounded at minimum $0.20$)

---

## 4. The 14 Longitudinal Intelligence Metrics

SkillTrace computes 14 core metrics directly from live database tables:

1. **Placement Rate (%):** Proportion of trainees achieving positive economic placement (`EMPLOYED`, `SELF_EMPLOYED`, `APPRENTICESHIP`, `FREELANCING`, `ENTREPRENEURSHIP`) over total cohort size.
2. **Salaried Employment Rate (%):** Trainees in formal salaried roles (`EMPLOYED`).
3. **Self-Employment Rate (%):** Trainees operating registered enterprises (`SELF_EMPLOYED`).
4. **Apprenticeship Rate (%):** Trainees in active apprenticeship programs (`APPRENTICESHIP`).
5. **Freelancing Rate (%):** Independent gig and contract workers (`FREELANCING`).
6. **Higher Studies Rate (%):** Trainees in tertiary education programs (`HIGHER_STUDIES`).
7. **30-Day Retention (%):** Trainees actively employed $\ge 30$ days post-placement.
8. **90-Day Retention (%):** Trainees actively employed $\ge 90$ days post-placement.
9. **180-Day Retention (%):** Trainees actively employed $\ge 180$ days post-placement.
10. **365-Day Retention (%):** Trainees actively employed $\ge 365$ days post-placement.
11. **Wage Progression (%):** Percentage difference between average current wage and placement starting wage:
    $$\Delta W = \frac{\bar{W}_{\text{current}} - \bar{W}_{\text{placement}}}{\bar{W}_{\text{placement}}} \times 100$$
12. **Median Wage (₹):** Median verified wage across all reporting trainees.
13. **Training-to-Job Relevance (%):** Percentage alignment between curriculum competencies and employer-evaluated task requirements.
14. **Follow-Up Response Rate (%):** Ratio of completed longitudinal milestone follow-ups to scheduled follow-ups.

---

## 5. Append-Only Real Career Timeline

Career progression is modeled as an immutable sequential event log. **Historical events are never overwritten.**

### Canonical Timeline Stages:
1. `TRAINING`: Enrolled in program curriculum.
2. `COMPLETION`: Completed coursework, practical modules, and capstone.
3. `PLACEMENT`: Offer extended and accepted.
4. `EMPLOYMENT`: First day of active work verified.
5. `JOB_CHANGE`: Transition to a new employer or role.
6. `SALARY_CHANGE`: Increments, promotions, or pay adjustments.
7. `RETENTION`: Milestone verification (30d, 90d, 180d, 365d).
8. `SKILL_DEVELOPMENT`: Advanced skill acquisition or micro-credentials obtained on the job.

Each event includes:
- `event_id`, `trainee_id`, `stage`, `title`, `description`
- `event_date`, `sequence_order`
- `verification_status`, `verified_by`, `evidence_url`, `metadata_json`

---

## 6. Data Quality Engine & Itemized Auditability

To prevent "garbage in, garbage out" analytics, SkillTrace scores every record from **0 to 100** using four orthogonal pillars (25 points each):

### Pillar 1: Completeness (25 Points)
- Affiliated with valid training program: $+5$
- Enrollment and graduation dates populated: $+5$
- Employer name present for placed outcome: $+8$
- Verified wage or placement salary present: $+7$

### Pillar 2: Freshness (25 Points)
- Active contact within last 90 days: $+25$
- Inactive $91 - 180$ days: $-5$ deduction ("Quarterly review pending")
- Inactive $181 - 365$ days: $-12$ deduction ("Aging record: No activity recorded for $> 180$ days")
- Inactive $> 365$ days: $-20$ deduction ("Stale record: No activity recorded for $> 1$ year")

### Pillar 3: Verification (25 Points)
- `DOCUMENT_VERIFIED` or `EMPLOYER_VERIFIED`: $+25$
- `SYSTEM_VERIFIED`: $+20$
- `PARTIALLY_VERIFIED`: $+15$
- `SELF_REPORTED`: $+8$ ($-17$ deduction for uncorroborated self-report)
- `UNVERIFIED` / `UNKNOWN`: $0$

### Pillar 4: Consistency (25 Points)
- Longitudinal follow-up milestones scheduled: $+8$
- Timeline events exist matching declared outcome: $+7$
- Positive retention aligns with ongoing employment: $+10$

Every audit exposes the exact line-item deductions, allowing program managers and auditors to immediately identify and remedy data gaps.

---

## 7. Multi-Dimensional Cohort Filtering & Synthetic Isolation

Every analytics query supports fine-grained cohort slicing:
- **`course`**: Filter by curriculum or trade (e.g., Full-Stack Web Development, Data Science).
- **`provider`**: Filter by training institution or partner center.
- **`district`**: Filter by geographical region (e.g., Bengaluru, Hyderabad, Pune).
- **`batch`**: Filter by academic or training cohort.
- **`training_period_start` / `training_period_end`**: Bounded date ranges.
- **`outcome_type`**: Filter by any canonical outcome state.
- **`include_demo`**: Boolean toggle (`true`/`false`). When set to `false`, all records marked `is_synthetic = True` or `data_source = 'DEMO/SYNTHETIC'` are completely excluded.

---

## 8. API Specifications

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/dashboard` | High-level summary metrics with cohort filters |
| `GET` | `/api/analytics/longitudinal-metrics` | All 14 longitudinal intelligence metrics |
| `GET` | `/api/analytics/data-quality` | Data quality score, 4-pillar breakdown, audit metrics, and itemized record deductions |
| `GET` | `/api/analytics/cohort-filters` | Available filter options (courses, providers, districts, batches, outcome states) |
| `GET` | `/api/analytics/trainee-outcomes` | Trainee list with grounded confidence, verification level, and data source |
| `GET` | `/api/analytics/comprehensive` | Comprehensive consolidated payload for dashboards |

All endpoints enforce strict role-based access control (Admin, Coach, Employer, Trainee). Trainees are strictly scoped to their own records.

---

## 9. Verification & Automated Test Coverage

The Longitudinal Outcome Intelligence Layer is validated by **56 automated backend tests**:
- `test_eleven_canonical_outcome_states_defined`: Confirms presence of all 11 outcome states.
- `test_normalize_outcome_state_logic`: Verifies string normalization and trade aliases.
- `test_missing_data_never_classified_as_unemployed`: Ensures missing data defaults to `UNKNOWN`.
- `test_withdrawn_consent_override`: Verifies privacy consent revocation handling.
- `test_confidence_values_derived_from_verification_evidence`: Validates deterministic confidence mapping.
- `test_confidence_corroboration_bonus`: Validates $+0.05$ multi-source boost.
- `test_confidence_freshness_decay_penalty`: Validates $-0.10$ and $-0.20$ aging decay.
- `test_historical_timeline_events_never_overwritten`: Verifies chronological event preservation.
- `test_data_quality_score_calculation_and_itemized_deductions`: Tests 4-pillar scoring and deduction explanations.
- `test_cohort_filtering_by_district`: Verifies geographic filtering.
- `test_synthetic_data_isolation_toggle`: Validates complete exclusion of demo data when requested.
- `test_api_longitudinal_metrics_endpoint` & `test_api_data_quality_dashboard_endpoint`: Validates full end-to-end API integration.
