import { Link } from 'react-router';
import { Truck } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-green-600 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Truck className="size-10" />
          <div>
            <h1 className="text-3xl font-bold">PECABO</h1>
            <p className="text-sm text-white/90">Grondwerken & Machinverhuur</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
