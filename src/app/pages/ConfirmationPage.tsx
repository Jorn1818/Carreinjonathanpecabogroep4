import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { Header } from '@/app/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCircle2, Euro, Calendar, User, Mail, Phone, MapPin, Package, Home } from 'lucide-react';
import { Booking } from '@/app/types';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // In a real app, this would fetch from a database
    const savedBooking = localStorage.getItem('lastBooking');
    if (savedBooking) {
      setBooking(JSON.parse(savedBooking));
    }
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Reservering niet gevonden</p>
          <Link to="/" className="flex justify-center mt-4">
            <Button className="bg-green-600 hover:bg-green-700">
              <Home className="size-4 mr-2" />
              Terug naar homepagina
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
        {/* Success Message */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="size-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reservering succesvol!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Bedankt voor uw reservering. We nemen zo spoedig mogelijk contact met u op om de details te bevestigen.
            </p>
            <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Reserveringsnummer:</span>
              <span className="ml-2 font-mono font-semibold">{booking.id}</span>
            </div>
          </div>

          {/* Booking Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reserveringsgegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Machine */}
              <div className="flex items-start gap-3">
                <Package className="size-5 text-green-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Machine</p>
                  <p className="font-semibold text-lg">{booking.machineName}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-green-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Verhuurperiode</p>
                  <p className="font-semibold">
                    {format(new Date(booking.startDate), 'PPP', { locale: nl })}
                    {' '}-{' '}
                    {format(new Date(booking.endDate), 'PPP', { locale: nl })}
                  </p>
                </div>
              </div>

              {/* Accessories */}
              {booking.accessories.length > 0 && (
                <div className="flex items-start gap-3">
                  <Package className="size-5 text-green-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Geselecteerde accessoires</p>
                    <ul className="list-disc list-inside">
                      {booking.accessories.map(acc => (
                        <li key={acc} className="font-medium">{acc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-start gap-3 pt-4 border-t">
                <Euro className="size-5 text-green-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Totaalprijs (excl. BTW)</p>
                  <p className="text-2xl font-bold text-green-600">€{booking.totalPrice}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Uw gegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="size-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Naam</p>
                  <p className="font-medium">{booking.customerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="size-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">E-mail</p>
                  <p className="font-medium">{booking.customerEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="size-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Telefoon</p>
                  <p className="font-medium">{booking.customerPhone}</p>
                </div>
              </div>

              {booking.deliveryRequired && booking.deliveryAddress && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <MapPin className="size-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Bezorgadres</p>
                    <p className="font-medium whitespace-pre-line">{booking.deliveryAddress}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Wat nu?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium">Bevestiging per e-mail</p>
                  <p className="text-sm text-gray-600">U ontvangt een bevestigingsmail op {booking.customerEmail}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium">Contact opnemen</p>
                  <p className="text-sm text-gray-600">We bellen u binnen 24 uur om de reservering te bevestigen</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium">Afspraak maken</p>
                  <p className="text-sm text-gray-600">
                    {booking.deliveryRequired 
                      ? 'We plannen de bezorging op het opgegeven adres'
                      : 'We maken een afspraak voor het ophalen van de machine'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/" className="flex-1">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Home className="size-4 mr-2" />
                Terug naar homepagina
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.print()}
            >
              Print bevestiging
            </Button>
          </div>

          {/* Contact Info */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Vragen over uw reservering?</p>
            <p className="font-semibold text-gray-900 mt-1">
              Neem contact op via {booking.customerPhone} of {booking.customerEmail}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
