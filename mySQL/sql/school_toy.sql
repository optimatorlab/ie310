-- Class 1 toy database: students / courses / enrollments
-- Small enough to read every row. Re-runnable: drops and recreates the `school` database.
--
-- Designed teaching features:
--   * enrollments is a many-to-many "bridge" table (composite primary key, two foreign keys)
--   * students.major can be NULL (undeclared)           -> NULL handling, IS NULL
--   * enrollments.grade_points is NULL while a course is in progress -> AVG ignores NULLs
--   * one student (Priya) has no enrollments             -> INNER vs LEFT JOIN
--   * one course (IE450) has no enrollments              -> RIGHT/LEFT JOIN from the other side
--   * two students share a last name (Kim)               -> names are not keys

DROP DATABASE IF EXISTS school;
CREATE DATABASE school CHARACTER SET utf8mb4;
USE school;

CREATE TABLE students (
    student_id  INT          NOT NULL,
    first_name  VARCHAR(30)  NOT NULL,
    last_name   VARCHAR(30)  NOT NULL,
    email       VARCHAR(60)  NOT NULL,
    major       VARCHAR(30)  NULL,
    start_year  INT          NOT NULL,
    PRIMARY KEY (student_id),
    UNIQUE KEY uq_students_email (email)
) ENGINE=InnoDB;

CREATE TABLE courses (
    course_id   VARCHAR(8)   NOT NULL,
    title       VARCHAR(60)  NOT NULL,
    credits     INT          NOT NULL,
    department  VARCHAR(10)  NOT NULL,
    PRIMARY KEY (course_id)
) ENGINE=InnoDB;

CREATE TABLE enrollments (
    student_id    INT          NOT NULL,
    course_id     VARCHAR(8)   NOT NULL,
    semester      VARCHAR(12)  NOT NULL,
    grade_points  DECIMAL(3,2) NULL,   -- 0.00-4.00; NULL = not yet graded
    PRIMARY KEY (student_id, course_id, semester),
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    FOREIGN KEY (course_id)  REFERENCES courses (course_id)
) ENGINE=InnoDB;

INSERT INTO students (student_id, first_name, last_name, email, major, start_year) VALUES
(1001, 'Alice',  'Nguyen',   'alice.nguyen@example.edu',   'Industrial Engineering', 2023),
(1002, 'Bruno',  'Silva',    'bruno.silva@example.edu',    'Industrial Engineering', 2023),
(1003, 'Chen',   'Wei',      'chen.wei@example.edu',       'Computer Science',       2024),
(1004, 'Dana',   'Okafor',   'dana.okafor@example.edu',    'Industrial Engineering', 2024),
(1005, 'Elena',  'Petrova',  'elena.petrova@example.edu',  'Mathematics',            2022),
(1006, 'Farid',  'Haddad',   'farid.haddad@example.edu',   'Computer Science',       2025),
(1007, 'Grace',  'Kim',      'grace.kim@example.edu',      'Industrial Engineering', 2025),
(1008, 'Hiro',   'Tanaka',   'hiro.tanaka@example.edu',    NULL,                     2025),
(1009, 'Imani',  'Brooks',   'imani.brooks@example.edu',   'Mathematics',            2023),
(1010, 'Jamal',  'Kim',      'jamal.kim@example.edu',      'Computer Science',       2024),
(1011, 'Katya',  'Ivanova',  'katya.ivanova@example.edu',  NULL,                     2026),
(1012, 'Priya',  'Raman',    'priya.raman@example.edu',    'Industrial Engineering', 2026);

INSERT INTO courses (course_id, title, credits, department) VALUES
('IE210', 'Probability and Statistics for Engineers', 3, 'IE'),
('IE310', 'Computing for Industrial Engineers',       3, 'IE'),
('IE330', 'Operations Research I',                    3, 'IE'),
('IE450', 'Supply Chain Analytics',                   3, 'IE'),
('CS115', 'Introduction to Programming',              4, 'CS'),
('MTH241','Linear Algebra',                           4, 'MTH');

INSERT INTO enrollments (student_id, course_id, semester, grade_points) VALUES
-- Fall 2025 (graded)
(1001, 'MTH241', 'Fall 2025',   3.70),
(1001, 'IE210',  'Fall 2025',   4.00),
(1002, 'MTH241', 'Fall 2025',   2.70),
(1002, 'IE210',  'Fall 2025',   3.30),
(1003, 'CS115',  'Fall 2025',   4.00),
(1003, 'MTH241', 'Fall 2025',   3.00),
(1004, 'CS115',  'Fall 2025',   3.30),
(1005, 'IE210',  'Fall 2025',   3.70),
(1005, 'MTH241', 'Fall 2025',   4.00),
(1006, 'CS115',  'Fall 2025',   2.30),
(1009, 'MTH241', 'Fall 2025',   3.30),
(1010, 'CS115',  'Fall 2025',   3.70),
-- Spring 2026 (graded)
(1001, 'CS115',  'Spring 2026', 3.70),
(1001, 'IE330',  'Spring 2026', 3.30),
(1002, 'CS115',  'Spring 2026', 3.00),
(1002, 'IE330',  'Spring 2026', 2.00),
(1003, 'IE210',  'Spring 2026', 3.70),
(1004, 'IE210',  'Spring 2026', 3.00),
(1004, 'MTH241', 'Spring 2026', 2.70),
(1005, 'IE330',  'Spring 2026', 4.00),
(1006, 'MTH241', 'Spring 2026', 3.30),
(1007, 'CS115',  'Spring 2026', 4.00),
(1009, 'IE210',  'Spring 2026', 3.00),
(1010, 'MTH241', 'Spring 2026', 2.30),
-- Fall 2026 (in progress: no grade yet)
(1001, 'IE310',  'Fall 2026',   NULL),
(1002, 'IE310',  'Fall 2026',   NULL),
(1003, 'IE310',  'Fall 2026',   NULL),
(1004, 'IE310',  'Fall 2026',   NULL),
(1004, 'IE330',  'Fall 2026',   NULL),
(1007, 'IE310',  'Fall 2026',   NULL),
(1007, 'IE210',  'Fall 2026',   NULL),
(1008, 'CS115',  'Fall 2026',   NULL),
(1009, 'IE310',  'Fall 2026',   NULL),
(1010, 'IE310',  'Fall 2026',   NULL),
(1011, 'CS115',  'Fall 2026',   NULL);
