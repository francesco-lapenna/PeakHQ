import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useExercises } from '@/lib/api/exercises';
import { useDeleteDay, useUpdateDay } from '@/lib/api/programs';
import type { ExerciseEntry, ProgramDay } from '@/lib/api/programs';

interface Props {
  programId: string;
  day: ProgramDay;
}

export default function ProgramDayDetail({ programId, day }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const updateDay = useUpdateDay();
  const deleteDay = useDeleteDay();

  const { data: exercises = [] } = useExercises(exSearch || undefined);

  function removeExercise(exerciseId: string) {
    const exercises = day.exercises.filter((e) => e.exerciseId !== exerciseId);
    updateDay.mutate({ programId, dayId: day.dayId, exercises });
  }

  function addExercise(exerciseId: string, exerciseName: string) {
    const exercises: ExerciseEntry[] = [
      ...day.exercises,
      {
        exerciseId,
        exerciseName,
        order: day.exercises.length,
        plannedSets: 3,
        plannedReps: '8-12',
        weight: null,
        rpe: null,
        restSec: null,
        notes: null,
      },
    ];
    updateDay.mutate({ programId, dayId: day.dayId, exercises }, { onSuccess: () => setPickerOpen(false) });
  }

  return (
    <Card className="border-dashed">
      <CardContent className="py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{day.name}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              + Exercise
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => deleteDay.mutate({ programId, dayId: day.dayId })}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <ul className="space-y-1">
          {day.exercises.map((ex) => (
            <li key={ex.exerciseId} className="flex items-center justify-between text-sm">
              <span>{ex.exerciseName}</span>
              <div className="flex items-center gap-2">
                {ex.plannedSets && ex.plannedReps && (
                  <Badge variant="secondary" className="text-xs">
                    {ex.plannedSets}×{ex.plannedReps}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeExercise(ex.exerciseId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick an exercise</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search…"
            value={exSearch}
            onChange={(e) => setExSearch(e.target.value)}
          />
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {exercises.map((ex) => (
              <li key={ex.exerciseId}>
                <button
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addExercise(ex.exerciseId, ex.name)}
                >
                  {ex.name}
                  {ex.primaryMuscles.map((m) => (
                    <Badge key={m} variant="secondary" className="ml-2 text-xs">{m}</Badge>
                  ))}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
