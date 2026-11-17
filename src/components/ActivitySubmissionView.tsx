import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  Activity,
  ActivityStatus,
  Unit,
  User,
} from '../types/database';
import {
  addWorkingDays,
  checkScheduleConflict,
  formatCurrencyIDR,
  formatDateID,
  getTodayISO,
} from '../utils/spjLogic';
import { ActivityStatusText } from './StatusIndicator';

interface ActivitySubmissionViewProps {
  units: Unit[];
  activities: Activity[];
  currentUser: User;
  onCreateActivity: (
    payload: Omit<Activity, 'id' | 'code' | 'createdAt' | 'creatorId'>,
    submitImmediately: boolean
  ) => void;
  onAdvanceApproval: (
    activityId: string,
    action: 'Diajukan' | 'Disetujui' | 'Revisi' | 'Ditolak' | 'Dijadwalkan Ulang',
    note: string,
    asLeader?: boolean
  ) => void;
  onDeleteDraftActivity: (activityId: string) => void;
}

const STANDARD_LOCATIONS = [
  'Aula Kecamatan Gedangan',
  'Ruang Rapat Sekcam',
  'Pendopo Kecamatan Gedangan',
  'Halaman Kantor Kecamatan Gedangan',
];

export const ActivitySubmissionView: React.FC<ActivitySubmissionViewProps> = ({
  units,
  activities,
  currentUser,
  onCreateActivity,
  onAdvanceApproval,
  onDeleteDraftActivity,
}) => {
  const [unitId, setUnitId] = useState<string>(currentUser.unitId || units[0]?.id || 'unit-1');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [location, setLocation] = useState('Aula Kecamatan Gedangan');
  const [estimatedParticipants, setEstimatedParticipants] = useState(40);
  const [budgetEstimate, setBudgetEstimate] = useState(3500000);
  const [picPhone, setPicPhone] = useState(currentUser.phone);
  const [notes, setNotes] = useState('');
  const [allowConflictOverride, setAllowConflictOverride] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'ALL'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isUnitPic = currentUser.roleId === 'OPERATOR_SEKSI';

  useEffect(() => {
    setUnitId(currentUser.unitId || units[0]?.id || 'unit-1');
    setPicPhone(currentUser.phone);
  }, [currentUser, units]);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  // Deteksi bentrok jadwal secara real-time saat form diubah
  const conflictCheck = useMemo(
    () =>
      checkScheduleConflict(
        { date, startTime, endTime, location },
        activities
      ),
    [date, startTime, endTime, location, activities]
  );

  // Perhitungan otomatis pratinjau tenggat SPJ (H+7 hari kerja)
  const projectedSpjDueDate = useMemo(() => {
    if (!date) return '-';
    return addWorkingDays(date, 7);
  }, [date]);

  const handleSubmitForm = (submitImmediately: boolean) => {
    setFormFeedback(null);
    if (!title.trim()) {
      setFormFeedback('Nama kegiatan wajib diisi.');
      return;
    }
    if (endTime <= startTime) {
      setFormFeedback('Jam selesai harus lebih besar daripada jam mulai.');
      return;
    }
    if (conflictCheck.hasLocationConflict && submitImmediately && !allowConflictOverride) {
      setFormFeedback(
        'Terdeteksi bentrok jadwal dan lokasi. Sesuaikan jam/ruangan atau centang konfirmasi koordinasi lintas seksi.'
      );
      return;
    }

    const selectedUnit = unitMap.get(unitId);

    onCreateActivity(
      {
        unitId,
        title: title.trim(),
        activityTypeId: 'default',
        date,
        startTime,
        endTime,
        location: location.trim(),
        estimatedParticipants: Number(estimatedParticipants) || 0,
        budgetEstimate: Number(budgetEstimate) || 0,
        picName: selectedUnit ? `PIC ${selectedUnit.shortName}` : 'PIC Unit Kerja',
        picPhone: picPhone.trim() || currentUser.phone,
        notes: notes.trim(),
        status: submitImmediately ? 'Diajukan' : 'Draft',
      },
      submitImmediately
    );

    setTitle('');
    setNotes('');
    setAllowConflictOverride(false);
    setStatusFilter('ALL');
    setFormFeedback(
      submitImmediately
        ? 'Pengajuan kegiatan berhasil dikirim dan ditampilkan pada tabel daftar kegiatan.'
        : 'Kegiatan berhasil disimpan sebagai Draft dan ditampilkan pada tabel daftar kegiatan.'
    );
  };

  const filteredQueue = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((a) => (isUnitPic ? a.unitId === currentUser.unitId : true))
      .filter((a) => (statusFilter === 'ALL' ? true : a.status === statusFilter));
  }, [activities, statusFilter, isUnitPic, currentUser.unitId]);

  const canFinanceVerify =
    currentUser.roleId === 'VERIFIKATOR_KEUANGAN' || currentUser.roleId === 'ADMIN';
  const canLeaderApprove =
    currentUser.roleId === 'PIMPINAN' || currentUser.roleId === 'ADMIN';
  const isLeaderOnly = currentUser.roleId === 'PIMPINAN';
  const isVerifierOnly = currentUser.roleId === 'VERIFIKATOR_KEUANGAN';

  const pendingFinanceCount = useMemo(
    () => activities.filter((a) => a.status === 'Diajukan').length,
    [activities]
  );

  const pendingLeaderCount = useMemo(
    () =>
      activities.filter(
        (a) => a.status === 'Verifikasi Keuangan' || a.status === 'Diajukan'
      ).length,
    [activities]
  );

  const showSubmissionForm = !isVerifierOnly && !isLeaderOnly;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {isVerifierOnly
            ? 'Daftar Kegiatan & Verifikasi Pengajuan'
            : isLeaderOnly
            ? 'Daftar Kegiatan & Persetujuan Pimpinan'
            : 'Pengajuan Kegiatan & Daftar Kegiatan Tersimpan'}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {isVerifierOnly
            ? 'Daftar seluruh pengajuan kegiatan unit kerja untuk diperiksa, disetujui (lolos verifikasi keuangan), diminta penyesuaian, atau ditolak.'
            : isLeaderOnly
            ? 'Daftar seluruh pengajuan kegiatan unit kerja untuk ditinjau, disetujui, diminta penyesuaian, atau ditolak oleh Camat Gedangan.'
            : 'Input rencana kegiatan seksi dengan validasi otomatis bentrok jadwal, penyimpanan draft, dan persetujuan berjenjang (Seksi → Perencanaan & Keuangan → Pimpinan).'}
        </p>
      </div>

      {/* Formulir Pengajuan Kegiatan Baru (khusus PIC Unit Kerja & Super Admin) */}
      {showSubmissionForm && (
        <section className="bg-white border border-slate-200 rounded-md p-5">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-900">
              Formulir Pengajuan Kegiatan Baru
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kegiatan yang disimpan sebagai Draft maupun Diajukan langsung tercatat di tabel daftar kegiatan di bawah.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Tenggat SPJ otomatis:{' '}
            <span className="font-mono-num font-semibold text-[#0F294A]">
              {formatDateID(projectedSpjDueDate)}
            </span>{' '}
            (H+7 kerja)
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Input Utama */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Penyelenggara (7 Sub Bagian / Seksi)
                </label>
                <select
                  value={unitId}
                  disabled={isUnitPic}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white disabled:bg-slate-100 disabled:text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {isUnitPic && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Otomatis terkunci sesuai unit kerja Anda.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi / Fasilitas Kecamatan
                </label>
                <input
                  type="text"
                  list="gedangan-locations"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Pilih atau ketik lokasi pelaksanaan"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
                <datalist id="gedangan-locations">
                  {STANDARD_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kegiatan
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Sosialisasi Percepatan PBB-P2 Desa"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jam Mulai
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jam Selesai
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimasi Peserta
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimatedParticipants}
                  onChange={(e) => setEstimatedParticipants(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimasi Anggaran (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={budgetEstimate}
                  onChange={(e) => setBudgetEstimate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kontak PIC / WA
                </label>
                <input
                  type="text"
                  value={picPhone}
                  onChange={(e) => setPicPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Validasi Jadwal, Catatan, & Tombol Simpan */}
          <div className="lg:col-span-5 space-y-4">
            {conflictCheck.hasLocationConflict ? (
              <div className="p-3.5 rounded-md border border-red-300 bg-red-50 text-red-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold">
                      Terdeteksi Bentrok Jadwal &amp; Lokasi!
                    </div>
                    <p className="text-red-800 mt-0.5">
                      Waktu dan lokasi beririsan dengan kegiatan unit lain pada{' '}
                      <span className="font-mono-num">{formatDateID(date)}</span>:
                    </p>
                  </div>
                </div>
                <ul className="space-y-1 pl-6 text-[11px] text-red-800 list-disc">
                  {conflictCheck.locationConflicts.map((c) => (
                    <li key={c.id}>
                      <span className="font-semibold">{c.title}</span> (
                      {unitMap.get(c.unitId)?.shortName} ·{' '}
                      <span className="font-mono-num">
                        {c.startTime}–{c.endTime}
                      </span>{' '}
                      di {c.location})
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-[11px] font-medium pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowConflictOverride}
                    onChange={(e) => setAllowConflictOverride(e.target.checked)}
                    className="rounded border-red-400"
                  />
                  <span>Sudah dikoordinasikan lintas seksi (tetap ajukan)</span>
                </label>
              </div>
            ) : conflictCheck.sameDayActivities.length > 0 ? (
              <div className="p-3 rounded-md border border-blue-200 bg-blue-50/70 text-blue-900 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {conflictCheck.sameDayActivities.length} kegiatan lain terjadwal pada{' '}
                    {formatDateID(date)}
                  </span>{' '}
                  di lokasi berbeda (bebas bentrok ruangan).
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50/60 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Jadwal &amp; lokasi tersedia.</span>{' '}
                  Tidak ada kegiatan lain yang beririsan pada slot waktu tersebut.
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan koordinasi atau rincian kebutuhan kegiatan..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 resize-none"
              />
            </div>

            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Otomatisasi Tenggat SPJ (H+7 Hari Kerja):
              </span>
              <span className="font-mono-num font-semibold text-[#0F294A]">
                {formatDateID(projectedSpjDueDate)}
              </span>
            </div>

            {formFeedback && (
              <div className="p-3 rounded-md bg-slate-100 border border-slate-300 text-xs text-slate-800 font-medium">
                {formFeedback}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSubmitForm(false)}
                className="px-4 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Simpan Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmitForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ajukan Kegiatan</span>
              </button>
            </div>
          </div>
        </div>
        </section>
      )}

      {/* Tabel Daftar Kegiatan Tersimpan & Antrian Approval Berjenjang */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-900">
              {isUnitPic
                ? 'Daftar Kegiatan Unit Kerja (Draft & Pengajuan)'
                : isVerifierOnly
                ? 'Daftar Kegiatan untuk Verifikasi (Setujui / Tolak)'
                : isLeaderOnly
                ? 'Daftar Kegiatan & Persetujuan Camat'
                : 'Antrian Approval Berjenjang & Daftar Kegiatan'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Peran aktif:{' '}
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
              {isVerifierOnly && (
                <span className="text-blue-700 font-medium">
                  {' '}
                  · Menunggu verifikasi keuangan (
                  <span className="font-mono-num">{pendingFinanceCount}</span>)
                </span>
              )}
              {canLeaderApprove && (
                <span className="text-emerald-700 font-medium">
                  {' '}
                  · Hak Persetujuan Pimpinan aktif (
                  <span className="font-mono-num">{pendingLeaderCount}</span> menunggu)
                </span>
              )}
              {' '}· Menampilkan{' '}
              <span className="font-mono-num font-semibold text-slate-700">
                {filteredQueue.length}
              </span>{' '}
              kegiatan
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
            {(
              [
                'ALL',
                'Draft',
                'Diajukan',
                'Verifikasi Keuangan',
                'Disetujui',
                'Ditolak',
              ] as const
            ).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Nama Kegiatan</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-4 whitespace-nowrap">Jam</th>
                <th className="py-3 px-4">Lokasi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Estimasi Peserta
                </th>
                <th className="py-3 px-4 text-right whitespace-nowrap">
                  Estimasi Anggaran
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Belum ada kegiatan tersimpan pada filter status ini.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((act) => {
                  const unit = unitMap.get(act.unitId);
                  const noteVal = approvalNotes[act.id] ?? '';

                  const canSubmitThisDraft =
                    currentUser.roleId === 'ADMIN' ||
                    (currentUser.roleId === 'OPERATOR_SEKSI' &&
                      act.unitId === currentUser.unitId);
                  const showDraftActions =
                    (act.status === 'Draft' || act.status === 'Dijadwalkan Ulang') &&
                    canSubmitThisDraft;
                  const showFinanceActions =
                    act.status === 'Diajukan' && canFinanceVerify;
                  const showLeaderActions =
                    (act.status === 'Verifikasi Keuangan' ||
                      act.status === 'Diajukan') &&
                    canLeaderApprove;

                  const hasModeratorPanel = showFinanceActions || showLeaderActions;

                  return (
                    <React.Fragment key={act.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 align-top min-w-[220px] max-w-xs">
                          <div className="font-semibold text-slate-900 leading-snug">
                            {act.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono-num font-medium text-slate-700">
                              {act.code}
                            </span>
                            {unit && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{unit.shortName}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono-num text-slate-800">
                          {formatDateID(act.date)}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono-num text-slate-700">
                          {act.startTime}–{act.endTime}
                        </td>
                        <td className="py-3.5 px-4 align-top min-w-[150px] text-slate-700">
                          {act.location}
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap font-mono-num text-slate-800">
                          {act.estimatedParticipants} org
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap font-mono-num font-medium text-slate-900">
                          {formatCurrencyIDR(act.budgetEstimate)}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <ActivityStatusText status={act.status} />
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {showDraftActions ? (
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {act.status === 'Draft' && (
                                <>
                                  {confirmDeleteId === act.id ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteDraftActivity(act.id);
                                          setConfirmDeleteId(null);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Ya, Hapus</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-600"
                                      >
                                        Batal
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(act.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-red-200 hover:bg-red-50 text-red-700 text-[11px] font-semibold"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Hapus</span>
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onAdvanceApproval(
                                    act.id,
                                    'Diajukan',
                                    noteVal || 'Diajukan oleh operator unit kerja.'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold"
                              >
                                <Send className="w-3 h-3" />
                                <span>Ajukan</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              {hasModeratorPanel ? 'Lihat panel aksi' : 'Tersimpan'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Baris sekunder: Panel Pemeriksaan / Approval Pimpinan */}
                      {hasModeratorPanel && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-4 py-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={noteVal}
                                  onChange={(e) =>
                                    setApprovalNotes((prev) => ({
                                      ...prev,
                                      [act.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Catatan pemeriksa / keterangan persetujuan..."
                                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                                />
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {showFinanceActions && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onAdvanceApproval(
                                            act.id,
                                            'Dijadwalkan Ulang',
                                            noteVal ||
                                              'Mohon sesuaikan jadwal/estimasi anggaran.'
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-orange-300 bg-white text-orange-700 hover:bg-orange-50 text-xs font-semibold"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Minta Penyesuaian</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onAdvanceApproval(
                                            act.id,
                                            'Ditolak',
                                            noteVal ||
                                              'Ditolak pada verifikasi Perencanaan & Keuangan.'
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold"
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
                                            noteVal || 'Layak administrasi & pagu DPA.'
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>Setujui (Lolos Verifikasi)</span>
                                      </button>
                                    </>
                                  )}

                                  {showLeaderActions && (
                                    <>
                                      {(act.status === 'Verifikasi Keuangan' ||
                                        isLeaderOnly) && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onAdvanceApproval(
                                              act.id,
                                              'Dijadwalkan Ulang',
                                              noteVal ||
                                                'Mohon penyesuaian jadwal/rencana dari arahan pimpinan.',
                                              true
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-orange-300 bg-white text-orange-700 hover:bg-orange-50 text-xs font-semibold"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>Minta Penyesuaian</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onAdvanceApproval(
                                            act.id,
                                            'Ditolak',
                                            noteVal ||
                                              'Ditolak oleh Pimpinan Kecamatan.',
                                            true
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold"
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
                                            noteVal ||
                                              'Disetujui Camat Gedangan untuk dilaksanakan.',
                                            true
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>
                                          {act.status === 'Diajukan' && !isLeaderOnly
                                            ? 'Setujui Langsung (Pimpinan)'
                                            : 'Setujui Kegiatan'}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
