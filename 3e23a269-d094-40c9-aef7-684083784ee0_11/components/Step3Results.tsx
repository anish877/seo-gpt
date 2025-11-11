
'use client';

import React, { useState, useEffect } from 'react';

interface Step3Props {
  stepData: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

interface IntentPhrase {
  id: string;
  phrase: string;
  relevanceScore: number;
  sources: string[];
  trend: string;
  editable: boolean;
  selected: boolean;
  parentKeyword: string;
  isEditing?: boolean;
}

interface LLMResult {
  id: string;
  phrase: string;
  model: string;
  answerSnippet: string;
  confidence: number;
  sources: string[];
  competitorUrls: string[];
  competitorMatchScore: number;
  expanded: boolean;
}

interface GenerationProgress {
  phase: string;
  step: string;
  progress: number;
  message: string;
  data?: any;
}

export default function Step3Results({ stepData, onNext, onBack }: Step3Props) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [generatingSteps, setGeneratingSteps] = useState([
    { name: 'Community Data Mining', status: 'pending', progress: 0, description: 'Extracting insights from Reddit and Quora' },
    { name: 'Search Pattern Analysis', status: 'pending', progress: 0, description: 'Analyzing user search behaviors' },
    { name: 'Intent Classification Engine', status: 'pending', progress: 0, description: 'Categorizing user intent patterns' },
    { name: 'Phrase Generation', status: 'pending', progress: 0, description: 'Creating optimized intent phrases' },
    { name: 'Relevance Score Calculation', status: 'pending', progress: 0, description: 'Computing semantic relevance scores' }
  ]);

  const [intentPhrases, setIntentPhrases] = useState<IntentPhrase[]>([]);
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('GPT-4o');
  const [runAllModels, setRunAllModels] = useState(false);
  const [llmResults, setLlmResults] = useState<LLMResult[]>([]);
  const [credits, setCredits] = useState(1250);
  const [loadMoreCost, setLoadMoreCost] = useState(25);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [showTableFormulaTooltip, setShowTableFormulaTooltip] = useState(false);
  const [domainId, setDomainId] = useState<number | null>(null);

  const models = ['GPT-4o', 'Claude 3', 'Gemini 1.5'];

  useEffect(() => {
    // Extract domain ID from stepData
    if (stepData.domainId) {
      setDomainId(stepData.domainId);
    }
    
    // Start AI-powered generation
    if (domainId) {
      startAIGeneration();
    }
  }, [domainId, stepData]);

