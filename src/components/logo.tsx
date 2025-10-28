import { GitBranchPlus } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="FixConvert Logo">
      <div className="p-2 bg-primary/20 border border-primary/40 rounded-lg shadow-md">
        <GitBranchPlus className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold font-headline text-foreground">
        Fix<span className="text-primary">Convert</span>
      </h1>
    </div>
  );
}
