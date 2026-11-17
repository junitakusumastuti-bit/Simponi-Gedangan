import {
  Activity,
  ActivityApproval,
  ActivityType,
  AuditLog,
  NotificationItem,
  Role,
  SpjChecklistMaster,
  SpjDocument,
  SpjSubmission,
  Unit,
  User,
} from '../types/database';
import { addWorkingDays } from '../utils/spjLogic';

export const SEED_UNITS: Unit[] = [
  {
    id: 'unit-1',
    code: 'SUBBAG-PK',
    name: 'Sub Bagian Perencanaan dan Keuangan',
    shortName: 'Perencanaan & Keuangan',
    headName: 'Dra. Ratna Kusumawati, M.Si.',
    colorHex: '#0F294A',
    status: 'Aktif',
  },
  {
    id: 'unit-2',
    code: 'SUBBAG-UK',
    name: 'Sub Bagian Umum dan Kepegawaian',
    shortName: 'Umum & Kepegawaian',
    headName: 'Hendra Wijaya, S.Sos.',
    colorHex: '#1D4ED8',
    status: 'Aktif',
  },
  {
    id: 'unit-3',
    code: 'SEKSI-PEMB',
    name: 'Seksi Pembangunan',
    shortName: 'Seksi Pembangunan',
    headName: 'Ir. Bambang Setiawan',
    colorHex: '#0D9488',
    status: 'Aktif',
  },
  {
    id: 'unit-4',
    code: 'SEKSI-PEM',
    name: 'Seksi Pemerintahan',
    shortName: 'Seksi Pemerintahan',
    headName: 'Ahmad Fauzi, S.STP., M.M.',
    colorHex: '#4338CA',
    status: 'Aktif',
  },
  {
    id: 'unit-5',
    code: 'SEKSI-TRANTIB',
    name: 'Seksi Ketentraman dan Ketertiban Umum',
    shortName: 'Seksi Trantibum',
    headName: 'Sugeng Riyadi, S.H.',
    colorHex: '#B45309',
    status: 'Aktif',
  },
  {
    id: 'unit-6',
    code: 'SEKSI-EKON',
    name: 'Seksi Perekonomian',
    shortName: 'Seksi Perekonomian',
    headName: 'Siti Aminah, S.E.',
    colorHex: '#0369A1',
    status: 'Aktif',
  },
  {
    id: 'unit-7',
    code: 'SEKSI-KESOS',
    name: 'Seksi Kesejahteraan Sosial (Kesos)',
    shortName: 'Seksi Kesos',
    headName: 'Nurul Hidayati, S.KM.',
    colorHex: '#7C3AED',
    status: 'Aktif',
  },
];

export const SEED_ROLES: Role[] = [
  {
    id: 'ADMIN',
    name: 'Super Admin',
    description: 'Akses penuh konfigurasi sistem, master 7 unit kerja, template checklist SPJ, akun pengguna, approval, verifikasi, dan audit log lintas unit.',
    permissions: ['manage_masters', 'manage_users', 'view_all', 'view_audit', 'verify_spj', 'approve_activity'],
  },
  {
    id: 'VERIFIKATOR_KEUANGAN',
    name: 'Verifikator / Kasubag Perencanaan & Keuangan',
    description: 'Review awal pengajuan kegiatan, pemeriksaan & validasi kelengkapan SPJ, catatan revisi, dan ekspor laporan.',
    permissions: ['verify_finance_stage', 'verify_spj', 'view_all', 'export_reports'],
  },
  {
    id: 'PIMPINAN',
    name: 'Pimpinan (Camat / Sekcam)',
    description: 'Persetujuan akhir kegiatan, akses penuh dashboard eksekutif, insight kepatuhan unit, dan laporan periodik.',
    permissions: ['approve_activity', 'view_all', 'export_reports'],
  },
  {
    id: 'OPERATOR_SEKSI',
    name: 'PIC Sub Bagian / Seksi',
    description: 'Input pengajuan kegiatan unitnya, melihat kalender kecamatan, unggah dokumen SPJ, dan perbaikan revisi unit terkait.',
    permissions: ['create_activity', 'upload_spj', 'view_calendar'],
  },
  {
    id: 'VIEWER',
    name: 'Peninjau / Pengawas Internal',
    description: 'Akses baca untuk pemantauan jadwal kecamatan, kepatuhan unit, dan laporan rekapitulasi.',
    permissions: ['view_all'],
  },
];

