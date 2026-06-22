# PeakHQ — API Contract

## General Conventions

**Base URL:** `https://<cloudfront-domain>/api`

**Authentication:** Every request must carry `Authorization: Bearer <Cognito ID token>`.
API Gateway validates the token against the Cognito JWKS endpoint before invoking
Lambda. A missing or invalid token returns `401 Unauthorized` with no Lambda invocation.

**User identity:** The `userId` is **always** extracted from the JWT `sub` claim inside
Lambda. It is never passed in the request body or URL path.

**Content type:** `application/json` for all request and response bodies.

**Timestamps:** ISO-8601 strings (`2026-06-22T10:00:00Z`).

**Error response shape:**

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Program prog-uuid-1 not found."
  }
}
```

**HTTP status codes:**

| Code | Meaning                                            |
| ---- | -------------------------------------------------- |
| 200  | OK — successful read or update                     |
| 201  | Created — resource created                         |
| 204  | No Content — successful delete                     |
| 400  | Bad Request — validation failure (Zod)             |
| 401  | Unauthorized — missing or invalid JWT              |
| 404  | Not Found — resource does not exist                |
| 409  | Conflict — operation rejected due to business rule |
| 500  | Internal Server Error                              |

**Food search** is NOT a Lambda endpoint. The frontend calls Open Food Facts directly:

```
GET https://world.openfoodfacts.org/cgi/search.pl
    ?search_terms={query}&search_simple=1&action=process&json=1
    &fields=code,product_name,nutriments&page_size=20
```

Extract from `nutriments`: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`.

---

## User Profile

### GET /api/profile

Returns the user's profile.

**Response 200:**

```json
{
  "weightUnit": "kg",
  "activeProgramId": "prog-uuid-1",
  "activeMealPlanId": "mp-uuid-1"
}
```

`activeProgramId` and `activeMealPlanId` are `null` if not set.

**Response 404:** Profile not yet initialised (first login — frontend should call PUT to initialise).

---

### PUT /api/profile

Create or replace the user profile.

**Request body:**

```json
{ "weightUnit": "kg" }
```

**Response 200:** Same shape as GET.

---

### PATCH /api/profile/active-program

Set or clear the active program.

**Request body:**

```json
{ "programId": "prog-uuid-1" }
```

To clear: `{ "programId": null }`

**Response 200:** Updated profile object.
**Response 404:** If `programId` does not exist.

---

### PATCH /api/profile/active-meal-plan

Set or clear the active meal plan.

**Request body:**

```json
{ "mealPlanId": "mp-uuid-1" }
```

To clear: `{ "mealPlanId": null }`

**Response 200:** Updated profile object.
**Response 404:** If `mealPlanId` does not exist.

---

## Training — Exercise Library

### GET /api/exercises

List all exercises (library + user custom, merged).

**Query params:**

- `search` (string, optional) — case-insensitive filter on `name`

**Response 200:**

```json
{
  "exercises": [
    {
      "exerciseId": "ex-uuid-1",
      "name": "Barbell Back Squat",
      "primaryMuscles": ["quads", "glutes"],
      "movementPattern": "squat",
      "techniqueTags": [],
      "isCustom": false
    }
  ]
}
```

---

### POST /api/exercises

Create a custom exercise.

**Request body:**

```json
{
  "name": "Meadows Row",
  "primaryMuscles": ["lats", "rear_delts"],
  "movementPattern": "horizontal_pull",
  "techniqueTags": ["pause_rep"]
}
```

**Response 201:** Created exercise object (same shape as list item, `isCustom: true`).

---

### PUT /api/exercises/{exerciseId}

Update a custom exercise. Returns 409 if the exercise is a library item (not custom).

**Request body:** Same shape as POST.
**Response 200:** Updated exercise object.

---

### DELETE /api/exercises/{exerciseId}

Delete a custom exercise.

**Response 204.**
**Response 409:** If the exercise is referenced by any saved program day.

---

### GET /api/exercises/{exerciseId}/progression

All sets logged for this exercise across all sessions, sorted by date ascending.
Served via GSI1.

**Response 200:**

```json
{
  "exerciseId": "ex-uuid-1",
  "exerciseName": "Barbell Bench Press",
  "sets": [
    {
      "date": "2026-05-01",
      "sessionId": "sess-uuid-0",
      "setNumber": 1,
      "reps": 6,
      "weight": 80,
      "unit": "kg"
    }
  ]
}
```

---

## Training — Programs

