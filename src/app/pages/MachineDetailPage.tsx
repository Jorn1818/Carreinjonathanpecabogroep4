import { useParams, Link } from 'react-router';
import { Header } from '@/app/components/Header';
import { machines } from '@/app/data/machines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { CheckCircle2, XCircle, Euro, ArrowLeft, Package } from 'lucide-react';

export function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const machine = machines.find(m => m.id === id);

  if (!machine) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Machine niet gevonden</p>
          <Link to="/" className="flex justify-center mt-4">
            <Button variant="outline">
              <ArrowLeft className="size-4 mr-2" />
              Terug naar overzicht
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft className="size-4 mr-2" />
          Terug naar overzicht
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Image Section */}
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <ImageWithFallback
              src={machine.image}
              alt={machine.name}
              className="w-full h-96 object-cover"
            />
            {machine.availability ? (
              <Badge className="absolute top-4 right-4 bg-green-600 text-lg px-4 py-2">
                <CheckCircle2 className="size-5 mr-2" />
                Beschikbaar
              </Badge>
            ) : (
              <Badge className="absolute top-4 right-4 bg-red-600 text-lg px-4 py-2">
                <XCircle className="size-5 mr-2" />
                Momenteel verhuurd
              </Badge>
            )}
          </div>

          {/* Details Section */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{machine.name}</h1>
            <p className="text-lg text-gray-600 mb-6">{machine.description}</p>

            {/* Pricing */}
            <Card className="mb-6 bg-gradient-to-br from-green-50 to-orange-50">
              <CardHeader>
                <CardTitle>Tarieven</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-700">Per dag</span>
                  <span className="text-2xl font-bold text-green-600 flex items-center">
                    <Euro className="size-5" />
                    {machine.pricePerDay}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-gray-700">Per week</span>
                  <span className="text-2xl font-bold text-green-600 flex items-center">
                    <Euro className="size-5" />
                    {machine.pricePerWeek}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">* Prijzen zijn exclusief BTW</p>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Specificaties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(machine.specifications).map(([key, value]) => (
                    value && (
                      <div key={key} className="border-b pb-2">
                        <p className="text-sm text-gray-600 capitalize">
                          {key === 'weight' && 'Gewicht'}
                          {key === 'power' && 'Vermogen'}
                          {key === 'capacity' && 'Capaciteit'}
                          {key === 'reach' && 'Reikwijdte'}
                        </p>
                        <p className="font-semibold">{value}</p>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA Button */}
            {machine.availability ? (
              <Link to={`/booking/${machine.id}`}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
                  Reserveer deze machine
                </Button>
              </Link>
            ) : (
              <Button className="w-full text-lg py-6" disabled>
                Momenteel niet beschikbaar
              </Button>
            )}
          </div>
        </div>

        {/* Accessories */}
        {machine.accessories && machine.accessories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-6" />
                Beschikbare accessoires
              </CardTitle>
              <CardDescription>
                Selecteer de gewenste accessoires tijdens het boeken
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {machine.accessories.map(accessory => (
                  <Card key={accessory.id} className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">{accessory.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {accessory.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl font-bold text-green-600 flex items-center">
                        <Euro className="size-4" />
                        {accessory.pricePerDay}
                        <span className="text-sm text-gray-600 ml-1">/dag</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
