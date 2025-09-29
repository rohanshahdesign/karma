-- test_rewards_functions.sql
-- Test script to verify the new rewards functions work correctly

-- Test 1: Check if the function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'create_default_rewards_v2'
);

-- Test 2: Check if refresh function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'refresh_workspace_rewards'
);

-- Test 3: Count rewards in system before refresh
SELECT 
  w.name as workspace_name,
  COUNT(r.id) as reward_count,
  COUNT(CASE WHEN r.active = true THEN 1 END) as active_rewards
FROM workspaces w
LEFT JOIN rewards r ON w.id = r.workspace_id
GROUP BY w.id, w.name
ORDER BY w.name;

-- Test 4: Show sample of current rewards by category
SELECT 
  category,
  COUNT(*) as count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price)::integer as avg_price
FROM rewards 
WHERE active = true
GROUP BY category
ORDER BY category;

-- Test 5: Manual test - create a test workspace (UNCOMMENT to run)
/*
INSERT INTO workspaces (name, slug, currency_name, monthly_allowance)
VALUES ('Test Workspace', 'test-workspace', 'points', 100)
RETURNING id;

-- Then run with the returned ID:
-- SELECT create_default_rewards_v2('your-workspace-id-here');
*/

-- Test 6: Show learning rewards (should be lowest cost)
SELECT title, price, category 
FROM rewards 
WHERE category = 'Learning' AND active = true
ORDER BY price;

-- Test 7: Show time off rewards (should be higher cost)
SELECT title, price, category 
FROM rewards 
WHERE category = 'Time Off' AND active = true
ORDER BY price;