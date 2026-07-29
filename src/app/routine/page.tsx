import type { Metadata } from 'next';
import { RoutineView } from '@/components/RoutineView';

export const metadata: Metadata = {
  title: 'Your routine',
  description: 'An ordered routine built from your matched products.',
};

export default function RoutinePage() {
  return <RoutineView />;
}
