-- Inspico Schema DDL

CREATE TABLE IF NOT EXISTS public.admins (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, username text NOT NULL, role text NOT NULL DEFAULT 'Admin', password text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.teams (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, password text NOT NULL, can_assign boolean DEFAULT true, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.categories (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, is_general boolean DEFAULT false, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.stages (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, capacity integer DEFAULT 0, location text, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.judges (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, username text NOT NULL, password text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.invigilators (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, username text NOT NULL, password text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.announcers (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, username text NOT NULL, password text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.award_users (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, username text NOT NULL, password text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.competitions (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, category_id uuid REFERENCES public.categories(id), stage_id uuid REFERENCES public.stages(id), announcer_id uuid REFERENCES public.announcers(id), competition_type text DEFAULT 'off-stage', is_group boolean DEFAULT false, is_stage boolean DEFAULT false, max_participants integer DEFAULT 1, group_size integer DEFAULT 1, rules_duration text DEFAULT '', rules_description text DEFAULT '', mark_criteria text DEFAULT '', created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.participants (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, team_id uuid REFERENCES public.teams(id), category_id uuid REFERENCES public.categories(id), chess_number text, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.competition_participants (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.competition_invigilators (competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, invigilator_id uuid REFERENCES public.invigilators(id) ON DELETE CASCADE, PRIMARY KEY (competition_id, invigilator_id));

CREATE TABLE IF NOT EXISTS public.competition_judges (competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, judge_id uuid REFERENCES public.judges(id) ON DELETE CASCADE, PRIMARY KEY (competition_id, judge_id));

CREATE TABLE IF NOT EXISTS public.competition_schedule (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, stage_id uuid REFERENCES public.stages(id), scheduled_date date, scheduled_time time without time zone, estimated_duration_mins integer DEFAULT 30, sequence_order integer DEFAULT 0, status text DEFAULT 'scheduled', actual_start_time timestamp with time zone, actual_end_time timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.competition_reports (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, participant_id uuid REFERENCES public.participants(id), chess_number text, code_letter text NOT NULL, reported_by uuid, reported_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.judge_results (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, judge_id uuid REFERENCES public.judges(id), code_letter text NOT NULL, points_raw integer NOT NULL, grade text, submitted_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.competition_results (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE, participant_id uuid REFERENCES public.participants(id), position integer, grade text, avg_points numeric, placement_points integer DEFAULT 0, grade_points integer DEFAULT 0, published boolean DEFAULT false, published_at timestamp with time zone, published_by uuid, prize_given boolean DEFAULT false, prize_given_to_leader boolean DEFAULT false, prize_given_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.point_settings (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, grade text NOT NULL, points integer NOT NULL, min_percent integer NOT NULL, max_percent integer NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.placement_points (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, position integer NOT NULL, points integer NOT NULL, competition_category text NOT NULL);

CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value text, updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.settings (key text PRIMARY KEY, value jsonb NOT NULL);

CREATE TABLE IF NOT EXISTS public.poster_templates (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, html_content text NOT NULL, canvas_width integer DEFAULT 1254, canvas_height integer DEFAULT 1254, result_range text DEFAULT '', layer_mapping jsonb DEFAULT '{}'::jsonb, is_default boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.gallery_media (id text PRIMARY KEY, type text NOT NULL DEFAULT 'photo', thumb_url text, hd_url text, caption text DEFAULT '', milestone integer, competition_id uuid REFERENCES public.competitions(id), uploader_name text DEFAULT 'Media Team', created_at timestamp with time zone DEFAULT timezone('utc'::text, now()));

CREATE TABLE IF NOT EXISTS public.media_presets (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, brightness integer NOT NULL DEFAULT 100, contrast integer NOT NULL DEFAULT 100, saturate integer NOT NULL DEFAULT 100, created_at timestamp with time zone DEFAULT now());
