import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProgression } from '@/lib/api/exercises';

interface Props {
  exerciseId: string;
  exerciseName: string;
}

export default function ExerciseProgressionDrawer({ exerciseId, exerciseName }: Props) {
  const { data: sets = [], isLoading } = useProgression(exerciseId);

  const chartData = sets
    .filter((s) => s.weight !== null)
    .map((s) => ({ date: s.date.slice(5), weight: s.weight, reps: s.reps }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exerciseName} — Progression</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logged sets yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
