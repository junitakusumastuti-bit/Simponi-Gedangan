import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileWarning,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  Activity,
  NavSection,
  SpjSubmission,
  Unit,
  User,
} from '../types/database';
import {
  computeUnitMetrics,
  evaluateSpjDeadline,
  formatCurrencyIDR,
  formatDateID,
  getTodayISO,
} from '../utils/spjLogic';
import { ActivityStatusText, SpjStatusText } from './StatusIndicator';

interface DashboardViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
  currentUser: User;
  onNavigate: (nav: NavSection) => void;
  onOpenSpjDetail: (activityId: string) => void;
  onOpenActivityQueue: () => void;
  onAdvanceApproval: (
    activityId: string,
    action: 'Diajukan' | 'Disetujui' | 'Revisi' | 'Ditolak' | 'Dijadwalkan Ulang',
    note: string,
    asLeader?: boolean
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  units,
  activities,
  submissions,
  currentUser,
  onNavigate,
  onOpenSpjDetail,
  onOpenActivityQueue,
  onAdvanceApproval,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [quickNotes, setQuickNotes] = useState<Record<string, string>>({});
  const today = getTodayISO();

  const canLeaderApprove =
    currentUser.roleId === 'PIMPINAN' || currentUser.roleId === 'ADMIN';

  const submissionByAct = useMemo(() => {
    const map = new Map<string, SpjSubmission>();
    submissions.forEach((s) => map.set(s.activityId, s));
    return map;
  }, [submissions]);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  // Hitung KPI sesuai PRD Bab 3.2
  const kpi = useMemo(() => {
    const currentMonthPrefix = today.slice(0, 7); // e.g., 2026-11
    const monthActivities = activities.filter((a) =>
      a.date.startsWith(currentMonthPrefix)
    );
    const activeOrScheduled = activities.filter(
      (a) => a.status === 'Disetujui' && a.date >= today
    );

    let spjComplete = 0;
    let spjSubmitted = 0;
    let spjRevision = 0;
    let spjOverdue = 0;
    let spjPending = 0;

    const actMap = new Map(activities.map((a) => [a.id, a]));

    submissions.forEach((sub) => {
      const act = actMap.get(sub.activityId);
      if (!act) return;
      const deadline = evaluateSpjDeadline(act.date, sub, today);

      if (sub.overallStatus === 'Complete') {
        spjComplete++;
      } else {
        if (sub.overallStatus === 'Submitted') spjSubmitted++;
        if (sub.overallStatus === 'Revision') spjRevision++;
        if (sub.overallStatus === 'Pending' && act.date <= today) spjPending++;
        if (deadline.isOverdue) spjOverdue++;
      }
    });

    const totalObligated = spjComplete + spjSubmitted + spjRevision + spjPending;
    const completePct =
      totalObligated > 0 ? Math.round((spjComplete / totalObligated) * 100) : 0;

    return {
      totalUnits: units.filter((u) => u.status === 'Aktif').length,
      monthActivitiesCount: monthActivities.length,
      scheduledCount: activeOrScheduled.length,
      spjComplete,
      completePct,
      spjSubmitted,
      spjRevision,
      spjOverdue,
      pendingApprovals: activities.filter(
        (a) => a.status === 'Diajukan' || a.status === 'Verifikasi Keuangan'
      ).length,
    };
  }, [activities, submissions, units, today]);

  const unitMetrics = useMemo(
    () => computeUnitMetrics(units, activities, submissions, today),
    [units, activities, submissions, today]
  );

  // Daftar peringatan dini (Overdue H+7, Peringatan H+5, Revisi >= 2x)
  const earlyWarnings = useMemo(() => {
    const actMap = new Map(activities.map((a) => [a.id, a]));
    const items: {
      activity: Activity;
      submission: SpjSubmission;
      unit: Unit | undefined;
      type: 'overdue' | 'h5' | 'revision';
      message: string;
    }[] = [];

    submissions.forEach((sub) => {
      const act = actMap.get(sub.activityId);
      if (!act || sub.overallStatus === 'Complete') return;
      const unit = unitMap.get(act.unitId);
      const deadline = evaluateSpjDeadline(act.date, sub, today);

      if (deadline.isOverdue) {
        items.push({
          activity: act,
          submission: sub,
          unit,
          type: 'overdue',
          message: `${deadline.label} (Batas ${formatDateID(sub.dueDate)})`,
        });
      } else if (deadline.isApproachingH5) {
        items.push({
          activity: act,
          submission: sub,
          unit,
          type: 'h5',
          message: `${deadline.label} — Berkas belum diunggah`,
        });
      } else if (sub.revisionCount >= 2) {
        items.push({
          activity: act,
          submission: sub,
          unit,
          type: 'revision',
          message: `Revisi ke-${sub.revisionCount} — Perlu pendampingan Keuangan`,
        });
      }
    });

    return items.sort((a, b) => {
      const priority = { overdue: 0, h5: 1, revision: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [activities, submissions, unitMap, today]);

  const leaderPendingActivities = useMemo(() => {
    if (!canLeaderApprove) return [];
    return [...activities]
      .filter((a) => a.status === 'Verifikasi Keuangan' || a.status === 'Diajukan')
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'Verifikasi Keuangan' ? -1 : 1;
        }
        return a.date.localeCompare(b.date);
      });
  }, [activities, canLeaderApprove]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...activities]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((act) => {
        if (selectedUnitId !== 'ALL' && act.unitId !== selectedUnitId) return false;
        if (!q) return true;
        const unitName = unitMap.get(act.unitId)?.name.toLowerCase() ?? '';
        return (
          act.title.toLowerCase().includes(q) ||
          act.code.toLowerCase().includes(q) ||
          unitName.includes(q)
        );
      });
  }, [activities, selectedUnitId, searchQuery, unitMap]);

  return (
    <div className="space-y-6">
      {/* Header Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Monitoring Kecamatan Gedangan
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Ringkasan operasional kegiatan dan kepatuhan pelaporan SPJ 7 Sub Bagian/Seksi per{' '}
            <span className="font-mono-num font-medium text-slate-800">{formatDateID(today)}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {kpi.pendingApprovals > 0 && (
            <button
              type="button"
              onClick={onOpenActivityQueue}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
            >
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>{kpi.pendingApprovals} Antrian Approval</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('monitoring-spj')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Verifikasi SPJ</span>
          </button>
        </div>
      </div>

      {/* 7 Kartu KPI Operasional */}
      <section aria-label="Indikator Kinerja Utama" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Unit Kerja</span>
            <Building2 className="w-4 h-4 text-[#0F294A]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {kpi.totalUnits}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Sub Bagian / Seksi</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Bulan Ini</span>
            <CalendarClock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {kpi.monthActivitiesCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Total kegiatan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Terjadwal</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {kpi.scheduledCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Siap dilaksanakan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>SPJ Lengkap</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-num text-2xl font-bold text-emerald-700">
              {kpi.spjComplete}
            </span>
            <span className="font-mono-num text-xs font-semibold text-emerald-600">
              ({kpi.completePct}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Terverifikasi sah</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
            <span>Menunggu Cek</span>
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-blue-700">
            {kpi.spjSubmitted}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Antrian Keuangan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-orange-700 font-medium">
            <span>Perlu Revisi</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-orange-700">
            {kpi.spjRevision}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">Perbaikan seksi</div>
        </div>

        <div className="bg-white border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between text-xs text-red-700 font-medium">
            <span>Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-red-700">
            {kpi.spjOverdue}
          </div>
          <div className="mt-1 text-[11px] text-red-600 truncate">Melewati H+7 kerja</div>
        </div>
      </section>

      {/* Panel Persetujuan Pimpinan (Camat) */}
      {canLeaderApprove && leaderPendingActivities.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#0F294A] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-semibold text-base text-slate-900">
                  Persetujuan Kegiatan Menunggu Pimpinan ({leaderPendingActivities.length})
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Otoritas Camat Gedangan untuk menyetujui atau menolak pengajuan kegiatan unit kerja sebelum dijadwalkan &amp; diterbitkan lembar SPJ H+7.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenActivityQueue}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Buka Antrian Lengkap
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {leaderPendingActivities.map((act) => {
              const unit = unitMap.get(act.unitId);
              const noteVal = quickNotes[act.id] ?? '';

              return (
                <div
                  key={act.id}
                  className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono-num font-semibold text-slate-800">
                        {act.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-700">
                        {unit?.shortName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        {formatDateID(act.date)} ({act.startTime}–{act.endTime})
                      </span>
                      <span aria-hidden="true">·</span>
                      <ActivityStatusText status={act.status} />
                    </div>
                    <div className="font-display font-semibold text-sm text-slate-900">
                      {act.title}
                    </div>
                    <div className="text-xs text-slate-600">
                      Lokasi: {act.location} · Unit: {unit?.shortName} · Anggaran:{' '}
                      <span className="font-mono-num font-semibold text-slate-800">
                        {formatCurrencyIDR(act.budgetEstimate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={noteVal}
                      onChange={(e) =>
                        setQuickNotes((prev) => ({ ...prev, [act.id]: e.target.value }))
                      }
                      placeholder="Catatan Camat (opsional)..."
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-md w-full sm:w-52 focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onAdvanceApproval(
                            act.id,
                            'Ditolak',
                            noteVal || 'Ditolak oleh Camat Gedangan.',
                            true
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAdvanceApproval(
                            act.id,
                            'Disetujui',
                            noteVal || 'Disetujui Camat Gedangan untuk dilaksanakan.',
                            true
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Setujui Kegiatan</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Grafik Kepatuhan 7 Unit Kerja & Peringatan Dini */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Kepatuhan 7 Unit Kerja */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Tingkat Kepatuhan SPJ per Unit Kerja
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rasio kegiatan berstatus SPJ Lengkap terhadap kewajiban berjalan
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('rekap-unit')}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
            >
              Lihat Rekap Lengkap
            </button>
          </div>

          <div className="mt-4 space-y-3.5 flex-1">
            {unitMetrics.map((m) => {
              const barColor =
                m.complianceRate >= 80
                  ? 'bg-emerald-600'
                  : m.complianceRate >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-600';

              return (
                <div key={m.unit.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: m.unit.colorHex }}
                      />
                      <span className="font-medium text-slate-800 truncate">
                        {m.unit.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono-num">
                      <span className="text-slate-500">
                        {m.completedSpj}/{m.approvedActivities} keg
                      </span>
                      <span className="font-semibold text-slate-900 w-10 text-right">
                        {m.complianceRate}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-300`}
                      style={{ width: `${m.complianceRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Peringatan Dini */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5 flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Peringatan Dini &amp; Prioritas Tindak Lanjut
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Deteksi otomatis batas H+5, Overdue H+7, dan revisi berulang
              </p>
            </div>
            <FileWarning className="w-4 h-4 text-amber-600 shrink-0" />
          </div>

          <div className="mt-4 space-y-2.5 flex-1">
            {earlyWarnings.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Seluruh unit kerja berada dalam batas waktu aman.
              </div>
            ) : (
              earlyWarnings.map((w) => {
                const styleMap = {
                  overdue: 'border-red-200 bg-red-50/50 text-red-900',
                  h5: 'border-amber-200 bg-amber-50/50 text-amber-900',
                  revision: 'border-orange-200 bg-orange-50/50 text-orange-900',
                };
                const labelMap = {
                  overdue: 'OVERDUE H+7',
                  h5: 'PERINGATAN H+5',
                  revision: 'REVISI BERULANG',
                };
                return (
                  <button
                    key={w.submission.id}
                    type="button"
                    onClick={() => onOpenSpjDetail(w.activity.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors hover:bg-white ${styleMap[w.type]}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span>{labelMap[w.type]}</span>
                      <span className="font-mono-num">{w.activity.code}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-1 line-clamp-1">
                      {w.activity.title}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate">{w.unit?.shortName}</span>
                      <span className="font-mono-num shrink-0">{w.message}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tabel Monitoring Kegiatan & Status SPJ 7 Unit Kerja */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-900">
              Daftar Kegiatan &amp; Progres Kelengkapan SPJ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik baris atau tombol Periksa SPJ untuk membuka lembar checklist &amp; verifikasi dokumen
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kegiatan, kode, atau unit..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-full sm:w-56 focus:outline-none focus:border-blue-600"
              />
            </div>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              aria-label="Filter unit kerja"
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua 7 Unit Kerja</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 whitespace-nowrap">Kode &amp; Tanggal</th>
                <th className="py-3 px-4">Nama Kegiatan &amp; Lokasi</th>
                <th className="py-3 px-4 whitespace-nowrap">Unit Kerja</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Estimasi Anggaran</th>
                <th className="py-3 px-4 whitespace-nowrap">Status Pengajuan</th>
                <th className="py-3 px-4 whitespace-nowrap">Status SPJ (H+7)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada kegiatan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const unit = unitMap.get(act.unitId);
                  const sub = submissionByAct.get(act.id);
                  const deadline = sub ? evaluateSpjDeadline(act.date, sub, today) : null;

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-mono-num font-semibold text-slate-800">
                          {act.code}
                        </div>
                        <div className="font-mono-num text-[11px] text-slate-500 mt-0.5">
                          {formatDateID(act.date)} · {act.startTime}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-medium text-slate-900 leading-snug">
                          {act.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {act.location}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-medium text-slate-700">
                          {unit?.shortName ?? '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono-num text-slate-800 whitespace-nowrap">
                        {formatCurrencyIDR(act.budgetEstimate)}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <ActivityStatusText status={act.status} />
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {sub ? (
                          <div>
                            <SpjStatusText
                              status={sub.overallStatus}
                              isOverdue={deadline?.isOverdue}
                            />
                            <div className="text-[11px] font-mono-num text-slate-500 mt-0.5">
                              Batas {formatDateID(sub.dueDate)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Menunggu persetujuan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        {sub ? (
                          <button
                            type="button"
                            onClick={() => onOpenSpjDetail(act.id)}
                            className="px-2.5 py-1.5 rounded border border-slate-200 hover:border-blue-600 hover:text-blue-700 font-medium text-slate-700 transition-colors"
                          >
                            Periksa SPJ
                          </button>
                        ) : canLeaderApprove &&
                          (act.status === 'Verifikasi Keuangan' ||
                            act.status === 'Diajukan') ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onAdvanceApproval(
                                  act.id,
                                  'Disetujui',
                                  'Disetujui Camat Gedangan untuk dilaksanakan.',
                                  true
                                )
                              }
                              className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 font-semibold text-white transition-colors"
                            >
                              Setujui
                            </button>
                            <button
                              type="button"
                              onClick={onOpenActivityQueue}
                              className="px-2.5 py-1.5 rounded border border-slate-200 hover:border-slate-400 font-medium text-slate-600 transition-colors"
                            >
                              Detail
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={onOpenActivityQueue}
                            className="px-2.5 py-1.5 rounded border border-slate-200 hover:border-slate-400 font-medium text-slate-600 transition-colors"
                          >
                            Approval
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
