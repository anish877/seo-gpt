import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DomainSubmission from '../components/DomainSubmission';
import DomainExtraction from '../components/DomainExtraction';
import Step3Results from '../components/Step3Results';
import AIQueryResults, { AIQueryResult, AIQueryStats } from '../components/AIQueryResults';
import Step4Report from '../components/Step4Report';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { maskDomainId } from '@/lib/domainUtils';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [domain, setDomain] = useState('');
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [domainId, setDomainId] = useState<number>(0); 
  const [brandContext, setBrandContext] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<AIQueryResult[]>([]);
  const [queryStats, setQueryStats] = useState<AIQueryStats | null>(null);
  
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [priorityUrls, setPriorityUrls] = useState<string[]>([]);
  const [priorityPaths, setPriorityPaths] = useState<string[]>([]);
  const [location, setLocation] = useState<string>('');
  const [isSavingMain, setIsSavingMain] = useState(false);
  
  // Add completion tracking for each step
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const { user, loading: authLoading, token } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Function to update domain current step in the database
  const updateDomainCurrentStep = async (domainId: number, step: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/domain/${domainId}/current-step`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentStep: step }),
      });

      if (!response.ok) {
        throw new Error('Failed to update domain current step');
      }

      const result = await response.json();
      console.log('Domain current step updated:', result);
    } catch (error) {
      console.error('Error updating domain current step:', error);
    }
  };

  useEffect(() => {
    const initializeOnboarding = async () => {
      const urlDomainId = searchParams.get('domainId');
      const reanalyze = searchParams.get('re') === '1' || searchParams.get('reanalyze') === '1';
      if (urlDomainId) {
        const domainIdNum = parseInt(urlDomainId);
        if (domainIdNum > 0) {
          setDomainId(domainIdNum);
          
          // Load the current step from the database
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/domain/${domainIdNum}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const domainData = await response.json();
              if (domainData.success) {
                if (domainData.url) {
                  setDomain(domainData.url);
                }
                // If reanalyze flag present, jump directly to Analysis step
                if (reanalyze) {
                  setCurrentStep(1);
                  setCompletedSteps(new Set([0]));
                } else if (domainData.currentStep !== undefined) {
                  setCurrentStep(domainData.currentStep);
                }
                // Mark all previous steps as completed
                const completedStepsSet = new Set<number>();
                const stepForCompletion = reanalyze ? 1 : (domainData.currentStep ?? 0);
                for (let i = 0; i <= stepForCompletion; i++) completedStepsSet.add(i);
                setCompletedSteps(completedStepsSet);
              }
            }
          } catch (error) {
            console.error('Error loading domain current step:', error);
            // Fallback: mark step 0 as completed
            setCompletedSteps(prev => new Set([...prev, 0]));
          }
        }
      }
    };

    if (token) {
      initializeOnboarding();
    }
  }, [searchParams, token]);

  useEffect(() => {
    console.log('Domain ID changed to:', domainId);
  }, [domainId]);

  // Function to mark a step as completed
  const markStepCompleted = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };

  // Function to check if a step can be accessed
  const canAccessStep = (stepIndex: number) => {
    if (stepIndex === 0) return true; // First step is always accessible
    if (stepIndex <= currentStep) return true; // Can access current and previous steps
    // For future steps, check if all previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      if (!completedSteps.has(i)) {
        return false;
      }
    }
    return true;
  };

  const nextStep = async (passedDomainId?: number) => {
    if (currentStep < 4) {
      if (passedDomainId && passedDomainId > 0) {
        setDomainId(passedDomainId);
        console.log('Domain ID set from previous step:', passedDomainId);
        
        // Update the URL to reflect the new domain ID
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('domainId', passedDomainId.toString());
        window.history.replaceState({}, '', newUrl.toString());
      }
      
      console.log('Moving to next step. Current step:', currentStep, 'Domain ID:', domainId, 'Passed Domain ID:', passedDomainId);
      
      try {
        // Mark current step as completed before moving to next
        markStepCompleted(currentStep);
        const newStep = currentStep + 1;
        setCurrentStep(newStep);
        
        // Update currentStep in the database if we have a domainId
        const currentDomainId = passedDomainId && passedDomainId > 0 ? passedDomainId : domainId;
        if (currentDomainId > 0) {
          await updateDomainCurrentStep(currentDomainId, newStep);
        }
      } catch (error) {
        console.error('Failed to save progress:', error);
        markStepCompleted(currentStep);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = async () => {
    if (currentStep > 0) {
      try {
        const newStep = currentStep - 1;
        setCurrentStep(newStep);
        
        // Update currentStep in the database if we have a domainId
        if (domainId > 0) {
          await updateDomainCurrentStep(domainId, newStep);
        }
      } catch (error) {
        console.error('Failed to save progress:', error);
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const completeAnalysis = async () => {
    setIsSavingMain(true);
    
    try {
      // Mark the final step as completed
      markStepCompleted(currentStep);
      
      // Update currentStep to 4 (completed) in the database
      const currentDomainId = domainId > 0 ? domainId : parseInt(searchParams.get('domainId') || '0');
      if (currentDomainId > 0) {
        await updateDomainCurrentStep(currentDomainId, 4);
      }
      
      // Ensure we're using the correct domain ID
      const finalDomainId = currentDomainId;
      const maskedId = maskDomainId(finalDomainId);
      const dashboardUrl = `/dashboard/${maskedId}`;
      console.log('Index - Current domainId state:', domainId);
      console.log('Index - URL searchParams domainId:', searchParams.get('domainId'));
      console.log('Index - Final domain ID for navigation:', finalDomainId);
      console.log('Index - Dashboard URL:', dashboardUrl);
      navigate(dashboardUrl);
    } catch (error) {
      console.error('Failed to complete analysis:', error);
      setIsSavingMain(false);
    }
  };

  // Simplified steps with clean naming
  const steps = [
    'Domain',
    'Analysis',
    'Phrases',
    'Testing',
    'Report'
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 rounded-full animate-spin border-t-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-light text-gray-900">Domain Analysis</h1>
              <p className="text-sm text-gray-500 mt-1">Step {currentStep + 1} of {steps.length}</p>
            </div>

            {/* Compact segmented steps (clickable) + Back button */}
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="inline-flex p-1 bg-gray-50 rounded-lg overflow-x-auto max-w-[60vw] sm:max-w-none">
                {steps.map((step, index) => {
                  const canGo = canAccessStep(index);
                  const isActive = index === currentStep;
                  return (
                    <button
                      key={step}
                      onClick={() => canGo && setCurrentStep(index)}
                      disabled={!canGo}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      } ${!canGo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {step}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Slim progress bar */}
          <div className="mt-3 sm:mt-4">
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div 
                className="bg-gray-900 h-1 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
 
      {/* Clean Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {currentStep === 0 && (
            <DomainSubmission
              domain={domain}
              setDomain={setDomain}
              onNext={nextStep}
              customPaths={customPaths}
              setCustomPaths={setCustomPaths}
              subdomains={subdomains}
              setSubdomains={setSubdomains}
              priorityUrls={priorityUrls}
              setPriorityUrls={setPriorityUrls}
              priorityPaths={priorityPaths}
              setPriorityPaths={setPriorityPaths}
              location={location}
              setLocation={setLocation}
            />
          )}
          
          {currentStep === 1 && (
            <DomainExtraction
              key={`domain-extraction-${domainId}`}
              domain={domain}
              subdomains={subdomains}
              setDomainId={setDomainId}
              domainId={domainId}
              setBrandContext={setBrandContext}
              onNext={nextStep}
              onPrev={prevStep}
              customPaths={customPaths}
              priorityUrls={priorityUrls}
              priorityPaths={priorityPaths}
              location={location}
            />
          )}
          
          {currentStep === 2 && (
            <Step3Results
              domainId={domainId}
              onNext={(data) => {
                nextStep();
              }}
              onBack={prevStep}
            />
          )}
          
          {currentStep === 3 && (
            <AIQueryResults
              domainId={domainId}
              setQueryResults={setQueryResults}
              setQueryStats={setQueryStats}
              onNext={nextStep}
              onPrev={prevStep}
              location={location}
            />
          )}
 
          {currentStep === 4 && (
            <Step4Report
              domainId={domainId}
              onBack={prevStep}
              onComplete={completeAnalysis}
            />
          )}
      </div>
    </div>
  );
};

export default Index;