export const SEED_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'superadmin',
    password: 'AdminGedangan2026',
    name: 'Fajar Nugroho, S.Kom.',
    nip: '19900710 201801 1 006',
    position: 'Super Admin Sistem Kecamatan',
    unitId: 'unit-2',
    roleId: 'ADMIN',
    email: 'superadmin.simponi@gedangan.go.id',
    phone: '0821-4090-3321',
    status: 'Aktif',
  },
  {
    id: 'user-verif',
    username: 'verifikator.keu',
    password: 'Keuangan2026',
    name: 'Dra. Ratna Kusumawati, M.Si.',
    nip: '19760819 200212 2 007',
    position: 'Kasubag Perencanaan & Keuangan',
    unitId: 'unit-1',
    roleId: 'VERIFIKATOR_KEUANGAN',
    email: 'perenkeu.gedangan@sidoarjokab.go.id',
    phone: '0812-3001-2204',
    status: 'Aktif',
  },
  {
    id: 'user-camat',
    username: 'camat.gedangan',
    password: 'Camat2026',
    name: 'Drs. H. Santoso Prabowo, M.Si.',
    nip: '19710412 199303 1 004',
    position: 'Camat Gedangan',
    unitId: 'unit-4',
    roleId: 'PIMPINAN',
    email: 'camat.gedangan@sidoarjokab.go.id',
    phone: '0812-3001-1101',
    status: 'Aktif',
  },
  {
    id: 'user-pic-1',
    username: 'pic.perenkeu',
    password: 'PicUnit1',
    name: 'Nadia Permatasari, S.E.',
    nip: '19920418 201903 2 012',
    position: 'PIC Sub Bag Perencanaan & Keuangan',
    unitId: 'unit-1',
    roleId: 'OPERATOR_SEKSI',
    email: 'pic.perenkeu@gedangan.go.id',
    phone: '0812-3001-5511',
    status: 'Aktif',
  },
  {
    id: 'user-pic-2',
    username: 'pic.umpeg',
    password: 'PicUnit2',
    name: 'Hendra Wijaya, S.Sos.',
    nip: '19880621 201403 1 005',
    position: 'PIC Sub Bag Umum & Kepegawaian',
    unitId: 'unit-2',
    roleId: 'OPERATOR_SEKSI',
    email: 'pic.umpeg@gedangan.go.id',
    phone: '0812-3300-9911',
    status: 'Aktif',
  },
  {
    id: 'user-op-pemb',
    username: 'pic.pembangunan',
    password: 'PicUnit3',
    name: 'Rizky Pratama, S.T.',
    nip: '19910514 201903 1 009',
    position: 'PIC Seksi Pembangunan',
    unitId: 'unit-3',
    roleId: 'OPERATOR_SEKSI',
    email: 'pembangunan.gedangan@sidoarjokab.go.id',
    phone: '0813-3450-8812',
    status: 'Aktif',
  },
  {
    id: 'user-op-pem',
    username: 'pic.pemerintahan',
    password: 'PicUnit4',
    name: 'Bagus Saputra, S.AP.',
    nip: '19891103 201504 1 003',
    position: 'PIC Seksi Pemerintahan',
    unitId: 'unit-4',
    roleId: 'OPERATOR_SEKSI',
    email: 'pemerintahan.gedangan@sidoarjokab.go.id',
    phone: '0812-1778-9023',
    status: 'Aktif',
  },
  {
    id: 'user-pic-5',
    username: 'pic.trantibum',
    password: 'PicUnit5',
    name: 'Arif Budiman, S.H.',
    nip: '19870315 201212 1 002',
    position: 'PIC Seksi Ketentraman & Ketertiban Umum',
    unitId: 'unit-5',
    roleId: 'OPERATOR_SEKSI',
    email: 'pic.trantibum@gedangan.go.id',
    phone: '0813-9901-4421',
    status: 'Aktif',
  },
  {
    id: 'user-pic-6',
    username: 'pic.perekonomian',
    password: 'PicUnit6',
    name: 'Dina Rahmawati, S.E.',
    nip: '19940809 202012 2 015',
    position: 'PIC Seksi Perekonomian',
    unitId: 'unit-6',
    roleId: 'OPERATOR_SEKSI',
    email: 'pic.perekonomian@gedangan.go.id',
    phone: '0812-8871-3109',
    status: 'Aktif',
  },
  {
    id: 'user-op-kesos',
    username: 'pic.kesos',
    password: 'PicUnit7',
    name: 'Dewi Lestari, S.Sos.',
    nip: '19930227 202012 2 011',
    position: 'PIC Seksi Kesejahteraan Sosial (Kesos)',
    unitId: 'unit-7',
    roleId: 'OPERATOR_SEKSI',
    email: 'kesos.gedangan@sidoarjokab.go.id',
    phone: '0815-5210-7741',
    status: 'Aktif',
  },
];

