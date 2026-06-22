import { Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/lib/api/profile';
import { usePrograms } from '@/lib/api/programs';
import { useCreateSession, useDeleteSession, useSessions } from '@/lib/api/sessions';

function durationStr(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  return `${mins} min`;
}

export default function SessionList() {
  const { data, isLoading } = useSessions();
  const sessions = data?.sessions ?? [];
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();
  const { data: programs = [] } = usePrograms();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const [startOpen, setStartOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState('');

  const activeProgram = programs.find((p) => p.programId === profile?.activeProgramId);

  function handleStart() {
    const today = new Date().toISOString().slice(0, 10);
    const day = activeProgram?.days.find((d) => d.dayId === selectedDayId);
    createSession.mutate(
      {
        date: today,
        programDayId: day?.dayId ?? undefined,
        programId: activeProgram?.programId ?? undefined,
      },
      {
        onSuccess: (session) => {
          setStartOpen(false);
          navigate(`/training/sessions/${session.sessionId}`);
        },
      },
    );
  }

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setStartOpen(true)}>
          <Play className="mr-2 h-4 w-4" />
          Start session
        </Button>
      </div>

      {sessions.map((s) => (
        <Card key={s.sessionId}>
          <CardContent className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{s.date}</p>
              <p className="text-sm text-muted-foreground">
                {durationStr(s.startedAt, s.endedAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => deleteSession.mutate(s.sessionId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start session</DialogTitle>
          </DialogHeader>
          {activeProgram ? (
            <div>
              <Label>Select training day</Label>
              <Select value={selectedDayId} onValueChange={setSelectedDayId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ad-hoc (no plan)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ad-hoc (no plan)</SelectItem>
                  {activeProgram.days.map((d) => (
                    <SelectItem key={d.dayId} value={d.dayId}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active program. The session will be logged as ad-hoc. Set an active program in Settings.
            </p>
          )}
          <DialogFooter>
            <Button onClick={handleStart} disabled={createSession.isPending}>
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
