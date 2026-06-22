# PeakHQ — DynamoDB Data Model

## Table

**Name:** `PeakHQ-prod`
**Primary key:** `PK` (String) + `SK` (String)
**Capacity:** PAY_PER_REQUEST (on-demand)
**Point-in-time recovery:** enabled

## GSI

| Name | Partition key     | Sort key          | Projection | Purpose                                                         |
| ---- | ----------------- | ----------------- | ---------- | --------------------------------------------------------------- |
| GSI1 | `GSI1PK` (String) | `GSI1SK` (String) | ALL        | Exercise progression: all sets for one exercise, sorted by date |

All other access patterns are served by `SK begins_with` queries on the base table.

---

## Entity Key Patterns

| Entity             | PK                 | SK                                    | GSI1PK                             | GSI1SK                                         |
| ------------------ | ------------------ | ------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| UserProfile        | `USER#<sub>`       | `PROFILE`                             | —                                  | —                                              |
| Exercise (library) | `EXERCISE_LIBRARY` | `EXERCISE#<exerciseId>`               | —                                  | —                                              |
| Exercise (custom)  | `USER#<sub>`       | `EXERCISE#<exerciseId>`               | —                                  | —                                              |
| Program            | `USER#<sub>`       | `PROGRAM#<programId>`                 | —                                  | —                                              |
| ProgramDay         | `USER#<sub>`       | `PROGRAM#<programId>#DAY#<dayId>`     | —                                  | —                                              |
| Session            | `USER#<sub>`       | `SESSION#<YYYY-MM-DD>#<sessionId>`    | —                                  | —                                              |
| SessionSet         | `USER#<sub>`       | `SESSION#<sessionId>#SET#<setId>`     | `USER#<sub>#EXERCISE#<exerciseId>` | `SESSION#<YYYY-MM-DD>#<sessionId>#SET#<setId>` |
| MealPlan           | `USER#<sub>`       | `MEALPLAN#<mealPlanId>`               | —                                  | —                                              |
| Meal               | `USER#<sub>`       | `MEALPLAN#<mealPlanId>#MEAL#<mealId>` | —                                  | —                                              |
| FoodFavourite      | `USER#<sub>`       | `FAVOURITE#<offId>`                   | —                                  | —                                              |
| BodyWeightEntry    | `USER#<sub>`       | `BW#<YYYY-MM-DD>`                     | —                                  | —                                              |
| WeeklyLog          | `USER#<sub>`       | `WEEKLYLOG#<YYYY-MM-DD>`              | —                                  | —                                              |

`<sub>` is the Cognito user pool `sub` claim (UUID), extracted from the JWT by Lambda.
`<YYYY-MM-DD>` dates sort lexicographically in the SK, giving chronological range queries for free.

---

## Entity Attribute Schemas

### UserProfile

```
PK:  USER#<sub>
SK:  PROFILE

weightUnit        String   "kg" | "lb"
activeProgramId   String?  programId of the currently active program (null if none)
activeMealPlanId  String?  mealPlanId of the currently active meal plan (null if none)
createdAt         String   ISO-8601
updatedAt         String   ISO-8601
```

### Exercise

Both library and custom exercises share the same attribute schema. Lambda merges the
two sets on every GET /exercises request.

```
PK:  EXERCISE_LIBRARY  (library) | USER#<sub>  (custom)
SK:  EXERCISE#<exerciseId>

exerciseId       String   UUID v4
name             String
primaryMuscles   List<String>   e.g. ["chest", "triceps"]
movementPattern  String         e.g. "horizontal_push" | "squat" | "hinge" | ...
techniqueTags    List<String>   e.g. ["drop_set", "pause_rep", "superset"]
isCustom         Boolean
createdAt        String   ISO-8601 (custom only)
```

### Program

```
PK:  USER#<sub>
SK:  PROGRAM#<programId>

programId    String   UUID v4
name         String
description  String?
createdAt    String   ISO-8601
updatedAt    String   ISO-8601
```

### ProgramDay

Exercises are embedded as a List attribute. A day typically has 5–10 exercises; the
maximum item size (400 KB) is far above what any realistic plan will reach.
Embedding avoids extra reads when starting a session (one GetItem fetches the full
day plan).

