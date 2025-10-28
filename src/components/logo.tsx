import { ArrowRightLeft } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="FixConvert Logo">
      <div className="p-2 bg-primary rounded-lg shadow-md">
        <ArrowRightLeft className="h-6 w-6 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-bold font-headline text-primary">
        FixConvert
      </h1>
    </div>
  );
}
