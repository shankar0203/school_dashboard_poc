import random
random.seed(42)

S = 1; MARKER = 2

JUNE = [
    '2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05',
    '2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12',
    '2026-06-15','2026-06-16','2026-06-17','2026-06-18','2026-06-19',
    '2026-06-22','2026-06-23','2026-06-24','2026-06-25','2026-06-26',
    '2026-06-29','2026-06-30',
]

BOY_FIRST = [
    "Aakash","Adhithya","Aravind","Arjun","Bharath","Deepak","Dinesh","Ganesh",
    "Gowtham","Hari","Hemanth","Jaidev","Kaarthik","Kamesh","Kirubakaran",
    "Kumaravel","Logesh","Madhavan","Mahesh","Mithun","Muthukumar","Naveen",
    "Nithish","Prabhu","Praveen","Prithivi","Rahul","Rajesh","Ramesh","Ranjith",
    "Sabari","Sakthivel","Sankar","Selvam","Senthil","Sivaganesh","Sriram",
    "Suresh","Surya","Vasanth","Venkatesh","Vijay","Vimal","Vishnu","Yuvan",
    "Akash","Balamurugan","Kumaran","Tamil","Tharun",
]
GIRL_FIRST = [
    "Abinaya","Aishwarya","Anandhi","Anitha","Archana","Arulselvi","Bhavani",
    "Bharathi","Chithra","Deepa","Devi","Divya","Gomathi","Indhu","Janani",
    "Kalpana","Kavitha","Keerthana","Kirthika","Komathi","Lavanya","Mahalakshmi",
    "Malathi","Meenakshi","Muthumari","Nithya","Nivetha","Padmavathi","Pavithra",
    "Pooja","Priya","Ramya","Rekha","Saranya","Selvi","Shanthi","Silambarasi",
    "Sivagami","Soundarya","Suganya","Sumithra","Tamilarasi","Umarani","Valli",
    "Vasantha","Vidya","Vijayalakshmi","Yasodha","Sangeetha","Swathi",
]
LAST = [
    "Kumar","Raja","Murugan","Selvam","Krishnan","Rajan","Pandi","Vel","Nathan",
    "Arumugam","Durai","Ganesan","Mani","Perumal","Pillai","Subramanian",
    "Thangavel","Velu","Arasu","Balan","Senthil","Karthik","Anand","Raj",
]

PROFILES = {
    'excellent':  (0,1,  84,98, +3),
    'good':       (2,3,  70,86,  0),
    'average':    (4,5,  55,72, -3),
    'struggling': (5,7,  38,58, -8),
    'chronic':    (8,11, 28,52,-10),
}

used_names = set()
for n in ["Aarav Anand","Divya Meenakshi","Priya Lakshmi","Karthik Raja","Mohammed Irfan","Sneha Devi"]:
    used_names.add(n)

def pick_name(gender):
    pool = BOY_FIRST if gender == 'male' else GIRL_FIRST
    for _ in range(1000):
        first = random.choice(pool)
        last  = random.choice(LAST)
        full  = f"{first} {last}"
        if full not in used_names:
            used_names.add(full)
            return full
    raise RuntimeError("pool exhausted")

# Student tuple: (sid, class_id, roll_no, name, gender, guardian, phone, profile)
def make_roster(class_id, id_start, profile_list):
    result = []
    for i, prof in enumerate(profile_list):
        sid = id_start + i
        gender = 'male' if random.random() < 0.5 else 'female'
        name = pick_name(gender)
        guardian = random.choice(BOY_FIRST) + " " + name.split()[-1]
        phone = f"9{random.randint(600000000,999999999)}"
        result.append((sid, class_id, i+1, name, gender, guardian, phone, prof))
    return result

def gen_att(sid, cid, prof):
    abs_lo, abs_hi = PROFILES[prof][0], PROFILES[prof][1]
    n_abs = random.randint(abs_lo, abs_hi)
    absent = set(random.sample(JUNE, n_abs))
    return [f"  ({S},{sid},{cid},'{d}','{'absent' if d in absent else 'present'}',{MARKER})" for d in JUNE]

