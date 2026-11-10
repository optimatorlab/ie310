-- Creates the classroom login used by the notebooks:  user 'student' / password 'student'.
-- Run as the MySQL root user. Safe to re-run.
CREATE USER IF NOT EXISTS 'student'@'%' IDENTIFIED BY 'student';

-- Class 1 database (created by school_toy.sql) and Class 2 database (created by citibike.sql.gz).
-- Granting on a database that doesn't exist yet is allowed.
GRANT ALL PRIVILEGES ON school.*   TO 'student'@'%';
GRANT ALL PRIVILEGES ON citibike.* TO 'student'@'%';
FLUSH PRIVILEGES;
