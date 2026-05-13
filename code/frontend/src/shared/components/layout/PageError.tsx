import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

interface PageErrorProps {
  message: string;
  backTo?: string;
  backLabel?: string;
}

export function PageError({ message, backTo, backLabel = 'Back' }: PageErrorProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <p className="text-destructive">{message}</p>
      {backTo && (
        <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
          {backLabel}
        </Button>
      )}
    </div>
  );
}
