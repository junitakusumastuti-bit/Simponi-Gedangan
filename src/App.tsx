import { useEffect, useState } from 'react';
import { ActivitySubmissionView } from './components/ActivitySubmissionView';
import { AnalyticsInsightView } from './components/AnalyticsInsightView';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
import { Layout } from './components/Layout';
import { LoginView } from './components/LoginView';
import { MasterSettingsView } from './components/MasterSettingsView';
import { ReportsView } from './components/ReportsView';
import { SpjMonitoringView } from './components/SpjMonitoringView';
import { UnitRecapView } from './components/UnitRecapView';
import {
  SEED_ACTIVITIES,
  SEED_APPROVALS,
  SEED_AUDIT_LOGS,
  SEED_CHECKLIST_MASTERS,
  SEED_NOTIFICATIONS,
  SEED_ROLES,
  SEED_SPJ_DOCUMENTS,
  SEED_SPJ_SUBMISSIONS,
  SEED_UNITS,
  SEED_USERS,
} from './data/seedData';
import {
  Activity,
  ActivityApproval,
  ActivityStatus,
  AuditLog,
  NavSection,
  NotificationItem,
  SpjChecklistMaster,
  SpjDocument,
  SpjSubmission,
  User,
} from './types/database';
import { addWorkingDays } from './utils/spjLogic';

const STORAGE_KEY = 'simponi_gedangan_state_v2';

