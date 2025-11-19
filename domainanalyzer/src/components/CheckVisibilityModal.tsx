'use client';

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import DomainExtraction from '@/components/DomainExtraction';
import Step3Results from '@/components/Step3Results';
import AIQueryResults, { AIQueryResult, AIQueryStats } from '@/components/AIQueryResults';

type Props = {
  domainId: number;
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
  location?: string;
};

const CheckVisibilityModal: React.FC<Props> = ({ domainId: initialDomainId, isOpen, onClose, domain, location }) => {
  const [step, setStep] = useState(0);
  const [domainId, setDomainId] = useState<number>(initialDomainId || 0);
  const [brandContext, setBrandContext] = useState('');
  const [queryResults, setQueryResults] = useState<AIQueryResult[]>([]);
  const [queryStats, setQueryStats] = useState<AIQueryStats | null>(null);

  const safeLocation = useMemo(() => location || 'Global', [location]);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep(0);
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-[1200px] w-full p-0 max-h-[85vh] overflow-auto">
        {step === 0 && (
          <DomainExtraction
            key={`visibility-extraction-${domainId}`}
            domain={domain || ''}
            subdomains={[]}
            setDomainId={setDomainId}
            domainId={domainId}
            setBrandContext={setBrandContext}
            onNext={() => setStep(1)}
            onPrev={close}
            customPaths={[]}
            priorityUrls={[]}
            priorityPaths={[]}
            location={safeLocation}
            embedded
          />
        )}
        {step === 1 && (
          <Step3Results
            domainId={domainId}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <AIQueryResults
            domainId={domainId}
            setQueryResults={setQueryResults}
            setQueryStats={setQueryStats}
            onNext={close}
            onPrev={() => setStep(1)}
            location={safeLocation}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckVisibilityModal;




