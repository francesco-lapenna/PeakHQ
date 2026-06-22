import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FavouritesList from '@/features/nutrition/favourites/FavouritesList';
import FoodSearch from '@/features/nutrition/food-search/FoodSearch';
import MealPlanList from '@/features/nutrition/meal-plans/MealPlanList';

export default function NutritionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold">Nutrition</h1>
      <Tabs defaultValue="meal-plans">
        <TabsList>
          <TabsTrigger value="meal-plans">Meal Plans</TabsTrigger>
          <TabsTrigger value="food-search">Food Search</TabsTrigger>
          <TabsTrigger value="favourites">Favourites</TabsTrigger>
        </TabsList>
        <TabsContent value="meal-plans">
          <MealPlanList />
        </TabsContent>
        <TabsContent value="food-search">
          <FoodSearch />
        </TabsContent>
        <TabsContent value="favourites">
          <FavouritesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
