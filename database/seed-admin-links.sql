-- seed fixes: admin-facing notifications belong to the seeded admin (id 9),
-- and the activity log must reference that admin instead of a customer.
UPDATE `notifications` SET `user_id` = 9 WHERE `link` LIKE '/admin/%';
UPDATE `admin_activity_logs` SET `admin_id` = 9;
