
'use client';

import { useState } from 'react';
import StepperNavigation from '@/components/StepperNavigation';
import Step1DomainLocation from '@/components/Step1DomainLocation';
import Step2Analysis from '@/components/Step2Analysis';
import Step3Results from '@/components/Step3Results';
import Step4Report from '@/components/Step4Report';

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepData, setStepData] = useState<any>({});

  const handleStepNext = (data: any) => {
    setStepData(prev => ({ ...prev, ...data }));
    setCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
    setCurrentStep(prev => prev + 1);
  };

  const handleStepBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = () => {
    setCompletedSteps(prev => [...prev.filter(step => step !== currentStep), currentStep]);
    alert('Analysis completed! You can now start a new analysis or view your results in the dashboard.');
    // Reset to start a new analysis
    setCurrentStep(1);
    setCompletedSteps([]);
    setStepData({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Domain Analyzer</h1>
          <p className="text-gray-600">Evaluate how your domain ranks across major LLMs</p>
        </div>
      </div>

      <StepperNavigation currentStep={currentStep} completedSteps={completedSteps} />
      
      <div className="pb-8">
        {currentStep === 1 && (
          <Step1DomainLocation onNext={handleStepNext} />
        )}
        {currentStep === 2 && (
          <Step2Analysis 
            stepData={stepData} 
            onNext={handleStepNext} 
            onBack={handleStepBack} 
          />
        )}
        {currentStep === 3 && (
          <Step3Results 
            stepData={stepData} 
            onNext={handleStepNext} 
            onBack={handleStepBack} 
          />
        )}
        {currentStep === 4 && (
          <Step4Report 
            stepData={stepData} 
            onBack={handleStepBack} 
            onComplete={handleComplete} 
          />
        )}
      </div>
    </div>
  );
}