def gen_marks(sid, prof):
    _,_,lo,hi,md = PROFILES[prof]
    rows = []
    for eid in [1,2,3,4]:
        for sub in [1,2,3,4,5]:
            m = random.randint(lo, hi)
            if sub == 3: m = max(10, min(100, m + md))
            if eid == 4: m = min(100, m + random.randint(0,5))
            if prof == 'chronic'    and random.random() < 0.35: m = random.randint(10,33)
            if prof == 'struggling' and random.random() < 0.20: m = random.randint(20,34)
            rows.append(f"  ({S},{eid},{sid},{sub},{m},2)")
    return rows

def gen_fees(sid):
    choice = random.choices(['full','partial','pending'], weights=[55,25,20])[0]
    rows = []
    for item, due, date in [
        ("Term 1 - Tuition", 16000, '2026-04-12'),
        ("Term 2 - Tuition", 16000, '2026-06-30'),
        ("Exam and Lab fee",  4000, '2026-06-30'),
    ]:
        if choice == 'full':
            paid = due; receipt = f"'RC-{sid:03d}{random.randint(10,99)}'"
        elif choice == 'partial':
            paid = random.choice([8000,10000,12000]) if due >= 16000 else 0; receipt = 'NULL'
        else:
            paid = 0; receipt = 'NULL'
        rows.append(f"  ({S},{sid},'{item}',{due},{paid},'{date}',{receipt})")
    return rows

# Build rosters
PROF_8A = (['excellent']*4 + ['good']*13 + ['average']*8 + ['struggling']*5 + ['chronic']*2 + ['good']*3)[:29]
PROF_8B = (['excellent']*4 + ['good']*11 + ['average']*7 + ['struggling']*3)[:25]
PROF_9A = (['excellent']*3 + ['good']*10 + ['average']*5 + ['struggling']*2)[:20]
random.shuffle(PROF_8A); random.shuffle(PROF_8B); random.shuffle(PROF_9A)

new_8a     = make_roster(5, 7,  PROF_8A)   # IDs 7-35
students_8b = make_roster(6, 36, PROF_8B)  # IDs 36-60
students_9a = make_roster(7, 61, PROF_9A)  # IDs 61-80

# Existing 8-A students (already in seed.sql, ID 1-6)
EXIST_8A = [
    (1,5,12,'Aarav Anand',    'male',  'Anand Kumar','9876543212','excellent'),
    (2,5, 4,'Divya Meenakshi','female','Meena R.',   '9876543204','good'),
    (3,5, 7,'Priya Lakshmi',  'female','Lakshmi S.', '9876543207','good'),
    (4,5,19,'Karthik Raja',   'male',  'Raja M.',    '9876543219','struggling'),
    (5,5,22,'Mohammed Irfan', 'male',  'Irfan A.',   '9876543222','chronic'),
    (6,5, 3,'Sneha Devi',     'female','Devi K.',    '9876543203','average'),
]

def sq(s): return str(s).replace("'","''")

out = []
out.append("-- =========================================================================")
out.append("-- seed_extra.sql — appended AFTER seed.sql (adds 74 more students + data)")
out.append("-- =========================================================================")
out.append("USE school_app;")
out.append("")

# ── Students 8-A new (IDs 7-35) ─────────────────────────────────────────────
out.append("-- Students 8-A new (IDs 7-35) -------------------------------------------")
out.append("INSERT INTO students (id,school_id,class_id,roll_no,name,gender,guardian_name,guardian_phone) VALUES")
out.append(",\n".join(
    f"  ({r[0]},{S},{r[1]},{r[2]},'{sq(r[3])}','{r[4]}','{sq(r[5])}','{r[6]}')"
    for r in new_8a
) + ";")
out.append("")

# ── Students 8-B ─────────────────────────────────────────────────────────────
out.append("-- Students 8-B (IDs 36-60) -----------------------------------------------")
out.append("INSERT INTO students (id,school_id,class_id,roll_no,name,gender,guardian_name,guardian_phone) VALUES")
out.append(",\n".join(
    f"  ({r[0]},{S},{r[1]},{r[2]},'{sq(r[3])}','{r[4]}','{sq(r[5])}','{r[6]}')"
    for r in students_8b
) + ";")
out.append("")

