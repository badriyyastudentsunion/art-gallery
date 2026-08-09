-- 1. Function to recalculate all points based on current settings
CREATE OR REPLACE FUNCTION recalculate_all_points()
RETURNS VOID AS $$
BEGIN
    -- Update grade_points based on the latest point_settings
    UPDATE competition_results cr
    SET grade_points = ps.points
    FROM point_settings ps
    WHERE cr.grade = ps.grade;

    -- Update placement_points based on the latest placement_points and competition group sizes
    UPDATE competition_results cr
    SET placement_points = pp.points
    FROM competitions c
    JOIN placement_points pp ON 
        pp.competition_category = CASE 
            WHEN c.group_size = 1 THEN 'individual'
            WHEN c.group_size = 2 THEN 'group_2'
            WHEN c.group_size = 3 THEN 'group_3'
            ELSE 'group_45'
        END
    WHERE cr.competition_id = c.id
      AND cr.position = pp.position;
      
    -- Reset placement_points to 0 for positions > 3 or NULL
    UPDATE competition_results
    SET placement_points = 0
    WHERE position > 3 OR position IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to fetch aggregated team standings dynamically
CREATE OR REPLACE FUNCTION get_team_standings(
    exclude_comps UUID[] DEFAULT '{}'
)
RETURNS TABLE (
    team_id UUID,
    points NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.team_id,
        COALESCE(SUM(cr.placement_points + cr.grade_points), 0)::NUMERIC AS points
    FROM 
        competition_results cr
    JOIN 
        participants p ON cr.participant_id = p.id
    WHERE 
        cr.published = TRUE
        AND (
            array_length(exclude_comps, 1) IS NULL
            OR cr.competition_id != ALL(exclude_comps)
        )
    GROUP BY 
        p.team_id;
END;
$$ LANGUAGE plpgsql;

-- 3. High-speed dashboard listing query for announcer (lightweight & indexed)
CREATE OR REPLACE FUNCTION get_announcer_dashboard_data(p_announcer_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_comps JSONB;
    v_settings JSONB;
BEGIN
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'id', c.id,
            'name', c.name,
            'category_id', c.category_id,
            'competition_type', c.competition_type,
            'group_size', c.group_size,
            'announcer_id', c.announcer_id,
            'created_at', c.created_at,
            'categories', JSONB_BUILD_OBJECT('name', cat.name),
            'competition_schedule', (
                SELECT JSONB_BUILD_OBJECT('scheduled_date', cs.scheduled_date, 'estimated_duration_mins', cs.estimated_duration_mins)
                FROM competition_schedule cs
                WHERE cs.competition_id = c.id
                LIMIT 1
            ),
            'hasJudgeResults', EXISTS(SELECT 1 FROM judge_results jr WHERE jr.competition_id = c.id),
            'published', COALESCE(cr.published, false),
            'published_at', cr.published_at
        ) ORDER BY c.name
    ) INTO v_comps
    FROM competitions c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN (
        SELECT competition_id, bool_or(published) AS published, min(published_at) AS published_at
        FROM competition_results
        GROUP BY competition_id
    ) cr ON c.id = cr.competition_id
    WHERE c.announcer_id = p_announcer_id;

    -- Only select the 4 specific keys needed by Announcer (DO NOT include heavy gallery/event_media data)
    SELECT JSONB_OBJECT_AGG(key, value) INTO v_settings
    FROM app_settings
    WHERE key IN (
        'leaderboard_suspense_active',
        'leaderboard_reveal_threshold',
        'announcer_sequence',
        'leaderboard_revealed_by_admin'
    );

    RETURN JSONB_BUILD_OBJECT(
        'competitions', COALESCE(v_comps, '[]'::jsonb),
        'settings', COALESCE(v_settings, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. High-speed competition result calculation for announcer
CREATE OR REPLACE FUNCTION get_announcer_competition_detail(p_comp_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_group_size INT;
    v_cat_key TEXT;
    v_results JSONB;
BEGIN
    SELECT COALESCE(group_size, 1) INTO v_group_size FROM competitions WHERE id = p_comp_id;
    
    v_cat_key := CASE 
        WHEN v_group_size = 1 THEN 'individual'
        WHEN v_group_size = 2 THEN 'group_2'
        WHEN v_group_size = 3 THEN 'group_3'
        ELSE 'group_45'
    END;

    WITH avg_scores AS (
        SELECT 
            jr.code_letter,
            ROUND(AVG(jr.points_raw)::numeric, 1) AS avg_points,
            SUM(jr.points_raw) AS total_points,
            (ARRAY_AGG(jr.grade))[1] AS grade
        FROM judge_results jr
        WHERE jr.competition_id = p_comp_id
        GROUP BY jr.code_letter
    ),
    participant_data AS (
        SELECT 
            cr.code_letter,
            p.id AS participant_id,
            p.name AS participant_name,
            p.team_id,
            t.name AS team_name
        FROM competition_reports cr
        JOIN participants p ON cr.participant_id = p.id
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE cr.competition_id = p_comp_id
    ),
    ranked AS (
        SELECT 
            a.code_letter,
            a.avg_points,
            a.total_points,
            a.grade,
            pd.participant_id,
            pd.participant_name,
            pd.team_id,
            pd.team_name,
            DENSE_RANK() OVER (ORDER BY a.avg_points DESC, a.grade DESC) AS position
        FROM avg_scores a
        LEFT JOIN participant_data pd ON a.code_letter = pd.code_letter
    )
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'code_letter', r.code_letter,
            'avg_points', r.avg_points,
            'total_points', r.total_points,
            'grade', r.grade,
            'position', r.position,
            'grade_points', COALESCE(ps.points, 0),
            'placement_points', CASE WHEN r.position <= 3 THEN COALESCE(pp.points, 0) ELSE 0 END,
            'participant', CASE WHEN r.participant_id IS NOT NULL THEN JSONB_BUILD_OBJECT(
                'id', r.participant_id,
                'name', r.participant_name,
                'team_id', r.team_id,
                'teams', JSONB_BUILD_OBJECT('name', r.team_name)
            ) ELSE NULL END
        ) ORDER BY r.avg_points DESC
    ) INTO v_results
    FROM ranked r
    LEFT JOIN point_settings ps ON r.grade = ps.grade
    LEFT JOIN placement_points pp ON pp.competition_category = v_cat_key AND pp.position = r.position;

    RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;
