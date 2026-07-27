import type { Metadata } from 'next';
import { ResultsView } from '@/components/ResultsView';

export const metadata: Metadata = {
  title: 'Your matches',
  description: 'Products scored against your profile, with the reasoning shown.',
};

export default function ResultsPage() {
  return <ResultsView />;
}
