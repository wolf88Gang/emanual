
-- Move ALL assets to the estate center point (9.9234, -84.1400) so they cluster as one
UPDATE assets SET lat = 9.9234, lng = -84.1400 WHERE estate_id = '22222222-2222-2222-2222-222222222222';
