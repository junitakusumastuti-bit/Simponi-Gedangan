import React, { useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Database,
  FileCheck,
  History,
  Plus,
  RotateCcw,
  Users,
} from 'lucide-react';
import { POSTGRES_DDL_SCHEMA } from '../data/sqlSchema';
import {
  AuditLog,
  Role,
  SpjChecklistMaster,
  Unit,
  User,
} from '../types/database';
import { formatDateID } from '../utils/spjLogic';

interface MasterSettingsViewProps {
  units: Unit[];
  users: User[];
  roles: Role[];
  currentUser: User;
  checklistMasters: SpjChecklistMaster[];
  auditLogs: AuditLog[];
  onAddChecklistItem: (
    docName: string,
    isMandatory: boolean,
    description: string
  ) => void;
  onCreateUser: (newUser: Omit<User, 'id' | 'status'>) => void;
  onToggleUserStatus: (userId: string) => void;
  onResetDemoData: () => void;
}

type SettingsTab = 'units' | 'checklists' | 'users' | 'audit' | 'schema';

export const MasterSettingsView: React.FC<MasterSettingsViewProps> = ({
  units,
  users,
  roles,
  currentUser,
  checklistMasters,
  auditLogs,
  onAddChecklistItem,
  onCreateUser,
  onToggleUserStatus,
  onResetDemoData,
}) => {
  const [tab, setTab] = useState<SettingsTab>('units');
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const [newUserName, setNewUserName] = useState('');
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserUnitId, setNewUserUnitId] = useState(units[0]?.id || 'unit-1');
  const [newUserRoleId, setNewUserRoleId] = useState<User['roleId']>('OPERATOR_SEKSI');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [userFormNotice, setUserFormNotice] = useState<string | null>(null);

  const isSuperAdmin = currentUser.roleId === 'ADMIN';

  const unitMap = new Map(units.map((u) => [u.id, u]));
  const roleMap = new Map(roles.map((r) => [r.id, r]));

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(POSTGRES_DDL_SCHEMA);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Master, RBAC &amp; Jejak Audit
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Konfigurasi 7 unit kerja Kecamatan Gedangan, template syarat dokumen SPJ, hak akses pegawai, audit log, serta skema database PostgreSQL.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetDemoData}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Data Simulasi</span>
        </button>
      </div>

      {/* Tab Navigasi Pengaturan */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto w-fit max-w-full">
        {(
          [
            { id: 'units', label: '7 Unit Kerja', icon: Building2 },
            { id: 'checklists', label: 'Syarat Dokumen SPJ', icon: FileCheck },
            { id: 'users', label: 'Pegawai & RBAC', icon: Users },
            { id: 'audit', label: `Audit Log (${auditLogs.length})`, icon: History },
            { id: 'schema', label: 'Skema Database SQL', icon: Database },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Master 7 Unit Kerja */}
      {tab === 'units' && (
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200">
            <h3 className="font-display font-semibold text-base text-slate-900">
              Master 7 Unit Kerja Operasional Kecamatan Gedangan
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Sub Bagian / Seksi</th>
                  <th className="py-3 px-4">Kepala Unit Kerja</th>
                  <th className="py-3 px-4">Warna Kalender</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono-num font-semibold text-slate-800">
                      {u.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-700">{u.headName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-mono-num text-[11px]">
                        <span
                          className="w-3.5 h-3.5 rounded-xs border border-slate-200"
                          style={{ backgroundColor: u.colorHex }}
                        />
                        <span>{u.colorHex}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 2: Syarat Dokumen SPJ */}
      {tab === 'checklists' && (
        <section className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-display font-semibold text-base text-slate-900">
              Daftar Dokumen Wajib SPJ Kecamatan Gedangan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar checklist standar yang otomatis diterapkan ketika pengajuan kegiatan disetujui Pimpinan (tenggat default H+7 hari kerja).
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {checklistMasters.map((chk, idx) => (
              <div key={chk.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {idx + 1}. {chk.docName}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{chk.description}</div>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 shrink-0">
                  {chk.isMandatory ? 'Wajib' : 'Opsional'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-800">
              Tambah Item Checklist Baru
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                placeholder="Nama dokumen (misal: Berita Acara Serah Terima)"
                className="px-3 py-2 text-xs border border-slate-200 rounded-md"
              />
              <input
                type="text"
                value={newDocDesc}
                onChange={(e) => setNewDocDesc(e.target.value)}
                placeholder="Keterangan singkat syarat dokumen"
                className="px-3 py-2 text-xs border border-slate-200 rounded-md"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newDocName.trim()) return;
                onAddChecklistItem(
                  newDocName.trim(),
                  true,
                  newDocDesc.trim() || 'Dokumen pendukung kelengkapan SPJ.'
                );
                setNewDocName('');
                setNewDocDesc('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0F294A] text-white text-xs font-semibold hover:bg-blue-900"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Syarat SPJ</span>
            </button>
          </div>
        </section>
      )}

      {/* Tab 3: Pengguna & Hak Akses */}
      {tab === 'users' && (
        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-base text-slate-900">
                  Daftar Akun Super Admin &amp; PIC 7 Sub Bagian / Seksi (RBAC)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola kredensial login untuk Super Admin dan PIC masing-masing unit kerja.
                </p>
              </div>
              {!isSuperAdmin && (
                <span className="text-[11px] font-medium text-slate-500">
                  Masuk sebagai Super Admin untuk menambah atau menonaktifkan akun
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Nama Pegawai &amp; NIP</th>
                    <th className="py-3 px-4">Username Login</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Unit Kerja</th>
                    <th className="py-3 px-4">Role Akses</th>
                    <th className="py-3 px-4">Status</th>
                    {isSuperAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="font-mono-num text-[11px] text-slate-500">
                          NIP. {u.nip}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-num text-xs font-semibold text-slate-800">
                        {u.username}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{u.position}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {unitMap.get(u.unitId)?.shortName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0F294A]">
                        {roleMap.get(u.roleId)?.name}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={
                            u.status === 'Aktif' ? 'text-emerald-700' : 'text-red-700'
                          }
                        >
                          {u.status}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {u.id !== currentUser.id ? (
                            <button
                              type="button"
                              onClick={() => onToggleUserStatus(u.id)}
                              className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-700"
                            >
                              {u.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Akun aktif</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {isSuperAdmin && (
            <section className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-display font-semibold text-sm text-slate-900">
                    Tambah Akun Admin / PIC Sub Bagian Baru
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Super Admin dapat menambahkan akun Admin baru maupun PIC untuk masing-masing 7 Sub Bagian/Seksi.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserRoleId('ADMIN');
                      setNewUserPosition('Admin Sistem Kecamatan');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                      newUserRoleId === 'ADMIN'
                        ? 'bg-[#0F294A] text-white border-[#0F294A]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Mode: Tambah Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserRoleId('OPERATOR_SEKSI');
                      setNewUserPosition('PIC Sub Bagian / Seksi');
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                      newUserRoleId === 'OPERATOR_SEKSI'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Mode: Tambah PIC Unit
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nama Lengkap & Gelar"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={newUserNip}
                  onChange={(e) => setNewUserNip(e.target.value)}
                  placeholder="NIP Pegawai"
                  className="px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={newUserPosition}
                  onChange={(e) => setNewUserPosition(e.target.value)}
                  placeholder="Jabatan (misal: PIC Seksi Kesos)"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md"
                />
                <select
                  value={newUserUnitId}
                  onChange={(e) => setNewUserUnitId(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newUserRoleId}
                  onChange={(e) => setNewUserRoleId(e.target.value as User['roleId'])}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="Username Login (unik)"
                  className="px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md"
                />
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Kata Sandi Login"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="No. WhatsApp / Telepon"
                  className="px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-md"
                />
              </div>

              {userFormNotice && (
                <div className="text-xs font-medium text-slate-800 bg-slate-100 border border-slate-200 rounded p-2.5">
                  {userFormNotice}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (
                    !newUserName.trim() ||
                    !newUserUsername.trim() ||
                    !newUserPassword.trim()
                  ) {
                    setUserFormNotice('Nama, Username, dan Kata Sandi wajib diisi.');
                    return;
                  }
                  const duplicate = users.some(
                    (u) =>
                      u.username.toLowerCase() === newUserUsername.trim().toLowerCase()
                  );
                  if (duplicate) {
                    setUserFormNotice('Username sudah digunakan. Pilih username lain.');
                    return;
                  }
                  onCreateUser({
                    name: newUserName.trim(),
                    nip: newUserNip.trim() || '19950101 202401 1 001',
                    position: newUserPosition.trim() || 'PIC Sub Bagian / Seksi',
                    unitId: newUserUnitId,
                    roleId: newUserRoleId,
                    username: newUserUsername.trim(),
                    password: newUserPassword.trim(),
                    email:
                      newUserEmail.trim() ||
                      `${newUserUsername.trim()}@gedangan.go.id`,
                    phone: newUserPhone.trim() || '0812-0000-0000',
                  });
                  setNewUserName('');
                  setNewUserNip('');
                  setNewUserPosition('');
                  setNewUserUsername('');
                  setNewUserPassword('');
                  setNewUserEmail('');
                  setNewUserPhone('');
                  setUserFormNotice(
                    'Akun baru berhasil ditambahkan dan siap digunakan untuk login.'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Akun Pegawai</span>
              </button>
            </section>
          )}
        </div>
      )}

      {/* Tab 4: Audit Log */}
      {tab === 'audit' && (
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-display font-semibold text-base text-slate-900">
              Jejak Audit Aktivitas &amp; Verifikasi (`audit_logs`)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mencatat setiap pengajuan kegiatan, persetujuan berjenjang, unggah berkas, catatan revisi, hingga pengesahan SPJ Lengkap.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num font-semibold text-[#0F294A]">
                      {log.action}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-800">{log.userName}</span>
                    <span className="text-slate-500">({log.userRole})</span>
                  </div>
                  <div className="text-slate-700">{log.details}</div>
                </div>
                <div className="font-mono-num text-[11px] text-slate-500 shrink-0">
                  {formatDateID(log.timestamp)} · {log.entityId}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 5: Skema Database PostgreSQL */}
      {tab === 'schema' && (
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Skema Database Relasional PostgreSQL (PRD Lampiran C)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                DDL siap pakai dengan foreign key relasional untuk deployment server Pemerintah Kabupaten / Kecamatan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin DDL SQL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
            <code>{POSTGRES_DDL_SCHEMA}</code>
          </pre>
        </section>
      )}
    </div>
  );
};
