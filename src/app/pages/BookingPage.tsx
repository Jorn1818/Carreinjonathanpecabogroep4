import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Header } from '@/app/components/Header';
import { machines } from '@/app/data/machines';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Textarea } from '@/app/components/ui/textarea';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Euro, Package, Truck } from 'lucide-react';
import { Booking } from '@/app/types';
import { Link } from 'react-router';

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const machine = machines.find(m => m.id === id);

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  if (!machine) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Machine niet gevonden</p>
        </div>
      </div>
    );
  }

  const toggleAccessory = (accessoryId: string) => {
    setSelectedAccessories(prev =>
      prev.includes(accessoryId)
        ? prev.filter(id => id !== accessoryId)
        : [...prev, accessoryId]
    );
  };

  const calculatePrice = () => {
    if (!startDate || !endDate) return 0;
    
    const days = Math.max(1, differenceInDays(endDate, startDate) + 1);
    let total = machine.pricePerDay * days;

    // Add accessory costs
    if (machine.accessories) {
      selectedAccessories.forEach(accId => {
        const accessory = machine.accessories!.find(a => a.id === accId);
        if (accessory) {
          total += accessory.pricePerDay * days;
        }
      });
    }

    return total;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      alert('Selecteer alstublieft start- en einddatum');
      return;
    }

    const booking: Booking = {
      id: `booking-${Date.now()}`,
      machineId: machine.id,
      machineName: machine.name,
      customerName,
      customerEmail,
      customerPhone,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      accessories: selectedAccessories,
      deliveryRequired,
      deliveryAddress: deliveryRequired ? deliveryAddress : undefined,
      totalPrice: calculatePrice(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // In a real app, this would be saved to a database
    localStorage.setItem('lastBooking', JSON.stringify(booking));
    navigate(`/confirmation/${booking.id}`);
  };

  const totalPrice = calculatePrice();
  const days = startDate && endDate ? Math.max(1, differenceInDays(endDate, startDate) + 1) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Link to={`/machine/${machine.id}`} className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft className="size-4 mr-2" />
          Terug naar machine details
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Reservering maken</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Machine Info */}
            <Card>
              <CardHeader>
                <CardTitle>Geselecteerde machine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                    <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{machine.name}</h3>
                    <p className="text-green-600 flex items-center">
                      <Euro className="size-4" />
                      {machine.pricePerDay}/dag
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Verhuurperiode</CardTitle>
                <CardDescription>Selecteer de start- en einddatum</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startdatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 size-4" />
                          {startDate ? format(startDate, 'PPP', { locale: nl }) : 'Selecteer datum'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Einddatum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 size-4" />
                          {endDate ? format(endDate, 'PPP', { locale: nl }) : 'Selecteer datum'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => !startDate || date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {startDate && endDate && (
                  <p className="text-sm text-gray-600">
                    Totaal: <span className="font-semibold">{days} dag{days !== 1 ? 'en' : ''}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Accessories */}
            {machine.accessories && machine.accessories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="size-5" />
                    Accessoires (optioneel)
                  </CardTitle>
                  <CardDescription>Selecteer de gewenste accessoires</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {machine.accessories.map(accessory => (
                    <div key={accessory.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                      <Checkbox
                        id={accessory.id}
                        checked={selectedAccessories.includes(accessory.id)}
                        onCheckedChange={() => toggleAccessory(accessory.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={accessory.id} className="cursor-pointer">
                          <p className="font-medium">{accessory.name}</p>
                          <p className="text-sm text-gray-600">{accessory.description}</p>
                          <p className="text-sm text-green-600 font-semibold mt-1">
                            +€{accessory.pricePerDay}/dag
                          </p>
                        </Label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Uw gegevens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Naam *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    placeholder="Uw volledige naam"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    placeholder="naam@voorbeeld.nl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefoonnummer *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    placeholder="+32 123 45 67 89"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="size-5" />
                  Bezorging
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="delivery"
                    checked={deliveryRequired}
                    onCheckedChange={(checked) => setDeliveryRequired(checked as boolean)}
                  />
                  <Label htmlFor="delivery" className="cursor-pointer">
                    Ik wil de machine laten bezorgen
                  </Label>
                </div>

                {deliveryRequired && (
                  <div className="space-y-2">
                    <Label htmlFor="address">Bezorgadres</Label>
                    <Textarea
                      id="address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Straat, nummer, postcode, plaats"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
              Reservering bevestigen
            </Button>
          </form>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Overzicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Machine ({days} {days !== 1 ? 'dagen' : 'dag'})</span>
                    <span className="font-medium">€{machine.pricePerDay * days}</span>
                  </div>

                  {machine.accessories && selectedAccessories.map(accId => {
                    const accessory = machine.accessories!.find(a => a.id === accId);
                    if (!accessory) return null;
                    return (
                      <div key={accId} className="flex justify-between text-sm">
                        <span className="text-gray-600">{accessory.name} ({days} {days !== 1 ? 'dagen' : 'dag'})</span>
                        <span className="font-medium">€{accessory.pricePerDay * days}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Totaal (excl. BTW)</span>
                    <span className="text-2xl font-bold text-green-600 flex items-center">
                      <Euro className="size-5" />
                      {totalPrice}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  <p className="font-medium mb-1">Let op:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>BTW wordt toegevoegd op de factuur</li>
                    <li>Bezorging wordt apart berekend</li>
                    <li>Borgsom vereist bij afhaling</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
