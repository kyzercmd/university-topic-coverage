-- ============================================================
-- Supabase SQL Setup for AI Evaluation Backend
-- Run this in the Supabase SQL Editor (in order)
-- ============================================================


-- -----------------------------------------------
-- STEP 1: Enable the pgvector extension
-- -----------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- -----------------------------------------------
-- STEP 2: Create the students table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    email       TEXT        NOT NULL UNIQUE,
    section_id  UUID        NOT NULL
);


-- -----------------------------------------------
-- STEP 3: Create the section_coverage table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS section_coverage (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id      UUID        NOT NULL,
    course_id        UUID        NOT NULL,
    section_id       UUID        NOT NULL,
    topic_name       TEXT        NOT NULL,
    material_context TEXT,
    is_covered       BOOLEAN     NOT NULL DEFAULT FALSE,
    topic_embedding  vector(1536)          -- 1536 dims matches OpenAI text-embedding-ada-002 / text-embedding-3-small
);

-- Optional: IVFFlat index for fast approximate nearest-neighbour search
-- (create AFTER you have inserted data)
-- CREATE INDEX ON section_coverage USING ivfflat (topic_embedding vector_cosine_ops) WITH (lists = 100);


-- -----------------------------------------------
-- STEP 4: Create the teacher_evaluations table
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_evaluations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id  UUID            NOT NULL,
    section_id  UUID            NOT NULL,
    week        INTEGER         NOT NULL CHECK (week >= 1),
    depth_score NUMERIC(4, 2)   NOT NULL CHECK (depth_score BETWEEN 0 AND 10),
    rationale   TEXT
);