# ── Students 9-A ─────────────────────────────────────────────────────────────
out.append("-- Students 9-A (IDs 61-80) -----------------------------------------------")
out.append("INSERT INTO students (id,school_id,class_id,roll_no,name,gender,guardian_name,guardian_phone) VALUES")
out.append(",\n".join(
    f"  ({r[0]},{S},{r[1]},{r[2]},'{sq(r[3])}','{r[4]}','{sq(r[5])}','{r[6]}')"
    for r in students_9a
) + ";")
out.append("")

# ── Attendance: existing 8-A students 2-6 (full June, replaces single-day entries) ──
out.append("-- Attendance: 8-A students 2-6 (full June 2026) -------------------------")
out.append("INSERT INTO attendance (school_id,student_id,class_id,att_date,status,marked_by) VALUES")
att2 = []
for r in EXIST_8A[1:]:  # skip Aarav
    att2.extend(gen_att(r[0], r[1], r[7]))
out.append(",\n".join(att2) + ";")
out.append("")

# ── Attendance: new 8-A students ─────────────────────────────────────────────
out.append("-- Attendance: 8-A new students (IDs 7-35, full June 2026) ---------------")
out.append("INSERT INTO attendance (school_id,student_id,class_id,att_date,status,marked_by) VALUES")
att3 = []
for r in new_8a:
    att3.extend(gen_att(r[0], r[1], r[7]))
out.append(",\n".join(att3) + ";")
out.append("")

# ── Attendance: 8-B + 9-A ────────────────────────────────────────────────────
out.append("-- Attendance: 8-B + 9-A (full June 2026) ---------------------------------")
out.append("INSERT INTO attendance (school_id,student_id,class_id,att_date,status,marked_by) VALUES")
att4 = []
for r in students_8b + students_9a:
    att4.extend(gen_att(r[0], r[1], r[7]))
out.append(",\n".join(att4) + ";")
out.append("")

# ── Marks: existing 8-A students 2-6 ────────────────────────────────────────
out.append("-- Marks: 8-A students 2-6 (4 exams x 5 subjects) -----------------------")
out.append("INSERT INTO marks (school_id,exam_id,student_id,subject_id,mark,entered_by) VALUES")
mk2 = []
for r in EXIST_8A[1:]:
    mk2.extend(gen_marks(r[0], r[7]))
out.append(",\n".join(mk2) + ";")
out.append("")

# ── Marks: new 8-A students ──────────────────────────────────────────────────
out.append("-- Marks: 8-A new students (IDs 7-35) ------------------------------------")
out.append("INSERT INTO marks (school_id,exam_id,student_id,subject_id,mark,entered_by) VALUES")
mk3 = []
for r in new_8a:
    mk3.extend(gen_marks(r[0], r[7]))
out.append(",\n".join(mk3) + ";")
out.append("")

# ── Fees: 8-A students 2-35 ──────────────────────────────────────────────────
out.append("-- Fees: 8-A students 2-35 ------------------------------------------------")
out.append("INSERT INTO fees (school_id,student_id,item,amount_due,amount_paid,due_date,receipt_no) VALUES")
fees = []
for r in EXIST_8A[1:]:
    fees.extend(gen_fees(r[0]))
for r in new_8a:
    fees.extend(gen_fees(r[0]))
out.append(",\n".join(fees) + ";")
out.append("")

with open('/sessions/great-vibrant-edison/mnt/outputs/seed_extra.sql', 'w') as f:
    f.write("\n".join(out))

total = 6 + len(new_8a) + len(students_8b) + len(students_9a)
print(f"✓ 8-A: {6 + len(new_8a)} students (IDs 1-35)")
print(f"✓ 8-B: {len(students_8b)} students (IDs 36-60)")
print(f"✓ 9-A: {len(students_9a)} students (IDs 61-80)")
print(f"✓ Grand total: {total}")
print(f"✓ Attendance rows: {len(att2)+len(att3)+len(att4)}")
print(f"✓ Mark rows: {len(mk2)+len(mk3)}")
print(f"✓ Fee rows: {len(fees)}")
