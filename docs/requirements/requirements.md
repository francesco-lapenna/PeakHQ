# PeakHQ — Requirements Document

Version: 1.1
Date: 2026-06-20
Status: Draft — awaiting stakeholder review

---

## 1. Problem Statement

Existing fitness applications are either too narrow (training-only or nutrition-only) or too complicated (feature-bloated UIs that create friction for daily use). PeakHQ is a personal health dashboard that consolidates training programming, meal planning, and weekly metric tracking in one place, optimised for the individual athlete who wants a comprehensive but uncluttered overview of their progress.

---

## 2. Stakeholders

| Role | Description |
|---|---|
| Primary user | The owner/developer — the sole user of the MVP |
| Future users | General public (potential future phase; out of scope for MVP) |

---

## 3. Scope

### 3.1 In scope (MVP)

- Training plan management and session logging
- Meal planning with external food database integration
- Weekly metric tracking dashboard with body weight logging

### 3.2 Out of scope for MVP

| Item | Reason |
|---|---|
| Multi-user accounts / public registration | Post-MVP decision |
| Food intake logging (what was actually eaten) | Meal planning only for now |
| Wearable / device integration | Manual entry for steps, RHR, VO2Max |
| Progress photos | Post-MVP |
| Social / sharing features | Post-MVP |

---

## 4. Functional Requirements

### F1 — Training

#### F1.1 Exercise Library

- **F1.1.1** The system shall maintain a searchable library of exercises.
- **F1.1.2** Each exercise shall record: name, primary muscle group(s), movement pattern.
- **F1.1.3** The user shall be able to create custom exercises that are added to their library.
- **F1.1.4** Exercises shall support optional technique tags (e.g., drop set, superset, pause rep, tempo, rest-pause).

#### F1.2 Training Program Management

- **F1.2.1** The user shall be able to create, edit, and delete training programs.
- **F1.2.2** Each program shall consist of named training days that form the weekly split (e.g., "Push A", "Pull B", "Legs").
- **F1.2.3** Each training day shall contain an ordered list of exercises.
- **F1.2.4** For each exercise within a training day the user shall define:
  - Planned sets and reps *(required)*
  - Weight / load *(optional)*
  - RPE (Rate of Perceived Exertion, 1–10) *(optional)*
  - Rest time *(optional)*
  - Tempo *(optional)*
  - Technique tags *(optional, see F1.1.4)*
  - Free-text notes *(optional)*
- **F1.2.5** The user shall be able to reorder exercises within a training day.
- **F1.2.6** The user shall be able to have multiple programs saved simultaneously; exactly one program is active at a time.

#### F1.3 Session Logging

- **F1.3.1** The user shall be able to start a session based on a planned training day from the active program.
- **F1.3.2** During a session, for each planned exercise the user shall record:
  - Actual sets completed
  - Reps per set
  - Weight per set
- **F1.3.3** The user shall be able to add exercises to a session that were not in the original plan.
- **F1.3.4** The user shall be able to add free-text notes to a session.
- **F1.3.5** Completed sessions shall be stored with a date and timestamp.
- **F1.3.6** The user shall be able to edit or delete a past session.

#### F1.4 Training History & Progression

- **F1.4.1** The user shall be able to view a chronological list of past sessions.
- **F1.4.2** The user shall be able to view the progression of any exercise over time (e.g., a chart of weight × reps across sessions).

---

### F2 — Nutrition

#### F2.1 Food Database

- **F2.1.1** The system shall integrate with the **Open Food Facts** API (free, no API key required) to allow searching foods by name.
- **F2.1.2** Search results shall display per serving: food name, serving size, calories (kcal), protein (g), carbohydrates (g), fat (g).
- **F2.1.3** The user shall be able to save foods to a personal favourites list for quick access.

#### F2.2 Meal Planning

- **F2.2.1** The user shall be able to create, edit, and delete named meal plans (e.g., "Bulk 3500 kcal", "Cut 2200 kcal").
- **F2.2.2** Each meal plan shall consist of named meals (e.g., Breakfast, Lunch, Pre-workout, Dinner, Snack).
- **F2.2.3** Each meal shall contain one or more food items, each with a quantity (g or ml or servings).
- **F2.2.4** The system shall compute and display total calories and macros (protein, carbs, fat) per meal and for the whole plan.
- **F2.2.5** The user shall be able to set a calorie target and macro targets (g or % of calories) for a plan.
- **F2.2.6** The system shall display the deviation between the plan totals and the set targets.
- **F2.2.7** The user shall be able to have multiple meal plans saved and mark one as active per week.

---

### F3 — Weekly Tracking Dashboard

The weekly tracking view shall display one row per week. Each row covers Monday–Sunday.

| Column | Source | Description |
|---|---|---|
| **Kcals** | Active meal plan | Planned daily calories from the active meal plan |
| **Δ Kcals** | Computed | Difference in Kcals vs the previous week |
| **Lifting (days)** | Manual entry | Number of lifting days completed during the week |
| **Cardio (min)** | Manual entry | Total cardio minutes for the week |
| **Steps** | Manual entry | Weekly daily average of steps |
| **RHR** | Manual entry | Resting heart rate (bpm) |
| **VO2Max** | Manual entry | VO2 Max (ml/kg/min) |
| **Avg Weekly BW** | Computed from daily weigh-ins | Mean of all body weight entries for the week |
| **Δ BW** | Computed | Difference in avg BW vs the previous week |
| **Min BW** | Computed from daily weigh-ins | Minimum body weight logged during the week |
| **Max BW** | Computed from daily weigh-ins | Maximum body weight logged during the week |
| **Check & Notes** | Manual entry | Free-text weekly reflection / review |

