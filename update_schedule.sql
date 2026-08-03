-- 1. Add new columns to competition_schedule for Queue System
ALTER TABLE public.competition_schedule
ADD COLUMN IF NOT EXISTS sequence_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_duration_mins integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS actual_start_time timestamptz,
ADD COLUMN IF NOT EXISTS actual_end_time timestamptz,
ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.stages(id);

-- 2. Drop the old stage_number column since we will use stage_id now.
ALTER TABLE public.competition_schedule DROP COLUMN IF EXISTS stage_number;