```
PK:  USER#<sub>
SK:  PROGRAM#<programId>#DAY#<dayId>

dayId       String   UUID v4
programId   String
name        String   e.g. "Push A"
order       Number   0-based, for display ordering within the program

exercises   List<Map>
  exerciseId     String
  exerciseName   String   denormalised snapshot (avoids join on session start)
  plannedSets    Number
  plannedReps    String   e.g. "8-12" or "5"
  weight         Number?
  rpe            Number?  1–10
  restSeconds    Number?
  tempo          String?  e.g. "3-1-2-0"
  techniqueTags  List<String>?
  notes          String?

createdAt   String   ISO-8601
updatedAt   String   ISO-8601
```

### Session

Session stores metadata only. Sets are stored as separate items to allow GSI indexing
by exercise (required for the progression query).

```
PK:  USER#<sub>
SK:  SESSION#<YYYY-MM-DD>#<sessionId>

sessionId     String   UUID v4
date          String   YYYY-MM-DD
startedAt     String   ISO-8601
endedAt       String?  ISO-8601
programDayId  String?  null for ad-hoc sessions
programId     String?
notes         String?
createdAt     String   ISO-8601
updatedAt     String   ISO-8601
```

### SessionSet

One item per set logged. GSI1 enables querying all sets for a given exercise across
all sessions, sorted chronologically by date.

```
PK:      USER#<sub>
SK:      SESSION#<sessionId>#SET#<setId>

GSI1PK:  USER#<sub>#EXERCISE#<exerciseId>
GSI1SK:  SESSION#<YYYY-MM-DD>#<sessionId>#SET#<setId>

setId          String   UUID v4
sessionId      String
exerciseId     String
exerciseName   String   denormalised snapshot
setNumber      Number   1-based
reps           Number
weight         Number?
unit           String   "kg" | "lb"
date           String   YYYY-MM-DD  (copied from parent Session for GSI sort key)
createdAt      String   ISO-8601
```

### MealPlan

```
PK:  USER#<sub>
SK:  MEALPLAN#<mealPlanId>

mealPlanId      String   UUID v4
name            String   e.g. "Bulk 3500 kcal"
calorieTarget   Number
proteinTargetG  Number
carbsTargetG    Number
fatTargetG      Number
createdAt       String   ISO-8601
updatedAt       String   ISO-8601
```

Macro totals for the plan are NOT stored — they are computed at read time from the
food items embedded in each Meal.

### Meal

Food items are embedded as a List attribute. A meal typically has 3–8 food items.
Macros per food item are stored as a per-100g snapshot taken from Open Food Facts
at the time the food is added. This snapshot is permanent — if OFF data changes,
the stored plan is not affected.

```
PK:  USER#<sub>
SK:  MEALPLAN#<mealPlanId>#MEAL#<mealId>

mealId      String   UUID v4
mealPlanId  String
name        String   e.g. "Breakfast"
order       Number   0-based

foodItems   List<Map>
  foodItemId      String   UUID v4
  offId           String   Open Food Facts barcode / product ID
  foodName        String   snapshot of OFF product_name at time of addition
  quantityG       Number   grams
  kcalPer100g     Number
  proteinPer100g  Number
  carbsPer100g    Number
  fatPer100g      Number

createdAt   String   ISO-8601
updatedAt   String   ISO-8601
```

### FoodFavourite

```
PK:  USER#<sub>
SK:  FAVOURITE#<offId>

offId           String   Open Food Facts barcode / product ID (natural key)
foodName        String
kcalPer100g     Number
proteinPer100g  Number
carbsPer100g    Number
fatPer100g      Number
addedAt         String   ISO-8601
```

### BodyWeightEntry

Natural key is the date. PutItem overwrites if the user corrects a same-day entry.

```
PK:  USER#<sub>
SK:  BW#<YYYY-MM-DD>

date    String   YYYY-MM-DD
weight  Number
unit    String   "kg" | "lb"
```

### WeeklyLog

Week start is always the Monday of the week (ISO 8601 week convention).
PutItem overwrites on re-entry. BW columns (avg, min, max, delta) are NOT stored —
computed at read time by joining with BodyWeightEntry items.

