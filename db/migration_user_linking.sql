-- ===========================================================================
--  MIGRATION — add user-linking columns to an EXISTING database.
--  Safe to run multiple times (uses IF NOT EXISTS checks).
--  Run on EC2: mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < db/migration_user_linking.sql
-- ===========================================================================

-- 1. Add cognito_sub to users (for fast JWT sub lookup)
ALTER TABLE users
  MODIFY COLUMN role ENUM('principal','admin','teacher','parent','student','owner','guest') NOT NULL;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cognito_sub');
SET @sql = IF(@col = 0,
  'ALTER TABLE users ADD COLUMN cognito_sub VARCHAR(100) AFTER id',
  'SELECT "cognito_sub already exists" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Add unique index on cognito_sub (skip if already exists)
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_cognito_sub');
SET @sql = IF(@idx = 0,
  'ALTER TABLE users ADD INDEX idx_users_cognito_sub (cognito_sub)',
  'SELECT "index already exists" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Add user_id to students (links a student record to a login account)
SET @col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'user_id');
SET @sql = IF(@col2 = 0,
  'ALTER TABLE students ADD COLUMN user_id INT AFTER notes',
  'SELECT "user_id already exists" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Add foreign key (skip if already exists — MySQL will error if duplicate)
SET @fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND CONSTRAINT_NAME = 'fk_students_user');
SET @sql = IF(@fk = 0,
  'ALTER TABLE students ADD CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id)',
  'SELECT "fk already exists" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration complete: user_id on students, cognito_sub on users' AS result;
