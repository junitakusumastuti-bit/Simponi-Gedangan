import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileEdit,
  Send,
  XCircle,
} from 'lucide-react';
import { ActivityStatus, SpjItemStatus, SpjOverallStatus } from '../types/database';

export function ActivityStatusText({ status }: { status: ActivityStatus }) {
  switch (status) {
    case 'Disetujui':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Disetujui</span>
        </span>
      );
    case 'Verifikasi Keuangan':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Verifikasi Keuangan</span>
        </span>
      );
    case 'Diajukan':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Send className="w-3.5 h-3.5 shrink-0" />
          <span>Diajukan</span>
        </span>
      );
    case 'Dijadwalkan Ulang':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Dijadwalkan Ulang</span>
        </span>
      );
    case 'Ditolak':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Ditolak</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
          <FileEdit className="w-3.5 h-3.5 shrink-0" />
          <span>Draft</span>
        </span>
      );
  }
}

export function SpjStatusText({
  status,
  isOverdue,
}: {
  status: SpjOverallStatus;
  isOverdue?: boolean;
}) {
  if (isOverdue && status !== 'Complete') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Terlambat / Overdue</span>
      </span>
    );
  }

  switch (status) {
    case 'Complete':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>SPJ Lengkap</span>
        </span>
      );
    case 'Submitted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Menunggu Verifikasi</span>
        </span>
      );
    case 'Revision':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Perlu Revisi</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Belum Upload</span>
        </span>
      );
  }
}

export function SpjItemStatusText({ status }: { status: SpjItemStatus }) {
  switch (status) {
    case 'Sesuai':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Sesuai / Sah</span>
        </span>
      );
    case 'Menunggu Cek':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Menunggu Cek</span>
        </span>
      );
    case 'Perlu Revisi':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Perlu Revisi</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 whitespace-nowrap">
          <FileEdit className="w-3.5 h-3.5 shrink-0" />
          <span>Belum Unggah</span>
        </span>
      );
  }
}
