
-- Move User K1 zone into the Escazú property area
UPDATE zones SET geometry_geojson = '{"type":"Polygon","coordinates":[[[-84.1400,9.9240],[-84.1394,9.9240],[-84.1394,9.9236],[-84.1400,9.9236],[-84.1400,9.9240]]]}'::jsonb, color = '#10b981'
WHERE id = '322e2516-cf11-4205-9be4-a84fc4739aca';

-- Move all assets from old coords (~-84.1928) into Escazú zones
UPDATE assets SET lat = 9.9237, lng = -84.1408 WHERE id = '72fb17c7-1b6f-446e-a6bf-bea95eddfbf4';
UPDATE assets SET lat = 9.9239, lng = -84.1404 WHERE id = '55555555-5555-5555-5555-555555555507';
UPDATE assets SET lat = 9.9235, lng = -84.1406 WHERE id = '55555555-5555-5555-5555-555555555503';
UPDATE assets SET lat = 9.9234, lng = -84.1402 WHERE id = '55555555-5555-5555-5555-555555555508';
UPDATE assets SET lat = 9.9236, lng = -84.1414 WHERE id = 'b308e3e0-ee62-43e2-bc9c-5c2b12b57103';
UPDATE assets SET lat = 9.9238, lng = -84.1393 WHERE id = 'cf9d99f9-3197-4d3e-b34e-8d56fb3c5c65';
UPDATE assets SET lat = 9.9233, lng = -84.1390 WHERE id = '9eb20f4f-a942-4f74-8aba-394d22ec37de';
UPDATE assets SET lat = 9.9234, lng = -84.1401 WHERE id = '55555555-5555-5555-5555-555555555504';
UPDATE assets SET lat = 9.9238, lng = -84.1407 WHERE id = '242a5091-b74c-40b6-903e-b43ff55f0b9e';
UPDATE assets SET lat = 9.9236, lng = -84.1397 WHERE id = '55555555-5555-5555-5555-555555555510';
UPDATE assets SET lat = 9.9235, lng = -84.1399 WHERE id = '55555555-5555-5555-5555-555555555509';
UPDATE assets SET lat = 9.9232, lng = -84.1393 WHERE id = 'ae78fd38-836a-419f-90ec-cc766c0c26cd';
UPDATE assets SET lat = 9.9236, lng = -84.1400 WHERE id = '55555555-5555-5555-5555-555555555501';
UPDATE assets SET lat = 9.9234, lng = -84.1400 WHERE id = '55555555-5555-5555-5555-555555555502';
UPDATE assets SET lat = 9.9233, lng = -84.1405 WHERE id = '55555555-5555-5555-5555-555555555505';
UPDATE assets SET lat = 9.9231, lng = -84.1392 WHERE id = '6903702f-2863-4b0d-8a6f-be3896096a17';
UPDATE assets SET lat = 9.9232, lng = -84.1407 WHERE id = '55555555-5555-5555-5555-555555555506';
UPDATE assets SET lat = 9.9234, lng = -84.1395 WHERE id = 'eb8468bf-228f-493e-95a0-86486c7d22dc';
UPDATE assets SET lat = 9.9237, lng = -84.1412 WHERE id = 'd7b83e5f-2a6a-436a-af49-24d8a4d34ea6';