export const SEED_ACTIVITY_TYPES: ActivityType[] = [
  {
    id: 'type-rapat',
    name: 'Rapat Koordinasi / Musrenbang',
    description: 'Rapat lintas desa, musyawarah perencanaan pembangunan, dan koordinasi forkopimka.',
    defaultSpjDeadlineDays: 7,
  },
  {
    id: 'type-sosialisasi',
    name: 'Sosialisasi & Pembinaan Masyarakat',
    description: 'Kegiatan penyuluhan, bimbingan teknis perangkat desa, kader posyandu, atau pelaku UMKM.',
    defaultSpjDeadlineDays: 7,
  },
  {
    id: 'type-monev',
    name: 'Monitoring & Pengawasan Lapangan',
    description: 'Peninjauan fisik pembangunan desa, operasi ketertiban umum, dan inspeksi lapangan.',
    defaultSpjDeadlineDays: 7,
  },
  {
    id: 'type-bansos',
    name: 'Penyaluran Bantuan & Layanan Publik',
    description: 'Penyaluran bantuan sosial, pelayanan administrasi terpadu kecamatan (PATEN), dan bakti sosial.',
    defaultSpjDeadlineDays: 7,
  },
];

export const SEED_CHECKLIST_MASTERS: SpjChecklistMaster[] = [
  {
    id: 'chk-std-1',
    activityTypeId: 'default',
    docName: 'KAK / Proposal Kegiatan',
    isMandatory: true,
    description: 'Kerangka Acuan Kerja dan Rencana Anggaran Biaya yang ditandatangani Kepala Seksi.',
  },
  {
    id: 'chk-std-2',
    activityTypeId: 'default',
    docName: 'Surat Undangan Resmi',
    isMandatory: true,
    description: 'Undangan bernomor surat dinas Kecamatan Gedangan beserta daftar distribusi.',
  },
  {
    id: 'chk-std-3',
    activityTypeId: 'default',
    docName: 'Daftar Hadir Peserta',
    isMandatory: true,
    description: 'Presensi tanda tangan basah peserta, narasumber, dan panitia pelaksana.',
  },
  {
    id: 'chk-std-4',
    activityTypeId: 'default',
    docName: 'Notulen / Laporan Hasil Kegiatan',
    isMandatory: true,
    description: 'Ringkasan jalannya kegiatan, kesimpulan, dan tindak lanjut.',
  },
  {
    id: 'chk-std-5',
    activityTypeId: 'default',
    docName: 'Kuitansi & Nota Belanja Sah',
    isMandatory: true,
    description: 'Bukti pengeluaran konsumsi/ATK/honorarium bermeterai & berstempel toko.',
  },
  {
    id: 'chk-std-6',
    activityTypeId: 'default',
    docName: 'Dokumentasi Foto Kegiatan',
    isMandatory: true,
    description: 'Minimal 3 foto pelaksanaan ber-timestamp dan terlihat spanduk/peserta.',
  },
];

