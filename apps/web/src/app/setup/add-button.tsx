import { Button } from '@/components/ui/button';

export function AddButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <Button variant="outline" className="justify-self-start" onClick={onClick}>
      {label}
    </Button>
  );
}
