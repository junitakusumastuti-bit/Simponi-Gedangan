import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  LogIn,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Role, Unit, User } from '../types/database';

interface LoginViewProps {
  users: User[];
  roles: Role[];
  units: Unit[];
  onLoginSuccess: (user: User) => void;
}

type LoginTab = 'pic' | 'superadmin' | 'pimpinan';

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  roles,
  units,
  onLoginSuccess,
}) => {
  const [loginTab, setLoginTab] = useState<LoginTab>('pic');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id ?? 'unit-1');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const coreAccounts = users.filter((u) => u.roleId !== 'OPERATOR_SEKSI');
  const picAccounts = users.filter((u) => u.roleId === 'OPERATOR_SEKSI');

  const handleTabChange = (tab: LoginTab) => {
    setLoginTab(tab);
    setErrorMsg(null);
    setIdentifier('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      setErrorMsg('Masukkan Username atau NIP beserta Kata Sandi.');
      return;
    }

    const matched = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.nip.replace(/\s+/g, '') === cleanId.replace(/\s+/g, '')
    );

    if (!matched || matched.password !== password) {
      setErrorMsg('Username/NIP atau Kata Sandi tidak sesuai.');
      return;
    }

    if (matched.status !== 'Aktif') {
      setErrorMsg('Akun pegawai berstatus Nonaktif. Hubungi Super Admin Kecamatan.');
      return;
    }

    if (loginTab === 'superadmin' && matched.roleId !== 'ADMIN') {
      setErrorMsg('Akun ini bukan akun Super Admin. Gunakan tab PIC atau Pimpinan.');
      return;
    }

    if (loginTab === 'pic') {
      if (matched.roleId !== 'OPERATOR_SEKSI') {
        setErrorMsg('Akun ini bukan akun PIC Sub Bagian/Seksi.');
        return;
      }
      if (matched.unitId !== selectedUnitId) {
        const targetUnit = unitMap.get(selectedUnitId);
        setErrorMsg(
          `Akun ini terdaftar pada ${unitMap.get(matched.unitId)?.shortName}, bukan ${targetUnit?.shortName}.`
        );
        return;
      }
    }

    if (
      loginTab === 'pimpinan' &&
      matched.roleId !== 'VERIFIKATOR_KEUANGAN' &&
      matched.roleId !== 'PIMPINAN'
    ) {
      setErrorMsg('Akun ini bukan akun Verifikator Keuangan atau Pimpinan.');
      return;
    }

    onLoginSuccess(matched);
  };

  const handleSelectQuickAccount = (user: User, autoLogin: boolean) => {
    setErrorMsg(null);
    if (user.roleId === 'ADMIN') {
      setLoginTab('superadmin');
    } else if (user.roleId === 'OPERATOR_SEKSI') {
      setLoginTab('pic');
      setSelectedUnitId(user.unitId);
    } else {
      setLoginTab('pimpinan');
    }
    setIdentifier(user.username);
    setPassword(user.password);
    if (autoLogin) {
      if (user.status !== 'Aktif') {
        setErrorMsg('Akun ini berstatus Nonaktif. Aktifkan melalui akun Super Admin.');
        return;
      }
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
        {/* Panel Kiri: Identitas Instansi & Akses Cepat Super Admin / PIC 7 Unit */}
        <div className="lg:col-span-7 bg-[#0F294A] text-slate-100 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-display font-bold text-lg text-white leading-tight">
                  Simponi Gedangan
                </div>
                <div className="text-xs text-blue-200">
                  Pemerintah Kabupaten Sidoarjo · Kecamatan Gedangan
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h1 className="font-display text-2xl font-bold text-white leading-snug text-balance">
                Sistem Informasi Monitoring Kegiatan &amp; Pelaporan SPJ
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                &ldquo;Sinergi Kegiatan Terjadwal, Pelaporan SPJ Tertib dan Akuntabel.&rdquo;
              </p>
            </div>
          </div>

          {/* Menu Pilihan Cepat Super Admin & PIC 7 Sub Bagian / Seksi */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-blue-200 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk Cepat: Super Admin, Verifikator Keuangan &amp; Pimpinan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {coreAccounts.map((acc) => {
                  const role = roleMap.get(acc.roleId);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectQuickAccount(acc, true)}
                      className="text-left p-2.5 rounded border border-white/15 bg-white/5 hover:bg-white/15 transition-colors"
                    >
                      <div className="text-xs font-semibold text-white truncate">
                        {acc.roleId === 'ADMIN'
                          ? 'Super Admin'
                          : acc.roleId === 'VERIFIKATOR_KEUANGAN'
                          ? 'Verifikator Keu'
                          : 'Camat / Pimpinan'}
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mt-0.5">
                        {acc.name}
                      </div>
                      <div className="font-mono-num text-[10px] text-blue-200 mt-1 truncate">
                        {acc.username} · {role ? 'Masuk' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-blue-200 mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>Masuk Cepat: PIC 7 Sub Bagian / Seksi</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {picAccounts.map((pic) => {
                  const unit = unitMap.get(pic.unitId);
                  return (
                    <button
                      key={pic.id}
                      type="button"
                      onClick={() => handleSelectQuickAccount(pic, true)}
                      className="text-left p-2.5 rounded border border-white/15 bg-white/5 hover:bg-white/15 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {unit?.shortName}
                        </div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {pic.name}
                        </div>
                      </div>
                      <span className="font-mono-num text-[10px] text-blue-200 shrink-0">
                        {pic.username}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Kanan: Formulir Login Kredensial per Peran */}
        <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-center">
          <div className="space-y-1 pb-4 border-b border-slate-100">
            <h2 className="font-display text-xl font-bold text-slate-900">
              Portal Login Pengguna
            </h2>
            <p className="text-xs text-slate-600">
              Pilih jenis akses (PIC Sub Bagian/Seksi, Super Admin, atau Pimpinan) lalu masukkan kredensial Anda.
            </p>
          </div>

          {/* Mode Login Tabs */}
          <div className="mt-4 grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => handleTabChange('pic')}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                loginTab === 'pic'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PIC Unit Kerja
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('superadmin')}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                loginTab === 'superadmin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('pimpinan')}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                loginTab === 'pimpinan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Keu / Pimpinan
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {loginTab === 'pic' && (
              <div>
                <label
                  htmlFor="login-unit"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Pilih Sub Bagian / Seksi
                </label>
                <select
                  id="login-unit"
                  value={selectedUnitId}
                  onChange={(e) => {
                    const nextUnitId = e.target.value;
                    setSelectedUnitId(nextUnitId);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-600"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username atau NIP Pegawai
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    loginTab === 'superadmin'
                      ? 'superadmin'
                      : loginTab === 'pimpinan'
                      ? 'verifikator.keu atau camat.gedangan'
                      : 'Contoh: pic.pembangunan'
                  }
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {loginTab === 'superadmin'
                  ? 'Masuk sebagai Super Admin'
                  : loginTab === 'pimpinan'
                  ? 'Masuk Keuangan / Pimpinan'
                  : 'Masuk sebagai PIC Unit'}
              </span>
            </button>
          </form>

          {/* Panduan Kredensial Uji Coba */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800">
              Kredensial Bawaan Simulasi:
            </div>
            <div className="grid grid-cols-1 gap-1 font-mono-num bg-slate-50 border border-slate-200 rounded p-2.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-700">superadmin</span>
                <span className="text-slate-500">AdminGedangan2026</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-700">verifikator.keu</span>
                <span className="text-slate-500">Keuangan2026</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-700">pic.perenkeu .. pic.kesos</span>
                <span className="text-slate-500">PicUnit1 .. PicUnit7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
