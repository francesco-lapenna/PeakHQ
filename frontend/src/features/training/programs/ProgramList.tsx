import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/lib/api/profile';
import {
  useCreateDay,
  useCreateProgram,
  useDeleteProgram,
  usePrograms,
} from '@/lib/api/programs';
import type { Program } from '@/lib/api/programs';
import ProgramDayDetail from './ProgramDayDetail';

function ProgramCard({ program }: { program: Program }) {
  const [expanded, setExpanded] = useState(false);
  const { data: profile } = useProfile();
  const deleteProgram = useDeleteProgram();
  const createDay = useCreateDay();
  const [addDayOpen, setAddDayOpen] = useState(false);
  const [newDayName, setNewDayName] = useState('');

  const isActive = profile?.activeProgramId === program.programId;

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <button
            className="flex flex-1 items-center gap-2 text-left font-semibold"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {program.name}
            {isActive && <Badge>Active</Badge>}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => deleteProgram.mutate(program.programId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {program.description && (
          <p className="pl-6 text-sm text-muted-foreground">{program.description}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {program.days.map((day) => (
            <ProgramDayDetail key={day.dayId} programId={program.programId} day={day} />
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddDayOpen(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add day
          </Button>
        </CardContent>
      )}

      <Dialog open={addDayOpen} onOpenChange={setAddDayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add training day</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="day-name">Day name</Label>
            <Input
              id="day-name"
              placeholder="e.g. Push A"
              value={newDayName}
              onChange={(e) => setNewDayName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={!newDayName}
              onClick={() =>
                createDay.mutate(
                  { programId: program.programId, name: newDayName, exercises: [] },
                  { onSuccess: () => { setAddDayOpen(false); setNewDayName(''); } },
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ProgramList() {
  const { data: programs = [], isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  if (isLoading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>New program</Button>
      </div>
      {programs.map((p) => (
        <ProgramCard key={p.programId} program={p} />
      ))}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New training program</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="prog-name">Name</Label>
              <Input id="prog-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="prog-desc">Description (optional)</Label>
              <Textarea id="prog-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!form.name}
              onClick={() =>
                createProgram.mutate(form, { onSuccess: () => { setCreateOpen(false); setForm({ name: '', description: '' }); } })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
