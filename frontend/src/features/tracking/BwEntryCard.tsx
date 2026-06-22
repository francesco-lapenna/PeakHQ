import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/lib/api/profile';
import { useBodyWeight, useDeleteBodyWeight, usePutBodyWeight } from '@/lib/api/tracking';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function BwEntryCard() {
  const { data: profile } = useProfile();
  const unit = profile?.weightUnit ?? 'kg';
  const [value, setValue] = useState('');
  const { data: entries = [] } = useBodyWeight({ from: (() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  })() });
  const putBw = usePutBodyWeight();
  const deleteBw = useDeleteBodyWeight();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const weight = parseFloat(value);
    if (isNaN(weight) || weight <= 0) return;
    putBw.mutate({ date: todayDate(), weight, unit }, { onSuccess: () => setValue('') });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body Weight</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder={`Weight (${unit})`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-40"
          />
          <Button type="submit" disabled={putBw.isPending}>
            Log weight
          </Button>
        </form>
        {putBw.isError && (
          <p className="text-sm text-destructive">Failed to save. Please try again.</p>
        )}
        <ul className="space-y-1">
          {entries.slice(0, 7).map((entry) => (
            <li key={entry.date} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{entry.date}</span>
              <span className="font-medium">
                {entry.weight} {entry.unit}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => deleteBw.mutate(entry.date)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
