import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCreateMeal,
  useDeleteMeal,
  useMealPlan,
  useUpdateMeal,
} from '@/lib/api/nutrition';
import type { FoodItem, Meal } from '@/lib/api/nutrition';

function MacroRow({ label, value, target }: { label: string; value: number; target: number | null }) {
  const deviation = target !== null ? value - target : null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 text-muted-foreground">{label}</span>
      <span className="font-medium">{value.toFixed(1)}</span>
      {target !== null && (
        <Badge variant={deviation! > 0 ? 'destructive' : 'secondary'} className="text-xs">
          {deviation! > 0 ? '+' : ''}{deviation!.toFixed(1)}
        </Badge>
      )}
    </div>
  );
}

function MealCard({ meal, mealPlanId }: { meal: Meal; mealPlanId: string }) {
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();
  const [foodSearch, setFoodSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [offResults, setOffResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);

  async function searchOff() {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQ)}&action=process&json=1&fields=code,product_name,nutriments&page_size=10`,
      );
      const data = await res.json();
      const results: FoodItem[] = (data.products ?? [])
        .filter((p: Record<string, unknown>) => p.product_name)
        .map((p: Record<string, unknown>) => {
          const n = p.nutriments as Record<string, number>;
          return {
            offId: p.code as string,
            name: p.product_name as string,
            quantityG: 100,
            kcalPer100g: n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
            proteinPer100g: n.proteins_100g ?? 0,
            carbsPer100g: n.carbohydrates_100g ?? 0,
            fatPer100g: n.fat_100g ?? 0,
          };
        });
      setOffResults(results);
    } finally {
      setSearching(false);
    }
  }

  function addFood(food: FoodItem) {
    const updated: Meal = { ...meal, foodItems: [...meal.foodItems, food] };
    updateMeal.mutate({ mealPlanId, mealId: meal.mealId, foodItems: updated.foodItems });
    setFoodSearch(false);
    setOffResults([]);
    setSearchQ('');
  }

  function removeFood(offId: string) {
    const foodItems = meal.foodItems.filter((f) => f.offId !== offId);
    updateMeal.mutate({ mealPlanId, mealId: meal.mealId, foodItems });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{meal.name}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setFoodSearch(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Add food
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => deleteMeal.mutate({ mealPlanId, mealId: meal.mealId })}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {meal.foodItems.map((f) => (
        <div key={f.offId} className="flex items-center justify-between text-sm">
          <span>{f.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{f.quantityG}g</span>
            <Badge variant="secondary" className="text-xs">
              {Math.round((f.kcalPer100g * f.quantityG) / 100)} kcal
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => removeFood(f.offId)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {meal.totals && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{Math.round(meal.totals.kcal)} kcal</span>
          <span>P: {meal.totals.protein.toFixed(0)}g</span>
          <span>C: {meal.totals.carbs.toFixed(0)}g</span>
          <span>F: {meal.totals.fat.toFixed(0)}g</span>
        </div>
      )}

      <Dialog open={foodSearch} onOpenChange={setFoodSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search foods</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search Open Food Facts…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchOff()}
            />
            <Button onClick={searchOff} disabled={searching}>Search</Button>
          </div>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {offResults.map((f) => (
              <li key={f.offId}>
                <button
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addFood(f)}
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{Math.round(f.kcalPer100g)} kcal/100g</span>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MealPlanDetail({ mealPlanId }: { mealPlanId: string }) {
  const { data: plan, isLoading } = useMealPlan(mealPlanId);
  const createMeal = useCreateMeal();
  const [addMealOpen, setAddMealOpen] = useState(false);
  const [mealName, setMealName] = useState('');

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!plan) return null;

  return (
    <div className="space-y-3">
      {plan.totals && plan.deviations && (
        <div className="rounded-lg bg-muted p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Plan totals vs targets</p>
          <MacroRow label="Kcal" value={plan.totals.kcal} target={plan.targetKcal} />
          <MacroRow label="Protein" value={plan.totals.protein} target={plan.targetProtein} />
          <MacroRow label="Carbs" value={plan.totals.carbs} target={plan.targetCarbs} />
          <MacroRow label="Fat" value={plan.totals.fat} target={plan.targetFat} />
        </div>
      )}

      {plan.meals.map((meal) => (
        <MealCard key={meal.mealId} meal={meal} mealPlanId={mealPlanId} />
      ))}

      <Button size="sm" variant="outline" onClick={() => setAddMealOpen(true)}>
        <Plus className="mr-1 h-3 w-3" />
        Add meal
      </Button>

      <Dialog open={addMealOpen} onOpenChange={setAddMealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add meal</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Meal name</Label>
            <Input
              placeholder="e.g. Breakfast"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!mealName}
              onClick={() =>
                createMeal.mutate(
                  { mealPlanId, name: mealName, foodItems: [] },
                  { onSuccess: () => { setAddMealOpen(false); setMealName(''); } },
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
