import React, { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileWarning,
  TrendingUp,
} from 'lucide-react';
import {
  Activity,
  SpjDocument,
  SpjSubmission,
  Unit,
} from '../types/database';
import {
  computeUnitMetrics,
  countWorkingDaysBetween,
  formatCurrencyIDR,
  formatDateID,
  generateOperationalInsights,
  getTodayISO,
} from '../utils/spjLogic';

interface AnalyticsInsightViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
  documents: SpjDocument[];
}

export const AnalyticsInsightView: React.FC<AnalyticsInsightViewProps> = ({
  units,
  activities,
  submissions,
  documents,
}) => {
  const today = getTodayISO();

  const metrics = useMemo(
    () => computeUnitMetrics(units, activities, submissions, today),
    [units, activities, submissions, today]
  );

  const insights = useMemo(
    () => generateOperationalInsights(units, activities, submissions, documents, today),
    [units, activities, submissions, documents, today]
  );

  // Analisis SLA: Rata-rata hari penyetoran seksi vs verifikasi keuangan
  const slaStats = useMemo(() => {
    const actMap = new Map(activities.map((a) => [a.id, a]));
    const submitDurations: number[] = [];
    const verifyDurations: number[] = [];
    const totalDurations: number[] = [];

    submissions.forEach((s) => {
      const act = actMap.get(s.activityId);
      if (!act || !s.submittedAt) return;
      const subDays = Math.max(0, countWorkingDaysBetween(act.date, s.submittedAt.slice(0, 10)));
      submitDurations.push(subDays);

      if (s.verifiedAt) {
        const verDays = Math.max(
          0,
          countWorkingDaysBetween(s.submittedAt.slice(0, 10), s.verifiedAt.slice(0, 10))
        );
        verifyDurations.push(verDays);
        totalDurations.push(
          Math.max(1, countWorkingDaysBetween(act.date, s.verifiedAt.slice(0, 10)))
        );
      }
    });

    const avg = (arr: number[]) =>
      arr.length > 0
        ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
        : '-';

    return {
      avgSubmitDays: avg(submitDurations),
      avgVerifyDays: avg(verifyDurations),
      avgTotalDays: avg(totalDurations),
    };
  }, [activities, submissions]);

  // Beban kegiatan per minggu dalam bulan berjalan
  const weeklyLoad = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    const buckets = [
      { label: 'Minggu 1 (1–7)', count: 0, budget: 0 },
      { label: 'Minggu 2 (8–14)', count: 0, budget: 0 },
      { label: 'Minggu 3 (15–21)', count: 0, budget: 0 },
      { label: 'Minggu 4 (22–31)', count: 0, budget: 0 },
    ];

    activities
      .filter((a) => a.date.startsWith(currentMonth) && a.status !== 'Ditolak')
      .forEach((act) => {
        const day = Number(act.date.slice(8, 10));
        const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
        buckets[idx].count += 1;
        buckets[idx].budget += act.budgetEstimate;
      });

    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, maxCount };
  }, [activities, today]);

  // Analisis item dokumen paling sering direvisi
  const docRevisionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    documents
      .filter((d) => d.itemStatus === 'Perlu Revisi')
      .forEach((d) => {
        counts[d.docName] = (counts[d.docName] || 0) + 1;
      });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [documents]);

  const totalApprovedBudget = useMemo(
    () =>
      activities
        .filter((a) => a.status === 'Disetujui')
        .reduce((acc, a) => acc + a.budgetEstimate, 0),
    [activities]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Analytics Kepatuhan &amp; Insight Eksekutif
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Analisis Service Level Agreement (SLA) penyelesaian SPJ, beban jadwal mingguan, kendala dokumen, dan ringkasan eksekutif untuk Camat &amp; Sekcam.
        </p>
      </div>

      {/* Ringkasan Metrik SLA */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Rata-rata Unggah Seksi</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {slaStats.avgSubmitDays} <span className="text-xs font-normal text-slate-500">hr kerja</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dari tanggal pelaksanaan</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Rata-rata Verifikasi Keuangan</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {slaStats.avgVerifyDays} <span className="text-xs font-normal text-slate-500">hr kerja</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dari unggah hingga sah</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Lead Time SPJ</span>
            <CheckCircle2 className="w-4 h-4 text-[#0F294A]" />
          </div>
          <div className="mt-2 font-mono-num text-2xl font-bold text-slate-900">
            {slaStats.avgTotalDays} <span className="text-xs font-normal text-slate-500">hr kerja</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Target standar ≤ 7 hr kerja</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Anggaran Kegiatan Disetujui</span>
            <BarChart3 className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 font-mono-num text-xl font-bold text-slate-900">
            {formatCurrencyIDR(totalApprovedBudget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Akumulasi bulan berjalan</div>
        </div>
      </section>

      {/* Grafik Beban Mingguan & Kendala Dokumen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="font-display font-semibold text-base text-slate-900">
              Distribusi Beban Kegiatan Mingguan (Bulan Berjalan)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Membantu Sub Bagian Perencanaan &amp; Keuangan mengantisipasi lonjakan berkas SPJ pasca-kegiatan
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {weeklyLoad.buckets.map((b) => {
              const pct = Math.round((b.count / weeklyLoad.maxCount) * 100);
              return (
                <div key={b.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{b.label}</span>
                    <span className="font-mono-num text-slate-600">
                      <strong className="text-slate-900">{b.count} kegiatan</strong> ·{' '}
                      {formatCurrencyIDR(b.budget)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[#0F294A] transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Analisis Kendala Dokumen SPJ
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Item checklist yang paling sering dikembalikan verifikator
              </p>
            </div>
            <FileWarning className="w-4 h-4 text-orange-600" />
          </div>

          <div className="mt-4 space-y-3">
            {docRevisionBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Belum ada catatan revisi dokumen pada periode ini.
              </div>
            ) : (
              docRevisionBreakdown.map((item, idx) => (
                <div
                  key={item.name}
                  className="p-3 rounded border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Perlu perhatian kelengkapan bukti sah / tanda tangan
                    </div>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-orange-700 shrink-0">
                    {item.count}x revisi
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Insight Otomatis & Rekomendasi Tindak Lanjut (PRD Lampiran D) */}
      <section className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#0F294A]" />
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Management Brief &amp; Rekomendasi Tindak Lanjut
              </h3>
              <p className="text-xs text-slate-500">
                Ringkasan evaluasi otomatis untuk Camat, Sekretaris Kecamatan, dan Kasubag Perencanaan &amp; Keuangan per {formatDateID(today)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins) => {
            const borderMap = {
              critical: 'border-red-200 bg-red-50/40',
              warning: 'border-amber-200 bg-amber-50/40',
              info: 'border-blue-200 bg-blue-50/40',
              positive: 'border-emerald-200 bg-emerald-50/40',
            };
            const textMap = {
              critical: 'text-red-800',
              warning: 'text-amber-800',
              info: 'text-blue-800',
              positive: 'text-emerald-800',
            };

            return (
              <div
                key={ins.id}
                className={`p-4 rounded-md border ${borderMap[ins.severity]} space-y-2`}
              >
                <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${textMap[ins.severity]}`}>
                  {ins.severity === 'positive' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{ins.category}</span>
                </div>
                <div className="font-display font-semibold text-sm text-slate-900">
                  {ins.title}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ins.description}
                </p>
                <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-800">
                  <span className="font-semibold">Rekomendasi: </span>
                  {ins.recommendation}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ringkasan Kepatuhan Cepat */}
        <div className="p-4 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Catatan Evaluasi Pimpinan: </span>
          Dari {metrics.length} unit kerja operasional Kecamatan Gedangan, unit dengan kepatuhan tertinggi saat ini adalah{' '}
          <strong className="text-slate-900">
            {[...metrics].sort((a, b) => b.complianceRate - a.complianceRate)[0]?.unit.name}
          </strong>{' '}
          ({[...metrics].sort((a, b) => b.complianceRate - a.complianceRate)[0]?.complianceRate}%).
        </div>
      </section>
    </div>
  );
};
