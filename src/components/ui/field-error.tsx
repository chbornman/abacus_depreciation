interface FieldErrorProps {
  error?: string;
}

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className="text-sm text-destructive mt-1">{error}</p>
  );
}
