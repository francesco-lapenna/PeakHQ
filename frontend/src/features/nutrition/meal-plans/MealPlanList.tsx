import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  useCreateMealPlan,
  useDeleteMealPlan,
  useMealPlans,
} from '@/lib/api/nutrition';
import type { MealPlan } from '@/lib/api/nutrition';
import MealPlanDetail from './MealPlanDetail';

function MealPlanCard({ plan }: { plan: MealPlan }) {
  const [expanded, setExpanded] = useState(false);
  const deletePlan = useDeleteMealPlan();

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <button
            className="flex flex-1 items-center gap-2 text-left font-semibold"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {plan.name}
            {plan.totals && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(plan.totals.kcal)} kcal
              </Badge>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => deletePlan.mutate(plan.mealPlanId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <MealPlanDetail mealPlanId={plan.mealPlanId} />
        </CardContent>
      )}
    </Card>
  );
}

export default function MealPlanList() {
  const { data: plans = [], isLoading } = useMealPlans();
  const createPlan = useCreateMealPlan();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', targetKcal: '', targetProtein: '', targetCarbs: '', targetFat: '' });

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  function handleCreate() {
    createPlan.mutate(
      {
        name: form.name,
        targetKcal: form.targetKcal ? Number(form.targetKcal) : undefined,
        targetProtein: form.targetProtein ? Number(form.targetProtein) : undefined,
        targetCarbs: form.targetCarbs ? Number(form.targetCarbs) : undefined,
        targetFat: form.targetFat ? Number(form.targetFat) : undefined,
      },
      { onSuccess: () => { setCreateOpen(false); setForm({ name: '', targetKcal: '', targetProtein: '', targetCarbs: '', targetFat: '' }); } },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>New meal plan</Button>
      </div>
      {plans.map((p) => <MealPlanCard key={p.mealPlanId} plan={p} />)}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New meal plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Bulk 3500 kcal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Target kcal</Label><Input type="number" value={form.targetKcal} onChange={(e) => setForm((f) => ({ ...f, targetKcal: e.target.value }))} /></div>
              <div><Label>Protein (g)</Label><Input type="number" value={form.targetProtein} onChange={(e) => setForm((f) => ({ ...f, targetProtein: e.target.value }))} /></div>
              <div><Label>Carbs (g)</Label><Input type="number" value={form.targetCarbs} onChange={(e) => setForm((f) => ({ ...f, targetCarbs: e.target.value }))} /></div>
              <div><Label>Fat (g)</Label><Input type="number" value={form.targetFat} onChange={(e) => setForm((f) => ({ ...f, targetFat: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!form.name} onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
