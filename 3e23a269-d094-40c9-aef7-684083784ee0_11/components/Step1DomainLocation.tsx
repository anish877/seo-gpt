
'use client';

import { useState } from 'react';

interface Step1Props {
  onNext: (data: any) => void;
}

export default function Step1DomainLocation({ onNext }: Step1Props) {
  const [domain, setDomain] = useState('blueoceanglobaltech.com');
  const [targetCountry, setTargetCountry] = useState('United States');
  const [state, setState] = useState('California');
  const [city, setCity] = useState('San Francisco');
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [customKeywords, setCustomKeywords] = useState('');
  const [intentPhrases, setIntentPhrases] = useState('');
  const [chatModel, setChatModel] = useState('GPT-4o');
  const [runAllModels, setRunAllModels] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState([
    { name: 'Domain Validation', status: 'pending', progress: 0 },
    { name: 'SSL Certificate Check', status: 'pending', progress: 0 },
    { name: 'Server Response Analysis', status: 'pending', progress: 0 },
    { name: 'Initial Crawl Setup', status: 'pending', progress: 0 },
    { name: 'Geo-location Configuration', status: 'pending', progress: 0 }
  ]);

  const chatModels = ['GPT-4o', 'Claude 3', 'Gemini 1.5'];
  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan'];

  const validateDomain = (value: string) => {
    const domainRegex = /^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!value) {
      setDomainError('Domain is required');
      return false;
    }
    if (!domainRegex.test(value)) {
      setDomainError('Please enter a valid domain (e.g., example.com)');
      return false;
    }
    setDomainError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateDomain(domain) || !targetCountry) {
      return;
    }

    const keywords = customKeywords.split(',').map(k => k.trim()).filter(k => k).slice(0, 5);
    const phrases = intentPhrases.split(',').map(p => p.trim()).filter(p => p).slice(0, 5);

    if (keywords.length > 5 || phrases.length > 5) {
      return;
    }

    setIsLoading(true);

    // Simulate progressive loading steps
    const steps = [...loadingSteps];
    
    for (let i = 0; i < steps.length; i++) {
      steps[i] = { ...steps[i], status: 'running' };
      setLoadingSteps([...steps]);
      
      // Simulate progress for current step
      for (let progress = 0; progress <= 100; progress += 20) {
        steps[i] = { ...steps[i], progress };
        setLoadingSteps([...steps]);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      steps[i] = { ...steps[i], status: 'completed', progress: 100 };
      setLoadingSteps([...steps]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setTimeout(() => {
      onNext({
        domain,
        targetCountry,
        state,
        city,
        customKeywords: keywords,
        intentPhrases: phrases,
        chatModel,
        runAllModels
      });
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Domain Setup in Progress</h2>
          
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Target Domain: {domain}</span>
              <span className="text-sm text-blue-600">{targetCountry}</span>
            </div>
            {customKeywords && (
              <div className="text-sm text-blue-700">
                Focus Keywords: {customKeywords}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {loadingSteps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-3 ${
                        step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className="font-medium">{step.name}</span>
                  </div>
                  <span className={`text-sm capitalize ${
                    step.status === 'completed' ? 'text-green-600' :
                      step.status === 'running' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.status === 'completed' ? 'Completed' : 
                     step.status === 'running' ? 'In Progress' : 'Pending'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${step.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center text-gray-600">
              <i className="ri-shield-check-line w-5 h-5 flex items-center justify-center mr-2"></i>
              <span className="text-sm">Your data is being securely processed and encrypted</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Domain & Location Submission</h2>
        <p className="text-gray-600">Enter your domain and target location to begin the analysis</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Domain <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    if (e.target.value) validateDomain(e.target.value);
                  }}
                  placeholder="blueoceanglobaltech.com"
                  className={`w-full px-4 py-4 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-sm ${
                    domainError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                <i className="ri-global-line absolute right-4 top-4 w-5 h-5 flex items-center justify-center text-gray-400"></i>
              </div>
              {domainError && <p className="text-red-500 text-sm mt-2">{domainError}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Target Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-12 text-sm"
                  required
                >
                  <option value="">Select country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <i className="ri-map-pin-line absolute right-4 top-4 w-5 h-5 flex items-center justify-center text-gray-400 pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                State <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="California"
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Helps provide more accurate regional results</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                City <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
                className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">Provides granular location-specific insights</p>
            </div>
          </div>

          <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-blue-700 hover:text-blue-800 font-medium cursor-pointer w-full"
            >
              <i className="ri-settings-3-line w-5 h-5 flex items-center justify-center mr-3"></i>
              <span className="text-sm font-semibold">Advanced Filters</span>
              <i className={`ri-arrow-${showAdvanced ? 'up' : 'down'}-s-line w-5 h-5 flex items-center justify-center ml-2`}></i>
            </button>
            <p className="text-blue-600 text-sm mt-2">Make your audit unique to the criteria and keyword. Have it customized.</p>

            {showAdvanced && (
              <div className="mt-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Keywords <span className="text-gray-500">(max 5, comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Intent Phrases <span className="text-gray-500">(max 5, comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={intentPhrases}
                    onChange={(e) => setIntentPhrases(e.target.value)}
                    placeholder="how to solve, best way to, what is the"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chat Model
                    <i className="ri-information-line w-4 h-4 flex items-center justify-center ml-2 text-gray-400 cursor-help inline-block" title="LLMs differ from search — intent phrases capture user goals better than raw keywords"></i>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <select
                        value={chatModel}
                        onChange={(e) => setChatModel(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 text-sm"
                      >
                        {chatModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line w-5 h-5 flex items-center justify-center absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={runAllModels}
                        onChange={(e) => setRunAllModels(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Run across all chat models</span>
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <i className="ri-lightbulb-line w-5 h-5 flex items-center justify-center text-blue-500 mt-0.5 mr-3"></i>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Why Intent Phrases Beat Keywords for LLMs</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Unlike traditional search engines, LLMs understand context and user intent. Intent phrases capture what users actually want to achieve, leading to more accurate and relevant results than raw keywords.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="px-12 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer text-sm"
            >
              Start Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
