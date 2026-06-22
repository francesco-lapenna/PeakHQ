import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { type WeeklyLog, usePutWeeklyLog } from '@/lib/api/tracking';

interface Props {
  log: WeeklyLog;
}

function formatWeek(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmt(v: number | null, decimals = 1): string {
  return v === null ? '—' : v.toFixed(decimals);
}

export default function WeeklyLogRow({ log }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<WeeklyLog>>({});
  const putLog = usePutWeeklyLog();

  function startEdit() {
    setDraft({
      liftingDays: log.liftingDays ?? undefined,
      cardioMin: log.cardioMin ?? undefined,
      stepsAvg: log.stepsAvg ?? undefined,
      rhr: log.rhr ?? undefined,
      vo2max: log.vo2max ?? undefined,
      notes: log.notes ?? '',
    });
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraft({});
  }

  function save() {
    putLog.mutate({ weekStart: log.weekStart, ...draft }, { onSuccess: () => setEditing(false) });
  }

  function num(field: keyof WeeklyLog) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((d) => ({ ...d, [field]: e.target.value === '' ? undefined : Number(e.target.value) }));
  }

  const deltaBWEl =
    log.deltaBW === null ? (
      <span className="text-muted-foreground">—</span>
    ) : (
      <Badge variant={log.deltaBW > 0 ? 'destructive' : 'secondary'}>
        {log.deltaBW > 0 ? '+' : ''}
        {log.deltaBW.toFixed(1)}
      </Badge>
    );

  if (!editing) {
    return (
      <TableRow
        onClick={startEdit}
        className="cursor-pointer"
        role="row"
      >
        <TableCell className="font-medium">{formatWeek(log.weekStart)}</TableCell>
        <TableCell>{fmt(log.kcals, 0)}</TableCell>
        <TableCell>{log.deltaKcals === null ? '—' : (log.deltaKcals > 0 ? '+' : '') + log.deltaKcals}</TableCell>
        <TableCell>{log.liftingDays ?? '—'}</TableCell>
        <TableCell>{fmt(log.cardioMin, 0)}</TableCell>
        <TableCell>{fmt(log.stepsAvg, 0)}</TableCell>
        <TableCell>{fmt(log.rhr, 0)}</TableCell>
        <TableCell>{fmt(log.vo2max)}</TableCell>
        <TableCell>{fmt(log.avgBW)}</TableCell>
        <TableCell>{deltaBWEl}</TableCell>
        <TableCell>{fmt(log.minBW)}</TableCell>
        <TableCell>{fmt(log.maxBW)}</TableCell>
        <TableCell className="max-w-[120px] truncate">{log.notes ?? ''}</TableCell>
        <TableCell />
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{formatWeek(log.weekStart)}</TableCell>
      <TableCell>{fmt(log.kcals, 0)}</TableCell>
      <TableCell />
      <TableCell>
        <Input
          type="number"
          min={0}
          max={7}
          className="w-16"
          value={draft.liftingDays ?? ''}
          onChange={num('liftingDays')}
        />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} className="w-20" value={draft.cardioMin ?? ''} onChange={num('cardioMin')} />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} className="w-24" value={draft.stepsAvg ?? ''} onChange={num('stepsAvg')} />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} className="w-16" value={draft.rhr ?? ''} onChange={num('rhr')} />
      </TableCell>
      <TableCell>
        <Input type="number" min={0} step={0.1} className="w-20" value={draft.vo2max ?? ''} onChange={num('vo2max')} />
      </TableCell>
      <TableCell>{fmt(log.avgBW)}</TableCell>
      <TableCell>{deltaBWEl}</TableCell>
      <TableCell>{fmt(log.minBW)}</TableCell>
      <TableCell>{fmt(log.maxBW)}</TableCell>
      <TableCell>
        <Textarea
          className="min-h-0 w-32 py-1"
          rows={2}
          value={draft.notes ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
        />
      </TableCell>
      <TableCell className="space-x-1">
        <Button size="sm" onClick={save} disabled={putLog.isPending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </TableCell>
    </TableRow>
  );
}
