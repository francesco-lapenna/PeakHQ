import { Star } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddFavourite } from '@/lib/api/nutrition';
import type { Favourite } from '@/lib/api/nutrition';

interface OFFProduct {
  code: string;
  product_name: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

interface OFFResult {
  offId: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

async function searchOFF(query: string): Promise<OFFResult[]> {
  const res = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&action=process&json=1&fields=code,product_name,nutriments&page_size=20`,
  );
  const data = await res.json();
  return (data.products ?? [])
    .filter((p: OFFProduct) => p.product_name)
    .map((p: OFFProduct) => ({
      offId: p.code,
      name: p.product_name,
      kcalPer100g: p.nutriments['energy-kcal_100g'] ?? p.nutriments['energy-kcal'] ?? 0,
      proteinPer100g: p.nutriments.proteins_100g ?? 0,
      carbsPer100g: p.nutriments.carbohydrates_100g ?? 0,
      fatPer100g: p.nutriments.fat_100g ?? 0,
    }));
}

export default function FoodSearch() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const addFav = useAddFavourite();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['off-search', submitted],
    queryFn: () => searchOFF(submitted),
    enabled: !!submitted,
  });

  function handleFavourite(item: OFFResult) {
    const fav: Favourite = { ...item, addedAt: new Date().toISOString() };
    addFav.mutate(fav);
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
      >
        <Input
          placeholder="Search Open Food Facts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      <ul className="space-y-2">
        {results.map((item) => (
          <li key={item.offId}>
            <Card>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{Math.round(item.kcalPer100g)} kcal/100g</span>
                    <Badge variant="secondary" className="text-xs">P: {item.proteinPer100g.toFixed(0)}g</Badge>
                    <Badge variant="secondary" className="text-xs">C: {item.carbsPer100g.toFixed(0)}g</Badge>
                    <Badge variant="secondary" className="text-xs">F: {item.fatPer100g.toFixed(0)}g</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Add to favourites"
                  onClick={() => handleFavourite(item)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
