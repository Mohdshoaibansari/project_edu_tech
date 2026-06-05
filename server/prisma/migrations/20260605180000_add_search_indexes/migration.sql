-- Enable trigram extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Students: search by name
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON students USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Staff: search by name
CREATE INDEX IF NOT EXISTS idx_staff_name_trgm ON staff USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Homework: search by title
CREATE INDEX IF NOT EXISTS idx_homework_title_trgm ON homework USING gin (title gin_trgm_ops);

-- Exam: search by title
CREATE INDEX IF NOT EXISTS idx_exams_title_trgm ON exams USING gin (title gin_trgm_ops);
