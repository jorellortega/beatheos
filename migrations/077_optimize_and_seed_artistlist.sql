-- Migration: Optimization and seeding for artistlist tables
-- Description: Additional indexes, views, and sample data for testing

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_label_artists_composite_search ON label_artists(status, priority, artist_class, genre);
CREATE INDEX IF NOT EXISTS idx_label_streaming_platforms_composite ON label_artist_streaming_platforms(label_artist_id, platform, monthly_listeners DESC);
CREATE INDEX IF NOT EXISTS idx_label_checklist_composite ON label_artist_checklist(label_artist_id, category, completed);
CREATE INDEX IF NOT EXISTS idx_production_schedule_composite ON production_schedule(user_id, status, scheduled_date);

-- Create view for label artist summary with streaming stats
CREATE OR REPLACE VIEW label_artist_summary AS
SELECT 
    a.*,
    -- Streaming platform stats
    COALESCE(sp.total_monthly_listeners, 0) as total_monthly_listeners,
    COALESCE(sp.total_followers, 0) as total_followers,
    COALESCE(sp.platform_count, 0) as platform_count,
    -- Checklist progress
    COALESCE(cl.total_tasks, 0) as total_checklist_tasks,
    COALESCE(cl.completed_tasks, 0) as completed_checklist_tasks,
    CASE 
        WHEN cl.total_tasks > 0 THEN ROUND((cl.completed_tasks::decimal / cl.total_tasks::decimal) * 100, 1)
        ELSE 0 
    END as checklist_completion_percentage,
    -- Production schedule
    COALESCE(ps.active_productions, 0) as active_productions,
    COALESCE(ps.overdue_productions, 0) as overdue_productions
FROM label_artists a
LEFT JOIN (
    -- Aggregate streaming platform data
    SELECT 
        label_artist_id,
        SUM(COALESCE(monthly_listeners, 0)) as total_monthly_listeners,
        SUM(COALESCE(followers, 0)) as total_followers,
        COUNT(*) as platform_count
    FROM label_artist_streaming_platforms
    GROUP BY label_artist_id
) sp ON a.id = sp.label_artist_id
LEFT JOIN (
    -- Aggregate checklist data
    SELECT 
        label_artist_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE completed = true) as completed_tasks
    FROM label_artist_checklist
    GROUP BY label_artist_id
) cl ON a.id = cl.label_artist_id
LEFT JOIN (
    -- Aggregate production schedule data
    SELECT 
        label_artist_id,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress')) as active_productions,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_productions
    FROM production_schedule
    GROUP BY label_artist_id
) ps ON a.id = ps.label_artist_id;

