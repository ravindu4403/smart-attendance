# Smart Attendance System (HND Final Project)

Next.js + MySQL web application for student attendance and performance management.

## ✅ Features
- **JWT Auth + Role Based Access** (admin / lecturer / student)
- **Admin Panel**
  - Manage **Users** (Lecturer / Student)
  - Manage **Batches**
  - Manage **Subjects**
  - Manage **Lecturer Assignments** (Lecturer ↔ Batch ↔ Subject)
- **Lecturer Panel**
  - Create / Enroll **Students** into their batches
- **Attendance** marking by **Date + Batch + Subject** (bulk save)
- **Marks** management by **Batch + Subject + Student**
- **Reports** (monthly) with **CSV download**
- **Student Dashboard** with Chart.js (attendance + marks)

## 🧪 Demo Accounts (Password: `123456`)
- Admin: `admin@test.com`
- Lecturer: `lecturer@test.com`
- Student: `student1@test.com`

## 🗄️ Setup (MySQL)
1) Create a database (example: `smart_attendance`)
2) Import the schema:
- `schema.sql`

## ⚙️ Env
Create `.env.local`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=smart_attendance
JWT_SECRET=your_secret_key
```

## ▶️ Install & Run
```
npm install
npm run dev
```

Open: `http://localhost:3000`

## 🔐 Role Rules
- **Admin**: `/dashboard`, `/attendance`, `/marks`, `/reports`, `/admin/*`
- **Lecturer**: `/dashboard`, `/attendance`, `/marks`, `/reports`, `/lecturer/students`
- **Student**: `/dashboard`, `/student`
