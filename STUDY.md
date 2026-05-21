# ShikshakSathi — Project Study & Workflow Reference

> **Purpose of this document:** a complete analysis of the ShikshakSathi
> application — its product, every screen, the end-to-end workflows, the
> existing design system, components, data models, and APIs.
> It is written as the briefing document for a **UI/UX redesign** — read
> sections 5–8 most closely.

---

## 1. What ShikshakSathi Is

**ShikshakSathi** ("Teacher's Companion") is an **AI-powered grading
assistant for India's teachers.**

A teacher uploads two things:

1. an **answer script** — the official model answers + marking rubric, and
2. a student's **handwritten answer pages** (phone photos or PDF).

Google Gemini AI then reads the handwriting, grades every question against
the rubric, and returns:

- a **rubric-based score** per question and an overall total,
- **strengths and mistakes** per question,
- **encouraging feedback in English and a second language** (Bengali or
  Hindi) — with optional audio playback,
- a generated **5-minute lesson plan** addressing the class's common
  mistakes.

It is a **multi-user platform**: teachers have accounts, create student
accounts, and link grades to students by roll number. Students log in to
see their own results, feedback, and lesson plans.

**Audience:** Indian college / school teachers and their students.
**Tone:** warm, encouraging, trustworthy, classroom-friendly — not corporate.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS + shadcn/ui component library |
| Animation | framer-motion |
| Charts | Recharts |
| AI | Google Gemini (`gemini-2.5-flash`) — grading + lesson plans |
| Database | MongoDB Atlas (collections: `teachers`, `students`, `grading_sessions`) |
| Auth | bcryptjs (password hashes) + jose (JWT in an httpOnly cookie) |
| Toasts | sonner |
| Icons | lucide-react |

The app is **light-theme only**, mobile-responsive, and currently has no
dark mode.

---

## 3. User Roles

| Role | How they sign in | What they can do |
|---|---|---|
| **Logged-out visitor** | — | See the landing page only. Cannot grade. |
| **Teacher** | Email + password (self sign-up) | Grade answer sheets, manage students, view analytics, submit final grades to student records. |
| **Student** | Roll number + password (created by their teacher) | View their own finalized exam results, feedback, and lesson plans. Read-only. |

There is **no anonymous grading** — a teacher login is required to grade.
Sessions last 7 days (JWT cookie).

---

## 4. Site Map — All Screens

| Route | Screen | Access |
|---|---|---|
| `/` | **Landing page** | Public (redirects logged-in users to their dashboard) |
| `/teacher/signup` | Teacher sign-up form | Public |
| `/teacher/login` | Teacher login form | Public |
| `/teacher/dashboard` | **Teacher workspace** | Teacher only |
| `/grade` | **Grading tool** (upload + grade) | Teacher only |
| `/result` | **Result page** (after grading) | Reached after grading |
| `/student/login` | Student login form | Public |
| `/student/dashboard` | **Student portal** | Student only |
| `/student/[rollno]` | A student's records, viewed by their teacher | Teacher only |
| `/dashboard` | Global archive analytics (legacy, currently unlinked) | Public route, not in nav |

**Shared chrome:** a sticky top **Navbar** on every page (logo left;
role menus right).

---

## 5. End-to-End Workflows

### 5.1 Teacher workflow (the primary journey)

```
Landing (/)
   │  "Teacher Login" / "Create an account"
   ▼
Sign up  ──►  Teacher Dashboard (/teacher/dashboard)
   │              │
   │              ├─ Add students (roll no + name + password + class)
   │              ├─ View 4 stat tiles + Subject Performance + Recent Sessions
   │              │
   │              ▼  "Grade a sheet"
   │          Grading tool (/grade)
   │              │  upload answer script + student pages
   │              │  pick feedback language
   │              │  (optional) pick a student roll number + subject
   │              │  → blur pre-check on images
   │              ▼  "Grade Answer Sheet"  (Gemini ~10–25 s)
   │          Result page (/result)
   │              │  review scores — tap any score ring to override
   │              │  generate + edit a 5-minute lesson plan
   │              ▼  "Submit Final Grade to Student Record"
   │          Saved to that student's permanent record
   ▼
Student can now see this exam when they log in.
```

**Detailed teacher steps**

1. **Land** on `/` → choose **Teacher Login** or **Create an account**.
2. **Sign up** — name, email, password, institution (optional). Lands on
   the teacher dashboard.
3. **Dashboard** — see class stats, **Add Student** (creates a login the
   teacher shares), browse **Subject Performance** cards, and the
   **Recent Sessions** table.
