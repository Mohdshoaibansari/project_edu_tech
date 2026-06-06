import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  return <Loader2 className={cn('animate-spin text-muted-foreground', sizeClass, className)} />;
}
