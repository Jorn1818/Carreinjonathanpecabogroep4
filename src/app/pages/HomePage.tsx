import { useState } from 'react';
import { Link } from 'react-router';
import { Header } from '@/app/components/Header';
import { machines } from '@/app/data/machines';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { CheckCircle2, XCircle, Euro } from 'lucide-react';

export function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Alle machines' },
    { id: 'graafmachine', label: 'Graafmachines' },
    { id: 'minigraver', label: 'Minigravers' },
    { id: 'dumper', label: 'Dumpers' },
    { id: 'kraan', label: 'Kranen' },
  ];

  const filteredMachines = selectedCategory === 'all' 
    ? machines 
    : machines.filter(m => m.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Welkom bij PECABO Machinverhuur
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Verhuur van professionele machines voor grondwerken. 
            Bekijk ons assortiment en boek direct online.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              <span>Professioneel onderhouden</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              <span>Bezorging mogelijk</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              <span>Inclusief accessoires</span>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Filter op categorie</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Machines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map(machine => (
            <Card key={machine.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 overflow-hidden">
                <ImageWithFallback
                  src={machine.image}
                  alt={machine.name}
                  className="w-full h-full object-cover"
                />
                {machine.availability ? (
                  <Badge className="absolute top-2 right-2 bg-green-600">
                    <CheckCircle2 className="size-3 mr-1" />
                    Beschikbaar
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 bg-red-600">
                    <XCircle className="size-3 mr-1" />
                    Verhuurd
                  </Badge>
                )}
              </div>
              
              <CardHeader>
                <CardTitle>{machine.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {machine.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Gewicht:</span>
                    <span className="font-medium">{machine.specifications.weight}</span>
                  </div>
                  {machine.specifications.power && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Vermogen:</span>
                      <span className="font-medium">{machine.specifications.power}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-3 bg-gray-50">
                <div className="w-full flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Vanaf</p>
                    <p className="text-2xl font-bold text-green-600 flex items-center">
                      <Euro className="size-5" />
                      {machine.pricePerDay}
                      <span className="text-sm text-gray-600 ml-1">/dag</span>
                    </p>
                  </div>
                </div>
                <Link to={`/machine/${machine.id}`} className="w-full">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    Bekijk details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
