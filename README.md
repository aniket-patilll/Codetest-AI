# CodeTest-AI Documentation

> **Comprehensive Technical Documentation for the AI-Powered Coding Test Platform**
> 
> Version: 1.0.0 | Last Updated: January 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Backend API Reference](#backend-api-reference)
6. [Frontend Application](#frontend-application)
7. [Authentication & Authorization](#authentication--authorization)
8. [AI-Powered Features](#ai-powered-features)
9. [Code Execution Engine](#code-execution-engine)
10. [Scoring System](#scoring-system)
11. [Integrity Monitoring](#integrity-monitoring)
12. [Deployment Guide](#deployment-guide)
13. [Environment Variables](#environment-variables)
14. [Contributing](#contributing)

---

## Project Overview

### Introduction

CodeTest-AI (also known as CodeCraft) is a comprehensive, AI-powered coding test platform designed to facilitate efficient and intelligent assessment of programming skills. The platform enables educators, interviewers, and organizations to create, administer, and evaluate coding tests with the power of artificial intelligence.

### Key Features

- **🎯 Test Creation & Management**: Create coding tests with multiple questions, varying difficulty levels, and customizable test cases
- **💻 Real-time Code Execution**: Execute student code in a sandboxed environment with Docker support for security
- **🤖 AI-Powered Evaluation**: Leverage Groq's LLM API to analyze code quality, logical clarity, and provide intelligent feedback
- **📊 Automated Scoring**: Combine rule-based scoring (test case pass rates) with AI evaluation for comprehensive assessment
- **🏆 Live Leaderboards**: Real-time ranking of participants based on scores and time taken
- **🔒 Academic Integrity**: Built-in anti-cheating measures including tab-switch detection, copy-paste prevention, and event logging
- **📱 Modern UI**: Responsive, sleek interface built with React, TypeScript, and Tailwind CSS
- **👥 Role-Based Access**: Separate dashboards and permissions for hosts (instructors) and students

### Target Users

| User Type | Description | Capabilities |
|-----------|-------------|--------------|
| **Hosts** | Instructors, interviewers, or administrators | Create tests, manage questions, view submissions, access leaderboards |
| **Students** | Participants or candidates | Join tests, solve coding problems, submit solutions, view results |

---

## Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Core backend programming language |
| **FastAPI** | Latest | High-performance async web framework |
| **Pydantic** | v2+ | Data validation and settings management |
| **Supabase** | Latest | PostgreSQL database, authentication, and real-time features |
| **OpenAI SDK** | Latest | Client for Groq API (OpenAI-compatible) |
| **Docker** | Optional | Sandboxed code execution environment |
| **Uvicorn** | Latest | ASGI server for running FastAPI |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI library for building component-based interfaces |
| **TypeScript** | 5.8+ | Type-safe JavaScript superset |
| **Vite** | 5.4+ | Next-generation frontend build tool |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **shadcn/ui** | Latest | High-quality UI component library |
| **React Router** | 6.30+ | Client-side routing |
| **TanStack Query** | 5.83+ | Async state management and data fetching |
| **Monaco Editor** | 4.6+ | VS Code-powered code editor component |
| **Framer Motion** | 12.29+ | Animation library for React |

### External Services

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database hosting, authentication, Row Level Security (RLS) |
| **Groq API** | AI-powered code evaluation (free tier available) |
| **Docker** | Secure code execution sandbox (optional) |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     React + TypeScript + Vite                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │  Auth       │  │  Dashboard  │  │  Test Environment       │   │   │
│  │  │  Context    │  │  Pages      │  │  (Monaco Editor)        │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTP/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     FastAPI Application                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │   │
│  │  │  Routers    │  │  Services   │  │  Dependencies           │   │   │
│  │  │  - execute  │  │  - sandbox  │  │  - auth                 │   │   │
│  │  │  - submit   │  │  - scorer   │  │  - supabase client      │   │   │
│  │  │  - evaluate │  │  - ai_eval  │  │  - role checker         │   │   │
│  │  │  - leaderb. │  │  - ai_gen   │  └─────────────────────────┘   │   │
│  │  │  - generate │  │  - complex. │                                │   │
│  │  └─────────────┘  └─────────────┘                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│    Supabase   │         │   Groq API    │         │    Docker     │
│  PostgreSQL   │         │   (LLM)       │         │   Sandbox     │
└───────────────┘         └───────────────┘         └───────────────┘
```

### Directory Structure

```
codetest-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Pydantic settings configuration
│   │   ├── dependencies.py      # Dependency injection (auth, DB clients)
│   │   ├── auth/
│   │   │   └── jwt.py           # JWT verification utilities
│   │   ├── routers/
│   │   │   ├── execution.py     # Code execution endpoints
│   │   │   ├── submission.py    # Solution submission endpoints
│   │   │   ├── evaluation.py    # AI evaluation endpoints
│   │   │   ├── leaderboard.py   # Leaderboard endpoints
│   │   │   └── generation.py    # AI question generation endpoints
│   │   ├── schemas/
│   │   │   ├── execution.py     # Execution request/response models
│   │   │   ├── submission.py    # Submission models
│   │   │   ├── evaluation.py    # Evaluation models
│   │   │   ├── leaderboard.py   # Leaderboard models
│   │   │   └── generation.py    # Generation models
│   │   └── services/
│   │       ├── sandbox.py       # Docker/local code execution
│   │       ├── scorer.py        # Rule-based scoring logic
│   │       ├── ai_evaluator.py  # Groq-powered code evaluation
│   │       ├── ai_generator.py  # AI question generation
│   │       └── complexity_analyzer.py  # AST-based complexity analysis
│   ├── supabase/
│   │   └── schema.sql           # Database schema definition
│   ├── docker/
│   │   └── docker-compose.yml   # Docker configuration
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main application component with routing
│   │   ├── main.tsx             # Application entry point
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Authentication state management
│   │   ├── lib/
│   │   │   ├── api.ts           # Backend API client functions
│   │   │   ├── supabase.ts      # Supabase client initialization
│   │   │   └── utils.ts         # Utility functions
│   │   ├── pages/
│   │   │   ├── Index.tsx        # Landing page
│   │   │   ├── JoinTest.tsx     # Test join page
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Signup.tsx
│   │   │   │   └── AuthCallback.tsx
│   │   │   ├── host/
│   │   │   │   ├── HostDashboard.tsx
│   │   │   │   ├── TestCreation.tsx
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   ├── Submissions.tsx
│   │   │   │   └── TestResults.tsx
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.tsx
│   │   │   │   └── StudentTestResults.tsx
│   │   │   └── test/
│   │   │       └── TestEnvironment.tsx  # Coding environment
│   │   └── components/
│   │       ├── ui/              # shadcn/ui components
│   │       ├── layout/          # Layout components
│   │       └── test/            # Test-specific components
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
└── docs.md                      # This documentation file
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │───────│    tests    │───────│  questions  │
│             │ 1   * │             │ 1   * │             │
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ email       │       │ host_id(FK) │       │ test_id(FK) │
│ full_name   │       │ name        │       │ title       │
│ role        │       │ duration    │       │ description │
│ created_at  │       │ languages   │       │ difficulty  │
└─────────────┘       │ status      │       │ points      │
      │               │ starts_at   │       │ order_index │
      │               │ ends_at     │       └─────────────┘
      │               │ join_code   │              │
      │               │ password    │              │ 1
      │               └─────────────┘              │
      │                     │                      │ *
      │                     │ 1              ┌─────────────┐
      │                     │                │  testcases  │
      │ *                   │ *              │             │
┌─────────────┐       ┌─────────────┐       │ id (PK)     │
│participants │───────│ submissions │       │ question_id │
│             │ 1   * │             │       │ input       │
│ id (PK)     │       │ id (PK)     │       │ expected    │
│ user_id(FK) │       │ part_id(FK) │       │ is_hidden   │
│ test_id(FK) │       │ quest_id(FK)│       │ order_index │
│ status      │       │ code        │       └─────────────┘
│ joined_at   │       │ language    │
│ started_at  │       │ testcases_p │
│ submitted_at│       │ total_tests │
└─────────────┘       │ rule_score  │
      │               │ ai_eval     │
      │ 1             │ final_score │
      │               │ exec_time   │
      │ *             │ memory      │
┌─────────────┐       │ error       │
│ integrity   │       │ submitted_at│
│   events    │       └─────────────┘
│             │
│ id (PK)     │
│ part_id(FK) │
│ event_type  │
│ metadata    │
│ created_at  │
└─────────────┘
```

### Table Definitions

#### `users` Table
Stores user profile information, extending Supabase's `auth.users`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | References `auth.users(id)` |
| `email` | TEXT | User's email address (unique) |
| `full_name` | TEXT | User's display name |
| `role` | ENUM | Either `'host'` or `'student'` |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |

#### `tests` Table
Stores coding test information created by hosts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique test identifier |
| `host_id` | UUID (FK) | Reference to creator in `users` |
| `name` | TEXT | Test title |
| `duration_minutes` | INTEGER | Test duration (default: 60) |
| `languages` | TEXT[] | Allowed programming languages |
| `status` | ENUM | `draft`, `scheduled`, `active`, `completed` |
| `starts_at` | TIMESTAMPTZ | Scheduled start time |
| `ends_at` | TIMESTAMPTZ | Scheduled end time |
| `join_code` | TEXT | Unique code for students to join |
| `password` | TEXT | Optional test password |
| `created_at` | TIMESTAMPTZ | Test creation timestamp |

#### `questions` Table
Stores individual coding problems within a test.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique question identifier |
| `test_id` | UUID (FK) | Reference to parent test |
| `title` | TEXT | Question title |
| `description` | TEXT | Problem description (Markdown) |
| `difficulty` | ENUM | `easy`, `medium`, `hard` |
| `points` | INTEGER | Maximum points (default: 100) |
| `order_index` | INTEGER | Display order |

#### `testcases` Table
Stores input/output pairs for validating solutions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique testcase identifier |
| `question_id` | UUID (FK) | Reference to parent question |
| `input` | TEXT | Test input (JSON string) |
| `expected_output` | TEXT | Expected output |
| `is_hidden` | BOOLEAN | Whether visible to students |
| `order_index` | INTEGER | Execution order |

#### `participants` Table
Tracks student participation in tests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique participant record ID |
| `user_id` | UUID (FK) | Reference to student in `users` |
| `test_id` | UUID (FK) | Reference to test |
| `status` | ENUM | `registered`, `started`, `submitted` |
| `joined_at` | TIMESTAMPTZ | When student joined |
| `started_at` | TIMESTAMPTZ | When test was started |
| `submitted_at` | TIMESTAMPTZ | When test was submitted |

#### `submissions` Table
Stores code submissions and evaluation results.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique submission identifier |
| `participant_id` | UUID (FK) | Reference to participant |
| `question_id` | UUID (FK) | Reference to question |
| `code` | TEXT | Submitted source code |
| `language` | TEXT | Programming language used |
| `testcases_passed` | INTEGER | Number of passed testcases |
| `total_testcases` | INTEGER | Total number of testcases |
| `rule_based_score` | FLOAT | Score from testcase execution |
| `ai_evaluation` | JSONB | AI evaluation results |
| `final_score` | FLOAT | Combined final score |
| `execution_time` | TEXT | Average execution time |
| `memory_used` | TEXT | Memory consumption |
| `runtime_error` | TEXT | Error message if any |
| `submitted_at` | TIMESTAMPTZ | Submission timestamp |

#### `integrity_events` Table
Logs potential cheating attempts during tests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique event identifier |
| `participant_id` | UUID (FK) | Reference to participant |
| `event_type` | ENUM | `tab_switch`, `copy_paste`, `paste`, `window_blur`, `right_click` |
| `metadata` | JSONB | Additional event details |
| `created_at` | TIMESTAMPTZ | When event occurred |

### Leaderboard View

The `leaderboard` view aggregates participant scores with proper ranking:

```sql
CREATE VIEW public.leaderboard AS
SELECT 
    ROW_NUMBER() OVER (
        PARTITION BY p.test_id 
        ORDER BY COALESCE(SUM(s.final_score), 0) DESC, 
                 p.submitted_at ASC NULLS LAST
    ) as rank,
    p.test_id,
    p.id as participant_id,
    u.id as user_id,
    u.full_name as student_name,
    COALESCE(SUM(s.final_score), 0) as total_score,
    COALESCE(SUM(s.testcases_passed), 0) as total_testcases_passed,
    COALESCE(SUM(s.total_testcases), 0) as total_testcases,
    p.submitted_at - p.started_at as time_taken,
    p.submitted_at
FROM public.participants p
JOIN public.users u ON p.user_id = u.id
LEFT JOIN public.submissions s ON s.participant_id = p.id
WHERE p.status = 'submitted'
GROUP BY p.test_id, p.id, u.id, u.full_name, p.submitted_at, p.started_at;
```

---

## Backend API Reference

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-backend-domain.com`

### API Versioning
All endpoints are prefixed with `/api/v1`

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase_access_token>
```

---

### Code Execution API

#### `POST /api/v1/execute`

Execute code against provided testcases in a sandboxed environment.

**Tags**: `Code Execution`

**Authentication**: Required

**Request Body**:
```json
{
  "code": "def solution(nums, target):\n    pass",
  "language": "python",
  "testcases": [
    {
      "input": "{\"nums\": [1, 2, 3], \"target\": 4}",
      "expected_output": "7"
    }
  ],
  "timeout_seconds": 10,
  "memory_limit_mb": 256
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Source code to execute |
| `language` | string | Yes | Programming language (`python`) |
| `testcases` | array | Yes | Array of testcase objects |
| `timeout_seconds` | integer | No | Max execution time (default: 10) |
| `memory_limit_mb` | integer | No | Memory limit (default: 256) |

**Response** (200 OK):
```json
{
  "results": [
    {
      "testcase_index": 0,
      "passed": true,
      "actual_output": "7",
      "expected_output": "7",
      "execution_time_ms": 42.5,
      "memory_used_mb": 12.3,
      "error": null
    }
  ],
  "summary": {
    "passed": 1,
    "failed": 0,
    "total": 1,
    "avg_execution_time_ms": 42.5,
    "max_memory_mb": 12.3
  },
  "runtime_error": null
}
```

---

### Submission API

#### `POST /api/v1/submit`

Submit a solution for complete evaluation (runs against all testcases including hidden ones).

**Tags**: `Submissions`

**Authentication**: Required

**Request Body**:
```json
{
  "question_id": "uuid-of-question",
  "code": "def solution(data):\n    return data['a'] + data['b']",
  "language": "python",
  "is_final": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_id` | UUID | Yes | ID of the question being answered |
| `code` | string | Yes | Source code of the solution |
| `language` | string | Yes | Programming language used |
| `is_final` | boolean | No | Whether this is the final submission |

**Response** (200 OK):
```json
{
  "submission_id": "uuid-of-new-submission",
  "testcases_passed": 8,
  "total_testcases": 10,
  "rule_based_score": 76.5,
  "execution_time": "45ms",
  "memory_used": "15.2MB",
  "runtime_error": null
}
```

**Notes**:
- AI evaluation runs automatically in the background after submission
- The `final_score` will be updated once AI evaluation completes

---

#### `GET /api/v1/submissions/{test_id}`

Get all submissions for a test (host only).

**Tags**: `Submissions`

**Authentication**: Required (Host role)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `test_id` | UUID | The test ID to fetch submissions for |

**Response** (200 OK):
```json
[
  {
    "id": "uuid",
    "student_name": "John Doe",
    "student_id": "user-uuid",
    "language": "python",
    "score": 85.5,
    "testcases_passed": 9,
    "total_testcases": 10,
    "submitted_at": "2026-01-28T10:30:00Z",
    "execution_time": "42ms",
    "memory_used": "14.8MB",
    "participant_started_at": "2026-01-28T09:00:00Z",
    "participant_submitted_at": "2026-01-28T10:30:00Z"
  }
]
```

---

#### `GET /api/v1/submission/{submission_id}`

Get detailed information about a specific submission.

**Tags**: `Submissions`

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `submission_id` | UUID | The submission ID |

**Response** (200 OK):
```json
{
  "id": "uuid",
  "participant_id": "uuid",
  "question_id": "uuid",
  "code": "def solution(data):\n    ...",
  "language": "python",
  "testcases_passed": 9,
  "total_testcases": 10,
  "rule_based_score": 85.0,
  "ai_evaluation": {
    "code_quality_score": 8.5,
    "logical_clarity_score": 9.0,
    "time_complexity": "O(n)",
    "space_complexity": "O(1)",
    "overall_score": 8.7,
    "suggestions": [
      "Consider adding input validation",
      "Variable names could be more descriptive"
    ],
    "justification": "The solution is clean and efficient..."
  },
  "final_score": 86.2,
  "execution_time": "42ms",
  "memory_used": "14.8MB",
  "runtime_error": null,
  "submitted_at": "2026-01-28T10:30:00Z"
}
```

---

### AI Evaluation API

#### `POST /api/v1/evaluate`

Manually trigger AI evaluation on a submission.

**Tags**: `AI Evaluation`

**Authentication**: Required

**Request Body**:
```json
{
  "submission_id": "uuid-of-submission"
}
```

**Response** (200 OK):
```json
{
  "submission_id": "uuid",
  "ai_evaluation": {
    "code_quality_score": 8.5,
    "logical_clarity_score": 9.0,
    "time_complexity": "O(n)",
    "space_complexity": "O(1)",
    "overall_score": 8.7,
    "suggestions": [
      "Consider adding input validation",
      "Variable names could be more descriptive"
    ],
    "justification": "The solution demonstrates good understanding..."
  },
  "final_score": 86.2,
  "rule_based_score": 85.0,
  "ai_weight": 0.3
}
```

---

### AI Question Generation API

#### `POST /api/v1/generate/question`

Generate a coding question using AI based on a topic prompt.

**Tags**: `Generation`

**Authentication**: Required

**Request Body**:
```json
{
  "prompt": "Binary search on a sorted array",
  "difficulty": "medium",
  "testcase_count": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Topic description for the question |
| `difficulty` | string | Yes | `easy`, `medium`, or `hard` |
| `testcase_count` | integer | No | Number of testcases to generate (default: 5) |

**Response** (200 OK):
```json
{
  "title": "Binary Search",
  "description": "Given a sorted array of integers and a target value...",
  "difficulty": "medium",
  "testcases": [
    {
      "input": "{\"nums\": [1, 3, 5, 7, 9], \"target\": 5}",
      "expected_output": "2",
      "is_hidden": false
    }
  ],
  "code_snippets": {
    "python": {
      "starter_code": "def binary_search(nums, target):\n    pass",
      "driver_code": "import sys\nimport json\nif __name__ == '__main__':\n    data = json.loads(sys.stdin.read())\n    print(binary_search(data['nums'], data['target']))"
    }
  }
}
```

---

### Leaderboard API

#### `GET /api/v1/leaderboard/{test_id}`

Get the leaderboard for a specific test.

**Tags**: `Leaderboard`

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `test_id` | UUID | The test ID |

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Maximum entries to return (1-100) |
| `offset` | integer | 0 | Pagination offset |

**Response** (200 OK):
```json
{
  "test_id": "uuid",
  "entries": [
    {
      "rank": 1,
      "student_name": "Alice Johnson",
      "user_id": "uuid",
      "total_score": 95.5,
      "testcases_passed": 19,
      "total_testcases": 20,
      "time_taken": "01:15:30",
      "submitted_at": "2026-01-28T11:15:30Z"
    }
  ],
  "total_participants": 42
}
```

**Ranking Logic**:
1. **Primary**: Total score (descending)
2. **Tiebreaker**: Time taken (ascending)
3. **Secondary**: Submission time (ascending)

---

#### `GET /api/v1/leaderboard/{test_id}/my-rank`

Get the current user's rank in a test leaderboard.

**Tags**: `Leaderboard`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "ranked": true,
  "rank": 5,
  "total_score": 85.0,
  "testcases_passed": 17,
  "total_testcases": 20,
  "time_taken": "01:30:00"
}
```

---

### Health Check API

#### `GET /health`

Check if the API is running and healthy.

**Tags**: `Health`

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## Frontend Application

### Page Structure

#### Public Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index.tsx` | Landing page with product overview |
| `/login` | `Login.tsx` | User authentication page |
| `/signup` | `Signup.tsx` | User registration page |
| `/auth/callback` | `AuthCallback.tsx` | OAuth callback handler |
| `/join` | `JoinTest.tsx` | Test join page (with code input) |
| `/join/:code` | `JoinTest.tsx` | Direct join via URL with code |

#### Host Pages (Protected)

| Route | Component | Description |
|-------|-----------|-------------|
| `/host` | `HostDashboard.tsx` | Host home with test overview |
| `/host/tests` | `HostDashboard.tsx` | List of created tests |
| `/host/tests/create` | `TestCreation.tsx` | Create new test |
| `/host/tests/:id` | `TestCreation.tsx` | Edit existing test |
| `/host/tests/:id/manage` | `TestCreation.tsx` | Manage test settings |
| `/host/submissions` | `Submissions.tsx` | View all submissions |
| `/host/leaderboard` | `Leaderboard.tsx` | View leaderboards |
| `/host/tests/:id/results` | `TestResults.tsx` | Detailed test results |

#### Student Pages (Protected)

| Route | Component | Description |
|-------|-----------|-------------|
| `/student` | `StudentDashboard.tsx` | Student home with joined tests |
| `/student/tests` | `StudentDashboard.tsx` | List of joined tests |
| `/student/results/:id` | `StudentTestResults.tsx` | View test results |

#### Test Environment (Protected)

| Route | Component | Description |
|-------|-----------|-------------|
| `/test/:id` | `TestEnvironment.tsx` | Coding test interface |

### Key Components

#### AuthContext
Manages authentication state across the application:

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  setUserRole: (role: UserRole) => void;
  refreshSession: () => Promise<void>;
}
```

#### TestEnvironment
The main coding interface featuring:

- **Monaco Editor**: VS Code-powered code editor with syntax highlighting
- **Question Display**: Markdown-rendered problem descriptions
- **Test Runner**: Execute code against sample testcases
- **Submission Handler**: Submit solutions for full evaluation
- **Timer**: Countdown timer for test duration
- **Integrity Monitoring**: Tab switch, copy/paste detection

#### API Client (`lib/api.ts`)
Centralized API functions for backend communication:

```typescript
// Code Execution
executeCode(request: ExecutionRequest): Promise<ExecutionResponse>

// Submissions
submitSolution(request: SubmissionRequest): Promise<SubmissionResponse>

// Leaderboard
getLeaderboard(testId: string, limit?: number, offset?: number): Promise<LeaderboardResponse>
getMyRank(testId: string): Promise<MyRankResponse>

// AI Features
evaluateSubmission(submissionId: string): Promise<EvaluationResponse>
generateQuestion(prompt: string, difficulty: string, testcaseCount?: number): Promise<GeneratedQuestion>

// Test Management (via Supabase)
getHostTests(): Promise<Test[]>
createTest(test: CreateTestRequest): Promise<Test>
updateTest(testId: string, updates: Partial<Test>): Promise<Test>
deleteTest(testId: string): Promise<void>

// Questions & Testcases
getQuestions(testId: string): Promise<Question[]>
createQuestion(question: CreateQuestionRequest): Promise<Question>
getTestcases(questionId: string): Promise<Testcase[]>

// Participants
getParticipants(testId: string): Promise<Participant[]>
joinTest(testId: string): Promise<JoinResult>
getStudentTests(): Promise<StudentTest[]>
```

---

## Authentication & Authorization

### Authentication Flow

CodeTest-AI uses Supabase Auth for authentication, supporting:

1. **Email/Password Authentication**
   - Traditional signup with email verification
   - Password-based login

2. **OAuth (Google)**
   - Social login via Google accounts
   - Automatic profile creation on first login

### JWT Token Verification

The backend verifies Supabase JWT tokens for API requests:

```python
def verify_supabase_jwt(token: str, jwt_secret: str, supabase_url: str) -> dict:
    """
    Verify a Supabase JWT token and return the decoded payload.
    """
    # Decodes and validates the token
    # Returns user claims including 'sub' (user ID)
```

### Role-Based Access Control

Two user roles with distinct permissions:

| Role | Capabilities |
|------|--------------|
| **Host** | Create/manage tests, view all submissions, access leaderboards, generate questions |
| **Student** | Join tests, solve problems, submit solutions, view own results |

### Row Level Security (RLS)

Database-level security policies ensure data isolation:

```sql
-- Example: Users can only read their own profile
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Example: Hosts can only manage their own tests
CREATE POLICY "Hosts can manage own tests" ON public.tests
    FOR ALL USING (auth.uid() = host_id);

-- Example: Students can only view visible testcases
CREATE POLICY "Participants can view sample testcases" ON public.testcases
    FOR SELECT USING (
        is_hidden = false AND
        EXISTS (
            SELECT 1 FROM public.questions q
            JOIN public.participants p ON q.test_id = p.test_id
            WHERE q.id = question_id AND p.user_id = auth.uid()
        )
    );
```

---

## AI-Powered Features

### AI Code Evaluation

The platform uses Groq's LLM API to provide intelligent code evaluation:

#### Evaluation Criteria

| Criterion | Score Range | Description |
|-----------|-------------|-------------|
| Code Quality | 1-10 | Readability, naming conventions, code structure |
| Logical Clarity | 1-10 | Algorithm clarity and logical flow |
| Time Complexity | String | Big O notation (e.g., "O(n)", "O(n log n)") |
| Space Complexity | String | Big O notation for space usage |
| Overall Score | 1-10 | Weighted average of all factors |

#### Evaluation Prompt

```
You are an expert code reviewer evaluating a coding submission...

Please evaluate the code and respond with a JSON object containing:
1. code_quality_score (1-10)
2. logical_clarity_score (1-10)
3. time_complexity (string)
4. space_complexity (string)
5. overall_score (1-10)
6. suggestions (array of strings)
7. justification (string)
```

### AI Question Generation

Hosts can generate coding questions using natural language prompts:

```python
await generate_question_with_ai(
    topic="Two sum problem with hash map",
    difficulty="medium",
    testcase_count=5
)
```

The AI generates:
- Problem title and description (Markdown)
- Starter code template
- Driver code for I/O handling
- Multiple testcases (visible + hidden)

### Static Complexity Analysis

In addition to AI evaluation, the platform performs AST-based complexity analysis:

```python
class ComplexityAnalyzer:
    """Analyzes Python code to estimate time and space complexity."""
    
    def estimate_time_complexity(self) -> str:
        # Analyzes loop nesting, recursion, and operations
        # Returns Big O notation
        
    def estimate_space_complexity(self) -> str:
        # Analyzes data structures and recursion depth
        # Returns Big O notation
```

---

## Code Execution Engine

### Execution Modes

The platform supports two code execution modes:

#### 1. Docker Sandbox (Production)
- Isolated container environment
- Enforced resource limits (CPU, memory, time)
- Network isolation for security
- Supports multiple languages

#### 2. Local Subprocess (Development)
- Direct subprocess execution
- Faster for development/testing
- Automatic fallback when Docker unavailable

### Execution Flow

```
┌─────────────────┐
│ User Code Input │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Language Config │ (extension, image, commands)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Temp File│
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │   Docker   │───────────┐
    │ Available? │           │ No
    └────┬───────┘           │
         │ Yes               │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ Docker Execute  │  │ Local Execute   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └────────┬───────────┘
                  │
                  ▼
         ┌───────────────┐
         │ Parse Output  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Compare with  │
         │ Expected      │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Return Result │
         └───────────────┘
```

### Language Support

Currently supported:

| Language | Extension | Docker Image | Status |
|----------|-----------|--------------|--------|
| Python | `.py` | `python:3.11-slim` | ✅ Full Support |

### Resource Limits

| Resource | Default | Maximum |
|----------|---------|---------|
| Execution Timeout | 10 seconds | Configurable |
| Memory Limit | 256 MB | Configurable |

---

## Scoring System

### Hybrid Scoring Approach

The platform combines two scoring methods for comprehensive evaluation:

```
Final Score = (Rule-Based Score × 0.7) + (AI Score × 0.3)
```

### Rule-Based Scoring

```python
def calculate_score(
    testcases_passed: int,
    total_testcases: int,
    question_points: int = 100,
    execution_time_ms: float = 0,
    memory_used_mb: float = 0
) -> ScoringResult:
    """
    Scoring Logic:
    - Base score = (testcases_passed / total_testcases) × question_points
    - Time bonus: +5% if execution < average
    - Memory bonus: +5% if memory < average
    - Penalty: -10% per failed testcase after 50% pass rate
    """
```

| Component | Calculation |
|-----------|-------------|
| **Base Score** | `(passed / total) × max_points` |
| **Time Bonus** | +5% if faster than average |
| **Memory Bonus** | +5% if less memory than average |
| **Penalty** | -10% per failed testcase (after 50% pass rate, capped at 30%) |

### AI Scoring

AI evaluation provides a score on a 1-10 scale, normalized to 100:

```python
normalized_ai_score = ai_score × 10
```

The AI considers:
- Code quality and readability
- Logical clarity and structure
- Algorithmic efficiency
- Best practices adherence

---

## Integrity Monitoring

### Anti-Cheating Measures

The test environment implements multiple integrity controls:

#### 1. Tab Switch Detection
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logIntegrityEvent('tab_switch');
    }
});
```

#### 2. Copy/Paste Prevention
```javascript
document.addEventListener('copy', (e) => {
    e.preventDefault();
    logIntegrityEvent('copy_paste');
});

document.addEventListener('paste', (e) => {
    e.preventDefault();
    logIntegrityEvent('paste');
});
```

#### 3. Right-Click Prevention
```javascript
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    logIntegrityEvent('right_click');
});
```

#### 4. Keyboard Shortcut Prevention
```javascript
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && ['c', 'v', 'Tab'].includes(e.key)) {
        e.preventDefault();
    }
});
```

#### 5. Window Blur Detection
```javascript
window.addEventListener('blur', () => {
    logIntegrityEvent('window_blur');
});
```

### Integrity Event Logging

All suspicious events are logged to the database:

```json
{
  "participant_id": "uuid",
  "event_type": "tab_switch",
  "metadata": {
    "timestamp": "2026-01-28T10:15:30Z",
    "context": "During question 2"
  },
  "created_at": "2026-01-28T10:15:30Z"
}
```

### Fullscreen Mode

The test environment encourages fullscreen mode to:
- Maximize focus on the test
- Reduce distraction
- Enable better monitoring

---

## Deployment Guide

### Backend Deployment

#### Prerequisites
- Python 3.11+
- Docker (optional, for sandboxed execution)
- Supabase project

#### Local Development

```bash
# Clone repository
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Unix

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env  # Windows
cp .env.example .env    # Unix
# Edit .env with your credentials

# Run development server
uvicorn app.main:app --reload --port 8000
```

#### Docker Deployment

```bash
# Build image
docker build -t codetest-api .

# Run container
docker run -p 8000:8000 --env-file .env codetest-api
```

#### Production Deployment (Render, etc.)

1. Connect your repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Configure environment variables

### Frontend Deployment

#### Prerequisites
- Node.js 18+
- npm or bun

#### Local Development

```bash
# Clone repository
cd frontend

# Install dependencies
npm install
# or
bun install

# Configure environment
copy .env.example .env  # Windows
# Edit .env with your API URL and Supabase credentials

# Run development server
npm run dev
```

#### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

#### Deployment (Vercel, Netlify, etc.)

1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Configure environment variables:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## Environment Variables

### Backend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Yes | Supabase anon/public key | `eyJhbGc...` |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key | `eyJhbGc...` |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret from Supabase settings | `your-jwt-secret` |
| `GROQ_API_KEY` | Yes | Groq API key | `gsk_xxx` |
| `GROQ_MODEL` | No | LLM model to use | `llama-3.1-8b-instant` |
| `CODE_TIMEOUT_SECONDS` | No | Max execution time | `10` |
| `CODE_MEMORY_LIMIT_MB` | No | Max memory limit | `256` |
| `ENVIRONMENT` | No | Deployment environment | `development` |

### Frontend Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_URL` | Yes | Backend API base URL | `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key | `eyJhbGc...` |

---

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Follow ESLint configuration
- **Components**: Use functional components with hooks
- **Commits**: Use conventional commit messages

### Testing

```bash
# Backend tests
pytest

# Frontend tests
npm run test
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

For questions or issues:
- Open a GitHub Issue
- Contact the development team

---

*Built with ❤️ using FastAPI, React, and AI*