export const SEED_ACTIVITIES: Activity[] = [
  {
    id: 'act-01',
    code: 'KEG-2026-1101',
    unitId: 'unit-4',
    creatorId: 'user-op-pem',
    title: 'Rapat Koordinasi Administrasi Pemerintahan Desa se-Gedangan',
    activityTypeId: 'type-rapat',
    date: '2026-11-02',
    startTime: '09:00',
    endTime: '12:00',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 45,
    budgetEstimate: 4250000,
    picName: 'PIC Seksi Pemerintahan',
    picPhone: '0812-1778-9023',
    status: 'Disetujui',
    createdAt: '2026-10-26T08:30:00Z',
  },
  {
    id: 'act-02',
    code: 'KEG-2026-1102',
    unitId: 'unit-2',
    creatorId: 'user-admin',
    title: 'Bimbingan Teknis Tata Naskah Dinas & Arsip Digital',
    activityTypeId: 'type-sosialisasi',
    date: '2026-11-03',
    startTime: '08:30',
    endTime: '12:30',
    location: 'Ruang Rapat Sekcam',
    estimatedParticipants: 28,
    budgetEstimate: 3100000,
    picName: 'PIC Sub Bag Umum & Kepegawaian',
    picPhone: '0812-3300-9911',
    status: 'Disetujui',
    createdAt: '2026-10-27T09:15:00Z',
  },
  {
    id: 'act-03',
    code: 'KEG-2026-1103',
    unitId: 'unit-3',
    creatorId: 'user-op-pemb',
    title: 'Monitoring Fisik Drainase & Jalan Lingkungan Desa Ketajen',
    activityTypeId: 'type-monev',
    date: '2026-11-04',
    startTime: '09:00',
    endTime: '14:00',
    location: 'Desa Ketajen & Desa Keboansikep',
    estimatedParticipants: 16,
    budgetEstimate: 2650000,
    picName: 'PIC Seksi Pembangunan',
    picPhone: '0813-3450-8812',
    status: 'Disetujui',
    createdAt: '2026-10-28T10:00:00Z',
  },
  {
    id: 'act-04',
    code: 'KEG-2026-1104',
    unitId: 'unit-5',
    creatorId: 'user-op-pem',
    title: 'Patroli Gabungan Penertiban PKL & Reklame Jalan Protokol',
    activityTypeId: 'type-monev',
    date: '2026-11-04',
    startTime: '13:00',
    endTime: '16:30',
    location: 'Koridor Jl. Raya Gedangan - Aloha',
    estimatedParticipants: 22,
    budgetEstimate: 3500000,
    picName: 'PIC Seksi Trantibum',
    picPhone: '0813-9901-4421',
    status: 'Disetujui',
    createdAt: '2026-10-29T11:20:00Z',
  },
  {
    id: 'act-05',
    code: 'KEG-2026-1105',
    unitId: 'unit-7',
    creatorId: 'user-op-kesos',
    title: 'Verifikasi & Penyaluran Bantuan KPM Lansia Terlantar',
    activityTypeId: 'type-bansos',
    date: '2026-11-06',
    startTime: '08:30',
    endTime: '13:00',
    location: 'Pendopo Kecamatan Gedangan',
    estimatedParticipants: 85,
    budgetEstimate: 6800000,
    picName: 'PIC Seksi Kesos',
    picPhone: '0815-5210-7741',
    status: 'Disetujui',
    createdAt: '2026-10-30T14:00:00Z',
  },
  {
    id: 'act-06',
    code: 'KEG-2026-1106',
    unitId: 'unit-1',
    creatorId: 'user-verif',
    title: 'Asistensi Penyusunan RKA Perubahan & Evaluasi Serapan TW IV',
    activityTypeId: 'type-rapat',
    date: '2026-11-09',
    startTime: '09:00',
    endTime: '13:00',
    location: 'Ruang Rapat Sekcam',
    estimatedParticipants: 20,
    budgetEstimate: 2900000,
    picName: 'PIC Sub Bag Perencanaan & Keuangan',
    picPhone: '0812-3001-2204',
    status: 'Disetujui',
    createdAt: '2026-11-02T08:00:00Z',
  },
  {
    id: 'act-07',
    code: 'KEG-2026-1107',
    unitId: 'unit-6',
    creatorId: 'user-op-kesos',
    title: 'Pendampingan Sertifikasi Halal Gratis Pelaku UMKM Gedangan',
    activityTypeId: 'type-sosialisasi',
    date: '2026-11-09',
    startTime: '09:00',
    endTime: '13:00',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 60,
    budgetEstimate: 5400000,
    picName: 'PIC Seksi Perekonomian',
    picPhone: '0812-8871-3109',
    status: 'Disetujui',
    createdAt: '2026-11-02T13:10:00Z',
  },
  {
    id: 'act-08',
    code: 'KEG-2026-1108',
    unitId: 'unit-3',
    creatorId: 'user-op-pemb',
    title: 'Rapat Persiapan Pra-Musrenbang Kecamatan Tahun 2027',
    activityTypeId: 'type-rapat',
    date: '2026-11-11',
    startTime: '09:30',
    endTime: '12:30',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 50,
    budgetEstimate: 4800000,
    picName: 'PIC Seksi Pembangunan',
    picPhone: '0813-3450-8812',
    status: 'Disetujui',
    createdAt: '2026-11-04T09:40:00Z',
  },
  {
    id: 'act-09',
    code: 'KEG-2026-1109',
    unitId: 'unit-7',
    creatorId: 'user-op-kesos',
    title: 'Rapat Koordinasi Penurunan Stunting & Kader Posyandu',
    activityTypeId: 'type-sosialisasi',
    date: '2026-11-13',
    startTime: '08:30',
    endTime: '12:00',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 55,
    budgetEstimate: 4950000,
    picName: 'PIC Seksi Kesos',
    picPhone: '0815-5210-7741',
    status: 'Disetujui',
    createdAt: '2026-11-06T10:15:00Z',
  },
  {
    id: 'act-10',
    code: 'KEG-2026-1110',
    unitId: 'unit-4',
    creatorId: 'user-op-pem',
    title: 'Pembinaan Perangkat Desa Bidang Pengelolaan Aset & Tanah Kas Desa',
    activityTypeId: 'type-sosialisasi',
    date: '2026-11-18',
    startTime: '09:00',
    endTime: '12:30',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 42,
    budgetEstimate: 4100000,
    picName: 'PIC Seksi Pemerintahan',
    picPhone: '0812-1778-9023',
    status: 'Disetujui',
    createdAt: '2026-11-11T08:50:00Z',
  },
  {
    id: 'act-11',
    code: 'KEG-2026-1111',
    unitId: 'unit-5',
    creatorId: 'user-op-pem',
    title: 'Rapat Kesiapsiagaan Bencana Musim Penghujan Forkopimka',
    activityTypeId: 'type-rapat',
    date: '2026-11-19',
    startTime: '10:00',
    endTime: '13:00',
    location: 'Aula Kecamatan Gedangan',
    estimatedParticipants: 38,
    budgetEstimate: 3850000,
    picName: 'PIC Seksi Trantibum',
    picPhone: '0813-9901-4421',
    status: 'Verifikasi Keuangan',
    createdAt: '2026-11-14T11:00:00Z',
  },
  {
    id: 'act-12',
    code: 'KEG-2026-1112',
    unitId: 'unit-6',
    creatorId: 'user-op-kesos',
    title: 'Bazar Pangan Murah & Gelar Produk Unggulan Desa',
    activityTypeId: 'type-bansos',
    date: '2026-11-24',
    startTime: '07:30',
    endTime: '13:00',
    location: 'Halaman Kantor Kecamatan Gedangan',
    estimatedParticipants: 180,
    budgetEstimate: 9500000,
    picName: 'PIC Seksi Perekonomian',
    picPhone: '0812-8871-3109',
    status: 'Diajukan',
    createdAt: '2026-11-15T15:20:00Z',
  },
  {
    id: 'act-13',
    code: 'KEG-2026-1113',
    unitId: 'unit-3',
    creatorId: 'user-op-pemb',
    title: 'Evaluasi Realisasi Dana Desa Tahap III Tahun Anggaran 2026',
    activityTypeId: 'type-rapat',
    date: '2026-11-26',
    startTime: '09:00',
    endTime: '12:00',
    location: 'Ruang Rapat Sekcam',
    estimatedParticipants: 30,
    budgetEstimate: 3200000,
    picName: 'PIC Seksi Pembangunan',
    picPhone: '0813-3450-8812',
    status: 'Draft',
    createdAt: '2026-11-16T09:00:00Z',
  },
];

