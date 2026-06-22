import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/lib/api/profile';
import { useProgram } from '@/lib/api/programs';
import { useCreateSet, usePatchSession, useSession } from '@/lib/api/sessions';

interface SetForm {
  reps: string;
  weight: string;
}

function ExerciseSetLogger({
  sessionId,
  exerciseId,
  exerciseName,
  unit,
}: {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  unit: 'kg' | 'lb';
}) {
  const [form, setForm] = useState<SetForm>({ reps: '', weight: '' });
  const { data: session } = useSession(sessionId);
  const createSet = useCreateSet();

  const existingSets = session?.sets?.filter((s) => s.exerciseId === exerciseId) ?? [];

  function handleLog() {
    const reps = parseInt(form.reps, 10);
    const weight = form.weight === '' ? null : parseFloat(form.weight);
    if (isNaN(reps) || reps < 0) return;
    createSet.mutate(
      {
        sessionId,
        exerciseId,
        exerciseName,
        setNumber: existingSets.length + 1,
        reps,
        weight,
        unit,
      },
      { onSuccess: () => setForm({ reps: '', weight: '' }) },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">{exerciseName}</span>
        <Badge variant="secondary">{existingSets.length} sets logged</Badge>
      </div>
      {existingSets.length > 0 && (
        <ul className="text-sm text-muted-foreground">
          {existingSets.map((s) => (
            <li key={s.setId}>
              Set {s.setNumber}: {s.reps} reps{s.weight !== null ? ` @ ${s.weight} ${s.unit}` : ''}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <div>
          <Label htmlFor={`reps-${exerciseId}`} className="text-xs">Reps</Label>
          <Input
            id={`reps-${exerciseId}`}
            type="number"
            min={0}
            className="w-20"
            value={form.reps}
            onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={`weight-${exerciseId}`} className="text-xs">Weight ({unit})</Label>
          <Input
            id={`weight-${exerciseId}`}
            type="number"
            min={0}
            step={0.5}
            className="w-24"
            value={form.weight}
            onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button size="sm" onClick={handleLog} disabled={createSet.isPending}>
            Log set
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SessionLoggerPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const { data: session, isLoading } = useSession(sessionId);
  const { data: profile } = useProfile();
  const patchSession = usePatchSession();
  const navigate = useNavigate();

  const { data: program } = useProgram(session?.programId ?? '');
  const planDay = program?.days.find((d) => d.dayId === session?.programDayId);
  const unit = profile?.weightUnit ?? 'kg';

  function handleFinish() {
    patchSession.mutate(
      { sessionId, endedAt: new Date().toISOString() },
      { onSuccess: () => navigate('/training') },
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!session) {
    return <p className="p-4 text-destructive">Session not found.</p>;
  }

  const exercises = planDay?.exercises ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Session: {session.date}</h1>
          {planDay && <p className="text-sm text-muted-foreground">{planDay.name}</p>}
        </div>
        <Button onClick={handleFinish} disabled={patchSession.isPending}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Finish
        </Button>
      </div>

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No planned exercises. Start logging sets below.
        </p>
      ) : (
        <div className="space-y-4">
          {exercises.map((ex) => (
            <Card key={ex.exerciseId}>
              <CardContent className="pt-4">
                <ExerciseSetLogger
                  sessionId={sessionId}
                  exerciseId={ex.exerciseId}
                  exerciseName={ex.exerciseName}
                  unit={unit}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
