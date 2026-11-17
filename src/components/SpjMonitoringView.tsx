import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileUp,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Activity,
  SpjDocument,
  SpjOverallStatus,
  SpjSubmission,
  Unit,
  User,
} from '../types/database';
import {
  evaluateSpjDeadline,
  formatCurrencyIDR,
  formatDateID,
  getTodayISO,
} from '../utils/spjLogic';
import { SpjItemStatusText, SpjStatusText } from './StatusIndicator';

interface SpjMonitoringViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
  documents: SpjDocument[];
  currentUser: User;
  selectedActivityId: string | null;
  onSelectActivityId: (activityId: string) => void;
  onUploadSpjFile: (
    documentId: string,
    fileName: string,
    fileSizeKb: number,
    fileType: string,
    filePreviewUrl: string | null
  ) => void;
  onSubmitSpjBundle: (submissionId: string) => void;
  onVerifySpjItem: (
    documentId: string,
    status: 'Sesuai' | 'Perlu Revisi',
    note: string
  ) => void;
  onFinalizeSpjVerification: (
    submissionId: string,
    decision: 'Revision' | 'Complete',
    generalNote: string
  ) => void;
}

export const SpjMonitoringView: React.FC<SpjMonitoringViewProps> = ({
  units,
  activities,
  submissions,
  documents,
  currentUser,
  selectedActivityId,
  onSelectActivityId,
  onUploadSpjFile,
  onSubmitSpjBundle,
  onVerifySpjItem,
  onFinalizeSpjVerification,
}) => {
  const today = getTodayISO();
  const [statusFilter, setStatusFilter] = useState<SpjOverallStatus | 'ALL' | 'OVERDUE'>('ALL');
  const [search, setSearch] = useState('');
  const [generalVerifierNote, setGeneralVerifierNote] = useState('');
  const [itemNotesDraft, setItemNotesDraft] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<SpjDocument | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const actMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const enrichedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions
      .map((sub) => {
        const act = actMap.get(sub.activityId);
        if (!act) return null;
        if (
          currentUser.roleId === 'OPERATOR_SEKSI' &&
          act.unitId !== currentUser.unitId
        ) {
          return null;
        }
        const unit = unitMap.get(act.unitId);
        const deadline = evaluateSpjDeadline(act.date, sub, today);
        const docs = documents.filter((d) => d.spjSubmissionId === sub.id);
        const uploadedCount = docs.filter((d) => d.fileName !== null).length;
        const verifiedCount = docs.filter((d) => d.itemStatus === 'Sesuai').length;

        return {
          sub,
          act,
          unit,
          deadline,
          docs,
          uploadedCount,
          verifiedCount,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (statusFilter === 'OVERDUE') {
          if (!item.deadline.isOverdue) return false;
        } else if (statusFilter !== 'ALL') {
          if (item.sub.overallStatus !== statusFilter) return false;
        }
        if (!q) return true;
        return (
          item.act.title.toLowerCase().includes(q) ||
          item.act.code.toLowerCase().includes(q) ||
          (item.unit?.shortName.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => a.sub.dueDate.localeCompare(b.sub.dueDate));
  }, [submissions, actMap, unitMap, documents, statusFilter, search, today, currentUser.roleId, currentUser.unitId]);

  const activeEntry = useMemo(() => {
    if (selectedActivityId) {
      const found = enrichedList.find((e) => e.act.id === selectedActivityId);
      if (found) return found;
      // Cari di seluruh submissions jika tidak masuk filter (selama sesuai hak akses unit)
      const sub = submissions.find((s) => s.activityId === selectedActivityId);
      const act = actMap.get(selectedActivityId);
      if (
        sub &&
        act &&
        (currentUser.roleId !== 'OPERATOR_SEKSI' || act.unitId === currentUser.unitId)
      ) {
        const docs = documents.filter((d) => d.spjSubmissionId === sub.id);
        return {
          sub,
          act,
          unit: unitMap.get(act.unitId),
          deadline: evaluateSpjDeadline(act.date, sub, today),
          docs,
          uploadedCount: docs.filter((d) => d.fileName !== null).length,
          verifiedCount: docs.filter((d) => d.itemStatus === 'Sesuai').length,
        };
      }
    }
    return enrichedList[0] ?? null;
  }, [selectedActivityId, enrichedList, submissions, actMap, documents, unitMap, today, currentUser.roleId, currentUser.unitId]);

  const isVerifier =
    currentUser.roleId === 'VERIFIKATOR_KEUANGAN' || currentUser.roleId === 'ADMIN';
  const canUploadForActiveEntry =
    currentUser.roleId === 'ADMIN' ||
    (currentUser.roleId === 'OPERATOR_SEKSI' &&
      activeEntry?.act.unitId === currentUser.unitId);
  const isUnitPic = currentUser.roleId === 'OPERATOR_SEKSI';

  const handleRealFileSelect = (
    docId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      onUploadSpjFile(docId, file.name, sizeKb, file.type || 'application/pdf', url);
      setActionBanner(`Berkas "${file.name}" berhasil diunggah.`);
    };
    reader.readAsDataURL(file);
  };

  const handleQuickSimulateUpload = (doc: SpjDocument, actCode: string) => {
    const slug = doc.docName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const isPhoto = doc.docName.toLowerCase().includes('foto');
    const fakeName = `${actCode}_${slug}.${isPhoto ? 'jpg' : 'pdf'}`;
    onUploadSpjFile(
      doc.id,
      fakeName,
      isPhoto ? 840 : 465,
      isPhoto ? 'image/jpeg' : 'application/pdf',
      null
    );
    setActionBanner(`Berkas "${fakeName}" siap untuk verifikasi.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isUnitPic
              ? 'Upload & Kelengkapan SPJ Kegiatan'
              : 'Monitoring & Verifikasi Kelengkapan SPJ'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Unggah dokumen digital berdasarkan checklist wajib dan lakukan verifikasi berjenjang oleh Sub Bagian Perencanaan &amp; Keuangan (Tenggat H+7 hari kerja).
          </p>
        </div>
        <div className="text-xs bg-white border border-slate-200 rounded-md px-3 py-2 shrink-0">
          <span className="text-slate-500">Mode Akses: </span>
          <span className="font-semibold text-[#0F294A]">
            {isVerifier
              ? 'Verifikator Keuangan (Dapat Mengesahkan & Revisi)'
              : isUnitPic
              ? 'PIC Unit Kerja (Unggah & Ajukan SPJ)'
              : 'Monitoring Pimpinan'}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'Semua' },
              { id: 'Pending', label: 'Belum Upload' },
              { id: 'Submitted', label: 'Menunggu Verifikasi' },
              { id: 'Revision', label: 'Perlu Revisi' },
              { id: 'Complete', label: 'SPJ Lengkap' },
              { id: 'OVERDUE', label: 'Overdue H+7' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kegiatan, kode, atau seksi..."
            className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md w-full lg:w-64 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Tabel 1: Daftar Berkas SPJ Kegiatan */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm sm:text-base text-slate-900">
              Daftar Kegiatan &amp; Kewajiban SPJ ({enrichedList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih baris kegiatan pada tabel untuk mengunggah atau memeriksa dokumen checklist SPJ di bawah.
            </p>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">Urut batas H+7</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Kode &amp; Nama Kegiatan</th>
                <th className="py-3 px-4 whitespace-nowrap">Unit Kerja</th>
                <th className="py-3 px-4 whitespace-nowrap">Tgl Kegiatan</th>
                <th className="py-3 px-4 whitespace-nowrap">Batas SPJ (H+7)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Kelengkapan</th>
                <th className="py-3 px-4 whitespace-nowrap">Status SPJ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada kegiatan SPJ pada kategori ini.
                  </td>
                </tr>
              ) : (
                enrichedList.map((item) => {
                  const isSelected = activeEntry?.sub.id === item.sub.id;
                  return (
                    <tr
                      key={item.sub.id}
                      onClick={() => {
                        onSelectActivityId(item.act.id);
                        setActionBanner(null);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 hover:bg-blue-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 align-top min-w-[240px] max-w-md">
                        <div className="font-mono-num text-[11px] font-semibold text-[#0F294A]">
                          {item.act.code}
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5 leading-snug">
                          {item.act.title}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap text-slate-700 font-medium">
                        {item.unit?.shortName ?? '-'}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono-num text-slate-700">
                        {formatDateID(item.act.date)}
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono-num font-medium text-slate-800">
                          {formatDateID(item.sub.dueDate)}
                        </div>
                        <div
                          className={`text-[11px] font-mono-num mt-0.5 ${
                            item.deadline.isOverdue
                              ? 'text-red-700 font-semibold'
                              : item.deadline.isApproachingH5
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.deadline.label}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap font-mono-num">
                        <div className="text-slate-800 font-semibold">
                          {item.uploadedCount}/{item.docs.length} berkas
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          {item.verifiedCount}/{item.docs.length} sah
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <SpjStatusText
                          status={item.sub.overallStatus}
                          isOverdue={item.deadline.isOverdue}
                        />
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectActivityId(item.act.id);
                            setActionBanner(null);
                          }}
                          className={`px-3 py-1.5 rounded text-[11px] font-semibold border transition-colors ${
                            isSelected
                              ? 'bg-[#0F294A] text-white border-[#0F294A]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-600 hover:text-blue-700'
                          }`}
                        >
                          {isSelected ? 'Sedang Dibuka' : 'Buka Upload SPJ'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabel 2: Lembar Checklist & Unggah Dokumen SPJ Kegiatan Terpilih */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {!activeEntry ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Pilih salah satu kegiatan pada tabel di atas untuk membuka tabel unggah dokumen SPJ.
          </div>
        ) : (
          <div>
            {/* Header Detail Kegiatan SPJ */}
            <div className="p-5 border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono-num font-semibold text-[#0F294A]">
                      {activeEntry.act.code}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeEntry.unit?.name}</span>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mt-1">
                    {activeEntry.act.title}
                  </h3>
                </div>
                <div className="shrink-0">
                  <SpjStatusText
                    status={activeEntry.sub.overallStatus}
                    isOverdue={activeEntry.deadline.isOverdue}
                  />
                </div>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <dt className="text-slate-500">Tgl Kegiatan</dt>
                  <dd className="font-mono-num font-semibold text-slate-900 mt-0.5">
                    {formatDateID(activeEntry.act.date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Batas Akhir (H+7)</dt>
                  <dd
                    className={`font-mono-num font-semibold mt-0.5 ${
                      activeEntry.deadline.isOverdue ? 'text-red-700' : 'text-slate-900'
                    }`}
                  >
                    {formatDateID(activeEntry.sub.dueDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Unit / Anggaran</dt>
                  <dd className="font-medium text-slate-900 mt-0.5 truncate">
                    {activeEntry.unit?.shortName ?? 'PIC Unit Kerja'}
                  </dd>
                  <dd className="font-mono-num text-[11px] text-slate-500">
                    {formatCurrencyIDR(activeEntry.act.budgetEstimate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Riwayat Revisi</dt>
                  <dd className="font-mono-num font-semibold text-slate-900 mt-0.5">
                    {activeEntry.sub.revisionCount} kali
                  </dd>
                </div>
              </dl>

              {activeEntry.sub.revisionCount >= 2 &&
                activeEntry.sub.overallStatus !== 'Complete' && (
                  <div className="p-3 rounded border border-orange-300 bg-orange-50 text-xs text-orange-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-orange-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Indikator Pendampingan Khusus:
                      </span>{' '}
                      Berkas ini telah mengalami revisi {activeEntry.sub.revisionCount} kali.
                      Disarankan asistensi langsung oleh staf Sub Bagian Perencanaan &amp; Keuangan.
                    </div>
                  </div>
                )}

              {actionBanner && (
                <div className="p-3 rounded border border-blue-200 bg-blue-50 text-xs font-medium text-blue-900">
                  {actionBanner}
                </div>
              )}

              {currentUser.roleId === 'OPERATOR_SEKSI' &&
                activeEntry.act.unitId !== currentUser.unitId && (
                  <div className="p-3 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700">
                    <span className="font-semibold">Mode Baca Saja (Isolasi Unit):</span>{' '}
                    Hanya PIC dari <span className="font-semibold">{activeEntry.unit?.name}</span> atau Super Admin yang dapat mengunggah berkas SPJ kegiatan ini.
                  </div>
                )}
            </div>

            {/* Tabel Checklist 6 Dokumen Wajib SPJ */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-12">No.</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Dokumen SPJ</th>
                    <th className="py-3 px-4 min-w-[220px]">Berkas Digital &amp; Catatan</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status Item</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap min-w-[220px]">
                      Unggah / Verifikasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEntry.docs.map((doc, idx) => {
                    const draftNote =
                      itemNotesDraft[doc.id] !== undefined
                        ? itemNotesDraft[doc.id]
                        : doc.verifierNote;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 align-top font-mono-num font-semibold text-slate-500">
                          0{idx + 1}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">{doc.docName}</div>
                          {doc.isMandatory && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Syarat Wajib SPJ
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top space-y-2">
                          {doc.fileName ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-num text-blue-800 font-medium break-all">
                                {doc.fileName}
                              </span>
                              <span className="font-mono-num text-slate-400">
                                ({doc.fileSizeKb} KB)
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Pratinjau</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              Belum ada file PDF atau foto yang diunggah.
                            </span>
                          )}

                          {doc.verifierNote && doc.itemStatus === 'Perlu Revisi' && (
                            <div className="p-2 rounded bg-orange-50 border border-orange-200 text-[11px] text-orange-900 flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-700 shrink-0 mt-0.5" />
                              <span>
                                <span className="font-semibold">Catatan: </span>
                                {doc.verifierNote}
                              </span>
                            </div>
                          )}

                          {isVerifier &&
                            doc.fileName &&
                            activeEntry.sub.overallStatus !== 'Complete' && (
                              <input
                                type="text"
                                value={draftNote}
                                onChange={(e) =>
                                  setItemNotesDraft((prev) => ({
                                    ...prev,
                                    [doc.id]: e.target.value,
                                  }))
                                }
                                placeholder="Catatan revisi item (opsional)..."
                                className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-600"
                              />
                            )}
                        </td>
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <SpjItemStatusText status={doc.itemStatus} />
                        </td>
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {activeEntry.sub.overallStatus !== 'Complete' &&
                              canUploadForActiveEntry && (
                                <>
                                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 hover:border-blue-600 text-[11px] font-medium text-slate-700 cursor-pointer transition-colors bg-white">
                                    <FileUp className="w-3.5 h-3.5 text-blue-600" />
                                    <span>
                                      {doc.fileName
                                        ? 'Unggah Ulang'
                                        : 'Pilih File PDF/Foto'}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,image/*"
                                      className="hidden"
                                      onChange={(e) => handleRealFileSelect(doc.id, e)}
                                    />
                                  </label>

                                  {!doc.fileName && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickSimulateUpload(
                                          doc,
                                          activeEntry.act.code
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-600"
                                    >
                                      Contoh Digital
                                    </button>
                                  )}
                                </>
                              )}

                            {isVerifier &&
                              doc.fileName &&
                              activeEntry.sub.overallStatus !== 'Complete' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const noteToSave =
                                        draftNote.trim() ||
                                        'Mohon lengkapi tanda tangan/stempel resmi pada berkas ini.';
                                      onVerifySpjItem(doc.id, 'Perlu Revisi', noteToSave);
                                      setActionBanner(
                                        `Item "${doc.docName}" ditandai Perlu Revisi.`
                                      );
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition-colors ${
                                      doc.itemStatus === 'Perlu Revisi'
                                        ? 'bg-orange-600 text-white border-orange-600'
                                        : 'border-orange-300 text-orange-700 hover:bg-orange-50'
                                    }`}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Revisi</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onVerifySpjItem(doc.id, 'Sesuai', draftNote.trim());
                                      setActionBanner(
                                        `Item "${doc.docName}" diverifikasi Sesuai / Sah.`
                                      );
                                    }}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition-colors ${
                                      doc.itemStatus === 'Sesuai'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Sesuai</span>
                                  </button>
                                </>
                              )}

                            {activeEntry.sub.overallStatus === 'Complete' && (
                              <span className="text-[11px] text-emerald-700 font-medium">
                                Terverifikasi Sah
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Aksi Pengajuan & Pengesahan Akhir */}
            {activeEntry.sub.overallStatus !== 'Complete' && (
              <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                {isVerifier && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Keseluruhan Verifikator Keuangan
                    </label>
                    <input
                      type="text"
                      value={generalVerifierNote}
                      onChange={(e) => setGeneralVerifierNote(e.target.value)}
                      placeholder="Ringkasan hasil verifikasi kelengkapan SPJ..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    Kelengkapan terunggah:{' '}
                    <span className="font-mono-num font-semibold text-slate-900">
                      {activeEntry.uploadedCount}/{activeEntry.docs.length}
                    </span>{' '}
                    · Terverifikasi sah:{' '}
                    <span className="font-mono-num font-semibold text-emerald-700">
                      {activeEntry.verifiedCount}/{activeEntry.docs.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canUploadForActiveEntry &&
                      (activeEntry.sub.overallStatus === 'Pending' ||
                        activeEntry.sub.overallStatus === 'Revision') && (
                        <button
                          type="button"
                          disabled={activeEntry.uploadedCount === 0}
                          onClick={() => {
                            onSubmitSpjBundle(activeEntry.sub.id);
                            setActionBanner(
                              'Berkas SPJ berhasil dikirim ke Sub Bagian Perencanaan & Keuangan untuk verifikasi.'
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {activeEntry.sub.overallStatus === 'Revision'
                              ? 'Kirim Perbaikan SPJ'
                              : 'Ajukan Verifikasi SPJ'}
                          </span>
                        </button>
                      )}

                    {isVerifier && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onFinalizeSpjVerification(
                              activeEntry.sub.id,
                              'Revision',
                              generalVerifierNote.trim() ||
                                'Terdapat berkas checklist yang harus diperbaiki.'
                            );
                            setActionBanner(
                              'Status SPJ dikembalikan ke unit kerja sebagai Perlu Revisi.'
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-orange-300 bg-white hover:bg-orange-50 text-orange-700 text-xs font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan (Perlu Revisi)</span>
                        </button>
                        <button
                          type="button"
                          disabled={
                            activeEntry.docs.some(
                              (d) => d.isMandatory && d.itemStatus !== 'Sesuai'
                            )
                          }
                          onClick={() => {
                            onFinalizeSpjVerification(
                              activeEntry.sub.id,
                              'Complete',
                              generalVerifierNote.trim() ||
                                'Seluruh dokumen wajib SPJ lengkap dan sah.'
                            );
                            setActionBanner(
                              'SPJ resmi disahkan dengan status SPJ Lengkap.'
                            );
                          }}
                          title={
                            activeEntry.docs.some(
                              (d) => d.isMandatory && d.itemStatus !== 'Sesuai'
                            )
                              ? 'Pastikan seluruh dokumen wajib telah ditandai Sesuai terlebih dahulu'
                              : 'Sahkan status SPJ Lengkap'
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Sahkan SPJ Lengkap</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal Pratinjau Berkas */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {previewDoc.docName}
                </div>
                <div className="text-[11px] font-mono-num text-slate-500 truncate">
                  {previewDoc.fileName} · {previewDoc.fileSizeKb} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
                aria-label="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto flex items-center justify-center">
              {previewDoc.filePreviewUrl &&
              previewDoc.fileType?.startsWith('image/') ? (
                <img
                  src={previewDoc.filePreviewUrl}
                  alt={previewDoc.docName}
                  className="max-h-[55vh] rounded border border-slate-200 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded p-8 w-full max-w-md text-center space-y-3">
                  <FileCheck2 className="w-10 h-10 text-[#0F294A] mx-auto" />
                  <div className="text-sm font-semibold text-slate-900">
                    Pratinjau Dokumen Digital
                  </div>
                  <div className="text-xs font-mono-num text-slate-600 break-all">
                    {previewDoc.fileName}
                  </div>
                  <p className="text-xs text-slate-500">
                    Diunggah oleh{' '}
                    {activeEntry?.unit?.shortName
                      ? `PIC ${activeEntry.unit.shortName}`
                      : 'PIC Seksi'}{' '}
                    pada {formatDateID(previewDoc.uploadedAt)}. Siap diperiksa oleh
                    verifikator Sub Bagian Perencanaan &amp; Keuangan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