4. **Grade** — click **"Grade a sheet"** → `/grade`.
5. On `/grade`: drop in the **answer script** + **student answer pages**,
   choose **feedback language** (Bengali / Hindi / English), and
   optionally type/pick a **student roll number** and **subject override**.
6. Click **Grade Answer Sheet** → a quick **blur check** runs on the
   images (warns + asks to confirm if any look blurry) → Gemini grades.
7. **Result page** — review the breakdown. The teacher can:
   - **tap any score ring** to override a question's score,
   - **Generate** a lesson plan and **edit** it field-by-field.
8. If a roll number was set, a green **"Submit Final Grade to Student
   Record"** strip appears → clicking it saves the grade + feedback +
   lesson plan to that student.

### 5.2 Student workflow

```
Landing (/)  ──►  "Student Login"
   ▼
Login (roll number + password from their teacher)
   ▼
Student Dashboard (/student/dashboard)
   │  total exams · average score · best subject
   ▼
List of finalized exams → tap one to expand
   ▼
Full report: score hero, rubric breakdown, strengths,
mistakes, bilingual feedback, and the teacher's lesson plan
(everything READ-ONLY — students cannot edit or generate)
```

### 5.3 The grading data flow (behind the scenes)

```
/grade  ──POST /api/grade──►  Gemini  ──►  grading result JSON
   │                                            │
   │  result saved to localStorage              │  also POSTed to
   │  (so /result can render it)                ▼  /api/archive
   │                                       MongoDB grading_sessions
   ▼                                       (finalized: false)
/result
   │  teacher clicks "Submit Final Grade"
   └──PATCH /api/archive/finalize──► sets finalized: true,
                                     links roll_number, stores lesson_plan
                                            │
                                            ▼
                          Student's /student/dashboard reads it
```

---

## 6. Screen-by-Screen UI Breakdown

This is the most important section for redesign — it describes what each
screen currently contains.

