-- ===========================================================================
--  DUMMY STUDENTS — extra sample data for validation/testing.
--  Run AFTER schema.sql (and optionally after seed.sql).
--  Adds ~30 students spread across several classes.
-- ===========================================================================
USE school_app;

-- assumes school_id 1 and the classes from seed.sql (6-A=1 ... 12-A=12)
INSERT INTO students (school_id, class_id, roll_no, name, guardian_name, guardian_phone) VALUES
  (1, 1, 1,'Aadhira Bala',     'Bala R.',      '90000000001'),
  (1, 1, 2,'Bharath Kumar',    'Kumar S.',     '90000000002'),
  (1, 1, 3,'Charanya Devi',    'Devi P.',      '90000000003'),
  (1, 2, 1,'Dhruv Menon',      'Menon A.',     '90000000004'),
  (1, 2, 2,'Eshwari N.',       'Nagaraj',      '90000000005'),
  (1, 3, 1,'Farhan Ali',       'Ali M.',       '90000000006'),
  (1, 3, 2,'Gayathri S.',      'Suresh',       '90000000007'),
  (1, 3, 3,'Harish V.',        'Vasanth',      '90000000008'),
  (1, 4, 1,'Ishaan Roy',       'Roy D.',       '90000000009'),
  (1, 4, 2,'Janaki R.',        'Ramesh',       '90000000010'),
  (1, 6, 1,'Kabir Khan',       'Khan I.',      '90000000011'),
  (1, 6, 2,'Lavanya M.',       'Mani',         '90000000012'),
  (1, 6, 3,'Manoj P.',         'Prakash',      '90000000013'),
  (1, 7, 1,'Nandini S.',       'Selvam',       '90000000014'),
  (1, 7, 2,'Omar Sheikh',      'Sheikh F.',    '90000000015'),
  (1, 7, 3,'Pavithra K.',      'Karthik',      '90000000016'),
  (1, 8, 1,'Qadir Hussain',    'Hussain',      '90000000017'),
  (1, 8, 2,'Reshma J.',        'Jagan',        '90000000018'),
  (1, 9, 1,'Sanjay Gupta',     'Gupta R.',     '90000000019'),
  (1, 9, 2,'Tara Iyer',        'Iyer V.',      '90000000020'),
  (1, 9, 3,'Uday Verma',       'Verma',        '90000000021'),
  (1,10, 1,'Vaishnavi R.',     'Rajan',        '90000000022'),
  (1,10, 2,'Wasim Akram',      'Akram',        '90000000023'),
  (1,11, 1,'Xavier Fernandes', 'Fernandes',    '90000000024'),
  (1,11, 2,'Yamini S.',        'Sundar',       '90000000025'),
  (1,12, 1,'Zoya Begum',       'Begum',        '90000000026'),
  (1,12, 2,'Aravind T.',       'Thangavel',    '90000000027'),
  (1,12, 3,'Brindha L.',       'Lokesh',       '90000000028');