export const SEED_APPROVALS: ActivityApproval[] = [
  {
    id: 'apr-1',
    activityId: 'act-01',
    approverId: 'user-verif',
    approverName: 'Dra. Ratna Kusumawati, M.Si.',
    stage: 'Verifikasi Perencanaan & Keuangan',
    action: 'Disetujui',
    note: 'Pagu anggaran belanja makan/minum sesuai DPA.',
    timestamp: '2026-10-27T10:15:00Z',
  },
  {
    id: 'apr-2',
    activityId: 'act-01',
    approverId: 'user-camat',
    approverName: 'Drs. H. Santoso Prabowo, M.Si.',
    stage: 'Persetujuan Pimpinan',
    action: 'Disetujui',
    note: 'Disetujui, pastikan seluruh Sekdes hadir tepat waktu.',
    timestamp: '2026-10-28T08:40:00Z',
  },
  {
    id: 'apr-3',
    activityId: 'act-11',
    approverId: 'user-op-pem',
    approverName: 'Bagus Saputra, S.AP.',
    stage: 'Pengajuan Seksi',
    action: 'Diajukan',
    note: 'Mohon prioritas persetujuan mengingat prakiraan cuaca ekstrem.',
    timestamp: '2026-11-14T11:05:00Z',
  },
  {
    id: 'apr-4',
    activityId: 'act-12',
    approverId: 'user-op-kesos',
    approverName: 'Dewi Lestari, S.Sos.',
    stage: 'Pengajuan Seksi',
    action: 'Diajukan',
    note: 'Pengajuan kegiatan bazar pangan murah akhir November.',
    timestamp: '2026-11-15T15:25:00Z',
  },
];

