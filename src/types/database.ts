export type RoleCode =
  | 'ADMIN'
  | 'OPERATOR_SEKSI'
  | 'VERIFIKATOR_KEUANGAN'
  | 'PIMPINAN'
  | 'VIEWER';

export type NavSection =
  | 'dashboard'
  | 'pengajuan'
  | 'kalender'
  | 'monitoring-spj'
  | 'rekap-unit'
  | 'analytics'
  | 'laporan'
  | 'pengaturan';

export type ActivityStatus =
  | 'Draft'
  | 'Diajukan'
  | 'Verifikasi Keuangan'
  | 'Disetujui'
  | 'Ditolak'
  | 'Dijadwalkan Ulang';

export type SpjOverallStatus =
  | 'Pending'    // Kegiatan selesai / berjalan, berkas belum diunggah
  | 'Submitted'  // Menunggu Verifikasi Perencanaan & Keuangan
  | 'Revision'   // Perlu Revisi (ada catatan verifikator)
  | 'Complete';  // SPJ Lengkap & Terverifikasi

export type SpjItemStatus =
  | 'Belum Unggah'
  | 'Menunggu Cek'
  | 'Sesuai'
  | 'Perlu Revisi';

export interface Unit {
  id: string;
  code: string;
  name: string;
  shortName: string;
  headName: string;
  colorHex: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface Role {
  id: RoleCode;
  name: string;
  description: string;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  nip: string;
  position: string;
  unitId: string;
  roleId: RoleCode;
  email: string;
  phone: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface ActivityType {
  id: string;
  name: string;
  description: string;
  defaultSpjDeadlineDays: number;
}

export interface SpjChecklistMaster {
  id: string;
  activityTypeId: string;
  docName: string;
  isMandatory: boolean;
  description: string;
}

export interface Activity {
  id: string;
  code: string;
  unitId: string;
  creatorId: string;
  title: string;
  activityTypeId: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  location: string;
  estimatedParticipants: number;
  budgetEstimate: number;
  picName: string;
  picPhone: string;
  notes?: string;
  status: ActivityStatus;
  createdAt: string;
}

export interface ActivityApproval {
  id: string;
  activityId: string;
  approverId: string;
  approverName: string;
  stage: 'Pengajuan Seksi' | 'Verifikasi Perencanaan & Keuangan' | 'Persetujuan Pimpinan';
  action: 'Diajukan' | 'Disetujui' | 'Revisi' | 'Ditolak' | 'Dijadwalkan Ulang';
  note: string;
  timestamp: string;
}

export interface SpjSubmission {
  id: string;
  activityId: string;
  dueDate: string; // YYYY-MM-DD (H+7 working days)
  submittedAt: string | null;
  verifiedAt: string | null;
  verifierId: string | null;
  overallStatus: SpjOverallStatus;
  revisionCount: number;
  generalNote?: string;
}

export interface SpjDocument {
  id: string;
  spjSubmissionId: string;
  checklistMasterId: string;
  docName: string;
  isMandatory: boolean;
  fileName: string | null;
  fileSizeKb: number | null;
  fileType: string | null;
  filePreviewUrl: string | null;
  uploadedBy: string | null;
  uploadedAt: string | null;
  itemStatus: SpjItemStatus;
  verifierNote: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  activityId: string;
  type: 'Approval' | 'Revisi SPJ' | 'Tenggat H+5' | 'Overdue H+7' | 'SPJ Sah';
  title: string;
  message: string;
  isRead: boolean;
  sentAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: 'activities' | 'activity_approvals' | 'spj_submissions' | 'spj_documents' | 'master_data';
  entityId: string;
  details: string;
  timestamp: string;
}
