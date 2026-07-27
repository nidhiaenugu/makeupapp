import type { Metadata } from 'next';
import { SavedView } from '@/components/SavedView';

export const metadata: Metadata = {
  title: 'Saved',
  description: 'Products you have saved in this browser.',
};

export default function SavedPage() {
  return <SavedView />;
}