#### F3.1 Body Weight Logging

- **F3.1.0** The user shall be able to set a preferred weight unit (kg or lb) in their profile; all body weight values shall be entered and displayed in the chosen unit.
- **F3.1.1** The user shall be able to log body weight for any calendar date.
- **F3.1.2** The system shall compute the weekly average, minimum, and maximum from daily entries automatically.
- **F3.1.3** The system shall compute and display the delta (Δ) in average body weight between consecutive weeks.
- **F3.1.4** The system shall display a trend chart of body weight over time.

#### F3.2 Manual Metric Entry

- **F3.2.1** The user shall be able to enter or edit the following per week: Lifting (days), Cardio (min), Steps (daily average), RHR, VO2Max, Check & Notes.
- **F3.2.2** All manual metric entries shall be persisted and editable after initial entry.

#### F3.3 Weekly Summary Table

- **F3.3.1** The weekly dashboard shall be the home screen of the application.
- **F3.3.2** Weeks shall be displayed with the most recent first.
- **F3.3.3** Delta columns (Δ Kcals, Δ BW) shall be computed automatically and visually highlighted (positive/negative).
- **F3.3.4** The table shall be scrollable to access historical weeks.

---

## 5. Non-Functional Requirements

### NFR1 — Cost

- The system shall operate at zero infrastructure cost within AWS Free Tier limits.
- See `CLAUDE.md` § "Approved Free Tier Architecture" and "Free Tier Guard Rails" for the full list of constraints.

### NFR2 — Security

- All user data (health metrics, training logs) is personal and sensitive.
- The application shall require authentication before any data is accessible (via AWS Cognito).
- No user data shall be accessible without a valid authenticated session.
- No secrets, credentials, or personal data shall be stored in source control.

### NFR3 — Performance

- Initial page load shall complete in under 2 seconds on a standard broadband connection.
- Food database search results shall appear within 1 second of query submission.
- Session logging interactions shall feel immediate (optimistic UI updates where feasible).

### NFR4 — Usability

- The UI shall be responsive and usable on both mobile and desktop browsers.
- The application shall be intuitive to use without documentation: "comprehensive but not overcomplicated".
- The weekly tracking dashboard (F3) shall be the primary entry point.

### NFR5 — Data Integrity

- No logged session, body weight entry, or weekly metric shall be silently discarded on save failure; errors shall be surfaced to the user.
- The system shall provide a data export function (JSON or CSV) covering all user data.

### NFR6 — Availability

- Best-effort availability on AWS Free Tier. No formal SLA for the single-user MVP.

---

## 6. User Stories (MVP)

These user stories define the acceptance criteria for Phase 3 (Implementation / TDD).

### Authentication

| ID | User Story |
|---|---|
| US-01 | As a user, I want to log in with my credentials so that my personal health data is private and accessible only to me. |

### Training

| ID | User Story |
|---|---|
| US-02 | As a user, I want to create a training program with named days and an ordered list of exercises so that I have a structured plan to follow. |
| US-03 | As a user, I want to define sets, reps, and optional fields (weight, RPE, tempo, technique, notes) per exercise so that each session has clear targets. |
| US-04 | As a user, I want to log a completed training session by recording actual sets, reps, and weight per exercise so that I can track what I actually did. |
| US-05 | As a user, I want to add or remove exercises from a session (deviating from the plan) so that I can adapt to what the gym allows or my body dictates. |
| US-06 | As a user, I want to view the history of a specific exercise over time so that I can see my strength progression. |
| US-07 | As a user, I want to create custom exercises so that I am not limited to a predefined library. |

### Nutrition

| ID | User Story |
|---|---|
| US-08 | As a user, I want to search a food database by name so that I can find accurate nutritional information without typing macros manually. |
| US-09 | As a user, I want to create a meal plan with named meals and foods at specified quantities so that I have a structured nutrition plan. |
| US-10 | As a user, I want to see total calories and macros computed automatically for each meal and the whole plan so that I can verify it meets my targets. |
| US-11 | As a user, I want to set calorie and macro targets for a meal plan so that I can compare my plan against my goals. |
| US-12 | As a user, I want to save frequently used foods to a favourites list so that I can build meal plans faster. |

### Weekly Tracking

| ID | User Story |
|---|---|
| US-13 | As a user, I want to log my body weight for any day so that the system can compute my weekly average, minimum, and maximum. |
| US-14 | As a user, I want to enter cardio minutes, steps, RHR, and VO2Max per week so that I have a complete picture of my weekly health. |
| US-15 | As a user, I want the weekly dashboard to be my home screen so that I have an at-a-glance overview every time I open the app. |
| US-16 | As a user, I want delta values (Δ Kcals, Δ BW) computed and highlighted automatically so that I can spot trends at a glance without manual calculation. |
| US-17 | As a user, I want to add a weekly note and review check so that I can record a brief reflection on each week. |

---

## 7. Open Questions

### Resolved

| # | Question | Decision |
|---|---|---|
| OQ-01 | Which external food database API? | **Open Food Facts** — free, no API key, strong European coverage, aligns with zero-cost policy |
| OQ-02 | Weight unit: kg, lb, or both? | **Both** — user sets a preferred unit (kg or lb) in their profile; all values use that unit |
| OQ-03 | Is "Steps" a weekly total or daily average? | **Weekly daily average** |
| OQ-04 | Single or multiple active programs? | **One active program at a time** |

### Pending (Phase 2 input)

| # | Question | Impact |
|---|---|---|
| OQ-05 | What is the tech stack? (Frontend framework, backend runtime) | Phase 2 output — drives CI/CD workflow, CDK stack choices, and test tooling |
