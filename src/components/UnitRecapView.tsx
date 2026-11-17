import React, { useMemo } from 'react';
import { Building2, CheckCircle2, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { Activity, SpjSubmission, Unit } from '../types/database';
import { computeUnitMetrics, formatCurrencyIDR, getTodayISO } from '../utils/spjLogic';

interface UnitRecapViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
  onFilterUnitToSpj: (unitId: string) => void;
}

export const UnitRecapView: React.FC<UnitRecapViewProps> = ({
  units,
  activities,
  submissions,
  onFilterUnitToSpj,
}) => {
  const today = getTodayISO();
  const metrics = useMemo(
    () => computeUnitMetrics(units, activities, submissions, today),
    [units, activities, submissions, today]
  );

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        totalActivities: acc.totalActivities + m.totalActivities,
        approvedActivities: acc.approvedActivities + m.approvedActivities,
        completedSpj: acc.completedSpj + m.completedSpj,
        submittedSpj: acc.submittedSpj + m.submittedSpj,
        revisionSpj: acc.revisionSpj + m.revisionSpj,
        overdueSpj: acc.overdueSpj + m.overdueSpj,
        totalBudget: acc.totalBudget + m.totalBudget,
      }),
      {
        totalActivities: 0,
        approvedActivities: 0,
        completedSpj: 0,
        submittedSpj: 0,
        revisionSpj: 0,
        overdueSpj: 0,
        totalBudget: 0,
      }
    );
  }, [metrics]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Rekapitulasi 7 Unit Kerja Kecamatan Gedangan
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Evaluasi kinerja pelaksanaan kegiatan, kepatuhan penyetoran SPJ, rata-rata SLA penyelesaian, dan total pagu anggaran per unit.
        </p>
      </div>

      {/* Tabel Rekapitulasi Komparatif */}
      <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0F294A]" />
            <h3 className="font-display font-semibold text-base text-slate-900">
              Matriks Kepatuhan 7 Sub Bagian &amp; Seksi
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Target Kepatuhan Kecamatan: <strong className="font-mono-num text-slate-800">≥ 85%</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Sub Bagian / Seksi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Keg.</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Disetujui</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-emerald-700">SPJ Lengkap</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-blue-700">Verifikasi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-orange-700">Revisi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap text-red-700">Overdue</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">SLA Rata-rata</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Kepatuhan</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Anggaran Disetujui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m) => (
                <tr key={m.unit.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: m.unit.colorHex }}
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{m.unit.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Kepala: {m.unit.headName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-700">
                    {m.totalActivities}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-900 font-medium">
                    {m.approvedActivities}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-emerald-700">
                    {m.completedSpj}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-blue-700">
                    {m.submittedSpj}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-orange-700">
                    {m.revisionSpj}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-semibold text-red-700">
                    {m.overdueSpj}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                    {m.avgSlaDays !== null ? `${m.avgSlaDays} hr kerja` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num font-bold whitespace-nowrap">
                    <span
                      className={
                        m.complianceRate >= 80
                          ? 'text-emerald-700'
                          : m.complianceRate >= 50
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {m.complianceRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-num text-slate-800 whitespace-nowrap">
                    {formatCurrencyIDR(m.totalBudget)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-3 px-4">Total Kecamatan Gedangan (7 Unit Kerja)</td>
                <td className="py-3 px-4 text-right font-mono-num">{totals.totalActivities}</td>
                <td className="py-3 px-4 text-right font-mono-num">{totals.approvedActivities}</td>
                <td className="py-3 px-4 text-right font-mono-num text-emerald-700">
                  {totals.completedSpj}
                </td>
                <td className="py-3 px-4 text-right font-mono-num text-blue-700">
                  {totals.submittedSpj}
                </td>
                <td className="py-3 px-4 text-right font-mono-num text-orange-700">
                  {totals.revisionSpj}
                </td>
                <td className="py-3 px-4 text-right font-mono-num text-red-700">
                  {totals.overdueSpj}
                </td>
                <td className="py-3 px-4 text-right font-mono-num">-</td>
                <td className="py-3 px-4 text-right font-mono-num">-</td>
                <td className="py-3 px-4 text-right font-mono-num">
                  {formatCurrencyIDR(totals.totalBudget)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Kartu Ringkas per Unit Kerja */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.unit.id}
            className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono-num font-semibold text-slate-700">
                  {m.unit.code}
                </span>
                <span className="font-mono-num font-bold text-slate-900">
                  Kepatuhan {m.complianceRate}%
                </span>
              </div>
              <h4 className="font-display font-bold text-sm text-slate-900 mt-1">
                {m.unit.name}
              </h4>
              <div className="text-xs text-slate-500 mt-0.5">{m.unit.headName}</div>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                <div>
                  <div className="flex items-center justify-center gap-1 text-emerald-700 font-semibold font-mono-num">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{m.completedSpj}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Lengkap</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-blue-700 font-semibold font-mono-num">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{m.submittedSpj + m.pendingSpj}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Proses</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-orange-700 font-semibold font-mono-num">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{m.revisionSpj}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Revisi</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-red-700 font-semibold font-mono-num">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{m.overdueSpj}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Overdue</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onFilterUnitToSpj(m.unit.id)}
              className="w-full py-2 rounded border border-slate-200 hover:border-blue-600 hover:text-blue-700 text-xs font-semibold text-slate-700 transition-colors"
            >
              Lihat Daftar SPJ Unit Ini
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};
