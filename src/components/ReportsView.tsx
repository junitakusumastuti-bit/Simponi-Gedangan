import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { Activity, SpjSubmission, Unit } from '../types/database';
import {
  evaluateSpjDeadline,
  exportToExcelCsv,
  formatCurrencyIDR,
  formatDateID,
  getTodayISO,
} from '../utils/spjLogic';
import { SpjStatusText } from './StatusIndicator';

interface ReportsViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  units,
  activities,
  submissions,
}) => {
  const today = getTodayISO();
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [spjFilter, setSpjFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState(today.slice(0, 7));

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const subByAct = useMemo(
    () => new Map(submissions.map((s) => [s.activityId, s])),
    [submissions]
  );

  const reportRows = useMemo(() => {
    return activities
      .filter((act) => {
        if (monthFilter && !act.date.startsWith(monthFilter)) return false;
        if (unitFilter !== 'ALL' && act.unitId !== unitFilter) return false;
        const sub = subByAct.get(act.id);
        if (spjFilter !== 'ALL') {
          if (!sub) return false;
          if (spjFilter === 'OVERDUE') {
            if (!evaluateSpjDeadline(act.date, sub, today).isOverdue) return false;
          } else if (sub.overallStatus !== spjFilter) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activities, monthFilter, unitFilter, spjFilter, subByAct, today]);

  const totalBudget = useMemo(
    () => reportRows.reduce((acc, a) => acc + a.budgetEstimate, 0),
    [reportRows]
  );

  const handleExportExcel = () => {
    const headers = [
      'Kode Kegiatan',
      'Tanggal',
      'Unit Kerja',
      'Nama Kegiatan',
      'Lokasi',
      'PIC',
      'Estimasi Anggaran (Rp)',
      'Status Kegiatan',
      'Tenggat SPJ (H+7)',
      'Status SPJ',
      'Keterangan Waktu',
    ];

    const rows = reportRows.map((act) => {
      const unit = unitMap.get(act.unitId);
      const sub = subByAct.get(act.id);
      const deadline = sub ? evaluateSpjDeadline(act.date, sub, today) : null;

      return [
        act.code,
        act.date,
        unit?.name ?? '-',
        act.title,
        act.location,
        unit ? `PIC ${unit.shortName}` : 'PIC Unit Kerja',
        act.budgetEstimate,
        act.status,
        sub?.dueDate ?? '-',
        sub?.overallStatus ?? 'Belum Masuk SPJ',
        deadline?.label ?? '-',
      ];
    });

    exportToExcelCsv(
      `Laporan_Simponi_Gedangan_${monthFilter || 'Semua'}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Laporan Rekapitulasi &amp; Ekspor Resmi
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Unduh rekapitulasi kegiatan dan status kelengkapan SPJ ke format Excel (CSV UTF-8) atau cetak langsung sebagai dokumen PDF Kecamatan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Ekspor Excel (.CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center gap-4 no-print">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Periode Bulan
          </label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono-num border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Unit Kerja
          </label>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
          >
            <option value="ALL">Semua 7 Unit Kerja</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Status SPJ
          </label>
          <select
            value={spjFilter}
            onChange={(e) => setSpjFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="Complete">SPJ Lengkap</option>
            <option value="Submitted">Menunggu Verifikasi</option>
            <option value="Revision">Perlu Revisi</option>
            <option value="Pending">Belum Upload</option>
            <option value="OVERDUE">Terlambat (Overdue H+7)</option>
          </select>
        </div>
      </div>

      {/* Lembar Pratinjau Laporan Resmi */}
      <section className="bg-white border border-slate-200 rounded-md p-6 sm:p-8 print-container space-y-6">
        {/* Kop Surat Kecamatan */}
        <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
          <div className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
            Pemerintah Kabupaten Sidoarjo
          </div>
          <div className="font-display text-lg sm:text-xl font-bold text-slate-900">
            KECAMATAN GEDANGAN
          </div>
          <div className="text-xs text-slate-600">
            Laporan Rekapitulasi Pelaksanaan Kegiatan &amp; Pertanggungjawaban Keuangan (SPJ)
          </div>
          <div className="text-[11px] font-mono-num text-slate-500">
            Periode: {monthFilter || 'Semua Periode'} · Dicetak pada {formatDateID(today)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-300 text-slate-700 font-semibold">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Kode &amp; Tgl</th>
                <th className="py-2.5 px-3">Unit Kerja</th>
                <th className="py-2.5 px-3">Nama Kegiatan</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Anggaran</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Batas H+7</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status SPJ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data kegiatan pada filter periode terpilih.
                  </td>
                </tr>
              ) : (
                reportRows.map((act, idx) => {
                  const unit = unitMap.get(act.unitId);
                  const sub = subByAct.get(act.id);
                  const deadline = sub ? evaluateSpjDeadline(act.date, sub, today) : null;
                  return (
                    <tr key={act.id}>
                      <td className="py-2.5 px-3 font-mono-num text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{act.code}</div>
                        <div className="text-[11px] text-slate-500">{formatDateID(act.date)}</div>
                      </td>
                      <td className="py-2.5 px-3">{unit?.shortName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{act.title}</td>
                      <td className="py-2.5 px-3 text-right font-mono-num whitespace-nowrap">
                        {formatCurrencyIDR(act.budgetEstimate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num whitespace-nowrap">
                        {sub ? formatDateID(sub.dueDate) : '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {sub ? (
                          <SpjStatusText
                            status={sub.overallStatus}
                            isOverdue={deadline?.isOverdue}
                          />
                        ) : (
                          <span className="text-slate-500">{act.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-300 font-semibold">
                <td colSpan={4} className="py-2.5 px-3 text-right">
                  Total ({reportRows.length} Kegiatan):
                </td>
                <td className="py-2.5 px-3 text-right font-mono-num">
                  {formatCurrencyIDR(totalBudget)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Blok Pengesahan Tanda Tangan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 text-xs text-slate-800">
          <div className="space-y-14">
            <div>
              <div>Mengetahui,</div>
              <div className="font-semibold">Camat Gedangan</div>
            </div>
            <div>
              <div className="font-semibold underline">Drs. H. Santoso Prabowo, M.Si.</div>
              <div className="font-mono-num text-[11px] text-slate-600">
                NIP. 19710412 199303 1 004
              </div>
            </div>
          </div>

          <div className="space-y-14 sm:text-right">
            <div>
              <div>Gedangan, {formatDateID(today)}</div>
              <div className="font-semibold">Kasubag Perencanaan dan Keuangan</div>
            </div>
            <div>
              <div className="font-semibold underline">Dra. Ratna Kusumawati, M.Si.</div>
              <div className="font-mono-num text-[11px] text-slate-600">
                NIP. 19760819 200212 2 007
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
