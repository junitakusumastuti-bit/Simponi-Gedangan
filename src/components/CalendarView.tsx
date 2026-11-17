import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import {
  Activity,
  SpjSubmission,
  Unit,
} from '../types/database';
import { formatCurrencyIDR, formatDateID, getTodayISO } from '../utils/spjLogic';
import { ActivityStatusText, SpjStatusText } from './StatusIndicator';

interface CalendarViewProps {
  units: Unit[];
  activities: Activity[];
  submissions: SpjSubmission[];
  onOpenSpjDetail: (activityId: string) => void;
}

type CalendarMode = 'month' | 'week' | 'day';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  units,
  activities,
  submissions,
  onOpenSpjDetail,
}) => {
  const today = getTodayISO();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursorDate, setCursorDate] = useState<string>(today);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ALL');
  const [includePending, setIncludePending] = useState<boolean>(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const subByAct = useMemo(
    () => new Map(submissions.map((s) => [s.activityId, s])),
    [submissions]
  );

  const visibleActivities = useMemo(() => {
    return activities.filter((act) => {
      if (act.status === 'Ditolak') return false;
      if (!includePending && act.status !== 'Disetujui') return false;
      if (selectedUnitId !== 'ALL' && act.unitId !== selectedUnitId) return false;
      return true;
    });
  }, [activities, includePending, selectedUnitId]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, Activity[]>();
    visibleActivities.forEach((act) => {
      const list = map.get(act.date) || [];
      list.push(act);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(act.date, list);
    });
    return map;
  }, [visibleActivities]);

  const [cy, cm, cd] = cursorDate.split('-').map(Number);

  const navigateCursor = (step: number) => {
    const base = new Date(cy, cm - 1, cd);
    if (mode === 'month') {
      base.setMonth(base.getMonth() + step);
    } else if (mode === 'week') {
      base.setDate(base.getDate() + step * 7);
    } else {
      base.setDate(base.getDate() + step);
    }
    setCursorDate(toISODate(base));
  };

  // Hitung grid bulan (Senin - Minggu)
  const monthGridDates = useMemo(() => {
    const firstOfMonth = new Date(cy, cm - 1, 1);
    const jsDay = firstOfMonth.getDay(); // 0=Sun..6=Sat
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    const gridStart = new Date(cy, cm - 1, 1 + mondayOffset);
    const cells: { iso: string; dayNum: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      cells.push({
        iso: toISODate(cellDate),
        dayNum: cellDate.getDate(),
        inMonth: cellDate.getMonth() === cm - 1,
      });
    }
    return cells;
  }, [cy, cm]);

  // Hitung 7 hari dalam minggu aktif
  const weekDates = useMemo(() => {
    const base = new Date(cy, cm - 1, cd);
    const jsDay = base.getDay();
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(base);
    monday.setDate(base.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        iso: toISODate(d),
        label: `${DAY_HEADERS[i]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`,
      };
    });
  }, [cy, cm, cd]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kalender Kegiatan Terpadu Kecamatan
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Jadwal terpusat seluruh 7 Sub Bagian/Seksi untuk mencegah bentrok fasilitas dan memantau kepadatan agenda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            aria-label="Filter unit pada kalender"
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
          >
            <option value="ALL">Semua 7 Unit Kerja</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.shortName}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md cursor-pointer">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-slate-700">Tampilkan Pengajuan Proses</span>
          </label>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'month', label: 'Bulanan' },
                { id: 'week', label: 'Mingguan' },
                { id: 'day', label: 'Harian' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda Warna 7 Unit */}
      <div className="bg-white border border-slate-200 rounded-md px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="font-semibold text-slate-700">Kode Warna Unit:</span>
        {units.map((u) => (
          <div key={u.id} className="flex items-center gap-1.5 text-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: u.colorHex }}
            />
            <span>{u.shortName}</span>
          </div>
        ))}
      </div>

      {/* Toolbar Navigasi Tanggal */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateCursor(-1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Periode sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursorDate(today)}
              className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => navigateCursor(1)}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700"
              aria-label="Periode berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="font-display font-semibold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0F294A]" />
            <span>
              {mode === 'day'
                ? formatDateID(cursorDate)
                : `${MONTH_NAMES[cm - 1]} ${cy}`}
            </span>
          </div>
        </div>

        {/* Tampilan Bulanan */}
        {mode === 'month' && (
          <div>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="py-2 px-2 text-center text-[11px] font-semibold text-slate-600"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
              {monthGridDates.map((cell) => {
                const dayEvents = activitiesByDate.get(cell.iso) || [];
                const isToday = cell.iso === today;
                const highDensity = dayEvents.length >= 2;

                return (
                  <div
                    key={cell.iso}
                    className={`min-h-[104px] sm:min-h-[120px] p-1.5 sm:p-2 flex flex-col gap-1 ${
                      cell.inMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setCursorDate(cell.iso);
                          setMode('day');
                        }}
                        className={`font-mono-num text-xs px-1.5 py-0.5 rounded ${
                          isToday
                            ? 'bg-[#0F294A] text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cell.dayNum}
                      </button>
                      {highDensity && (
                        <span
                          className="text-[10px] font-mono-num font-semibold text-amber-700"
                          title="Kepadatan jadwal tinggi lintas seksi"
                        >
                          {dayEvents.length} agenda
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-24">
                      {dayEvents.map((ev) => {
                        const unit = unitMap.get(ev.unitId);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedActivity(ev)}
                            className="w-full text-left px-1.5 py-1 rounded text-[11px] leading-tight text-white transition-opacity hover:opacity-90 truncate block"
                            style={{ backgroundColor: unit?.colorHex || '#1E3A5F' }}
                            title={`${ev.startTime} - ${ev.title}`}
                          >
                            <span className="font-mono-num opacity-90">{ev.startTime}</span>{' '}
                            <span className="font-medium">{ev.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tampilan Mingguan */}
        {mode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {weekDates.map((wd) => {
              const events = activitiesByDate.get(wd.iso) || [];
              const isToday = wd.iso === today;
              return (
                <div key={wd.iso} className="min-h-[260px] flex flex-col">
                  <div
                    className={`px-3 py-2 border-b border-slate-200 text-xs font-semibold ${
                      isToday ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {wd.label}
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {events.length === 0 ? (
                      <div className="text-[11px] text-slate-400 py-4 text-center">
                        Tidak ada agenda
                      </div>
                    ) : (
                      events.map((ev) => {
                        const unit = unitMap.get(ev.unitId);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedActivity(ev)}
                            className="w-full text-left p-2 rounded border border-slate-200 hover:border-blue-500 transition-colors space-y-1 bg-white"
                          >
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: unit?.colorHex }}
                              />
                              <span className="truncate text-slate-700">{unit?.shortName}</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                              {ev.title}
                            </div>
                            <div className="text-[10px] font-mono-num text-slate-500">
                              {ev.startTime}–{ev.endTime} · {ev.location}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tampilan Harian */}
        {mode === 'day' && (
          <div className="p-5 space-y-3">
            {(() => {
              const dayList = activitiesByDate.get(cursorDate) || [];
              if (dayList.length === 0) {
                return (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Belum ada jadwal kegiatan tercatat pada {formatDateID(cursorDate)}.
                  </div>
                );
              }
              return dayList.map((ev) => {
                const unit = unitMap.get(ev.unitId);
                const sub = subByAct.get(ev.id);
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-md border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: unit?.colorHex }}
                        />
                        <span className="font-semibold text-slate-800">{unit?.name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{ev.code}</span>
                      </div>
                      <h4 className="font-display font-semibold text-base text-slate-900">
                        {ev.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                        <span className="inline-flex items-center gap-1 font-mono-num">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ev.startTime} – {ev.endTime} WIB
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {ev.location}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono-num">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {ev.estimatedParticipants} peserta
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <ActivityStatusText status={ev.status} />
                      {sub && (
                        <button
                          type="button"
                          onClick={() => onOpenSpjDetail(ev.id)}
                          className="px-3 py-1.5 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold"
                        >
                          Buka Checklist SPJ
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Modal Detail Kegiatan */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-md max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-mono-num text-slate-500">
                  {selectedActivity.code} · {unitMap.get(selectedActivity.unitId)?.name}
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 mt-1">
                  {selectedActivity.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
                aria-label="Tutup detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Tanggal &amp; Jam</dt>
                <dd className="font-mono-num font-semibold text-slate-900 mt-0.5">
                  {formatDateID(selectedActivity.date)} · {selectedActivity.startTime}–
                  {selectedActivity.endTime}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Lokasi Pelaksanaan</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {selectedActivity.location}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">PIC Kegiatan</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {unitMap.get(selectedActivity.unitId)?.shortName
                    ? `PIC ${unitMap.get(selectedActivity.unitId)?.shortName}`
                    : 'PIC Unit Kerja'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Estimasi Anggaran</dt>
                <dd className="font-mono-num font-semibold text-slate-900 mt-0.5">
                  {formatCurrencyIDR(selectedActivity.budgetEstimate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status Pengajuan</dt>
                <dd className="mt-1">
                  <ActivityStatusText status={selectedActivity.status} />
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Status SPJ</dt>
                <dd className="mt-1">
                  {(() => {
                    const sub = subByAct.get(selectedActivity.id);
                    return sub ? (
                      <SpjStatusText status={sub.overallStatus} />
                    ) : (
                      <span className="text-slate-400">Belum masuk tahap SPJ</span>
                    );
                  })()}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              {subByAct.get(selectedActivity.id) && (
                <button
                  type="button"
                  onClick={() => {
                    const actId = selectedActivity.id;
                    setSelectedActivity(null);
                    onOpenSpjDetail(actId);
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#0F294A] text-white text-xs font-semibold hover:bg-blue-900"
                >
                  Buka Checklist &amp; Verifikasi SPJ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