function buildInitialSpjData() {
  const submissions: SpjSubmission[] = [];
  const documents: SpjDocument[] = [];

  const approvedActivities = SEED_ACTIVITIES.filter((a) => a.status === 'Disetujui');

  approvedActivities.forEach((act) => {
    const subId = `spj-${act.id}`;
    const dueDate = addWorkingDays(act.date, 7);

    let overallStatus: SpjSubmission['overallStatus'] = 'Pending';
    let submittedAt: string | null = null;
    let verifiedAt: string | null = null;
    let verifierId: string | null = null;
    let revisionCount = 0;

    if (['act-01', 'act-02', 'act-04', 'act-06'].includes(act.id)) {
      overallStatus = 'Complete';
      submittedAt = `${addWorkingDays(act.date, 2)}T14:00:00Z`;
      verifiedAt = `${addWorkingDays(act.date, 3)}T11:30:00Z`;
      verifierId = 'user-verif';
    } else if (act.id === 'act-03') {
      // Selesai 4 Nov, H+7 jatuh 13 Nov -> Overdue per 16 Nov! Status Revision > 2x
      overallStatus = 'Revision';
      submittedAt = '2026-11-08T10:20:00Z';
      verifierId = 'user-verif';
      revisionCount = 2;
    } else if (act.id === 'act-05') {
      // Selesai 6 Nov, H+7 jatuh 17 Nov -> Belum upload (Overdue/Warning)
      overallStatus = 'Pending';
    } else if (act.id === 'act-07') {
      // Selesai 9 Nov -> Submitted menunggu verifikasi
      overallStatus = 'Submitted';
      submittedAt = '2026-11-13T15:10:00Z';
    } else if (act.id === 'act-08') {
      // Selesai 11 Nov -> Perlu Revisi
      overallStatus = 'Revision';
      submittedAt = '2026-11-14T09:00:00Z';
      verifierId = 'user-verif';
      revisionCount = 1;
    } else if (act.id === 'act-09') {
      // Selesai 13 Nov -> Submitted menunggu verifikasi
      overallStatus = 'Submitted';
      submittedAt = '2026-11-16T08:45:00Z';
    } else {
      overallStatus = 'Pending';
    }

    submissions.push({
      id: subId,
      activityId: act.id,
      dueDate,
      submittedAt,
      verifiedAt,
      verifierId,
      overallStatus,
      revisionCount,
      generalNote:
        overallStatus === 'Revision'
          ? 'Mohon lengkapi catatan perbaikan pada item yang ditandai merah/oranye.'
          : undefined,
    });

    const checklistItems = SEED_CHECKLIST_MASTERS;

    checklistItems.forEach((chk, idx) => {
      let itemStatus: SpjDocument['itemStatus'] = 'Belum Unggah';
      let fileName: string | null = null;
      let fileSizeKb: number | null = null;
      let fileType: string | null = null;
      let uploadedBy: string | null = null;
      let uploadedAt: string | null = null;
      let verifierNote = '';

      if (overallStatus === 'Complete') {
        itemStatus = 'Sesuai';
        fileName = `${act.code}_${chk.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
        fileSizeKb = 420 + idx * 115;
        fileType = idx === 5 ? 'image/jpeg' : 'application/pdf';
        uploadedBy = act.picName;
        uploadedAt = submittedAt;
      } else if (overallStatus === 'Submitted') {
        itemStatus = 'Menunggu Cek';
        fileName = `${act.code}_${chk.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${idx === 5 ? 'jpg' : 'pdf'}`;
        fileSizeKb = 380 + idx * 95;
        fileType = idx === 5 ? 'image/jpeg' : 'application/pdf';
        uploadedBy = act.picName;
        uploadedAt = submittedAt;
      } else if (overallStatus === 'Revision') {
        if (idx === 2 || idx === 4) {
          itemStatus = 'Perlu Revisi';
          fileName = `${act.code}_${chk.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
          fileSizeKb = 310 + idx * 60;
          fileType = 'application/pdf';
          uploadedBy = act.picName;
          uploadedAt = submittedAt;
          verifierNote =
            idx === 2
              ? 'Daftar hadir halaman 2 belum ditandatangani oleh Kepala Desa/perwakilan.'
              : 'Nota belanja konsumsi belum mencantumkan stempel penyedia & meterai Rp10.000.';
        } else {
          itemStatus = 'Sesuai';
          fileName = `${act.code}_${chk.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${idx === 5 ? 'jpg' : 'pdf'}`;
          fileSizeKb = 510 + idx * 70;
          fileType = idx === 5 ? 'image/jpeg' : 'application/pdf';
          uploadedBy = act.picName;
          uploadedAt = submittedAt;
        }
      } else if (act.id === 'act-05' && idx < 2) {
        // Baru unggah sebagian
        itemStatus = 'Menunggu Cek';
        fileName = `${act.code}_${chk.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
        fileSizeKb = 490;
        fileType = 'application/pdf';
        uploadedBy = act.picName;
        uploadedAt = '2026-11-11T10:00:00Z';
      }

      documents.push({
        id: `doc-${subId}-${idx + 1}`,
        spjSubmissionId: subId,
        checklistMasterId: chk.id,
        docName: chk.docName,
        isMandatory: chk.isMandatory,
        fileName,
        fileSizeKb,
        fileType,
        filePreviewUrl: null,
        uploadedBy,
        uploadedAt,
        itemStatus,
        verifierNote,
      });
    });
  });

  return { submissions, documents };
}

const initialSpj = buildInitialSpjData();

export const SEED_SPJ_SUBMISSIONS: SpjSubmission[] = initialSpj.submissions;
export const SEED_SPJ_DOCUMENTS: SpjDocument[] = initialSpj.documents;

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'user-verif',
    activityId: 'act-03',
    type: 'Overdue H+7',
    title: 'SPJ Melewati Tenggat H+7',
    message: 'Monitoring Fisik Drainase (Seksi Pembangunan) melewati batas waktu 13 Nov 2026 dengan status Revisi.',
    isRead: false,
    sentAt: '2026-11-16T08:00:00Z',
  },
  {
    id: 'notif-2',
    userId: 'user-op-kesos',
    activityId: 'act-05',
    type: 'Tenggat H+5',
    title: 'Pengingat Batas Waktu SPJ',
    message: 'Verifikasi & Penyaluran Bantuan KPM Lansia (Seksi Kesos) baru terunggah 2 dari 6 berkas wajib.',
    isRead: false,
    sentAt: '2026-11-16T08:15:00Z',
  },
  {
    id: 'notif-3',
    userId: 'user-op-pemb',
    activityId: 'act-08',
    type: 'Revisi SPJ',
    title: 'Catatan Revisi dari Perencanaan & Keuangan',
    message: 'Rapat Persiapan Pra-Musrenbang memiliki 2 item berkas yang perlu diperbaiki (Daftar Hadir & Kuitansi).',
    isRead: false,
    sentAt: '2026-11-15T14:20:00Z',
  },
  {
    id: 'notif-4',
    userId: 'user-camat',
    activityId: 'act-11',
    type: 'Approval',
    title: 'Menunggu Persetujuan Jadwal',
    message: 'Seksi Trantibum mengajukan Rapat Kesiapsiagaan Bencana untuk tanggal 19 Nov 2026.',
    isRead: true,
    sentAt: '2026-11-14T11:30:00Z',
  },
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-verif',
    userName: 'Dra. Ratna Kusumawati, M.Si.',
    userRole: 'Verifikator Keuangan',
    action: 'VERIFY_SPJ_COMPLETE',
    entity: 'spj_submissions',
    entityId: 'spj-act-06',
    details: 'Mengesahkan kelengkapan SPJ Asistensi Penyusunan RKA Perubahan (6/6 item sah).',
    timestamp: '2026-11-12T11:30:00Z',
  },
  {
    id: 'log-2',
    userId: 'user-verif',
    userName: 'Dra. Ratna Kusumawati, M.Si.',
    userRole: 'Verifikator Keuangan',
    action: 'MARK_SPJ_REVISION',
    entity: 'spj_documents',
    entityId: 'spj-act-08',
    details: 'Menandai item Daftar Hadir & Kuitansi pada KEG-2026-1108 sebagai Perlu Revisi.',
    timestamp: '2026-11-15T14:20:00Z',
  },
  {
    id: 'log-3',
    userId: 'user-op-kesos',
    userName: 'Dewi Lestari, S.Sos.',
    userRole: 'Operator Seksi',
    action: 'SUBMIT_ACTIVITY',
    entity: 'activities',
    entityId: 'act-12',
    details: 'Mengajukan kegiatan Bazar Pangan Murah & Gelar Produk Unggulan Desa (24 Nov 2026).',
    timestamp: '2026-11-15T15:25:00Z',
  },
  {
    id: 'log-4',
    userId: 'user-op-kesos',
    userName: 'Dewi Lestari, S.Sos.',
    userRole: 'Operator Seksi',
    action: 'UPLOAD_SPJ_BUNDLE',
    entity: 'spj_submissions',
    entityId: 'spj-act-09',
    details: 'Mengunggah 6 berkas digital SPJ Rapat Koordinasi Penurunan Stunting untuk diverifikasi.',
    timestamp: '2026-11-16T08:45:00Z',
  },
];
