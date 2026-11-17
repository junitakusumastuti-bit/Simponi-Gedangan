export const POSTGRES_DDL_SCHEMA = `-- Skema Database Relasional PostgreSQL — Simponi Gedangan
-- Mengacu pada PRD Lampiran C: Data Model Awal (ACID-Compliant)

CREATE TABLE units (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  short_name VARCHAR(60) NOT NULL,
  head_name VARCHAR(120) NOT NULL,
  color_hex VARCHAR(7) NOT NULL DEFAULT '#1E3A5F',
  status VARCHAR(20) NOT NULL DEFAULT 'Aktif'
);

CREATE TABLE roles (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  nip VARCHAR(30) UNIQUE NOT NULL,
  position VARCHAR(120) NOT NULL,
  unit_id VARCHAR(36) NOT NULL REFERENCES units(id),
  role_id VARCHAR(30) NOT NULL REFERENCES roles(id),
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'Aktif'
);

CREATE TABLE activity_types (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  default_spj_deadline_days INTEGER NOT NULL DEFAULT 7
);

CREATE TABLE spj_checklist_masters (
  id VARCHAR(36) PRIMARY KEY,
  activity_type_id VARCHAR(36) NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  doc_name VARCHAR(150) NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT
);

CREATE TABLE activities (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  unit_id VARCHAR(36) NOT NULL REFERENCES units(id),
  creator_id VARCHAR(36) NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  activity_type_id VARCHAR(36) NOT NULL REFERENCES activity_types(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(150) NOT NULL,
  estimated_participants INTEGER NOT NULL DEFAULT 0,
  budget_estimate NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pic_name VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_activities_schedule ON activities (date, location, status);

CREATE TABLE activity_approvals (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  approver_id VARCHAR(36) NOT NULL REFERENCES users(id),
  stage VARCHAR(60) NOT NULL,
  action VARCHAR(30) NOT NULL,
  note TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spj_submissions (
  id VARCHAR(36) PRIMARY KEY,
  activity_id VARCHAR(36) UNIQUE NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  due_date DATE NOT NULL, -- Otomatis H+7 hari kerja pasca tanggal kegiatan
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verifier_id VARCHAR(36) REFERENCES users(id),
  overall_status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending | Submitted | Revision | Complete
  revision_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE spj_documents (
  id VARCHAR(36) PRIMARY KEY,
  spj_submission_id VARCHAR(36) NOT NULL REFERENCES spj_submissions(id) ON DELETE CASCADE,
  checklist_master_id VARCHAR(36) NOT NULL REFERENCES spj_checklist_masters(id),
  file_url TEXT,
  uploaded_by VARCHAR(36) REFERENCES users(id),
  uploaded_at TIMESTAMPTZ,
  item_status VARCHAR(30) NOT NULL DEFAULT 'Belum Unggah',
  verifier_note TEXT
);

CREATE TABLE spj_verifications (
  id VARCHAR(36) PRIMARY KEY,
  spj_submission_id VARCHAR(36) NOT NULL REFERENCES spj_submissions(id) ON DELETE CASCADE,
  verifier_id VARCHAR(36) NOT NULL REFERENCES users(id),
  decision VARCHAR(30) NOT NULL,
  summary_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  activity_id VARCHAR(36) REFERENCES activities(id),
  type VARCHAR(40) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(60) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
