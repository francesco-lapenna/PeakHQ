import BwEntryCard from '@/features/tracking/BwEntryCard';
import BwTrendChart from '@/features/tracking/BwTrendChart';
import WeeklyLogTable from '@/features/tracking/WeeklyLogTable';

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-muted-foreground">{today}</span>
      </div>
      <BwEntryCard />
      <BwTrendChart />
      <WeeklyLogTable />
    </div>
  );
}