```
PK:  USER#<sub>
SK:  WEEKLYLOG#<YYYY-MM-DD>   (Monday of the week)

weekStart    String   YYYY-MM-DD
liftingDays  Number?
cardioMin    Number?
stepsAvg     Number?
rhr          Number?
vo2max       Number?
notes        String?
updatedAt    String   ISO-8601
```

---

## Access Patterns

| Access Pattern             | Operation     | Key Condition                                                                |
| -------------------------- | ------------- | ---------------------------------------------------------------------------- |
| Get user profile           | GetItem       | `PK=USER#<sub>, SK=PROFILE`                                                  |
| List library exercises     | Query         | `PK=EXERCISE_LIBRARY`                                                        |
| List custom exercises      | Query         | `PK=USER#<sub>, SK begins_with EXERCISE#`                                    |
| Get single exercise        | GetItem       | `PK=..., SK=EXERCISE#<id>`                                                   |
| List all programs          | Query         | `PK=USER#<sub>, SK begins_with PROGRAM#` (filter: SK not contains `#DAY#`)   |
| List days for a program    | Query         | `PK=USER#<sub>, SK begins_with PROGRAM#<id>#DAY#`                            |
| Get single program day     | GetItem       | `PK=USER#<sub>, SK=PROGRAM#<id>#DAY#<dayId>`                                 |
| List sessions (history)    | Query         | `PK=USER#<sub>, SK begins_with SESSION#`, `ScanIndexForward=false`           |
| Sessions in date range     | Query         | `PK=USER#<sub>, SK between SESSION#<d1> and SESSION#<d2>`                    |
| Sets for a session         | Query         | `PK=USER#<sub>, SK begins_with SESSION#<sessionId>#SET#`                     |
| Exercise progression       | Query on GSI1 | `GSI1PK=USER#<sub>#EXERCISE#<id>`, `ScanIndexForward=true`                   |
| List meal plans            | Query         | `PK=USER#<sub>, SK begins_with MEALPLAN#` (filter: SK not contains `#MEAL#`) |
| List meals for a plan      | Query         | `PK=USER#<sub>, SK begins_with MEALPLAN#<id>#MEAL#`                          |
| List favourites            | Query         | `PK=USER#<sub>, SK begins_with FAVOURITE#`                                   |
| Get BW entries for week    | Query         | `PK=USER#<sub>, SK between BW#<Mon> and BW#<Sun>`                            |
| Get all BW entries (chart) | Query         | `PK=USER#<sub>, SK begins_with BW#`, `ScanIndexForward=true`                 |
| List weekly logs           | Query         | `PK=USER#<sub>, SK begins_with WEEKLYLOG#`, `ScanIndexForward=false`         |

---

## Computed Fields (never stored)

| Field                                   | Computed from                            | Where                           |
| --------------------------------------- | ---------------------------------------- | ------------------------------- |
| Meal totals (kcal, protein, carbs, fat) | `foodItems[].quantityG × *Per100g / 100` | Lambda or frontend              |
| Plan totals                             | Sum of meal totals                       | Lambda or frontend              |
| Plan deviations (Δ)                     | Plan totals − targets                    | Lambda or frontend              |
| Weekly avg BW                           | Mean of `BW#` entries for Mon–Sun        | Lambda (`GET /api/weekly-logs`) |
| Weekly min/max BW                       | Min/max of `BW#` entries for Mon–Sun     | Lambda (`GET /api/weekly-logs`) |
| Weekly Δ BW                             | avg BW this week − avg BW previous week  | Lambda (`GET /api/weekly-logs`) |
| Weekly Kcals                            | Active meal plan `calorieTarget`         | Lambda (`GET /api/weekly-logs`) |
| Weekly Δ Kcals                          | Kcals this week − Kcals previous week    | Lambda (`GET /api/weekly-logs`) |
| Lifting days in weekly dashboard        | From `WeeklyLog.liftingDays` (manual)    | Already stored                  |

The weekly-logs Lambda fetches WeeklyLog items and BodyWeightEntry items for the
requested date range in parallel (`Promise.all` with two Query calls), then assembles
the full row including computed BW columns before returning the response.
