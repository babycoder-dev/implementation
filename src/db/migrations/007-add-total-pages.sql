-- 添加 total_pages 字段到 task_files 表
-- 用于存储 PDF 文件的总页数（SRS-03 需求）

ALTER TABLE task_files
ADD COLUMN IF NOT EXISTS total_pages INT DEFAULT 0;

COMMENT ON COLUMN task_files.total_pages IS 'PDF 文件总页数';