interface AppState {
  currentUserId: string | null;
  users: User[];
  activities: Activity[];
  approvals: ActivityApproval[];
  submissions: SpjSubmission[];
  documents: SpjDocument[];
  checklistMasters: SpjChecklistMaster[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

function getInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && Array.isArray(parsed.activities) && Array.isArray(parsed.submissions)) {
        return {
          currentUserId: parsed.currentUserId ?? null,
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : SEED_USERS,
          activities: parsed.activities,
          approvals: parsed.approvals ?? SEED_APPROVALS,
          submissions: parsed.submissions,
          documents: parsed.documents ?? SEED_SPJ_DOCUMENTS,
          checklistMasters:
            Array.isArray(parsed.checklistMasters) && parsed.checklistMasters.length > 0
              ? Array.from(
                  new Map(
                    parsed.checklistMasters.map((c) => [c.docName, c])
                  ).values()
                )
              : SEED_CHECKLIST_MASTERS,
          notifications: parsed.notifications ?? SEED_NOTIFICATIONS,
          auditLogs: parsed.auditLogs ?? SEED_AUDIT_LOGS,
        };
      }
    }
  } catch {
    // Gunakan seed data jika localStorage tidak tersedia atau rusak
  }
  return {
    currentUserId: null,
    users: SEED_USERS,
    activities: SEED_ACTIVITIES,
    approvals: SEED_APPROVALS,
    submissions: SEED_SPJ_SUBMISSIONS,
    documents: SEED_SPJ_DOCUMENTS,
    checklistMasters: SEED_CHECKLIST_MASTERS,
    notifications: SEED_NOTIFICATIONS,
    auditLogs: SEED_AUDIT_LOGS,
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [selectedSpjActivityId, setSelectedSpjActivityId] = useState<string | null>(
    'act-08'
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Abaikan kuota penyimpanan penuh jika ada unggahan file besar
    }
  }, [state]);

  const currentUser = state.currentUserId
    ? state.users.find((u) => u.id === state.currentUserId) ?? null
    : null;

  const makeAuditLog = (
    action: string,
    entity: AuditLog['entity'],
    entityId: string,
    details: string,
    actor = currentUser
  ): AuditLog => ({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: actor?.id ?? 'system',
    userName: actor?.name ?? 'Sistem',
    userRole: actor
      ? SEED_ROLES.find((r) => r.id === actor.roleId)?.name ?? actor.roleId
      : 'Sistem',
    action,
    entity,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  });

  const handleCreateActivity = (
    payload: Omit<Activity, 'id' | 'code' | 'createdAt' | 'creatorId'>,
    submitImmediately: boolean
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const nextNum = state.activities.length + 1101;
    const newId = `act-${Date.now()}`;
    const newCode = `KEG-2026-${nextNum}`;

    const newAct: Activity = {
      ...payload,
      id: newId,
      code: newCode,
      creatorId: currentUser.id,
      createdAt: nowIso,
    };

    const newApprovals: ActivityApproval[] = submitImmediately
      ? [
          {
            id: `apr-${Date.now()}`,
            activityId: newId,
            approverId: currentUser.id,
            approverName: currentUser.name,
            stage: 'Pengajuan Seksi',
            action: 'Diajukan',
            note: 'Pengajuan baru dikirim melalui formulir Simponi Gedangan.',
            timestamp: nowIso,
          },
        ]
      : [];

    const newNotifs: NotificationItem[] = submitImmediately
      ? [
          {
            id: `notif-${Date.now()}`,
            userId: 'user-verif',
            activityId: newId,
            type: 'Approval',
            title: 'Pengajuan Kegiatan Baru',
            message: `${newAct.title} (${newCode}) menunggu verifikasi Perencanaan & Keuangan.`,
            isRead: false,
            sentAt: nowIso,
          },
        ]
      : [];

    const log = makeAuditLog(
      submitImmediately ? 'SUBMIT_ACTIVITY' : 'SAVE_DRAFT_ACTIVITY',
      'activities',
      newId,
      `${submitImmediately ? 'Mengajukan' : 'Menyimpan draft'} kegiatan "${newAct.title}" (${newCode}) tanggal ${newAct.date}.`
    );

    setState((prev) => ({
      ...prev,
      activities: [newAct, ...prev.activities],
      approvals: [...newApprovals, ...prev.approvals],
      notifications: [...newNotifs, ...prev.notifications],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleAdvanceApproval = (
    activityId: string,
    action: 'Diajukan' | 'Disetujui' | 'Revisi' | 'Ditolak' | 'Dijadwalkan Ulang',
    note: string,
    asLeader = false
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const targetAct = state.activities.find((a) => a.id === activityId);
    if (!targetAct) return;

    const actingAsLeader =
      currentUser.roleId === 'PIMPINAN' ||
      (asLeader && currentUser.roleId === 'ADMIN');

    let nextStatus: ActivityStatus = targetAct.status;
    let stage: ActivityApproval['stage'] = 'Pengajuan Seksi';

    if (targetAct.status === 'Draft' || targetAct.status === 'Dijadwalkan Ulang') {
      stage = 'Pengajuan Seksi';
      nextStatus = 'Diajukan';
    } else if (targetAct.status === 'Diajukan') {
      if (actingAsLeader) {
        stage = 'Persetujuan Pimpinan';
        nextStatus =
          action === 'Disetujui'
            ? 'Disetujui'
            : action === 'Ditolak'
            ? 'Ditolak'
            : 'Dijadwalkan Ulang';
      } else {
        stage = 'Verifikasi Perencanaan & Keuangan';
        nextStatus =
          action === 'Disetujui'
            ? 'Verifikasi Keuangan'
            : action === 'Ditolak'
            ? 'Ditolak'
            : 'Dijadwalkan Ulang';
      }
    } else if (targetAct.status === 'Verifikasi Keuangan') {
      stage = 'Persetujuan Pimpinan';
      nextStatus =
        action === 'Disetujui'
          ? 'Disetujui'
          : action === 'Ditolak'
          ? 'Ditolak'
          : 'Dijadwalkan Ulang';
    }

    const approvalEntry: ActivityApproval = {
      id: `apr-${Date.now()}`,
      activityId,
      approverId: currentUser.id,
      approverName: currentUser.name,
      stage,
      action,
      note,
      timestamp: nowIso,
    };

    // Jika resmi Disetujui Pimpinan, buat record SPJ & Checklist H+7 otomatis
    let newSubmission: SpjSubmission | null = null;
    let newDocs: SpjDocument[] = [];
    const alreadyHasSpj = state.submissions.some((s) => s.activityId === activityId);

    if (nextStatus === 'Disetujui' && !alreadyHasSpj) {
      const dueDate = addWorkingDays(targetAct.date, 7);
      const subId = `spj-${activityId}`;

      newSubmission = {
        id: subId,
        activityId,
        dueDate,
        submittedAt: null,
        verifiedAt: null,
        verifierId: null,
        overallStatus: 'Pending',
        revisionCount: 0,
      };

      const templates = state.checklistMasters;
      newDocs = templates.map((tpl, idx) => ({
        id: `doc-${subId}-${idx + 1}`,
        spjSubmissionId: subId,
        checklistMasterId: tpl.id,
        docName: tpl.docName,
        isMandatory: tpl.isMandatory,
        fileName: null,
        fileSizeKb: null,
        fileType: null,
        filePreviewUrl: null,
        uploadedBy: null,
        uploadedAt: null,
        itemStatus: 'Belum Unggah',
        verifierNote: '',
      }));
    }

    const newNotifs: NotificationItem[] = [
      {
        id: `notif-${Date.now()}`,
        userId: targetAct.creatorId,
        activityId,
        type: 'Approval',
        title: `Status Kegiatan: ${nextStatus}`,
        message: `${targetAct.title} (${targetAct.code}) kini berstatus ${nextStatus}.`,
        isRead: false,
        sentAt: nowIso,
      },
    ];

    if (nextStatus === 'Verifikasi Keuangan') {
      newNotifs.push({
        id: `notif-camat-${Date.now()}`,
        userId: 'user-camat',
        activityId,
        type: 'Approval',
        title: 'Menunggu Persetujuan Camat',
        message: `${targetAct.title} (${targetAct.code}) telah lolos verifikasi keuangan dan menunggu persetujuan pimpinan.`,
        isRead: false,
        sentAt: nowIso,
      });
    }

    const log = makeAuditLog(
      `APPROVAL_${action.toUpperCase()}`,
      'activity_approvals',
      activityId,
      `${stage}: ${action} untuk ${targetAct.code} (${targetAct.title}). Catatan: ${note}`
    );

    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === activityId ? { ...a, status: nextStatus } : a
      ),
      approvals: [approvalEntry, ...prev.approvals],
      submissions: newSubmission ? [newSubmission, ...prev.submissions] : prev.submissions,
      documents: newDocs.length > 0 ? [...prev.documents, ...newDocs] : prev.documents,
      notifications: [...newNotifs, ...prev.notifications],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleDeleteDraftActivity = (activityId: string) => {
    if (!currentUser) return;
    const targetAct = state.activities.find((a) => a.id === activityId);
    if (!targetAct || targetAct.status !== 'Draft') return;
    const allowed =
      currentUser.roleId === 'ADMIN' ||
      (currentUser.roleId === 'OPERATOR_SEKSI' &&
        targetAct.unitId === currentUser.unitId);
    if (!allowed) return;

    const log = makeAuditLog(
      'DELETE_DRAFT_ACTIVITY',
      'activities',
      activityId,
      `Menghapus draft kegiatan "${targetAct.title}" (${targetAct.code}).`
    );

    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== activityId),
      approvals: prev.approvals.filter((ap) => ap.activityId !== activityId),
      notifications: prev.notifications.filter((n) => n.activityId !== activityId),
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleUploadSpjFile = (
    documentId: string,
    fileName: string,
    fileSizeKb: number,
    fileType: string,
    filePreviewUrl: string | null
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const doc = state.documents.find((d) => d.id === documentId);
    if (!doc) return;

    const log = makeAuditLog(
      'UPLOAD_SPJ_DOCUMENT',
      'spj_documents',
      doc.spjSubmissionId,
      `Mengunggah "${fileName}" pada item checklist ${doc.docName}.`
    );

    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === documentId
          ? {
              ...d,
              fileName,
              fileSizeKb,
              fileType,
              filePreviewUrl,
              uploadedBy: currentUser.name,
              uploadedAt: nowIso,
              itemStatus: 'Menunggu Cek',
              verifierNote: '',
            }
          : d
      ),
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleSubmitSpjBundle = (submissionId: string) => {
    const nowIso = new Date().toISOString();
    const sub = state.submissions.find((s) => s.id === submissionId);
    const act = sub ? state.activities.find((a) => a.id === sub.activityId) : undefined;
    if (!sub || !act) return;

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: 'user-verif',
      activityId: act.id,
      type: 'Approval',
      title: 'Berkas SPJ Siap Diverifikasi',
      message: `${act.title} (${act.code}) telah diajukan untuk pemeriksaan Perencanaan & Keuangan.`,
      isRead: false,
      sentAt: nowIso,
    };

    const log = makeAuditLog(
      'SUBMIT_SPJ_BUNDLE',
      'spj_submissions',
      submissionId,
      `Mengajukan kelengkapan berkas SPJ ${act.code} untuk verifikasi Keuangan.`
    );

    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId
          ? { ...s, overallStatus: 'Submitted', submittedAt: nowIso }
          : s
      ),
      notifications: [notif, ...prev.notifications],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleVerifySpjItem = (
    documentId: string,
    status: 'Sesuai' | 'Perlu Revisi',
    note: string
  ) => {
    const doc = state.documents.find((d) => d.id === documentId);
    if (!doc) return;

    const log = makeAuditLog(
      status === 'Sesuai' ? 'VERIFY_DOC_VALID' : 'MARK_DOC_REVISION',
      'spj_documents',
      doc.spjSubmissionId,
      `Menandai item "${doc.docName}" sebagai ${status}${note ? `: ${note}` : '.'}`
    );

    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === documentId
          ? { ...d, itemStatus: status, verifierNote: note }
          : d
      ),
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleFinalizeSpjVerification = (
    submissionId: string,
    decision: 'Revision' | 'Complete',
    generalNote: string
  ) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();
    const sub = state.submissions.find((s) => s.id === submissionId);
    const act = sub ? state.activities.find((a) => a.id === sub.activityId) : undefined;
    if (!sub || !act) return;

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId: act.creatorId,
      activityId: act.id,
      type: decision === 'Complete' ? 'SPJ Sah' : 'Revisi SPJ',
      title:
        decision === 'Complete'
          ? 'SPJ Disahkan Lengkap'
          : 'SPJ Dikembalikan untuk Revisi',
      message:
        decision === 'Complete'
          ? `SPJ kegiatan ${act.title} (${act.code}) dinyatakan LENGKAP & SAH.`
          : `SPJ ${act.code} perlu perbaikan: ${generalNote}`,
      isRead: false,
      sentAt: nowIso,
    };

    const log = makeAuditLog(
      decision === 'Complete' ? 'VERIFY_SPJ_COMPLETE' : 'RETURN_SPJ_REVISION',
      'spj_submissions',
      submissionId,
      `${decision === 'Complete' ? 'Mengesahkan SPJ Lengkap' : 'Mengembalikan SPJ untuk Revisi'} pada ${act.code}. Catatan: ${generalNote}`
    );

    setState((prev) => ({
      ...prev,
      submissions: prev.submissions.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              overallStatus: decision,
              verifierId: currentUser.id,
              verifiedAt: decision === 'Complete' ? nowIso : null,
              revisionCount:
                decision === 'Revision' ? s.revisionCount + 1 : s.revisionCount,
              generalNote,
            }
          : s
      ),
      notifications: [notif, ...prev.notifications],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleAddChecklistItem = (
    docName: string,
    isMandatory: boolean,
    description: string
  ) => {
    const newItem: SpjChecklistMaster = {
      id: `chk-${Date.now()}`,
      activityTypeId: 'default',
      docName,
      isMandatory,
      description,
    };
    const log = makeAuditLog(
      'ADD_CHECKLIST_MASTER',
      'master_data',
      newItem.id,
      `Menambahkan syarat dokumen SPJ "${docName}".`
    );

    setState((prev) => ({
      ...prev,
      checklistMasters: [...prev.checklistMasters, newItem],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleCreateUser = (payload: Omit<User, 'id' | 'status'>) => {
    const newUser: User = {
      ...payload,
      id: `user-${Date.now()}`,
      status: 'Aktif',
    };
    const log = makeAuditLog(
      'CREATE_USER_ACCOUNT',
      'master_data',
      newUser.id,
      `Super Admin membuat akun login ${newUser.username} (${newUser.name}) untuk unit ${newUser.unitId}.`
    );
    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleToggleUserStatus = (userId: string) => {
    const target = state.users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const log = makeAuditLog(
      'TOGGLE_USER_STATUS',
      'master_data',
      userId,
      `Mengubah status akun ${target.username} menjadi ${nextStatus}.`
    );
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === userId ? { ...u, status: nextStatus } : u
      ),
      auditLogs: [log, ...prev.auditLogs],
    }));
  };

  const handleResetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentUserId: currentUser?.id ?? null,
      users: SEED_USERS,
      activities: SEED_ACTIVITIES,
      approvals: SEED_APPROVALS,
      submissions: SEED_SPJ_SUBMISSIONS,
      documents: SEED_SPJ_DOCUMENTS,
      checklistMasters: SEED_CHECKLIST_MASTERS,
      notifications: SEED_NOTIFICATIONS,
      auditLogs: SEED_AUDIT_LOGS,
    });
  };

  if (!currentUser) {
    return (
      <LoginView
        users={state.users}
        roles={SEED_ROLES}
        units={SEED_UNITS}
        onLoginSuccess={(user) => {
          const log = makeAuditLog(
            'USER_LOGIN',
            'master_data',
            user.id,
            `Pengguna ${user.name} (${user.username}) masuk ke sistem.`,
            user
          );
          setActiveNav(user.roleId === 'OPERATOR_SEKSI' ? 'pengajuan' : 'dashboard');
          setState((prev) => ({
            ...prev,
            currentUserId: user.id,
            auditLogs: [log, ...prev.auditLogs],
          }));
        }}
      />
    );
  }

  const effectiveNav: NavSection =
    currentUser.roleId === 'OPERATOR_SEKSI'
      ? activeNav === 'monitoring-spj'
        ? 'monitoring-spj'
        : 'pengajuan'
      : currentUser.roleId !== 'ADMIN' && activeNav === 'pengaturan'
      ? 'dashboard'
      : activeNav;

  const visibleNotifications =
    currentUser.roleId === 'OPERATOR_SEKSI'
      ? state.notifications.filter((n) => {
          const act = state.activities.find((a) => a.id === n.activityId);
          return n.userId === currentUser.id || act?.unitId === currentUser.unitId;
        })
      : state.notifications;

  return (
    <Layout
      activeNav={effectiveNav}
      onSelectNav={setActiveNav}
      currentUser={currentUser}
      users={state.users}
      roles={SEED_ROLES}
      units={SEED_UNITS}
      onSwitchUser={(userId) => {
        const nextUser = state.users.find((u) => u.id === userId);
        if (nextUser) {
          setActiveNav(
            nextUser.roleId === 'OPERATOR_SEKSI' ? 'pengajuan' : 'dashboard'
          );
        }
        setState((prev) => ({ ...prev, currentUserId: userId }));
      }}
      onLogout={() => {
        const log = makeAuditLog(
          'USER_LOGOUT',
          'master_data',
          currentUser.id,
          `Pengguna ${currentUser.name} keluar dari sesi Simponi Gedangan.`,
          currentUser
        );
        setState((prev) => ({
          ...prev,
          currentUserId: null,
          auditLogs: [log, ...prev.auditLogs],
        }));
      }}
      notifications={visibleNotifications}
      onMarkAllRead={() =>
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        }))
      }
      onNotificationClick={(notif) => {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notif.id ? { ...n, isRead: true } : n
          ),
        }));
        if (notif.type === 'Approval') {
          setActiveNav('pengajuan');
        } else {
          setSelectedSpjActivityId(notif.activityId);
          setActiveNav('monitoring-spj');
        }
      }}
      onQuickCreateActivity={() => setActiveNav('pengajuan')}
    >
      {effectiveNav === 'dashboard' && (
        <DashboardView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
          currentUser={currentUser}
          onNavigate={setActiveNav}
          onOpenSpjDetail={(actId) => {
            setSelectedSpjActivityId(actId);
            setActiveNav('monitoring-spj');
          }}
          onOpenActivityQueue={() => setActiveNav('pengajuan')}
          onAdvanceApproval={handleAdvanceApproval}
        />
      )}

      {effectiveNav === 'pengajuan' && (
        <ActivitySubmissionView
          units={SEED_UNITS}
          activities={state.activities}
          currentUser={currentUser}
          onCreateActivity={handleCreateActivity}
          onAdvanceApproval={handleAdvanceApproval}
          onDeleteDraftActivity={handleDeleteDraftActivity}
        />
      )}

      {effectiveNav === 'kalender' && (
        <CalendarView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
          onOpenSpjDetail={(actId) => {
            setSelectedSpjActivityId(actId);
            setActiveNav('monitoring-spj');
          }}
        />
      )}

      {effectiveNav === 'monitoring-spj' && (
        <SpjMonitoringView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
          documents={state.documents}
          currentUser={currentUser}
          selectedActivityId={selectedSpjActivityId}
          onSelectActivityId={setSelectedSpjActivityId}
          onUploadSpjFile={handleUploadSpjFile}
          onSubmitSpjBundle={handleSubmitSpjBundle}
          onVerifySpjItem={handleVerifySpjItem}
          onFinalizeSpjVerification={handleFinalizeSpjVerification}
        />
      )}

      {effectiveNav === 'rekap-unit' && (
        <UnitRecapView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
          onFilterUnitToSpj={(unitId) => {
            const firstMatch = state.activities.find(
              (a) =>
                a.unitId === unitId &&
                state.submissions.some((s) => s.activityId === a.id)
            );
            if (firstMatch) setSelectedSpjActivityId(firstMatch.id);
            setActiveNav('monitoring-spj');
          }}
        />
      )}

      {effectiveNav === 'analytics' && (
        <AnalyticsInsightView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
          documents={state.documents}
        />
      )}

      {effectiveNav === 'laporan' && (
        <ReportsView
          units={SEED_UNITS}
          activities={state.activities}
          submissions={state.submissions}
        />
      )}

      {effectiveNav === 'pengaturan' && (
        <MasterSettingsView
          units={SEED_UNITS}
          users={state.users}
          roles={SEED_ROLES}
          currentUser={currentUser}
          checklistMasters={state.checklistMasters}
          auditLogs={state.auditLogs}
          onAddChecklistItem={handleAddChecklistItem}
          onCreateUser={handleCreateUser}
          onToggleUserStatus={handleToggleUserStatus}
          onResetDemoData={handleResetDemoData}
        />
      )}
    </Layout>
  );
}
