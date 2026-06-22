import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyLogs } from '@/lib/api/tracking';
import WeeklyLogRow from './WeeklyLogRow';

const HEADS = [
  'Week', 'Kcals', 'ΔKcals', 'Lifting', 'Cardio', 'Steps', 'RHR', 'VO2Max',
  'Avg BW', 'ΔBW', 'Min BW', 'Max BW', 'Notes', '',
];

export default function WeeklyLogTable() {
  const { data: weeks = [], isLoading } = useWeeklyLogs();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {weeks.map((log) => (
            <WeeklyLogRow key={log.weekStart} log={log} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
