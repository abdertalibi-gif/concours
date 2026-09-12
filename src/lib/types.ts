// ============================================================
// CONCOURS MAROC — Types & Data Model
// Miroir du schéma Prisma de production (voir prisma/schema.prisma
// dans un déploiement Next.js). Ici persisté en localStorage via
// la couche d'abstraction src/lib/db.ts (storage interchangeable).
// ============================================================

export type Role = 'USER' | 'ADMIN';

export type CompetitionStatus = 'Ouvert' | 'Bientot' | 'Ferme' | 'Suspendu' | 'Archive';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'EXPIRED';
export type PublishStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type CompetitionCategory =
  | 'ECOLE'
  | 'MINISTERE'
  | 'UNIVERSITE'
  | 'INSTITUTION'
  | 'RECRUTEMENT'
  | 'FORMATION'
  | 'AUTRE';
export type OrgType = 'MINISTERE' | 'ECOLE' | 'INSTITUTION';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  city?: string;
  level?: string;
  phone?: string;
  bio?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface School {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  aliases?: string[];
  logoUrl?: string;
  officialLogo?: string;
  customLogo?: string;
  logoColor?: string;
  universityId?: string;
  ministryId?: string;
  isActive?: boolean;
  description: string;
  longDescription?: string;
  city: string;
  region: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  type: string;
  domains: string[];
  levels: string[];
  founded?: string;
  students?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  nameAr?: string;
  slug: string;
  aliases?: string[];
  logoUrl?: string;
  officialLogo?: string;
  customLogo?: string;
  logoColor?: string;
  ministryId?: string;
  description: string;
  city: string;
  region: string;
  website?: string;
  isActive?: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Ministry {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  aliases?: string[];
  logoUrl?: string;
  officialLogo?: string;
  customLogo?: string;
  logoColor?: string;
  description: string;
  website?: string;
  sourceUrl?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Competition {
  id: string;
  slug: string;
  title: string;
  organizationName: string;
  organizationType: OrgType;
  schoolId?: string;
  universityId?: string;
  ministryId?: string;
  logoUrl?: string;
  officialLogo?: string;
  customLogo?: string;
  logoColor?: string;
  category: CompetitionCategory;
  year: number;
  level: string;
  city: string;
  region: string;
  domaine?: string;
  places: number;
  description: string;
  conditions: string[];
  profil?: string;
  programme?: string;
  matieres: string[];
  epreuves: string[];
  documentsDemandes: string[];
  procedure?: string;
  frais?: string;
  resultats?: string;
  registrationStart?: string;
  registrationDeadline?: string;
  competitionDate?: string;
  publishedAt: string;
  officialWebsite?: string;
  registrationUrl?: string;
  sourceUrl?: string;
  sourceOrganization?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  publishStatus: PublishStatus;
  manualStatus?: CompetitionStatus;
  views: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  slug: string;
  title: string;
  schoolId?: string;
  schoolName: string;
  ministryId?: string;
  organizationName: string;
  subject: string;
  year: number;
  level: string;
  type: string;
  description?: string;
  pdfUrl?: string;
  pages?: number;
  duration?: string;
  downloads: number;
  hasCorrection: boolean;
  source?: string;
  verificationStatus: VerificationStatus;
  publishStatus: PublishStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocCategory =
  | 'Avis de concours'
  | 'Convocation'
  | 'Résultats'
  | 'Liste des candidats'
  | 'Programme'
  | 'Guide'
  | 'Cours'
  | 'Fiche de révision'
  | 'Ancien examen'
  | 'Notice officielle'
  | 'Texte juridique'
  | 'Autre';

export interface DocItem {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  organizationName: string;
  schoolId?: string;
  ministryId?: string;
  competitionId?: string;
  year: number;
  description?: string;
  fileUrl?: string;
  fileSize?: string;
  sourceUrl?: string;
  downloads: number;
  publishStatus: PublishStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'PDF' | 'QUIZ' | 'EXERCISE';
  duration: string;
  content: string;
  videoUrl?: string;
  pdfUrl?: string;
  order: number;
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subject: string;
  level: string;
  description: string;
  color: string;
  duration: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  chapters: Chapter[];
  publishStatus: PublishStatus;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  targetType: 'CONCOURS' | 'EXAMEN' | 'DOCUMENT' | 'COURS' | 'ECOLE';
  targetId: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  userId: string;
  competitionId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all' = diffusion
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'deadline' | 'result';
  link?: string;
  readBy: string[];
  createdAt: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[];
  percent: number;
  updatedAt: string;
}

export interface Report {
  id: string;
  userId?: string;
  userName?: string;
  competitionId?: string;
  competitionTitle?: string;
  type: 'Date incorrecte' | 'Lien incorrect' | 'Information incorrecte' | 'Concours terminé' | 'Autre';
  message: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
}

export interface DatabaseShape {
  version: number;
  users: User[];
  schools: School[];
  universities: University[];
  ministries: Ministry[];
  competitions: Competition[];
  exams: Exam[];
  documents: DocItem[];
  courses: Course[];
  favorites: Favorite[];
  follows: Follow[];
  notifications: AppNotification[];
  progress: UserProgress[];
  reports: Report[];
  settings: {
    siteName: string;
    contactEmail: string;
    announcement?: string;
  };
}