-- Function to copy checklist templates for new label artists
CREATE OR REPLACE FUNCTION copy_label_checklist_templates(target_label_artist_id UUID)
RETURNS void AS $$
BEGIN
    -- Copy template checklist items from label_checklist_templates
    INSERT INTO label_artist_checklist (
        label_artist_id, category, task, description, priority, created_by
    )
    SELECT 
        target_label_artist_id,
        category,
        task,
        description,
        priority,
        auth.uid()
    FROM label_checklist_templates
    WHERE NOT EXISTS (
        SELECT 1 FROM label_artist_checklist existing
        WHERE existing.label_artist_id = target_label_artist_id
        AND existing.task = label_checklist_templates.task
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically copy checklist templates when new label artist is created
CREATE OR REPLACE FUNCTION auto_copy_label_checklist_templates()
RETURNS TRIGGER AS $$
BEGIN
    -- Copy checklist templates for new label artist
    PERFORM copy_label_checklist_templates(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_copy_label_checklist_templates_trigger
    AFTER INSERT ON label_artists
    FOR EACH ROW
    EXECUTE FUNCTION auto_copy_label_checklist_templates();

-- Sample data for testing (only insert if no label artists exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM label_artists LIMIT 1) THEN
        -- Insert sample label artists
        INSERT INTO label_artists (
            id, name, stage_name, email, genre, subgenre, artist_class, 
            priority, performance_score, bio, location, manager, label, rank,
            contract_start, contract_end, royalty_rate, revenue, growth_rate,
            engagement_rate, market_potential, distributors, country, real_name
        ) VALUES 
        (
            '11111111-1111-1111-1111-111111111111'::uuid,
            'Marcus Johnson',
            'M.J. The Producer',
            'marcus@example.com',
            'Hip Hop',
            'Trap',
            'platinum',
            'high',
            85,
            'Grammy-nominated producer with over 50 million streams',
            'Atlanta, GA',
            'Sarah Williams',
            'Empire Records',
            'A',
            '2023-01-15',
            '2026-01-15',
            15.0,
            85000.00,
            12.5,
            8.7,
            92,
            ARRAY['Sony Music', 'Spotify', 'Apple Music'],
            'USA',
            'Marcus Anthony Johnson'
        ),
        (
            '22222222-2222-2222-2222-222222222222'::uuid,
            'Luna Rodriguez',
            'Luna',
            'luna@example.com',
            'Pop',
            'Electropop',
            'gold',
            'high',
            78,
            'Rising pop star with viral TikTok hits',
            'Los Angeles, CA',
            'Mike Chen',
            'Universal Music',
            'A',
            '2023-06-01',
            '2025-06-01',
            12.5,
            45000.00,
            25.3,
            15.2,
            88,
            ARRAY['Universal', 'TikTok Music'],
            'USA',
            'Luna Maria Rodriguez'
        ),
        (
            '33333333-3333-3333-3333-333333333333'::uuid,
            'David Thompson',
            'D-Thom',
            'david@example.com',
            'R&B',
            'Contemporary R&B',
            'silver',
            'medium',
            72,
            'Soulful R&B artist with smooth vocals',
            'Chicago, IL',
            'Lisa Johnson',
            'Independent',
            'B',
            '2024-01-01',
            '2025-12-31',
            10.0,
            18000.00,
            8.9,
            12.1,
            75,
            ARRAY['CD Baby', 'Spotify'],
            'USA',
            'David Michael Thompson'
        );

        -- Insert sample streaming platform data
        INSERT INTO label_artist_streaming_platforms (
            label_artist_id, platform, monthly_listeners, followers, streams
        ) VALUES 
        ('11111111-1111-1111-1111-111111111111'::uuid, 'spotify', 320000, 89000, 15000000),
        ('11111111-1111-1111-1111-111111111111'::uuid, 'apple_music', 145000, 67000, 8500000),
        ('11111111-1111-1111-1111-111111111111'::uuid, 'soundcloud', NULL, 45000, 2500000),
        ('22222222-2222-2222-2222-222222222222'::uuid, 'spotify', 180000, 95000, 7200000),
        ('22222222-2222-2222-2222-222222222222'::uuid, 'apple_music', 78000, 34000, 3100000),
        ('22222222-2222-2222-2222-222222222222'::uuid, 'tidal', 12000, 8500, 450000),
        ('33333333-3333-3333-3333-333333333333'::uuid, 'spotify', 45000, 23000, 1800000),
        ('33333333-3333-3333-3333-333333333333'::uuid, 'apple_music', 28000, 15000, 950000);

        -- Insert sample production schedule items
        INSERT INTO production_schedule (
            title, description, type, status, priority, scheduled_date, due_date,
            label_artist_id, artist_name, user_id
        ) VALUES 
        (
            'Release for Marcus Johnson',
            'New album production and release',
            'album_production',
            'in_progress',
            'high',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            '11111111-1111-1111-1111-111111111111'::uuid,
            'Marcus Johnson',
            (SELECT id FROM auth.users LIMIT 1)
        ),
        (
            'Luna Single Drop',
            'Summer hit single release',
            'single_release',
            'scheduled',
            'high',
            CURRENT_DATE + INTERVAL '14 days',
            CURRENT_DATE + INTERVAL '21 days',
            '22222222-2222-2222-2222-222222222222'::uuid,
            'Luna Rodriguez',
            (SELECT id FROM auth.users LIMIT 1)
        );

        RAISE NOTICE 'Sample label artist data inserted successfully';
    ELSE
        RAISE NOTICE 'Label artists already exist, skipping sample data insertion';
    END IF;
END $$;
