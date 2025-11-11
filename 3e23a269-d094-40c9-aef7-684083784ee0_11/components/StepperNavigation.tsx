
'use client';

interface StepperNavigationProps {
  currentStep: number;
  completedSteps: number[];
}

export default function StepperNavigation({ currentStep, completedSteps }: StepperNavigationProps) {
  const steps = [
    { id: 1, title: 'Domain & Location', description: 'Submit your domain and target location' },
    { id: 2, title: 'Content Analysis', description: 'Extract content and discover keywords' },
    { id: 3, title: 'AI Query Results', description: 'Compare performance across LLMs' },
    { id: 4, title: 'Summary & Report', description: 'Get insights and recommendations' }
  ];

  return (
    <div className="bg-white py-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200 mb-3 ${
                  completedSteps.includes(step.id) 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : currentStep === step.id 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {completedSteps.includes(step.id) ? (
                    <i className="ri-check-line w-5 h-5 flex items-center justify-center"></i>
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                <div className="max-w-32">
                  <h3 className={`text-sm font-semibold mb-1 ${
                    currentStep === step.id || completedSteps.includes(step.id) ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-tight">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-8 mt-6 ${
                  completedSteps.includes(step.id) ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
