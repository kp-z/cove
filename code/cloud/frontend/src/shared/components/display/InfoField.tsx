import { Label } from '@/shared/components/ui/label';

interface InfoFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function InfoField({ label, value, mono }: InfoFieldProps) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={`text-sm ${mono ? 'font-mono break-all' : ''}`}>{value}</p>
    </div>
  );
}
