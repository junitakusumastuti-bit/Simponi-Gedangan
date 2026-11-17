import {
  Activity,
  SpjDocument,
  SpjSubmission,
  Unit,
} from '../types/database';

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD.
 * Menggunakan tanggal sistem lokal agar selaras dengan waktu berjalan.
 */
export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateID(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  const clean = isoDate.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Menghitung tanggal tenggat SPJ otomatis (default H+7 hari kerja,
 * melewati Sabtu & Minggu sesuai aturan jam kerja instansi pemerintah).
 */
export function addWorkingDays(startDateStr: string, workingDays: number = 7): string {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  let added = 0;
  while (added < workingDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  const resY = date.getFullYear();
  const resM = String(date.getMonth() + 1).padStart(2, '0');
  const resD = String(date.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * Menghitung jumlah hari kerja antara dua tanggal (positif jika toDate > fromDate).
 */
export function countWorkingDaysBetween(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = toDateStr.slice(0, 10).split('-').map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  if (start.getTime() === end.getTime()) return 0;

  const forward = end > start;
  const cursor = new Date(start);
  let count = 0;
  while (forward ? cursor < end : cursor > end) {
    cursor.setDate(cursor.getDate() + (forward ? 1 : -1));
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += forward ? 1 : -1;
    }
  }
  return count;
}

export interface SpjDeadlineInfo {
  elapsedWorkingDaysFromActivity: number;
  remainingWorkingDaysToDue: number;
  isOverdue: boolean;
  isApproachingH5: boolean;
  urgencyLevel: 'complete' | 'upcoming' | 'normal' | 'warning_h5' | 'overdue';
  label: string;
}

/**
 * Mengevaluasi status keterlambatan dan peringatan dini SPJ (H+5 Warning, H+7 Overdue).
 */
export function evaluateSpjDeadline(
  activityDate: string,
  submission: SpjSubmission,
  referenceDateStr: string = getTodayISO()
): SpjDeadlineInfo {
  if (submission.overallStatus === 'Complete') {
    const completionDays = submission.verifiedAt
      ? Math.max(0, countWorkingDaysBetween(activityDate, submission.verifiedAt.slice(0, 10)))
      : 0;
    return {
      elapsedWorkingDaysFromActivity: completionDays,
      remainingWorkingDaysToDue: 0,
      isOverdue: false,
      isApproachingH5: false,
      urgencyLevel: 'complete',
      label: `Tuntas (${completionDays} hari kerja)`,
    };
  }

  if (referenceDateStr < activityDate) {
    return {
      elapsedWorkingDaysFromActivity: 0,
      remainingWorkingDaysToDue: countWorkingDaysBetween(referenceDateStr, submission.dueDate),
      isOverdue: false,
      isApproachingH5: false,
      urgencyLevel: 'upcoming',
      label: `Menunggu pelaksanaan`,
    };
  }

  const elapsed = countWorkingDaysBetween(activityDate, referenceDateStr);
  const remaining = countWorkingDaysBetween(referenceDateStr, submission.dueDate);

  if (remaining < 0) {
    return {
      elapsedWorkingDaysFromActivity: elapsed,
      remainingWorkingDaysToDue: remaining,
      isOverdue: true,
      isApproachingH5: false,
      urgencyLevel: 'overdue',
      label: `Terlambat ${Math.abs(remaining)} hari kerja`,
    };
  }

  if (elapsed >= 5 && submission.overallStatus === 'Pending') {
    return {
      elapsedWorkingDaysFromActivity: elapsed,
      remainingWorkingDaysToDue: remaining,
      isOverdue: false,
      isApproachingH5: true,
      urgencyLevel: 'warning_h5',
      label: `Peringatan H+${elapsed} (Sisa ${remaining} hr kerja)`,
    };
  }

  return {
    elapsedWorkingDaysFromActivity: elapsed,
    remainingWorkingDaysToDue: remaining,
    isOverdue: false,
    isApproachingH5: false,
    urgencyLevel: 'normal',
    label: remaining === 0 ? 'Jatuh tempo hari ini' : `Sisa ${remaining} hari kerja`,
  };
}

export interface ConflictCheckResult {
  hasLocationConflict: boolean;
  locationConflicts: Activity[];
  sameDayActivities: Activity[];
  densityWarning: boolean;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function normalizeLocation(loc: string): string {
  return loc.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Validasi otomatis deteksi bentrok jadwal antar-7 unit kerja:
 * 1. Bentrok keras (blocking/peringatan utama): Tanggal sama + irisan jam + lokasi sama.
 * 2. Kepadatan jadwal: Terdapat >= 2 kegiatan lain di Kecamatan pada tanggal yang sama.
 */
export function checkScheduleConflict(
  candidate: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  },
  existingActivities: Activity[]
): ConflictCheckResult {
  if (!candidate.date || !candidate.startTime || !candidate.endTime) {
    return {
      hasLocationConflict: false,
      locationConflicts: [],
      sameDayActivities: [],
      densityWarning: false,
    };
  }

  const candStart = toMinutes(candidate.startTime);
  const candEnd = toMinutes(candidate.endTime);
  const candLoc = normalizeLocation(candidate.location || '');

  const activeOnDate = existingActivities.filter(
    (act) =>
      act.id !== candidate.id &&
      act.date === candidate.date &&
      act.status !== 'Ditolak'
  );

  const locationConflicts = activeOnDate.filter((act) => {
    const actStart = toMinutes(act.startTime);
    const actEnd = toMinutes(act.endTime);
    const timeOverlaps = candStart < actEnd && candEnd > actStart;
    if (!timeOverlaps) return false;
    if (!candLoc) return false;
    const actLoc = normalizeLocation(act.location);
    return actLoc === candLoc || (actLoc.includes('aula') && candLoc.includes('aula'));
  });

  return {
    hasLocationConflict: locationConflicts.length > 0,
    locationConflicts,
    sameDayActivities: activeOnDate,
    densityWarning: activeOnDate.length >= 2,
  };
}

export interface UnitComplianceMetric {
  unit: Unit;
  totalActivities: number;
  approvedActivities: number;
  completedSpj: number;
  pendingSpj: number;
  submittedSpj: number;
  revisionSpj: number;
  overdueSpj: number;
  complianceRate: number; // 0-100
  avgSlaDays: number | null;
  totalBudget: number;
}

export function computeUnitMetrics(
  units: Unit[],
  activities: Activity[],
  submissions: SpjSubmission[],
  referenceDateStr: string = getTodayISO()
): UnitComplianceMetric[] {
  const submissionByActivity = new Map<string, SpjSubmission>();
  submissions.forEach((s) => submissionByActivity.set(s.activityId, s));

  return units.map((unit) => {
    const unitActs = activities.filter((a) => a.unitId === unit.id);
    const approvedActs = unitActs.filter((a) => a.status === 'Disetujui');

    let completedSpj = 0;
    let pendingSpj = 0;
    let submittedSpj = 0;
    let revisionSpj = 0;
    let overdueSpj = 0;
    const slaDaysList: number[] = [];

    // Kegiatan yang sudah masuk siklus SPJ (memiliki record submission)
    let spjObligatedCount = 0;

    approvedActs.forEach((act) => {
      const sub = submissionByActivity.get(act.id);
      if (!sub) return;
      // Hanya hitung sebagai kewajiban SPJ aktif jika tanggal kegiatan <= hari ini atau berkas sudah berproses
      const isDueCycle = act.date <= referenceDateStr || sub.overallStatus !== 'Pending';
      if (!isDueCycle) return;

      spjObligatedCount++;
      const deadline = evaluateSpjDeadline(act.date, sub, referenceDateStr);

      if (sub.overallStatus === 'Complete') {
        completedSpj++;
        if (sub.verifiedAt) {
          slaDaysList.push(
            Math.max(1, countWorkingDaysBetween(act.date, sub.verifiedAt.slice(0, 10)))
          );
        }
      } else {
        if (sub.overallStatus === 'Pending') pendingSpj++;
        if (sub.overallStatus === 'Submitted') submittedSpj++;
        if (sub.overallStatus === 'Revision') revisionSpj++;
        if (deadline.isOverdue) overdueSpj++;
      }
    });

    const complianceRate =
      spjObligatedCount > 0
        ? Math.round((completedSpj / spjObligatedCount) * 100)
        : 100;

    const avgSlaDays =
      slaDaysList.length > 0
        ? Number(
            (slaDaysList.reduce((acc, v) => acc + v, 0) / slaDaysList.length).toFixed(1)
          )
        : null;

    const totalBudget = approvedActs.reduce((acc, a) => acc + a.budgetEstimate, 0);

    return {
      unit,
      totalActivities: unitActs.length,
      approvedActivities: approvedActs.length,
      completedSpj,
      pendingSpj,
      submittedSpj,
      revisionSpj,
      overdueSpj,
      complianceRate,
      avgSlaDays,
      totalBudget,
    };
  });
}

export interface OperationalInsight {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

export function generateOperationalInsights(
  units: Unit[],
  activities: Activity[],
  submissions: SpjSubmission[],
  documents: SpjDocument[],
  referenceDateStr: string = getTodayISO()
): OperationalInsight[] {
  const insights: OperationalInsight[] = [];
  const metrics = computeUnitMetrics(units, activities, submissions, referenceDateStr);
  const actMap = new Map(activities.map((a) => [a.id, a]));
  const unitMap = new Map(units.map((u) => [u.id, u]));

  // 1. Deteksi Overdue (> H+7)
  const overdueSubs = submissions.filter((s) => {
    const act = actMap.get(s.activityId);
    if (!act) return false;
    return evaluateSpjDeadline(act.date, s, referenceDateStr).isOverdue;
  });

  if (overdueSubs.length > 0) {
    const firstAct = actMap.get(overdueSubs[0].activityId);
    const firstUnit = firstAct ? unitMap.get(firstAct.unitId) : undefined;
    insights.push({
      id: 'ins-overdue',
      severity: 'critical',
      category: 'Keterlambatan H+7',
      title: `${overdueSubs.length} berkas SPJ melewati batas waktu H+7 hari kerja`,
      description: `Terdapat tunggakan SPJ melewati tenggat, termasuk "${firstAct?.title ?? '-'}" (${firstUnit?.shortName ?? '-'}).`,
      recommendation:
        'Terbitkan surat teguran administratif dan jadwalkan pendampingan pengumpulan nota/kuitansi oleh staf Perencanaan & Keuangan.',
    });
  }

  // 2. Deteksi Peringatan H+5 Belum Upload
  const h5Subs = submissions.filter((s) => {
    const act = actMap.get(s.activityId);
    if (!act) return false;
    return evaluateSpjDeadline(act.date, s, referenceDateStr).isApproachingH5;
  });

  if (h5Subs.length > 0) {
    insights.push({
      id: 'ins-h5',
      severity: 'warning',
      category: 'Peringatan Dini H+5',
      title: `${h5Subs.length} kegiatan selesai > H+5 belum mengunggah berkas SPJ`,
      description:
        'Berkas berisiko menjadi overdue dalam 2 hari kerja apabila PIC seksi tidak segera mengunggah kelengkapan awal.',
      recommendation:
        'Kirim pengingat prioritas ke PIC pelaksana dan Kepala Seksi terkait sebelum jatuh tempo H+7.',
    });
  }

  // 3. Deteksi Revisi Berulang (> 2 kali)
  const highRevSubs = submissions.filter((s) => s.revisionCount >= 2 && s.overallStatus !== 'Complete');
  if (highRevSubs.length > 0) {
    const act = actMap.get(highRevSubs[0].activityId);
    const unit = act ? unitMap.get(act.unitId) : undefined;
    insights.push({
      id: 'ins-rev',
      severity: 'warning',
      category: 'Revisi Berulang',
      title: `${highRevSubs.length} SPJ mengalami revisi berulang (≥ 2 kali)`,
      description: `Kegiatan "${act?.title ?? '-'}" pada ${unit?.shortName ?? '-'} membutuhkan klarifikasi kelengkapan dokumen.`,
      recommendation:
        'Lakukan verifikasi tatap muka singkat bersama verifikator Sub Bagian Perencanaan & Keuangan agar tidak terjadi pengembalian berulang.',
    });
  }

  // 4. Unit dengan SLA tercepat / kepatuhan 100%
  const topUnits = metrics
    .filter((m) => m.completedSpj > 0 && m.complianceRate >= 80)
    .sort((a, b) => (a.avgSlaDays ?? 99) - (b.avgSlaDays ?? 99));

  if (topUnits.length > 0) {
    const best = topUnits[0];
    insights.push({
      id: 'ins-top',
      severity: 'positive',
      category: 'Kinerja Unit Terbaik',
      title: `${best.unit.shortName} mencatat kepatuhan ${best.complianceRate}%`,
      description: best.avgSlaDays
        ? `Rata-rata penyelesaian SPJ pasca-kegiatan tercatat ${best.avgSlaDays} hari kerja.`
        : `Seluruh kewajiban pelaporan SPJ berjalan tepat waktu.`,
      recommendation:
        'Pertahankan standar dokumentasi lapangan (daftar hadir & foto) sebagai acuan praktik baik bagi unit kerja lain.',
    });
  }

  // 5. Analisis dokumen paling sering direvisi
  const revDocs = documents.filter((d) => d.itemStatus === 'Perlu Revisi');
  if (revDocs.length > 0) {
    const counts: Record<string, number> = {};
    revDocs.forEach((d) => {
      counts[d.docName] = (counts[d.docName] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      insights.push({
        id: 'ins-doc-pattern',
        severity: 'info',
        category: 'Pola Kendala Dokumen',
        title: `Item "${sorted[0][0]}" paling sering memerlukan revisi (${sorted[0][1]} temuan)`,
        description:
          'Ketidaklengkapan bukti transaksi, meterai, atau tanda tangan peserta menjadi penyebab utama pengembalian berkas.',
        recommendation:
          'Bagikan panduan pengisian standar checklist item ini saat rapat koordinasi awal bulan kecamatan.',
      });
    }
  }

  return insights;
}

/**
 * Ekspor array objek ke file CSV dengan UTF-8 BOM agar langsung terbuka rapi di Excel.
 */
export function exportToExcelCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
