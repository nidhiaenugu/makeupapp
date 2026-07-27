import type { Metadata } from 'next';
import { QuizFlow } from '@/components/QuizFlow';

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'Tell us about your skin, hair and priorities to get matched products.',
};

export default function QuizPage() {
  return <QuizFlow />;
}