  const startAIGeneration = async () => {
    if (!domainId) return;

    try {
      // Set up SSE connection for real-time progress
      const eventSource = new EventSource(`/api/intent-phrases/${domainId}/stream`);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleProgressUpdate(data);
      };

      eventSource.addEventListener('progress', (event: any) => {
        const progress: GenerationProgress = JSON.parse(event.data);
        handleProgressUpdate(progress);
      });

      eventSource.addEventListener('complete', (event: any) => {
        const data = JSON.parse(event.data);
        console.log('Generation completed:', data);
        setIsGenerating(false);
        loadGeneratedPhrases();
        eventSource.close();
      });

      eventSource.addEventListener('error', (event: any) => {
        const data = JSON.parse(event.data);
        console.error('Generation error:', data);
        setIsGenerating(false);
        eventSource.close();
      });

    } catch (error) {
      console.error('Error starting AI generation:', error);
      setIsGenerating(false);
    }
  };

  const handleProgressUpdate = (progress: GenerationProgress) => {
    setGeneratingSteps(prev => {
      const newSteps = [...prev];
      const stepIndex = getStepIndex(progress.phase);
      
      if (stepIndex !== -1) {
        newSteps[stepIndex] = {
          ...newSteps[stepIndex],
          status: progress.progress === 100 ? 'completed' : 'running',
          progress: progress.progress,
          description: progress.message
        };
      }
      
      return newSteps;
    });
  };

  const getStepIndex = (phase: string): number => {
    const phaseMap: Record<string, number> = {
      'community_mining': 0,
      'search_patterns': 1,
      'intent_classification': 2,
      'phrase_generation': 3,
      'relevance_scoring': 4
    };
    return phaseMap[phase] || -1;
  };

  const loadGeneratedPhrases = async () => {
    if (!domainId) return;

    try {
      const response = await fetch(`/api/intent-phrases/${domainId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const phrases: IntentPhrase[] = [];

        // Convert grouped phrases to flat array
        Object.entries(data.phrases).forEach(([keyword, keywordPhrases]: [string, any]) => {
          keywordPhrases.forEach((phrase: any) => {
            phrases.push({
              id: phrase.id.toString(),
              phrase: phrase.phrase,
              relevanceScore: phrase.relevanceScore || 50,
              sources: phrase.sources || ['AI Generated'],
              trend: phrase.trend || 'Stable',
              editable: true,
              selected: phrase.isSelected || false,
              parentKeyword: keyword
            });
          });
        });

        setIntentPhrases(phrases);
      }
    } catch (error) {
      console.error('Error loading generated phrases:', error);
    }
  };

  const handleBackClick = async () => {
    setIsBackLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    onBack();
  };

  const handlePhraseSelect = (phraseId: string) => {
    if (selectedPhrases.includes(phraseId)) {
      setSelectedPhrases(prev => prev.filter(id => id !== phraseId));
    } else if (selectedPhrases.length < 3) {
      setSelectedPhrases(prev => [...prev, phraseId]);
    }
  };

  const runLLMAnalysis = () => {
    if (selectedPhrases.length === 0) {
      alert('Please select at least 1 intent phrase');
      return;
    }

    setShowDetailView(true);

    const results: LLMResult[] = selectedPhrases.flatMap(phraseId => {
      const phrase = intentPhrases.find(p => p.id === phraseId)!;
      const modelsToRun = runAllModels ? models : [selectedModel];

      return modelsToRun.map((model, modelIdx) => ({
        id: `result-${phraseId}-${modelIdx}`,
        phrase: phrase.phrase,
        model,
        answerSnippet: `Based on current industry trends, ${phrase.phrase.toLowerCase()} involves several key considerations including performance optimization, user experience design, and scalability factors...`,
        confidence: Math.floor(Math.random() * 30) + 70,
        sources: ['Official Documentation', 'Industry Reports', 'Community Discussions'],
        competitorUrls: [
          'https://competitor1.com/solutions',
          'https://competitor2.com/services',
          'https://competitor3.com/blog'
        ],
        competitorMatchScore: Math.floor(Math.random() * 40) + 60,
        expanded: false
      }));
    });

    setLlmResults(results);
  };

  const toggleResultExpanded = (resultId: string) => {
    setLlmResults(prev =>
      prev.map(result =>
        result.id === resultId ? { ...result, expanded: !result.expanded } : result
      )
    );
  };

  const handleNext = () => {
    if (llmResults.length === 0) {
      alert('Please run LLM analysis first');
      return;
    }

    onNext({
      ...stepData,
      intentPhrases: intentPhrases.filter(p => selectedPhrases.includes(p.id)),
      llmResults,
      selectedModel: runAllModels ? 'All Models' : selectedModel
    });
  };

  // Create grouped phrases with proper structure
  const groupedPhrases = [];

  // Add custom intent phrases group if they exist
  if (stepData.intentPhrases && stepData.intentPhrases.length > 0) {
    const customPhrases = intentPhrases.filter(phrase => phrase.parentKeyword === 'Custom Intent Phrases');
    if (customPhrases.length > 0) {
      groupedPhrases.push({
        keyword: 'Custom Intent Phrases',
        phrases: customPhrases
      });
    }
  }

  // Add keyword-based groups
  if (stepData.selectedKeywords && stepData.selectedKeywords.length > 0) {
    stepData.selectedKeywords.forEach((keyword: any) => {
      const keywordPhrases = intentPhrases.filter(phrase => phrase.parentKeyword === keyword.keyword);
      if (keywordPhrases.length > 0) {
        groupedPhrases.push({
          keyword: keyword.keyword,
          phrases: keywordPhrases
        });
      }
    });
  }

  const handleEditPhrase = (phraseId: string) => {
    setIntentPhrases(prev =>
      prev.map(p =>
        p.id === phraseId ? { ...p, isEditing: !p.isEditing } : p
      )
    );
  };

  const handlePhraseChange = (phraseId: string, newPhrase: string) => {
    setIntentPhrases(prev => {
      let newScore = 50;

      if (newPhrase.length > 50) newScore += 15;
      if (newPhrase.length > 100) newScore += 10;

      if (newPhrase.toLowerCase().includes('how') || newPhrase.toLowerCase().includes('what') || newPhrase.toLowerCase().includes('why')) {
        newScore += 10;
      }

      const actionWords = ['implement', 'create', 'build', 'develop', 'optimize', 'improve', 'best practices', 'solution'];
      const hasActionWords = actionWords.some(word => newPhrase.toLowerCase().includes(word));
      if (hasActionWords) newScore += 10;

      if (newPhrase.toLowerCase().includes('business') || newPhrase.toLowerCase().includes('company') || newPhrase.toLowerCase().includes('enterprise')) {
        newScore += 8;
      }

      newScore = Math.min(newScore, 100);

      return prev.map(p => {
        if (p.id === phraseId) {
          return {
            ...p,
            phrase: newPhrase,
            relevanceScore: newScore
          };
        }
        return p;
      });
    });
  };

  const handleSaveEdit = (phraseId: string) => {
    setIntentPhrases(prev =>
      prev.map(p =>
        p.id === phraseId ? { ...p, isEditing: false } : p
      )
    );
  };

  if (isBackLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading Previous Data</h2>
            <p className="text-gray-600 mb-6">Retrieving your keyword selections from secure cloud storage</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center">
                <i className="ri-cloud-line w-5 h-5 flex items-center justify-center text-blue-500 mr-3"></i>
                <span className="text-blue-800 text-sm">Your data is securely stored and encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">AI-Powered Intent Phrase Generation</h2>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Processing Selected Keywords</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stepData.selectedKeywords && stepData.selectedKeywords.length > 0 ? (
                  stepData.selectedKeywords.map((keyword: any, idx: number) => (
                    <div key={`keyword-${idx}`} className="flex items-center justify-between bg-white rounded p-2">
                      <span className="text-sm text-blue-700">{keyword.keyword}</span>
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 rounded-full animate-spin border-t-transparent mr-2"></div>
                        <span className="text-xs text-blue-600">Processing</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-blue-600">No keywords selected for processing</div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {generatingSteps.map((step, index) => (
                <div key={`step-${index}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 ${step.status === 'completed' ? 'bg-green-500' : step.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                          }`}
                      ></div>
                      <div>
                        <span className="font-medium">{step.name}</span>
                        <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                      </div>
                    </div>
                    <span className={`text-sm capitalize ${step.status === 'completed' ? 'text-green-600' : step.status === 'running' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                      {step.status === 'completed' ? 'Completed' : step.status === 'running' ? 'Processing' : 'Queued'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${step.status === 'completed' ? 'bg-green-500' : step.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-600">AI is analyzing community conversations and search patterns to generate the most relevant intent phrases...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showDetailView) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">LLM Analysis Results</h2>
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                  <i className="ri-download-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                  Export CSV
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                  <i className="ri-file-pdf-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                  Export PDF
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                  <i className="ri-code-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                  API Call
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent Phrase</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answer Snippet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sources</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitors</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {llmResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {result.phrase}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {result.model}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 max-w-md">
                        {result.expanded ? result.answerSnippet : `${result.answerSnippet.substring(0, 100)}...`}
                        <button
                          onClick={() => toggleResultExpanded(result.id)}
                          className="text-blue-600 hover:text-blue-800 ml-2 text-xs cursor-pointer"
                        >
                          {result.expanded ? 'Show less' : 'Show more'}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${result.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{result.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {result.sources.map((source, idx) => (
                          <div key={`source-${result.id}-${idx}`} className="flex items-center">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${source.includes('Official') ? 'bg-green-400' : source.includes('Community') ? 'bg-blue-400' : 'bg-yellow-400'
                                }`}
                            ></div>
                            {source}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {result.competitorUrls.slice(0, 2).map((url, idx) => (
                          <div key={`competitor-${result.id}-${idx}`} className="flex items-center justify-between">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 truncate max-w-32 cursor-pointer"
                            >
                              {url.split('//')[1]}
                            </a>
                            <button className="text-xs text-gray-500 hover:text-gray-700 ml-2 whitespace-nowrap cursor-pointer">
                              Add as competitor
                            </button>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500">
                          Match Score: {result.competitorMatchScore}%
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleResultExpanded(result.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-eye-line w-4 h-4 flex items-center justify-center mr-1 inline-block"></i>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setShowDetailView(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Back to Intent Phrases
            </button>

            <button
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">AI-Generated Intent Phrases & LLM Selection</h2>
            <div className="flex items-center text-sm text-gray-600">
              <i className="ri-coin-line w-4 h-4 flex items-center justify-center mr-2"></i>
              Credits: {credits} | Cost per load: {loadMoreCost}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Selected Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {stepData.selectedKeywords && stepData.selectedKeywords.length > 0 ? (
                    stepData.selectedKeywords.map((keyword: any, idx: number) => (
                      <span key={`selected-keyword-${idx}`} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {keyword.keyword}
                      </span>
                    ))
                  ) : (
                    <span className="text-blue-600 text-sm">No keywords selected</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900 mr-3">AI-Generated Intent Phrases</h3>
                    <div className="relative">
                      <button
                        onMouseEnter={() => setShowFormulaTooltip(true)}
                        onMouseLeave={() => setShowFormulaTooltip(false)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-help"
                      >
                        <i className="ri-information-line"></i>
                      </button>
                      {showFormulaTooltip && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 z-10">
                          <div className="font-medium mb-2">AI Relevance Score Formula:</div>
                          <div className="space-y-1">
                            <div>Community Frequency: 30%</div>
                            <div>Semantic Similarity: 25%</div>
                            <div>Intent Match: 20%</div>
                            <div>Recency: 15%</div>
                            <div>LLM Training Frequency: 10%</div>
                          </div>
                          <div className="w-3 h-3 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                    <i className="ri-refresh-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                    Load More (-{loadMoreCost} credits)
                  </button>
                </div>

                {selectedPhrases.length >= 3 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-700 text-sm">Maximum 3 intent phrases can be selected.</p>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent Phrase</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          <div className="flex items-center">
                            AI Relevance Score
                            <div className="relative ml-2">
                              <button
                                onMouseEnter={() => setShowTableFormulaTooltip(true)}
                                onMouseLeave={() => setShowTableFormulaTooltip(false)}
                                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-help"
                              >
                                <i className="ri-information-line"></i>
                              </button>
                              {showTableFormulaTooltip && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 z-10">
                                  <div className="font-medium mb-2">AI Relevance Score Formula:</div>
                                  <div className="space-y-1">
                                    <div>Community Frequency: 30%</div>
                                    <div>Semantic Similarity: 25%</div>
                                    <div>Intent Match: 20%</div>
                                    <div>Recency: 15%</div>
                                    <div>LLM Training Frequency: 10%</div>
                                  </div>
                                  <div className="mb-2 pt-2 border-t border-gray-700 text-xs">
                                    Higher scores indicate phrases with stronger alignment to user search patterns and community discussions.
                                  </div>
                                  <div className="w-3 h-3 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sources</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupedPhrases.map((group, groupIdx) => (
                        <React.Fragment key={`group-${groupIdx}`}>
                          <tr className="bg-blue-50 border-t-2 border-blue-200">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex items-center">
                                <i className="ri-key-line w-4 h-4 flex items-center justify-center text-blue-600 mr-2"></i>
                                <span className="font-medium text-blue-800 text-sm">{group.keyword}</span>
                              </div>
                            </td>
                          </tr>
                          {group.phrases.map((phrase, phraseIdx) => (
                            <tr key={`phrase-${phrase.id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedPhrases.includes(phrase.id)}
                                  onChange={() => handlePhraseSelect(phrase.id)}
                                  disabled={!selectedPhrases.includes(phrase.id) && selectedPhrases.length >= 3}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {phrase.isEditing ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={phrase.phrase}
                                      onChange={(e) => handlePhraseChange(phrase.id, e.target.value)}
                                      className="flex-1 text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveEdit(phrase.id)}
                                      className="text-green-600 hover:text-green-800 text-sm cursor-pointer"
                                    >
                                      <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-900">{phrase.phrase}</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${phrase.relevanceScore}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{phrase.relevanceScore}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {phrase.sources.map((source, idx) => (
                                    <span key={`source-${phrase.id}-${idx}`} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {source}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs ${phrase.trend === 'Rising' ? 'bg-green-100 text-green-800' : phrase.trend === 'Declining' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {phrase.trend}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleEditPhrase(phrase.id)}
                                  className="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
                                >
                                  <i className={`${phrase.isEditing ? 'ri-close-line' : 'ri-edit-line'} w-4 h-4 flex items-center justify-center mr-1 inline-block`}></i>
                                  {phrase.isEditing ? 'Cancel' : 'Edit'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">LLM Configuration</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chat Model</label>
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none pr-8"
                      >
                        {models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={runAllModels}
                      onChange={(e) => setRunAllModels(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Run across all three models</span>
                  </label>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Selection Status:</div>
                    <div className="text-sm">
                      <span className="font-medium">{selectedPhrases.length}/3</span> phrases selected
                    </div>
                    {selectedPhrases.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Estimated cost: {selectedPhrases.length * (runAllModels ? 3 : 1) * 10} credits
                      </div>
                    )}
                  </div>

                  <button
                    onClick={runLLMAnalysis}
                    disabled={selectedPhrases.length === 0}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Run LLM Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Back to Keywords
          </button>

          <div className="flex items-center space-x-4">
            {selectedPhrases.length > 0 && selectedPhrases.length <= 3 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <span className="text-green-800 text-sm font-medium">Ready for LLM Analysis</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
