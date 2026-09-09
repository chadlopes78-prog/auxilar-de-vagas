export type Country = { id: number; code: string; name: string; currency: string; slug: string };
export type Region = { id: number; countryId: number; name: string; slug: string };
export type City = { id: number; regionId: number; name: string; slug: string };
export type Category = { id: number; slug: string; name: string; icon: string; jobCount?: number };

export type ApplyChannel = "internal" | "official_api" | "email" | "official_redirect";

export type QuestionType = "yes_no" | "single" | "multi" | "text" | "number" | "date" | "file";
export type QuestionStep = "experience" | "qualifications" | "specific";
export type VisibleIf = { questionKey: string; equals?: string };

export type ApplyQuestion = {
  id: number;
  jobId: number;
  key: string;
  question: string;
  questionType: QuestionType;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
  stepKey: QuestionStep;
  helpText: string | null;
  visibleIf: VisibleIf | null;
};

export type AnswerMap = Record<string, string | string[]>;

export type JobCard = {
  id: number;
  title: string;
  companyId: number;
  companyName: string;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  category: string | null;
  categoryId: number | null;
  employmentType: string;
  workModel: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  publishedAt: string;
  deadline: string | null;
  excerpt: string;
  featured: boolean;
  urgent: boolean;
  saved: boolean;
  sourceName: string;
  originalUrl: string | null;
  applyMethod: string;
  applyChannel: ApplyChannel;
  sourceId: number | null;
  applyEmail?: string | null;
};

export type JobDetail = JobCard & {
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  qualifications: string | null;
  benefits: string | null;
  applyEmail: string | null;
  companyDescription: string | null;
  companyIndustry: string | null;
  companyWebsite: string | null;
  companySize: string | null;
  alreadyApplied: boolean;
};

export type CompanyCard = {
  id: number;
  name: string;
  industry: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  size: string | null;
  jobCount: number;
  approved: boolean;
};

export type Profile = {
  userId: string;
  role: "candidate" | "employer" | "admin";
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  countryId: number | null;
  regionId: number | null;
  cityId: number | null;
  countryName: string | null;
  regionName: string | null;
  cityName: string | null;
  onboarded: boolean;
  title: string | null;
  about: string | null;
  experienceLevel: string | null;
  openToRemote: boolean;
  linkedin: string | null;
  portfolio: string | null;
  cvName: string | null;
  completeness: number;
  companyId: number | null;
  interests: number[];
  defaultCoverLetter: string | null;
  salaryExpectation: string | null;
  availability: string | null;
  desiredRole: string | null;
};

export type ExperienceRow = {
  id: number;
  title: string | null;
  company: string | null;
  period: string | null;
  description: string | null;
};

export type EducationRow = {
  id: number;
  school: string | null;
  degree: string | null;
  period: string | null;
};

export type LanguageRow = {
  id: number;
  name: string;
  level: string | null;
};

export type CertificationRow = {
  id: number;
  name: string;
  issuer: string | null;
  year: string | null;
};

export type DocumentRow = {
  id: number;
  kind: string;
  fileName: string;
  isPrimary: boolean;
  createdAt: string;
};

export type CandidateBundle = {
  experiences: ExperienceRow[];
  education: EducationRow[];
  skills: string[];
  languages: LanguageRow[];
  certifications: CertificationRow[];
  documents: DocumentRow[];
};

export type ApplicationRow = {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  status: string;
  createdAt: string;
  candidateName: string | null;
  candidateEmail: string | null;
  coverLetter: string | null;
  phone: string | null;
  method?: string | null;
  sourceName?: string | null;
  countryName?: string | null;
  officialUrl?: string | null;
  statusNote?: string | null;
  externalStatus?: string | null;
  submittedAt?: string | null;
  answers?: { key: string; question: string; answer: string }[] | null;
};

export type ApplyContext = {
  jobId: number;
  title: string;
  companyName: string;
  location: string;
  sourceName: string;
  sourceSlug: string;
  channel: ApplyChannel;
  methodLabel: string;
  officialUrl: string | null;
  redirectTitle: string;
  redirectMessage: string;
  redirectCta: string;
  alreadyApplied: boolean;
  existingStatus: string | null;
  existingOfficialUrl: string | null;
  fullName: string;
  email: string;
  phone: string;
  cvName: string | null;
  documents: DocumentRow[];
  coverLetter: string;
  desiredRole: string;
  missingFields: string[];
  consentNeeded: boolean;
  consentFields: string[];
  quickApplyEligible: boolean;
  profession: string;
  requirements: string | null;
  qualifications: string | null;
  wantsCoverLetter: boolean;
  questions: ApplyQuestion[];
  cityName: string | null;
  regionName: string | null;
  countryName: string | null;
  suggestedAnswers: AnswerMap;
  applyEmail: string | null;
};

export type ApplyOutcome = {
  outcome: "sent" | "already" | "redirect" | "error" | "consent_required";
  message: string;
  applicationId?: number;
  officialUrl?: string | null;
  channel: ApplyChannel | "official_redirect";
  redirectCta?: string;
};

export type JobSearchInput = {
  q?: string;
  countryId?: number | null;
  regionId?: number | null;
  cityId?: number | null;
  categoryId?: number | null;
  employmentType?: string;
  workModel?: string;
  experienceLevel?: string;
  posted?: string;
  company?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  sort?: string;
  strictLocation?: boolean;
  page?: number;
  pageSize?: number;
  sourceSlug?: string;
};

export type SearchResult = {
  jobs: JobCard[];
  total: number;
  page: number;
  pageSize: number;
  cityCount: number;
  regionCount: number;
  countryCount: number;
  remoteCount: number;
  sourceCounts: { slug: string; name: string; count: number }[];
};

export type NotificationRow = {
  id: number;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
};

export type JobAlertRow = {
  id: number;
  keyword: string | null;
  cityId: number | null;
  cityName: string | null;
  regionId: number | null;
  regionName: string | null;
  countryId: number | null;
  countryName: string | null;
  frequency: string;
};

export type PlaceCount = {
  id: number;
  name: string;
  slug: string;
  count: number;
  countryId?: number;
  regionId?: number;
};

export type GeoBundle = {
  countries: Country[];
  regions: Region[];
  cities: City[];
  categories: Category[];
};

export type JobSource = {
  id: number;
  slug: string;
  name: string;
  countryCode: string;
  url: string;
  integrationType: string;
  feedUrl: string | null;
  active: boolean;
  status: string;
  lastSyncedAt: string | null;
  importedCount: number;
  lastError: string | null;
  lastFoundCount?: number | null;
  lastNewCount?: number | null;
  lastExpiredCount?: number | null;
  applicationStatus?: string;
  applicationReason?: string;
  supportsApplicationSubmission?: boolean;
  supportsJobsImport?: boolean;
  supportsApplicationStatus?: boolean;
  syncable?: boolean;
  primary?: boolean;
};
