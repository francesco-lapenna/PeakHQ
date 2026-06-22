export interface FoodItem {
  quantityG: number;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroTargets {
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
}

export interface MacroDeviations {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeMealTotals(foodItems: FoodItem[]): MacroTotals {
  return {
    kcal: round2(foodItems.reduce((s, f) => s + (f.quantityG * f.kcalPer100g) / 100, 0)),
    proteinG: round2(foodItems.reduce((s, f) => s + (f.quantityG * f.proteinPer100g) / 100, 0)),
    carbsG: round2(foodItems.reduce((s, f) => s + (f.quantityG * f.carbsPer100g) / 100, 0)),
    fatG: round2(foodItems.reduce((s, f) => s + (f.quantityG * f.fatPer100g) / 100, 0)),
  };
}

export function sumTotals(totals: MacroTotals[]): MacroTotals {
  return {
    kcal: round2(totals.reduce((s, t) => s + t.kcal, 0)),
    proteinG: round2(totals.reduce((s, t) => s + t.proteinG, 0)),
    carbsG: round2(totals.reduce((s, t) => s + t.carbsG, 0)),
    fatG: round2(totals.reduce((s, t) => s + t.fatG, 0)),
  };
}

export function computePlanDeviations(
  totals: MacroTotals,
  targets: MacroTargets,
): MacroDeviations {
  return {
    kcal: round2(totals.kcal - targets.calorieTarget),
    proteinG: round2(totals.proteinG - targets.proteinTargetG),
    carbsG: round2(totals.carbsG - targets.carbsTargetG),
    fatG: round2(totals.fatG - targets.fatTargetG),
  };
}
