-- SQL commands to fix duplicate EventSettings
-- Run these in your Django shell or database directly

-- 1. Check for duplicates
SELECT event_id, COUNT(*) as count 
FROM core_eventsettings 
GROUP BY event_id 
HAVING COUNT(*) > 1;

-- 2. Delete duplicates (keep the oldest one)
DELETE FROM core_eventsettings 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM core_eventsettings 
    GROUP BY event_id
);

-- 3. Verify no duplicates remain
SELECT event_id, COUNT(*) as count 
FROM core_eventsettings 
GROUP BY event_id 
HAVING COUNT(*) > 1;

-- 4. Check for events without EventSettings
SELECT e.id, e.title 
FROM core_event e 
LEFT JOIN core_eventsettings es ON e.id = es.event_id 
WHERE es.event_id IS NULL;

-- 5. Create missing EventSettings (run for each missing event)
-- INSERT INTO core_eventsettings (event_id, max_posts_per_guest, max_image_per_post, max_video_per_post, max_voice_per_post, require_approval, allow_anonymous, public_gallery, show_guest_names, max_photo_size, max_video_size, max_voice_size, max_video_duration, max_voice_duration, allowed_photo_formats, allowed_video_formats, allowed_voice_formats)
-- VALUES (EVENT_ID_HERE, 5, 3, 2, 1, 0, 0, 0, 1, 10485760, 104857600, 10485760, 300, 60, '["jpg", "jpeg", "png", "gif", "webp"]', '["mp4", "mov", "avi", "webm"]', '["mp3", "wav", "ogg", "m4a"]');
