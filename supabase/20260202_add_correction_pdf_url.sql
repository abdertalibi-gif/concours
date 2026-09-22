-- Add correction_pdf_url column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS correction_pdf_url TEXT;