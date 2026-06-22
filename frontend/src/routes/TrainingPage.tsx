import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExerciseList from '@/features/training/exercises/ExerciseList';
import ProgramList from '@/features/training/programs/ProgramList';
import SessionList from '@/features/training/sessions/SessionList';

export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold">Training</h1>
      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="programs">
          <ProgramList />
        </TabsContent>
        <TabsContent value="exercises">
          <ExerciseList />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
