# 🚀 InternHQ

**InternHQ** is an intelligent, full-stack internship portal designed to streamline the internship application, tracking, and recruiting process for students, recruiters, and administrators. 

🔗 **Live Deployment**: [https://internhq.vercel.app](https://internhq.vercel.app)

---

## 🌟 Key Features

### 1. 🎓 Student Command Center & Dashboard
- **Application Tracker**: Track your applications across various stages (`Saved`, `Applied`, `Screening`, `Online Assessment`, `Interview`, `Offer`, `Rejected`, `Withdrawn`) in a Kanban-style layout.
- **Dynamic Recommendations**: Get matched to relevant internship openings based on your profile, skills, and resume.
- **Resume & Document Vault**: Manage multiple versions of resumes and other key documents (Cover Letters, transcripts, certificates).

### 2. 🤖 Automated Career Assistant (Google Workspace Sync)
- **Gmail Sync & Classification**: Connects with Gmail to automatically identify internship-related emails and classify them (e.g., Assessment invites, Interview requests, Rejections, Offers) to update your application timeline.
- **Calendar Sync**: Automatically syncs upcoming interviews, online assessments, and deadline reminders to Google Calendar with custom notifications.

### 3. 📝 Interview Prep Hub
- **Interviews Scheduler**: Log upcoming rounds, interviewer info, and meeting links.
- **Prep Checklists**: Stay organized with round-specific checklists.
- **Q&A Database**: Practice with curated interview questions categorized by difficulty (Easy, Medium, Hard) and domain (Technical, HR, Behavioral, System Design).
- **Community Experiences**: Read and share anonymous interview logs and preparation tips.

### 4. 🏢 Recruiter Platform
- **Company Pages**: Verified company portals showcasing tech stacks, employee benefits, and open positions.
- **Candidate Evaluation**: Screen applicant profiles, rate candidates, add feedback notes, and view matching scores.
- **Direct Messaging**: Chat directly with students through the integrated message interface.
- **Hiring Analytics**: Track dashboard metrics like views, application rates, time-to-hire, and interview counts.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Hybrid server & client-side rendering with React 19 |
| **Language** | **TypeScript** | Fully typed components and database interfaces |
| **Database** | **Supabase (PostgreSQL)** | Relational database with Row Level Security (RLS) |
| **Authentication**| **Supabase Auth** | Secure login/signup and Google OAuth integration |
| **APIs** | **Google APIs** | Gmail & Calendar API OAuth integrations |
| **Styling** | **Tailwind CSS 4** | Next-generation CSS framework with `@tailwindcss/postcss` |
| **Animations** | **Framer Motion** & **tw-animate-css** | Premium animations and micro-transitions |
| **UI Kit** | **shadcn/ui** + **Lucide Icons** | Accessible UI primitives and iconography |

---

## 📁 Key File Structure

```
d:/InternHQ/
├── src/
│   ├── app/                  # Next.js App Router pages and layouts
│   │   ├── admin/            # Admin controls
│   │   ├── applications/     # Application details & tracking
│   │   ├── auth/             # Authentication callback/config
│   │   ├── dashboard/        # Main student workspace dashboard
│   │   ├── onboarding/       # Student/Recruiter initial setup flow
│   │   ├── recruiter/        # Recruiter candidates evaluation workspace
│   │   └── page.tsx          # Homepage client & server entry
│   ├── components/           # Reusable UI component library
│   │   ├── dashboard/        # Dashboard layouts, sidebar, topnav
│   │   ├── shared/           # Theme providers & Command Palette
│   │   └── ui/               # Custom shadcn UI primitives
│   ├── lib/                  # Services and utility library
│   │   ├── services/         # Gmail/Calendar sync & recommendation engine
│   │   └── supabase/         # SSR Supabase browser & server clients
│   └── types/                # Shared TypeScript models
└── supabase/
    ├── migrations/           # Database migration files (PostgreSQL)
    └── schema.sql            # Core database schema
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version 20+ recommended)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shaurya0501/InternHQ.git
   cd InternHQ
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔒 Security & Row Level Security (RLS)

This project leverages PostgreSQL Row Level Security (RLS) extensively. All data queries are constrained to the current authenticated user (`auth.uid() = user_id`), ensuring student resumes, application logs, and recruiter analytics remain isolated and secure.
