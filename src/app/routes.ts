import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/app/pages/HomePage';
import { MachineDetailPage } from '@/app/pages/MachineDetailPage';
import { BookingPage } from '@/app/pages/BookingPage';
import { ConfirmationPage } from '@/app/pages/ConfirmationPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: HomePage,
  },
  {
    path: '/machine/:id',
    Component: MachineDetailPage,
  },
  {
    path: '/booking/:id',
    Component: BookingPage,
  },
  {
    path: '/confirmation/:bookingId',
    Component: ConfirmationPage,
  },
]);
