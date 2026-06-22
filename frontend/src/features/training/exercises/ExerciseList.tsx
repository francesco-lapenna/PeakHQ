import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateExercise, useDeleteExercise, useExercises, useUpdateExercise } from '@/lib/api/exercises';
import type { Exercise } from '@/lib/api/exercises';

export default function ExerciseList() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Exercise | null>(null);
  const [form, setForm] = useState({ name: '', primaryMuscles: '', movementPattern: '' });

  const { data: exercises = [], isLoading } = useExercises(debouncedSearch || undefined);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();

  let searchTimer: ReturnType<typeof setTimeout>;
  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setDebouncedSearch(value), 300);
  }

  function openCreate() {
    setForm({ name: '', primaryMuscles: '', movementPattern: '' });
    setCreateOpen(true);
  }

  function openEdit(ex: Exercise) {
    setForm({
      name: ex.name,
      primaryMuscles: ex.primaryMuscles.join(', '),
      movementPattern: ex.movementPattern ?? '',
    });
    setEditTarget(ex);
  }

  function handleSubmit() {
    const data = {
      name: form.name,
      primaryMuscles: form.primaryMuscles.split(',').map((s) => s.trim()).filter(Boolean),
      movementPattern: form.movementPattern || null,
      techniqueTags: null,
    };
    if (editTarget) {
      updateExercise.mutate({ exerciseId: editTarget.exerciseId, ...data }, { onSuccess: () => setEditTarget(null) });
    } else {
      createExercise.mutate(data, { onSuccess: () => setCreateOpen(false) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={openCreate}>New exercise</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <li key={ex.exerciseId}>
              <Card>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ex.name}</span>
                    {ex.isCustom && <Badge variant="outline">Custom</Badge>}
                    {ex.primaryMuscles.map((m) => (
                      <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                  {ex.isCustom && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ex)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        data-testid={`delete-btn-${ex.exerciseId}`}
                        onClick={() => deleteExercise.mutate(ex.exerciseId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen || !!editTarget} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditTarget(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit exercise' : 'New exercise'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ex-name">Name</Label>
              <Input id="ex-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="ex-muscles">Primary muscles (comma-separated)</Label>
              <Input id="ex-muscles" value={form.primaryMuscles} onChange={(e) => setForm((f) => ({ ...f, primaryMuscles: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="ex-pattern">Movement pattern</Label>
              <Input id="ex-pattern" value={form.movementPattern} onChange={(e) => setForm((f) => ({ ...f, movementPattern: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!form.name}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
