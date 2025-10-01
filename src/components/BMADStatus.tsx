import { cn } from '@/lib/utils';
export type BmadStage = 'IDLE' | 'BLUEPRINT' | 'MODEL' | 'ASSEMBLE' | 'DEPLOY';
const STAGES: BmadStage[] = ['BLUEPRINT', 'MODEL', 'ASSEMBLE', 'DEPLOY'];
interface BMADStatusProps {
  currentStage: BmadStage;
}
export function BMADStatus({ currentStage }: BMADStatusProps) {
  return (
    <div className="flex items-center space-x-2">
      <p className="text-xs font-extrabold uppercase tracking-widest">BMAD:</p>
      <div className="flex items-center space-x-1.5 rounded-full bg-white p-1 brutalist-border">
        {STAGES.map((stage) => {
          const isActive = stage === currentStage || STAGES.indexOf(stage) < STAGES.indexOf(currentStage);
          return (
            <div
              key={stage}
              className="group relative flex items-center"
            >
              <div
                className={cn(
                  'h-3 w-3 rounded-full brutalist-border transition-colors',
                  isActive ? 'bg-brutalist-yellow' : 'bg-gray-300'
                )}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-none bg-black px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {stage.charAt(0) + stage.slice(1).toLowerCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}