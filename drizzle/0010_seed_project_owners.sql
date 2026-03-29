-- Seed project_members with 'owner' role for all existing projects.
-- Uses nanoid-style random IDs (12 chars alphanumeric).
-- Idempotent: skips projects that already have an owner member.

INSERT INTO project_members (id, project_id, user_id, role, added_by, created_at)
SELECT
  substr(md5(random()::text), 1, 12) AS id,
  p.id AS project_id,
  p.user_id,
  'owner' AS role,
  p.user_id AS added_by,
  NOW() AS created_at
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id AND pm.user_id = p.user_id
);
