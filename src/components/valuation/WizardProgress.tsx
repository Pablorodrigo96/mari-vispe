import { Check, FileText, BarChart3, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

const steps = [
  { icon: FileText, label: 'Dados Básicos' },
  { icon: BarChart3, label: 'Desempenho' },
  { icon: User, label: 'Identificação' },
];

export const WizardProgress = ({ currentStep, totalSteps }: WizardProgressProps) => {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const Icon = step.icon;

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all',
                  isCompleted && 'bg-success text-success-foreground',
                  isActive && 'bg-gold/10 border-2 border-gold text-gold',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs sm:text-sm font-medium hidden sm:block',
                  isActive && 'text-gold',
                  isCompleted && 'text-success',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {index < totalSteps - 1 && (
              <div
                className={cn(
                  'w-8 sm:w-16 h-0.5 mx-2 sm:mx-4',
                  index < currentStep ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
