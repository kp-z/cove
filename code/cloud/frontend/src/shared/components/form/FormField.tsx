/**
 * FormField Component
 *
 * A simple form field wrapper with label and optional hint text
 */

import { Label } from '@/shared/components/ui/label';

interface FormFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}

export function FormField({ label, hint, children, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
