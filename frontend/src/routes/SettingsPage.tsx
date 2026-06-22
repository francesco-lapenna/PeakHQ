import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import { usePatchActiveMealPlan, usePatchActiveProgram, useProfile, usePutProfile } from '@/lib/api/profile';
import { usePrograms } from '@/lib/api/programs';
import { useMealPlans } from '@/lib/api/nutrition';

export default function SettingsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: programs } = usePrograms();
  const { data: mealPlans } = useMealPlans();
  const putProfile = usePutProfile();
  const patchActiveProgram = usePatchActiveProgram();
  const patchActiveMealPlan = usePatchActiveMealPlan();

  function handleWeightUnitChange(unit: 'kg' | 'lb') {
    putProfile.mutate({ weightUnit: unit });
  }

  function handleActiveProgramChange(programId: string) {
    patchActiveProgram.mutate({ programId: programId === 'none' ? null : programId });
  }

  function handleActiveMealPlanChange(mealPlanId: string) {
    patchActiveMealPlan.mutate({ mealPlanId: mealPlanId === 'none' ? null : mealPlanId });
  }

  async function handleExport() {
    const data = await apiFetch<unknown>('/export?format=json');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peakhq-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profileLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="weight-unit">Weight unit</Label>
            <Select
              value={profile?.weightUnit ?? 'kg'}
              onValueChange={(v) => handleWeightUnitChange(v as 'kg' | 'lb')}
            >
              <SelectTrigger id="weight-unit" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lb">lb</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Training Program</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={profile?.activeProgramId ?? 'none'}
            onValueChange={handleActiveProgramChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="No active program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {programs?.map((p: { programId: string; name: string }) => (
                <SelectItem key={p.programId} value={p.programId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Meal Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={profile?.activeMealPlanId ?? 'none'}
            onValueChange={handleActiveMealPlanChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="No active meal plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {mealPlans?.map((p: { mealPlanId: string; name: string }) => (
                <SelectItem key={p.mealPlanId} value={p.mealPlanId}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Download all your data as a JSON file.
          </p>
          <Button onClick={handleExport} variant="outline">
            Download JSON export
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
