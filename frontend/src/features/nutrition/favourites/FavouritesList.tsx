import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteFavourite, useFavourites } from '@/lib/api/nutrition';

export default function FavouritesList() {
  const { data: favourites = [], isLoading } = useFavourites();
  const deleteFav = useDeleteFavourite();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (favourites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No favourites yet. Search foods and star them to save here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {favourites.map((fav) => (
        <Card key={fav.offId}>
          <CardContent className="py-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{fav.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(fav.kcalPer100g)} kcal/100g
                  </Badge>
                  <Badge variant="outline" className="text-xs">P {fav.proteinPer100g.toFixed(0)}g</Badge>
                  <Badge variant="outline" className="text-xs">C {fav.carbsPer100g.toFixed(0)}g</Badge>
                  <Badge variant="outline" className="text-xs">F {fav.fatPer100g.toFixed(0)}g</Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                title="Remove from favourites"
                onClick={() => deleteFav.mutate(fav.offId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