### 6.1 Landing page (`/`)
- **Hero** (two columns): badge ("AI Grading Companion · বাংলায়
  feedback"), big "Shikshak**Sathi**" wordmark, tagline, description, and
  two CTAs — **Teacher Login** (primary) and **Student Login** (outline).
  A decorative SVG of stacked, checkmarked answer sheets on the right.
- **"Get started" role cards** — two cards side by side:
  - *For Teachers* (teal gradient strip) — 3 bullet points, **Teacher
    Login** + **Create an account** buttons.
  - *For Students* (orange gradient strip) — 3 bullet points, **Student
    Login** button.
- **Feature highlights** — 4 small cards: 20-second grading, bilingual
  feedback, class analytics, student portal.
- Decorative blurred color blobs in the background.

### 6.2 Grading tool (`/grade`) — teacher only
- A "Logged in as [name] · Logout" pill, top-right.
- **Hero** — "Grade a full answer sheet in 20 seconds."
- **Training-archive counter** — animated stats ("handwriting samples /
  pages archived / subjects").
- **"Try sample exam"** link (loads demo files).
- **Two optional inputs** — Student Roll Number (autocompletes from the
  teacher's students) and Subject Override.
- **Upload card** — two **FileDropzones** (Answer Script / Student Answer
  Pages), a **language selector**, and the big **Grade Answer Sheet**
  button.
- **Trust badges** row.
- While grading: a full-screen **GradingProgress** overlay with a
  rotating spinner and cycling status messages.

### 6.3 Result page (`/result`)
Top to bottom:
- **Action row** — "Back to Grade", a "✋ Tap any score to override" hint
  badge, "Grade Another Sheet".
- **Submit strip** (only if a roll number is attached) — green panel:
  "Submit Final Grade to Student Record".
- **SummaryHero** — a deep-teal gradient card: big animated **score ring**
  on the left; subject, an encouraging headline ("Excellent work!"), the
  score line, a **readability pill**, and 4 stat tiles on the right.
- **Low-readability banner** (only if image quality was poor) — amber card
  with photo tips + "Grade Again" button.
- **Question-by-Question Breakdown** — a list of **QuestionCards**. Each
  collapsed card shows the question number, text, a small score ring, and
  (for hard-to-read pages) a readability icon. Expanded, it reveals: the
  extracted answer, the rubric table, strengths, mistakes, and English +
  translated feedback.
- **CommonMistakes** — class-level recurring mistakes.
- **LessonPlanCard** — generate / edit a 5-minute lesson plan.
- Footer disclaimer.

### 6.4 Teacher dashboard (`/teacher/dashboard`)
- **Welcome header** — "Welcome, [name]", institution, + **Grade a sheet**
  and **Log out** buttons.
- **4 stat tiles** — Students enrolled, Sessions graded, Avg. class score,
  This week.
- **📚 Subject Performance Overview** — a grid of **SubjectPerformanceCard**s
  (one per subject): student/session counts, an average-score progress
  bar, and a **View Details** button that opens a popup with that
  subject's **question-difficulty breakdown** (hardest questions first,
  stacked correct/partial/wrong bars).
- **My Students** — list of student accounts + an **Add Student** modal.
- **Recent Grading Sessions** — a table (stacked cards on mobile).

### 6.5 Student dashboard (`/student/dashboard`)
- **Welcome header** — "Welcome back, [name]", roll number, class.
- **3 summary stats** — Total exams, Average score, Best subject.
- **Exam list** — each finalized exam is an expandable card. Expanded, it
  reuses the result-page components (score hero, question cards, lesson
  plan) **in read-only mode** — no editing, no generating.

### 6.6 Auth pages (`/teacher/signup`, `/teacher/login`, `/student/login`)
- A single centered card on the cream background, with an icon, a
  heading, the form fields, an error line, a submit button, and a link to
  the alternate action. Student login has a friendlier tone ("Hi! Log in
  to see your grades", 🎒 icon).

### 6.7 `/student/[rollno]` — teacher viewing a student
- "Back to dashboard" link, the student's name/roll/class, and the same
  read-only exam list a student would see.

---

## 7. Design System (current)

The redesign should stay consistent with — or deliberately evolve — these
tokens. They are defined as CSS variables in `src/app/globals.css`.

### 7.1 Colour palette (warm, light-only)

| Token | HSL | Approx. hex | Use |
|---|---|---|---|
| `background` | `43 100% 95%` | `#FFF8E7` | App background — **warm cream** |
| `foreground` | `0 0% 10%` | `#1A1A1A` | Primary text |
| `card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `primary` | `193 72% 21%` | `#0F4C5C` | **Deep teal** — brand, buttons, headings accent |
| `primary-foreground` | `43 100% 97%` | near-white | Text on teal |
| `accent` | `27 87% 67%` | `#F4A261` | **Warm orange** — secondary accent |
| `success` | `173 58% 39%` | `#2A9D8F` | Green — good scores, positives |
| `destructive` | `0 72% 51%` | red | Errors, low scores |
| `secondary` / `muted` | `42 48% 90%` | light cream | Subtle fills, chips |
| `muted-foreground` | `28 12% 40%` | warm grey | Secondary text |
| `border` | `40 38% 85%` | light tan | Borders, dividers |

Score tones used throughout: **green ≥ 70%**, **amber 40–69%**, **red < 40%**.

### 7.2 Typography
- **Inter** — all UI / English text (`--font-inter`).
- **Noto Sans Bengali** — Bengali script, applied via the `.font-bengali`
  utility class (`--font-bengali`).
- Headings are heavy (`font-extrabold`), tight tracking.

### 7.3 Shape, depth, motion
- Corner radius base `0.75rem`; cards are usually `rounded-2xl` /
  `rounded-3xl`.
- Soft shadows (`shadow-sm` / `shadow-xl shadow-primary/10`).
- **framer-motion** entrances everywhere: fade + 16px slide-up, staggered
  by ~0.1s, easing curve `[0.22, 1, 0.36, 1]`.
- Icons: **lucide-react**, plus emoji used decoratively (📚 ⚠️ 🎒 👩‍🏫).

### 7.4 shadcn/ui components available
`badge`, `button`, `card`, `dialog`, `input`, `label`, `progress`,
`select`, `separator`, `sonner` (toaster), `tabs`.

---

## 8. Reusable Component Inventory

| Component | Location | Role |
|---|---|---|
| `Navbar` | `components/Navbar.tsx` | Sticky top nav; role-aware menus |
| `ScoreRing` | `components/result/` | Animated circular score gauge; tappable to edit |
| `QuestionCard` | `components/result/` | Expandable per-question breakdown |
| `SummaryHero` | `components/result/` | Teal gradient result-summary banner |
| `RubricRow` | `components/result/` | One rubric criterion row |
| `CommonMistakes` | `components/result/` | Class-level mistake list |
| `LessonPlanCard` | `components/result/` | Generate / edit / view a lesson plan |
| `PlayButton` | `components/result/` | Web-Speech audio playback button |
| `StatTile` | `components/dashboard/` | Count-up metric tile |
| `RecentSessionsTable` | `components/dashboard/` | Sessions table (cards on mobile) |
| `ScoreBucketsChart` / `LanguageDistributionChart` | `components/dashboard/` | Recharts bar / donut |
| `SubjectPerformanceCard` | `components/teacher/` | Per-subject card + difficulty popup |
| `QuestionDifficultyPanel` | `components/teacher/` | Stacked correct/partial/wrong bars |
| `StudentExamList` | `components/student/` | Student's expandable exam list |
| `FileDropzone` / `GradingProgress` / `LanguageSelector` | `components/upload/` | Upload-flow pieces |
| `TrainingArchiveStats` | `components/` | Animated "data flywheel" counter |

---

## 9. Data Models

### Teacher
`name`, `email`, `password_hash`, `institution?`, `created_at`

### Student
`roll_number` (unique), `name`, `password_hash`, `class_section?`,
`teacher_id`, `created_at`

### Grading session (`grading_sessions`)
`created_at`, `subject`, `total_score`, `total_max_marks`, `percentage`,
`questions_attempted/unattempted`, `overall_readability` (HIGH/MEDIUM/LOW),
`common_mistakes[]`, `feedback_language`, `page_count`,
`questions_summary[]`, **`grading_result`** (the full result object),
`student_page_samples[]` (base64), `roll_number`, `subject_override`,
`teacher_id`, `finalized`, `submitted_at`, **`lesson_plan`**.

### Grading result (the AI output shape)
- `answer_script` — `subject`, `total_questions`, `total_max_marks`
- `student_summary` — totals, `percentage`, `overall_readability`
- `graded_questions[]` — per question: `question_text`, `max_marks`,
  `attempted`, `extracted_answer`, `score`, `rubric_evaluation[]`,
  `strengths[]`, `mistakes[]`, `feedback_english`, `feedback_translated`,
  `feedback_language`, `source_pages[]`, `readability_confidence`
- `common_mistakes[]`

### Lesson plan
`topic`, `subject`, `duration_minutes`, `learning_objective`,
`bengali_analogy` (+ label), `blackboard_diagram` (ASCII),
`key_explanation`, `oral_quiz[]`, `homework_questions[]`,
`teaching_notes`, `feedback_language`.

---

## 10. API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/grade` | POST | Send images to Gemini, return the grading result |
| `/api/lesson-plan` | POST | Generate a 5-minute lesson plan |
| `/api/archive` | POST | Save a grading session to MongoDB |
| `/api/archive/finalize` | PATCH | Mark a session final & link it to a student |
| `/api/stats` | GET | Global archive counters + analytics |
| `/api/teacher/signup` `login` `logout` `me` | — | Teacher auth |
| `/api/teacher/students` | GET / POST | List / create the teacher's students |
| `/api/teacher/sessions` | GET | The teacher's grading sessions |
| `/api/teacher/analytics` | GET | Subject performance + question difficulty |
| `/api/student/login` `logout` `me` | — | Student auth |
| `/api/student/sessions` | GET | A student's finalized results |

---

## 11. Notes & Opportunities for the UI/UX Redesign

Things worth knowing while redesigning:

- **Mobile matters.** Teachers photograph answer sheets on phones; the
  upload flow and dashboards must be excellent on small screens. The
  navbar is currently a bit tight on phones (no hamburger menu).
- **Two big "moments"** deserve the most polish: the **Result page**
  (the payoff after grading) and the **Teacher Dashboard** (the home
  base). These are the demo showpieces.
- **The grading wait** is 10–25 seconds — the `GradingProgress` overlay
  carries that moment; it could be made more delightful/informative.
- **Bilingual content** is core — Bengali (and Hindi) text appears
  throughout. Layouts must not break with longer translated strings, and
  the Bengali font must always be applied to Bengali text.
- **Trust & encouragement** is the emotional goal — scores are framed as
  "a suggestion, not a verdict"; feedback is encouraging; the teacher can
  always override. The visual tone should feel supportive, not clinical.
- **Empty states** exist everywhere (no students yet, no exams yet, no
  analytics yet) and are a good redesign target.
- **Accessibility:** colour is currently the main signal for score tone
  (green/amber/red) — consider pairing it with icons/labels.
- The legacy global `/dashboard` analytics page still exists but is no
  longer linked in the nav — decide whether to revive, merge, or drop it.

---

*This document reflects the application as currently built. Use it as the
single source of truth for screens, flows, and design tokens when
producing new UI/UX designs.*
