CREATE TABLE t_p85149651_wb_pvz_mobile_app.sounds (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  s3_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);