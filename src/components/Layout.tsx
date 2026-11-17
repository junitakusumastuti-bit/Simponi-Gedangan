import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { NavSection, NotificationItem, Role, Unit, User } from '../types/database';
import { formatDateID } from '../utils/spjLogic';

interface LayoutProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  currentUser: User;
  users: User[];
  roles: Role[];
  units: Unit[];
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onNotificationClick: (notif: NotificationItem) => void;
  onQuickCreateActivity: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pengajuan', label: 'Pengajuan Kegiatan', icon: FileText },
  { id: 'kalender', label: 'Kalender Kecamatan', icon: CalendarDays },
  { id: 'monitoring-spj', label: 'Monitoring SPJ', icon: ClipboardCheck },
  { id: 'rekap-unit', label: 'Rekap 7 Unit Kerja', icon: Building2 },
  { id: 'analytics', label: 'Analytics & Insight', icon: BarChart3 },
  { id: 'laporan', label: 'Laporan', icon: FileSpreadsheet },
  { id: 'pengaturan', label: 'Pengaturan Master', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({
  activeNav,
  onSelectNav,
  currentUser,
  users,
  roles,
  units,
  onSwitchUser,
  onLogout,
  notifications,
  onMarkAllRead,
  onNotificationClick,
  onQuickCreateActivity,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userSwitchOpen, setUserSwitchOpen] = useState(false);

  const visibleNavItems =
    currentUser.roleId === 'OPERATOR_SEKSI'
      ? NAV_ITEMS.filter(
          (item) => item.id === 'pengajuan' || item.id === 'monitoring-spj'
        ).map((item) =>
          item.id === 'monitoring-spj'
            ? { ...item, label: 'Upload SPJ Kegiatan' }
            : item
        )
      : currentUser.roleId === 'ADMIN'
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => item.id !== 'pengaturan');

  const activeNavMeta = visibleNavItems.find((n) => n.id === activeNav) ?? NAV_ITEMS.find((n) => n.id === activeNav);
  const currentRole = roles.find((r) => r.id === currentUser.roleId);
  const currentUnit = units.find((u) => u.id === currentUser.unitId);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F294A] text-slate-100 select-none">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base tracking-tight text-white truncate">
              Simponi Gedangan
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              Kecamatan Gedangan
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Navigasi Utama">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectNav(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-400 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active User, Role Switcher & Logout */}
      <div className="p-3 border-t border-white/10 space-y-2 relative">
        <button
          type="button"
          onClick={() => setUserSwitchOpen((prev) => !prev)}
          className="w-full text-left p-2.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-blue-200 truncate">
              {currentRole?.name ?? currentUser.roleId}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {currentUnit?.shortName}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-white/15 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Keluar / Menu Login</span>
        </button>

        {userSwitchOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white text-slate-900 rounded-md border border-slate-200 shadow-lg overflow-hidden z-40">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              Ganti Cepat Akun Uji Coba
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {users.map((u) => {
                const r = roles.find((role) => role.id === u.roleId);
                const unit = units.find((un) => un.id === u.unitId);
                const selected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onSwitchUser(u.id);
                      setUserSwitchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {r?.name} · {unit?.shortName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 h-16 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                Kecamatan Gedangan
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {activeNavMeta?.label ?? 'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                aria-label="Notifikasi sistem"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded bg-red-600 text-white text-[10px] font-mono-num font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-md shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      Notifikasi &amp; Pengingat ({unreadCount} baru)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllRead}
                        className="text-xs text-blue-700 hover:underline font-medium"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center">
                        Belum ada notifikasi terbaru.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            onNotificationClick(n);
                            setNotifOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                            !n.isRead ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-0.5">
                            <span className="font-semibold text-slate-700">{n.type}</span>
                            <span className="font-mono-num">{formatDateID(n.sentAt)}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-900">{n.title}</div>
                          <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA (hanya untuk PIC Unit & Super Admin) */}
            {currentUser.roleId !== 'VERIFIKATOR_KEUANGAN' &&
              currentUser.roleId !== 'PIMPINAN' && (
                <button
                  type="button"
                  onClick={onQuickCreateActivity}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F294A] hover:bg-blue-900 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Ajukan Kegiatan</span>
                </button>
              )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