### GET /api/programs

List all programs with their days and exercises embedded.

**Response 200:**

```json
{
  "programs": [
    {
      "programId": "prog-uuid-1",
      "name": "PPL Intermediate",
      "description": "Push/Pull/Legs 6 days",
      "days": [
        {
          "dayId": "day-uuid-1",
          "name": "Push A",
          "order": 0,
          "exercises": [
            {
              "exerciseId": "ex-uuid-1",
              "exerciseName": "Barbell Bench Press",
              "plannedSets": 4,
              "plannedReps": "6-8",
              "weight": 80,
              "rpe": 8,
              "restSeconds": 180,
              "tempo": null,
              "techniqueTags": [],
              "notes": null
            }
          ]
        }
      ],
      "createdAt": "2026-06-01T10:00:00Z",
      "updatedAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/programs

Create a new program.

**Request body:**

```json
{ "name": "PPL Intermediate", "description": "Push/Pull/Legs 6 days" }
```

**Response 201:** Program object with `days: []`.

---

### GET /api/programs/{programId}

Get a single program with its days. Same shape as one item from the list.

**Response 200:** Program object.
**Response 404:** Program not found.

---

### PUT /api/programs/{programId}

Update program name and description only.

**Request body:** `{ "name": "...", "description": "..." }`
**Response 200:** Updated program (without days — use GET to refresh).

---

### DELETE /api/programs/{programId}

Delete a program and all its days.

**Response 204.**
**Response 409:** If the program is currently active.

---

## Training — Program Days

### POST /api/programs/{programId}/days

Add a day to a program.

**Request body:**

```json
{
  "name": "Push A",
  "order": 0,
  "exercises": []
}
```

**Response 201:** Created day object.

---

### PUT /api/programs/{programId}/days/{dayId}

Replace a day's full content. The frontend sends the complete `exercises` array.

**Request body:**

```json
{
  "name": "Push A",
  "order": 0,
  "exercises": [
    {
      "exerciseId": "ex-uuid-1",
      "exerciseName": "Barbell Bench Press",
      "plannedSets": 4,
      "plannedReps": "6-8",
      "weight": 80,
      "rpe": 8,
      "restSeconds": 180,
      "tempo": null,
      "techniqueTags": [],
      "notes": null
    }
  ]
}
```

**Response 200:** Updated day object.

---

### DELETE /api/programs/{programId}/days/{dayId}

**Response 204.**

---

### PATCH /api/programs/{programId}/days/reorder

Reorder all days in a program.

**Request body:**

```json
{ "dayOrder": ["day-uuid-2", "day-uuid-1", "day-uuid-3"] }
```

**Response 200:** `{ "days": [ ...updated days with new order values... ] }`

---

## Training — Sessions

### GET /api/sessions

List session summaries (no sets). Newest first.

**Query params:**

- `from` (YYYY-MM-DD, optional)
- `to` (YYYY-MM-DD, optional)
- `limit` (integer, default 20, max 100)
- `cursor` (string, optional — base64-encoded DynamoDB `LastEvaluatedKey`)

**Response 200:**

```json
{
  "sessions": [
    {
      "sessionId": "sess-uuid-1",
      "date": "2026-06-20",
      "startedAt": "2026-06-20T08:00:00Z",
      "endedAt": "2026-06-20T09:15:00Z",
      "programDayId": "day-uuid-1",
      "programId": "prog-uuid-1",
      "programDayName": "Push A",
      "notes": null
    }
  ],
  "nextCursor": "eyJQSyI6..."
}
```

`nextCursor` is `null` when there are no more results.

---

### POST /api/sessions

Start a new session.

**Request body:**

```json
{
  "date": "2026-06-20",
  "programDayId": "day-uuid-1",
  "programId": "prog-uuid-1",
  "notes": null
}
```

`programDayId` and `programId` are optional (null for ad-hoc sessions).

**Response 201:** Session object (without sets).

---

### GET /api/sessions/{sessionId}

Get a session with all its sets.

**Response 200:**

```json
{
  "sessionId": "sess-uuid-1",
  "date": "2026-06-20",
  "startedAt": "2026-06-20T08:00:00Z",
  "endedAt": "2026-06-20T09:15:00Z",
  "programDayId": "day-uuid-1",
  "notes": "Felt strong today",
  "sets": [
    {
      "setId": "set-uuid-1",
      "exerciseId": "ex-uuid-1",
      "exerciseName": "Barbell Bench Press",
      "setNumber": 1,
      "reps": 6,
      "weight": 82.5,
      "unit": "kg"
    }
  ]
}
```

---

### PATCH /api/sessions/{sessionId}

Update session metadata.

**Request body:**

```json
{ "endedAt": "2026-06-20T09:15:00Z", "notes": "Felt strong today" }
```

**Response 200:** Updated session object (without sets).

---

### DELETE /api/sessions/{sessionId}

Delete the session and all its sets.
**Response 204.**

---

### POST /api/sessions/{sessionId}/sets

Add a set to a session.

**Request body:**

```json
{
  "exerciseId": "ex-uuid-1",
  "exerciseName": "Barbell Bench Press",
  "setNumber": 1,
  "reps": 6,
  "weight": 82.5,
  "unit": "kg"
}
```

**Response 201:** Created set object (includes `setId`).

---

### PUT /api/sessions/{sessionId}/sets/{setId}

Update a set.

**Request body:** Same shape as POST.
**Response 200:** Updated set object.

---

### DELETE /api/sessions/{sessionId}/sets/{setId}

**Response 204.**

---

## Nutrition — Meal Plans

### GET /api/meal-plans

List all meal plans with computed totals.

**Response 200:**

```json
{
  "mealPlans": [
    {
      "mealPlanId": "mp-uuid-1",
      "name": "Bulk 3500 kcal",
      "calorieTarget": 3500,
      "proteinTargetG": 180,
      "carbsTargetG": 400,
      "fatTargetG": 100,
      "totals": { "kcal": 3480, "proteinG": 177, "carbsG": 398, "fatG": 102 },
      "createdAt": "2026-06-01T10:00:00Z",
      "updatedAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/meal-plans

**Request body:**

```json
{
  "name": "Bulk 3500 kcal",
  "calorieTarget": 3500,
  "proteinTargetG": 180,
  "carbsTargetG": 400,
  "fatTargetG": 100
}
```

**Response 201:** Created plan with `meals: []` and zeroed `totals`.

---

### GET /api/meal-plans/{mealPlanId}

Get a plan with all meals, food items, computed totals per meal, total for the plan,
and deviations from targets.

**Response 200:**

```json
{
  "mealPlanId": "mp-uuid-1",
  "name": "Bulk 3500 kcal",
  "calorieTarget": 3500,
  "proteinTargetG": 180,
  "carbsTargetG": 400,
  "fatTargetG": 100,
  "meals": [
    {
      "mealId": "meal-uuid-1",
      "name": "Breakfast",
      "order": 0,
      "foodItems": [
        {
          "foodItemId": "fi-uuid-1",
          "offId": "3017620422003",
          "foodName": "Nutella",
          "quantityG": 30,
          "kcalPer100g": 539,
          "proteinPer100g": 6.3,
          "carbsPer100g": 57.5,
          "fatPer100g": 30.9
        }
      ],
      "totals": { "kcal": 161.7, "proteinG": 1.89, "carbsG": 17.25, "fatG": 9.27 }
    }
  ],
  "totals": { "kcal": 3480, "proteinG": 177, "carbsG": 398, "fatG": 102 },
  "deviations": { "kcal": -20, "proteinG": -3, "carbsG": -2, "fatG": 2 }
}
```

---

### PUT /api/meal-plans/{mealPlanId}

Update plan metadata only.

**Request body:** `{ "name": "...", "calorieTarget": ..., "proteinTargetG": ..., "carbsTargetG": ..., "fatTargetG": ... }`
**Response 200:** Updated plan (without meals).

---

### DELETE /api/meal-plans/{mealPlanId}

**Response 204.**
**Response 409:** If the plan is currently active.

---

## Nutrition — Meals

### POST /api/meal-plans/{mealPlanId}/meals

**Request body:** `{ "name": "Breakfast", "order": 0 }`
**Response 201:** Created meal with `foodItems: []` and zeroed `totals`.

---

### PUT /api/meal-plans/{mealPlanId}/meals/{mealId}

Full replacement of a meal (name, order, complete foodItems array).

**Request body:**

```json
{
  "name": "Breakfast",
  "order": 0,
  "foodItems": [
    {
      "offId": "3017620422003",
      "foodName": "Nutella",
      "quantityG": 30,
      "kcalPer100g": 539,
      "proteinPer100g": 6.3,
      "carbsPer100g": 57.5,
      "fatPer100g": 30.9
    }
  ]
}
```

**Response 200:** Updated meal with computed `totals`.

---

### DELETE /api/meal-plans/{mealPlanId}/meals/{mealId}

**Response 204.**

---

## Nutrition — Food Favourites

### GET /api/favourites

**Response 200:**

```json
{
  "favourites": [
    {
      "offId": "3017620422003",
      "foodName": "Nutella",
      "kcalPer100g": 539,
      "proteinPer100g": 6.3,
      "carbsPer100g": 57.5,
      "fatPer100g": 30.9,
      "addedAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/favourites

Add a food to favourites. Idempotent — if `offId` already exists, the macro snapshot is overwritten.

**Request body:**

```json
{
  "offId": "3017620422003",
  "foodName": "Nutella",
  "kcalPer100g": 539,
  "proteinPer100g": 6.3,
  "carbsPer100g": 57.5,
  "fatPer100g": 30.9
}
```

**Response 201:** Created favourite object.

---

### DELETE /api/favourites/{offId}

**Response 204.**

---

## Weekly Tracking — Body Weight

### GET /api/body-weight

List body weight entries, sorted by date ascending.

**Query params:**

- `from` (YYYY-MM-DD, optional)
- `to` (YYYY-MM-DD, optional)

**Response 200:**

```json
{
  "entries": [
    { "date": "2026-06-19", "weight": 82.3, "unit": "kg" },
    { "date": "2026-06-20", "weight": 82.5, "unit": "kg" }
  ]
}
```

---

### PUT /api/body-weight/{date}

Create or update a body weight entry (idempotent upsert by date).

**Path param:** `date` = `YYYY-MM-DD`

**Request body:** `{ "weight": 82.5, "unit": "kg" }`
**Response 200:** `{ "date": "2026-06-20", "weight": 82.5, "unit": "kg" }`

---

### DELETE /api/body-weight/{date}

**Response 204.**

---

## Weekly Tracking — Weekly Log

### GET /api/weekly-logs

List weekly log rows with computed BW columns. Newest first.

Lambda fetches WeeklyLog items and BodyWeightEntry items for the requested range in
parallel (`Promise.all`), then computes avg/min/max BW and delta values. The active
meal plan `calorieTarget` is fetched from UserProfile and used for the Kcals column.

**Query params:**

- `from` (YYYY-MM-DD — Monday, optional, default: 12 weeks before current week)
- `to` (YYYY-MM-DD — Monday, optional, default: current week)

**Response 200:**

```json
{
  "weeks": [
    {
      "weekStart": "2026-06-16",
      "liftingDays": 4,
      "cardioMin": 60,
      "stepsAvg": 8500,
      "rhr": 52,
      "vo2max": 48.5,
      "notes": "Good week, hit all lifts",
      "kcals": 3480,
      "deltaKcals": -20,
      "avgBW": 82.4,
      "deltaBW": -0.3,
      "minBW": 81.9,
      "maxBW": 83.1,
      "bwUnit": "kg"
    }
  ]
}
```

`deltaKcals`, `deltaBW`, `avgBW`, `minBW`, `maxBW` are `null` when there is
insufficient data (first week, no body weight entries for the week, etc.).

---

### PUT /api/weekly-logs/{weekStart}

Create or update a weekly log entry.

**Path param:** `weekStart` = `YYYY-MM-DD` (must be a Monday).

**Request body:**

```json
{
  "liftingDays": 4,
  "cardioMin": 60,
  "stepsAvg": 8500,
  "rhr": 52,
  "vo2max": 48.5,
  "notes": "Good week"
}
```

All fields are optional — only provided fields are updated.

**Response 200:** The stored manual fields (without computed BW columns — use GET for the full view).

---

## Data Export

### GET /api/export

Export all user data.

**Query params:**

- `format`: `json` (default) | `csv`

**Response 200 (JSON):**

```
Content-Type: application/json
Content-Disposition: attachment; filename="peakhq-export-2026-06-22.json"
```

```json
{
  "exportedAt": "2026-06-22T12:00:00Z",
  "profile": { ... },
  "exercises": [ ... ],
  "programs": [ ... ],
  "programDays": [ ... ],
  "sessions": [ ... ],
  "sessionSets": [ ... ],
  "mealPlans": [ ... ],
  "meals": [ ... ],
  "favourites": [ ... ],
  "bodyWeightEntries": [ ... ],
  "weeklyLogs": [ ... ]
}
```

**Response 200 (CSV):**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="peakhq-export-2026-06-22.zip"
```

One CSV file per entity type inside the zip.
