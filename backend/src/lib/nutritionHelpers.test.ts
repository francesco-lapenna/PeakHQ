import { describe, expect, it } from 'vitest';
import {
  computeMealTotals,
  computePlanDeviations,
  sumTotals,
} from './nutritionHelpers.js';

const nutella: import('./nutritionHelpers.js').FoodItem = {
  quantityG: 30,
  kcalPer100g: 539,
  proteinPer100g: 6.3,
  carbsPer100g: 57.5,
  fatPer100g: 30.9,
};

describe('computeMealTotals', () => {
  it('returns zero totals for empty list', () => {
    expect(computeMealTotals([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('computes correct macros for a single food item', () => {
    const totals = computeMealTotals([nutella]);
    expect(totals.kcal).toBeCloseTo(161.7, 1);
    expect(totals.proteinG).toBeCloseTo(1.89, 2);
    expect(totals.carbsG).toBeCloseTo(17.25, 2);
    expect(totals.fatG).toBeCloseTo(9.27, 2);
  });

  it('sums multiple food items', () => {
    const totals = computeMealTotals([nutella, nutella]);
    expect(totals.kcal).toBeCloseTo(323.4, 1);
  });
});

describe('sumTotals', () => {
  it('sums an array of MacroTotals', () => {
    const a = { kcal: 100, proteinG: 10, carbsG: 15, fatG: 5 };
    const b = { kcal: 200, proteinG: 20, carbsG: 25, fatG: 10 };
    expect(sumTotals([a, b])).toEqual({ kcal: 300, proteinG: 30, carbsG: 40, fatG: 15 });
  });

  it('returns zeros for empty array', () => {
    expect(sumTotals([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('computePlanDeviations', () => {
  it('computes positive and negative deviations', () => {
    const totals = { kcal: 3480, proteinG: 177, carbsG: 398, fatG: 102 };
    const targets = {
      calorieTarget: 3500,
      proteinTargetG: 180,
      carbsTargetG: 400,
      fatTargetG: 100,
    };
    expect(computePlanDeviations(totals, targets)).toEqual({
      kcal: -20,
      proteinG: -3,
      carbsG: -2,
      fatG: 2,
    });
  });
});
