-- job_image_hashes에 site_protected(저작권/무단이용 금지 문구 유무) 컬럼 추가. 멱등.
ALTER TABLE job_image_hashes ADD COLUMN IF NOT EXISTS site_protected boolean NOT NULL DEFAULT false;
