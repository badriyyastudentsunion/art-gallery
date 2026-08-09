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
