'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { apiService } from '@/services/api';

interface Step3Props {
  domainId: number;
  onNext: (data: { domainId: number; selectedPhrases: IntentPhrase[]; step3Data: Step3Data }) => void;
  onBack: () => void;
}

interface IntentPhrase {
  id: string;
  phrase: string;
  relevanceScore: number;
  intent?: string;
  intentConfidence?: number;
  sources: string[];
  trend: string;
  editable: boolean;
  selected: boolean;
  parentKeyword: string;
  isEditing?: boolean;
  keywordId?: number;
  wordCount?: number;
  isAdditional?: boolean;
}

type RedditPostDebug = {
  title?: string;
  url?: string;
  subreddit?: string;
  score?: number;
  relevanceScore?: number;
};

type DebugItem = {
  id: string;
  type: 'reddit' | 'ai';
  stage?: string;
  keyword?: string;
  payload: RedditPostDebug[] | string;
  ts: number;
};

type CommunityInsightItem = {
  keywordId: number;
  keyword: string;
  sources?: {
    dataPoints?: RedditPostDebug[];
    [key: string]: unknown;
  };
  summary?: string;
};


interface Step3Data {
  domain: {
    id: number;
    url: string;
    context: string;
    location: string;
  };
  selectedKeywords: Array<{
    id: number;
    keyword: string;
    volume: number;
    difficulty: string;
    cpc: number;
    isSelected: boolean;
  }>;
  analysis: {
    semanticAnalysis: Record<string, unknown>;
    keywordAnalysis: Record<string, unknown>;
    searchVolumeClassification: Record<string, unknown>;
    intentClassification: Record<string, unknown>;
  };
  existingPhrases: IntentPhrase[];
  communityInsights: Record<string, unknown>[];
  searchPatterns: Record<string, unknown>[];
}

const Step3Results = React.memo(function Step3Results({ domainId, onNext, onBack }: Step3Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phrasesLoading, setPhrasesLoading] = useState(false);
  const [isPhraseGenerationActive, setIsPhraseGenerationActive] = useState(false);
  const [customPhrasesLoading, setCustomPhrasesLoading] = useState(false);
  const [customPhrasesLoaded, setCustomPhrasesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom phrase input state
  const [showAddPhrase, setShowAddPhrase] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [isAddingPhrase, setIsAddingPhrase] = useState(false);
  const [step3Data, setStep3Data] = useState<Step3Data | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugItems, setDebugItems] = useState<DebugItem[]>([]);
  
  const [generatingSteps, setGeneratingSteps] = useState([
    { name: 'Semantic Content Analysis', status: 'pending', progress: 0, description: 'Analyzing brand voice, theme, and target audience' },
    { name: 'Community Data Mining', status: 'pending', progress: 0, description: 'Extracting real insights from Reddit using Reddit API' },
    { name: 'Search Pattern Analysis', status: 'pending', progress: 0, description: 'Analyzing user search behaviors' },
    { name: 'Creating optimized intent phrases', status: 'pending', progress: 0, description: 'Generating optimized search phrases' },
    { name: 'Intent Classification', status: 'pending', progress: 0, description: 'Classifying generated phrases by intent' },
    { name: 'Relevance Score', status: 'pending', progress: 0, description: 'Computing semantic relevance scores' }
  ]);

  const [intentPhrases, setIntentPhrases] = useState<IntentPhrase[]>([]);
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [showTableFormulaTooltip, setShowTableFormulaTooltip] = useState(false);
  const [currentLoadingIndex, setCurrentLoadingIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isContinuing, setIsContinuing] = useState(false);
  const [phrasesReceived, setPhrasesReceived] = useState(0);
  const [receivedPhrases, setReceivedPhrases] = useState<IntentPhrase[]>([]);
  // NEW: group expand state to limit initial items
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({});
  const defaultGroupLimit = 3;
  
  // Load More functionality
  const [loadingMorePhrases, setLoadingMorePhrases] = useState<Record<string, boolean>>({});

  // Local state for editing values to prevent re-render resets
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  
  // Refs to store current input values without causing re-renders
  const inputValuesRef = useRef<{ [key: string]: string }>({});

  // Sort helper: show additional/new phrases first, then by id desc (numeric if possible)
  const sortPhrasesForDisplay = useCallback((phrases: IntentPhrase[]) => {
    const toNumber = (id: string | undefined) => {
      if (!id) return -Infinity;
      const num = Number(id);
      return Number.isNaN(num) ? -Infinity : num;
    };
    return [...phrases].sort((a, b) => {
      if ((b.isAdditional ? 1 : 0) !== (a.isAdditional ? 1 : 0)) {
        return (b.isAdditional ? 1 : 0) - (a.isAdditional ? 1 : 0);
      }
      return toNumber(b.id) - toNumber(a.id);
    });
  }, []);

  // When toggling debug on, if we have community insights with dataPoints, prefill debug with those posts
  useEffect(() => {
    if (!showDebug) return;
    // If we already have some debug items, don't flood
    if (debugItems.length > 0) return;
    const insights: CommunityInsightItem[] = (step3Data?.communityInsights || []) as CommunityInsightItem[];
    const collected: DebugItem[] = [];
    insights.forEach((ins) => {
      const dataPoints = Array.isArray(ins?.sources?.dataPoints) ? ins.sources!.dataPoints! : [];
      if (dataPoints.length > 0) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        collected.push({
          id,
          type: 'reddit',
          stage: 'existing_insights',
          payload: dataPoints,
          ts: Date.now()
        });
      }
    });
    if (collected.length > 0) {
      setDebugItems(prev => [...collected, ...prev].slice(0, 200));
    }
  }, [showDebug, step3Data]);

  // Load phrases from localStorage and analyze them with AI
  useEffect(() => {
    const loadPhrasesFromStorage = async () => {
      const savedIntentPhrases = localStorage.getItem('intentPhrases');
      if (savedIntentPhrases && domainId > 0 && step3Data?.selectedKeywords) {
        const phrases = savedIntentPhrases.split(',').map(p => p.trim()).filter(p => p);
        
        if (phrases.length > 0) {
          setCustomPhrasesLoading(true);
          console.log('Loading phrases from localStorage and analyzing with AI:', phrases);
          
          for (const phrase of phrases) {
            try {
              // Check if phrase already exists
              const existingPhrases = intentPhrases.filter(p => p.phrase === phrase);
              if (existingPhrases.length > 0) {
                console.log(`Phrase "${phrase}" already exists, skipping...`);
                continue;
              }

              // Get the first selected keyword to associate the phrase with
              const firstKeyword = step3Data.selectedKeywords[0];
              if (!firstKeyword) {
                console.log('No selected keywords found, skipping custom phrase');
                continue;
              }

              // Save to database using the new AI analysis endpoint
              try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/custom-phrase`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  },
                  body: JSON.stringify({
                    phrase: phrase
                    // The endpoint will automatically analyze the phrase, extract keyword, and map to existing or create new keyword
                  })
                });

                if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.phrase) {
                    // Create the phrase object with the database ID
                    const dbPhrase: IntentPhrase = {
                      id: result.phrase.id.toString(),
                      phrase: result.phrase.phrase,
                      relevanceScore: result.phrase.relevanceScore,
                      intent: result.phrase.intent,
                      intentConfidence: result.phrase.intentConfidence,
                      sources: result.phrase.sources,
                      trend: result.phrase.trend,
                      editable: result.phrase.editable,
                      selected: result.phrase.selected,
                      parentKeyword: result.phrase.parentKeyword,
                      keywordId: result.phrase.keywordId,
                      wordCount: result.phrase.wordCount,
                      isAdditional: true
                    };

                    // Add to local state with the database ID
                    setIntentPhrases(prev => [dbPhrase, ...prev]);
                    console.log(`Successfully analyzed and saved localStorage phrase "${phrase}" to database with ID: ${dbPhrase.id}`);
                    console.log(`Analysis result:`, result.analysis);
                    
                    // If a new keyword was created, update step3Data to include it
                    if (!result.keyword.isExisting && step3Data) {
                      const newKeyword = {
                        id: result.keyword.id,
                        keyword: result.keyword.term,
                        volume: 1000, // Default volume for custom keywords
                        difficulty: 'Medium',
                        cpc: 2.00,
                        isSelected: true
                      };
                      
                      setStep3Data(prev => prev ? {
                        ...prev,
                        selectedKeywords: [...prev.selectedKeywords, newKeyword]
                      } : null);
                      
                      console.log(`New keyword created from localStorage phrase: ${result.keyword.term}`);
                    } else {
                      console.log(`Mapped to existing keyword: ${result.keyword.term}`);
                    }
                  }
                } else {
                  console.error(`Failed to save localStorage phrase "${phrase}" to database:`, response.status);
                }
              } catch (dbError) {
                console.error(`Failed to save localStorage phrase "${phrase}" to database:`, dbError);
                // Don't add to UI if database save fails
              }
              
            } catch (error) {
              console.error(`Error processing custom phrase "${phrase}":`, error);
            }
          }

          // Clear localStorage after processing
          localStorage.removeItem('intentPhrases');
          setCustomPhrasesLoading(false);
          setCustomPhrasesLoaded(true);
          console.log('Phrases from localStorage analyzed and processed successfully');
        }
      }
    };

    // Also fetch any existing custom phrases from the database
    const fetchExistingCustomPhrases = async () => {
      if (domainId > 0 && step3Data?.selectedKeywords && !isGenerating && !isLoading) {
        try {
          setCustomPhrasesLoading(true);
          // Fetch phrases from the database to see if we have any custom ones
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/step3`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const existingData = await response.json();
            if (existingData.existingPhrases && existingData.existingPhrases.length > 0) {
              console.log('Found existing phrases in database:', existingData.existingPhrases.length);
              
              // Check if we have custom phrases (phrases with sources containing 'Custom Input')
              const customPhrases = existingData.existingPhrases.filter((p: { sources?: string[] }) => 
                p.sources && Array.isArray(p.sources) && p.sources.includes('Custom Input')
              );
              
              if (customPhrases.length > 0) {
                console.log('Found custom phrases in database:', customPhrases.length);
                
                // Add custom phrases to local state if they don't already exist
                setIntentPhrases(prev => {
                  const existingPhraseTexts = new Set(prev.map(p => p.phrase));
                  const newCustomPhrases = customPhrases.filter((p: { phrase: string }) => !existingPhraseTexts.has(p.phrase));
                  
                  if (newCustomPhrases.length > 0) {
                    const formattedCustomPhrases = newCustomPhrases.map((p: { 
                      id: number; 
                      phrase: string; 
                      relevanceScore?: number; 
                      intent?: string; 
                      intentConfidence?: number; 
                      sources?: string[]; 
                      trend?: string; 
                      parentKeyword?: string; 
                      keywordId?: number; 
                      wordCount?: number; 
                    }) => ({
                      id: p.id.toString(),
                      phrase: p.phrase,
                      relevanceScore: p.relevanceScore,
                      intent: p.intent,
                      intentConfidence: p.intentConfidence || 90,
                      sources: p.sources,
                      trend: p.trend,
                      editable: true,
                      selected: false,
                      parentKeyword: p.parentKeyword || 'Custom',
                      keywordId: p.keywordId,
                      wordCount: p.wordCount || p.phrase.trim().split(/\s+/).length,
                      isAdditional: true
                    }));
                    
                    console.log('Adding custom phrases from database:', formattedCustomPhrases.length);
                    return [...formattedCustomPhrases, ...prev];
                  }
                  
                  return prev;
                });
                setCustomPhrasesLoaded(true);
                console.log('Custom phrases from database loaded successfully');
              }
            }
          }
        } catch (error) {
          console.error('Error fetching existing custom phrases:', error);
        } finally {
          setCustomPhrasesLoading(false);
        }
      }
    };

    if (domainId > 0 && step3Data?.selectedKeywords && !isGenerating && !isLoading) {
      loadPhrasesFromStorage();
      fetchExistingCustomPhrases();
    }
  }, [domainId, step3Data, intentPhrases, isGenerating, isLoading]);

  // Load existing Step3Results data
  useEffect(() => {
    const loadStep3Data = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch domain information
        const domainResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/domain/${domainId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!domainResponse.ok) {
          throw new Error('Failed to load domain data');
        }

        const domainData = await domainResponse.json();
        
        console.log('Domain response data:', domainData);
        
        // Fetch only selected keywords
        const keywordsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/keywords/${domainId}?selected=true`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!keywordsResponse.ok) {
          throw new Error('Failed to load selected keywords');
        }

        const keywordsData = await keywordsResponse.json();
        
        console.log('Keywords response data:', keywordsData);
        
        // Create Step3Data structure
        const data: Step3Data = {
          domain: {
            id: domainId,
            url: domainData.url,
            context: domainData.crawlResults?.[0]?.extractedContext || '',
            location: domainData.location || 'Global'
          },
          selectedKeywords: keywordsData.keywords.map((kw: Record<string, unknown>) => ({
            id: kw.id,
            keyword: kw.term,
            volume: kw.volume,
            difficulty: kw.difficulty,
            cpc: kw.cpc,
            isSelected: kw.isSelected
          })),
          analysis: {
            semanticAnalysis: domainData.semanticAnalyses?.[0] || {},
            keywordAnalysis: domainData.keywordAnalyses?.[0] || {},
            searchVolumeClassification: domainData.searchVolumeClassifications?.[0] || {},
            intentClassification: domainData.intentClassifications?.[0] || {}
          },
          existingPhrases: [],
          communityInsights: [],
          searchPatterns: []
        };
        
        setStep3Data(data);
        
        // Check if we have keywords to work with
        if (data.selectedKeywords.length === 0) {
          setError('No keywords found for this domain. Please go back and run the analysis again.');
          setIsLoading(false);
          return;
        }
        
        console.log('Step3Data loaded successfully:', data);
        console.log('Selected keywords:', data.selectedKeywords);
        
        // Check if phrases already exist for this domain
        const existingPhrasesResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/step3`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (existingPhrasesResponse.ok) {
          const existingData = await existingPhrasesResponse.json();
          
          if (existingData.existingPhrases && existingData.existingPhrases.length > 0) {
            console.log('Found existing phrases:', existingData.existingPhrases.length);
            
            // Set existing phrases immediately (only if not currently generating)
            if (!isPhraseGenerationActive) {
              console.log('Setting existing phrases from loadStep3Data:', existingData.existingPhrases.length);
              setIntentPhrases(prev => {
                // Merge then sort to show new on top
                const seen = new Set(prev.map(p => p.phrase));
                const toAdd = existingData.existingPhrases.filter((p: IntentPhrase) => !seen.has(p.phrase));
                const merged = toAdd.length === 0
                  ? (prev.length >= existingData.existingPhrases.length ? prev : existingData.existingPhrases)
                  : [...prev, ...toAdd];
                return sortPhrasesForDisplay(merged);
              });
              setPhrasesReceived(prev => Math.max(prev || 0, existingData.existingPhrases.length));
              setReceivedPhrases(prev => {
                const seen = new Set(prev.map(p => p.phrase));
                const toAdd = existingData.existingPhrases.filter((p: IntentPhrase) => !seen.has(p.phrase));
                return toAdd.length ? [...prev, ...toAdd] : prev;
              });
            } else {
              console.log('Skipping setIntentPhrases - phrase generation is active');
            }
            
            // Check if we have phrases for ALL selected keywords
            const selectedKeywordIds = data.selectedKeywords.map(kw => kw.id);
            const existingKeywordIds = existingData.existingPhrases.map((phrase: IntentPhrase) => phrase.keywordId);
            const missingKeywords = selectedKeywordIds.filter(id => !existingKeywordIds.includes(id));
            
            if (missingKeywords.length === 0) {
              console.log('Phrases already exist for all keywords, loading existing data only...');
              setIsLoading(false);
              setStep3Data(data);
              return; // Don't start generation if phrases exist for all keywords
            } else {
              console.log(`Missing phrases for ${missingKeywords.length} keywords, will generate for missing keywords...`);
              // Continue to generation for missing keywords
            }
          }
        }
        
        // Start phrase generation with selected keywords
        setIsLoading(false); // Set loading to false before starting generation
        setStep3Data(data); // Set the state
        await generateNewPhrases(data); // Pass data directly
      } catch (error) {
        console.error('Error loading Step3Results data:', error);
        setError('Failed to load Step3Results data');
        setIsLoading(false);
      }
    };

    loadStep3Data();
  }, [domainId]);

  // Auto-advance loading carousel
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentLoadingIndex(prev => (prev + 1) % 3);
  //   }, 2000);
  //
  //   return () => clearInterval(interval);
  // }, []);

  // Auto-advance carousel to show running task (reactive, no intervals)
  useEffect(() => {
    const runningTaskIndex = generatingSteps.findIndex(step => step.status === 'running');
    if (runningTaskIndex !== -1) {
      setCurrentTaskIndex(runningTaskIndex);
    } else {
      // If none running, keep last or show last completed
      const lastCompleted = [...generatingSteps].map((s, i) => ({ s, i })).filter(x => x.s.status === 'completed').pop();
      if (lastCompleted) setCurrentTaskIndex(lastCompleted.i);
    }
  }, [generatingSteps]);



  const generateNewPhrases = async (data?: Step3Data) => {
    setIsGenerating(true);
    setPhrasesLoading(true);
    setIsPhraseGenerationActive(true);
    setError(null);
    
    // Initialize the phrases counter with existing phrases
    setPhrasesReceived(intentPhrases.length);
    
    // Preserve existing phrases before starting generation
    const currentPhrases = intentPhrases;
    console.log('Preserving current phrases before generation:', currentPhrases.length);
    console.log('Current phrases:', currentPhrases.map(p => `${p.id}: ${p.phrase}`));
    
    // Don't reset the state if we already have phrases
    if (currentPhrases.length > 0) {
      console.log('Already have phrases, not resetting state');
    }
    
    // No need to store phrases before generation since we'll fetch from DB
    
    // Add timeout to prevent phases from getting stuck
    const phaseTimeout = setTimeout(() => {
      console.log('Phase timeout - checking for stuck phases');
      setGeneratingSteps(prev => {
        const newSteps = [...prev];
        const runningIndex = newSteps.findIndex(step => step.status === 'running');
        if (runningIndex !== -1) {
          console.log(`Phase ${runningIndex} seems stuck, marking as completed`);
          newSteps[runningIndex] = {
            ...newSteps[runningIndex],
            status: 'completed',
            progress: 100
          };
          if (runningIndex + 1 < newSteps.length) {
            newSteps[runningIndex + 1] = {
              ...newSteps[runningIndex + 1],
              status: 'running',
              progress: 0
            };
          }
        }
        return newSteps;
      });
    }, 45000); // Increased to 45 seconds for slower operations
    
    // Initialize generating steps
    setGeneratingSteps([
      { name: 'Semantic Content Analysis', status: 'running', progress: 0, description: 'Analyzing brand voice, theme, and target audience' },
      { name: 'Community Data Mining', status: 'pending', progress: 0, description: 'Extracting real insights from Reddit using Reddit API' },
      { name: 'Search Pattern Analysis', status: 'pending', progress: 0, description: 'Analyzing user search behaviors' },
      { name: 'Creating optimized intent phrases', status: 'pending', progress: 0, description: 'Generating optimized search phrases' },
      { name: 'Intent Classification', status: 'pending', progress: 0, description: 'Classifying generated phrases by intent' },
      { name: 'Relevance Score', status: 'pending', progress: 0, description: 'Computing semantic relevance scores' }
    ]);
    
    console.log('Starting phrase generation with steps initialized');
    console.log('Current phrases before generation:', intentPhrases.length);
    
    const token = localStorage.getItem('authToken');
    const url = `${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/step3/generate`;
    
    // Get selected keywords for the prompt - use passed data or fallback to state
    const currentData = data || step3Data;
    const selectedKeywords = currentData?.selectedKeywords || [];
    const keywordTerms = selectedKeywords.filter(kw => kw.isSelected).map(kw => kw.keyword);
    
    console.log('Starting phrase generation with keywords:', keywordTerms);
    console.log('Domain context:', currentData?.domain.context);
    console.log('URL being called:', url);
    console.log('Request body:', {
      keywords: keywordTerms,
      domainContext: currentData?.domain.context || '',
      location: currentData?.domain.location || 'Global'
    });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // No body needed - enhanced phrases endpoint uses domain's top keywords automatically
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          console.log('Processing line:', line);
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              const data = JSON.parse(dataLine.slice(6));
              
              console.log('Received event:', eventType, data);
              
              if (eventType === 'debug') {
                // Capture debug items (reddit posts or ai raw responses)
                const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const payload: RedditPostDebug[] | string = data.type === 'reddit' ? (data.posts as RedditPostDebug[]) : (data.responseRaw as string);
                setDebugItems(prev => [{ id, type: data.type as 'reddit' | 'ai', stage: data.stage, keyword: data.keyword, payload, ts: Date.now() }, ...prev].slice(0, 200));
              } else 
              if (eventType === 'progress') {
                // Update step progress
                const { phase, step, progress, message } = data;
                
                // If this is the first progress event and no phase is specified, start semantic analysis
                if (!phase && progress !== undefined) {
                  setGeneratingSteps(prev => {
                    const newSteps = [...prev];
                    newSteps[0] = {
                      ...newSteps[0],
                      status: 'running',
                      progress: progress
                    };
                    console.log('Started semantic analysis phase');
                    return newSteps;
                  });
                }
                const phaseMap: { [key: string]: number } = {
                  'semantic_analysis': 0,
                  'community_mining': 1,
                  'search_patterns': 2,
                  'phrase_generation': 3,
                  'intent_classification': 4,
                  'relevance_scoring': 5
                };
                
                if (phase && phaseMap[phase] !== undefined) {
                  // Phase-specific progress update
                  const stepIndex = phaseMap[phase];
                  setGeneratingSteps(prev => {
                    const newSteps = [...prev];
                    
                    // Mark all previous steps as completed
                    for (let i = 0; i < stepIndex; i++) {
                      newSteps[i] = {
                        ...newSteps[i],
                        status: 'completed',
                        progress: 100
                      };
                    }
                    
                    // If this phase is completing, start the next phase
                    if (progress === 100) {
                      newSteps[stepIndex] = {
                        ...newSteps[stepIndex],
                        status: 'completed',
                        progress: 100
                      };
                      
                      // Start the next phase if it exists
                      if (stepIndex + 1 < newSteps.length) {
                        newSteps[stepIndex + 1] = {
                          ...newSteps[stepIndex + 1],
                          status: 'running',
                          progress: 0
                        };
                      }
                    } else {
                      // Update current phase progress and ensure it's running
                      newSteps[stepIndex] = {
                        ...newSteps[stepIndex],
                        status: 'running',
                        progress: progress
                      };
                      
                      // Mark all future steps as pending
                      for (let i = stepIndex + 1; i < newSteps.length; i++) {
                        newSteps[i] = {
                          ...newSteps[i],
                          status: 'pending',
                          progress: 0
                        };
                      }
                    }
                    
                    console.log(`Updated step ${stepIndex} (${phase}) to status: ${progress === 100 ? 'completed' : 'running'}, progress: ${progress}`);
                    console.log('All steps after update:', newSteps.map((step, idx) => `${idx}: ${step.name} - ${step.status} (${step.progress}%)`));
                    return newSteps;
                  });
                } else if (progress !== undefined) {
                  // Individual keyword processing progress - update current running step
                  setGeneratingSteps(prev => {
                    const newSteps = [...prev];
                    const currentRunningIndex = newSteps.findIndex(step => step.status === 'running');
                    if (currentRunningIndex !== -1) {
                      newSteps[currentRunningIndex] = {
                        ...newSteps[currentRunningIndex],
                        progress: progress
                      };
                      console.log(`Updated running step ${currentRunningIndex} progress to ${progress}`);
                    }
                    return newSteps;
                  });
                }
                
                // Log progress for debugging
                console.log('Progress update:', { phase, progress, message });
                console.log('Current steps state:', generatingSteps);
                            } else if (eventType === 'phrase-generated') {
                // Handle phrase generation events
                console.log('Received phrase event:', eventType, data);
                
                // Add the new phrase to the state using functional update
                const newPhrase = {
                  id: data.id,
                  phrase: data.phrase,
                  intent: data.intent,
                  intentConfidence: data.intentConfidence,
                  relevanceScore: data.relevanceScore,
                  sources: data.sources,
                  trend: data.trend,
                  editable: data.editable,
                  selected: data.selected,
                  parentKeyword: data.parentKeyword,
                  keywordId: data.keywordId,
                  wordCount: data.wordCount
                };
                
                setIntentPhrases(prev => {
                  // Check if phrase already exists to avoid duplicates
                  const exists = prev.some(p => p.phrase === data.phrase);
                  if (exists) {
                    console.log('Phrase already exists, skipping:', data.phrase);
                    return prev;
                  }
                  
                  console.log('Adding new phrase:', data.phrase, 'for keyword:', data.parentKeyword);
                  return [...prev, newPhrase];
                });
                
                // Update received phrases using functional update and avoid duplicates
                setReceivedPhrases(prev => {
                  const exists = prev.some(p => p.phrase === data.phrase);
                  if (exists) return prev;
                  return [...prev, newPhrase];
                });
                
                setPhrasesReceived(prev => prev + 1);
                
              } else if (eventType === 'phrase-updated') {
                // Handle phrase ID updates (temporary ID to real database ID)
                console.log('Received phrase-updated event:', data);
                
                setIntentPhrases(prev => {
                  return prev.map(phrase => {
                    if (phrase.id === data.oldId) {
                      console.log(`Updating phrase ID from ${data.oldId} to ${data.newId} for phrase: ${data.phrase}`);
                      return { ...phrase, id: data.newId };
                    }
                    return phrase;
                  });
                });
                
                // Update received phrases ref
                setReceivedPhrases(prev => prev.map(phrase => {
                  if (phrase.id === data.oldId) {
                    return { ...phrase, id: data.newId };
                  }
                  return phrase;
                }));

              } else if (eventType === 'complete') {
                // Generation complete
                console.log('Generation complete:', data);
                console.log('=== PHRASE COUNT SUMMARY ===');
                console.log('Expected total phrases:', data.totalPhrases || 0);
                console.log('Expected total keywords:', data.totalKeywords || 0);
                console.log('============================');
                
                // Mark all steps as completed
                setGeneratingSteps(prev => 
                  prev.map(step => ({ 
                    ...step, 
                    status: 'completed' as const, 
                    progress: 100 
                  }))
                );
                
                // Use the phrases we've already received instead of fetching from DB
                console.log('Final phrases count (state):', intentPhrases.length);
                console.log('Final phrases count (state):', receivedPhrases.length);
                console.log('Expected total phrases:', data.totalPhrases || 0);
                console.log('Expected total keywords:', data.totalKeywords || 0);
                console.log('All final phrases:', intentPhrases);
                
                // Check if we have the expected number of phrases
                const expectedPhrases = data.totalPhrases || 0;
                const actualPhrases = intentPhrases.length;
                
                if (actualPhrases < expectedPhrases) {
                  console.log(`MISMATCH: Expected ${expectedPhrases} phrases but received ${actualPhrases} phrases`);
                  
                  // Wait a bit more and then fetch from DB as fallback
                  setTimeout(async () => {
                    console.log('Fetching phrases from database as fallback...');
                    
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/step3`, {
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                          'Content-Type': 'application/json',
                        },
                      });

                      if (response.ok) {
                        const existingData = await response.json();
                        if (existingData.existingPhrases && existingData.existingPhrases.length > 0) {
                          console.log('Successfully fetched', existingData.existingPhrases.length, 'phrases from database');
                          setIntentPhrases(existingData.existingPhrases);
                          setPhrasesReceived(existingData.existingPhrases.length);
                          setReceivedPhrases(existingData.existingPhrases);
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching phrases from database:', error);
                    }
                    
                    clearTimeout(phaseTimeout);
                    setIsGenerating(false);
                    setPhrasesLoading(false);
                    setIsPhraseGenerationActive(false);
                  }, 2000);
                } else {
                  clearTimeout(phaseTimeout);
                  setIsGenerating(false);
                  setPhrasesLoading(false);
                  setIsPhraseGenerationActive(false);
                }
                
                // Add a final check after a longer delay to ensure we have all phrases
                setTimeout(() => {
                  console.log('Final phrases count after delay (state):', intentPhrases.length);
                  console.log('Final phrases count after delay (state):', receivedPhrases.length);
                  console.log('All final phrases after delay:', intentPhrases);
                  
                  if (intentPhrases.length < expectedPhrases) {
                    console.log('Still missing phrases: Expected', expectedPhrases, 'got', intentPhrases.length);
                  }
                }, 5000);
                return;
              } else if (eventType === 'error') {
                // Error occurred
                setError(data.error || 'An error occurred during generation');
                clearTimeout(phaseTimeout);
                setIsGenerating(false);
                setPhrasesLoading(false);
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in phrase generation:', error);
      setError('Failed to generate phrases. Please try again.');
      clearTimeout(phaseTimeout);
      setIsGenerating(false);
      setPhrasesLoading(false);
      setIsPhraseGenerationActive(false);
    }
  };

  const handleBackClick = async () => {
    setIsBackLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    onBack();
  };

  // STABLE handlers grouped to avoid re-creation breaking memoized children
  const stableHandlers = useMemo(() => ({
    handlePhraseSelect: (phraseId: string) => {
      setSelectedPhrases(prev => {
        if (prev.includes(phraseId)) {
          return prev.filter(id => id !== phraseId);
        } else if (prev.length < 5) {
          return [...prev, phraseId];
        }
        return prev;
      });
    },
    handleEditPhrase: (phraseId: string) => {
      setIntentPhrases(prev => prev.map(p => {
        if (p.id === phraseId) {
          // Initialize the ref with the current phrase value
          inputValuesRef.current[phraseId] = p.phrase;
          return { ...p, isEditing: !p.isEditing };
        }
        return p;
      }));
    },
    handleSaveEdit: async (phraseId: string) => {
      const currentValue = inputValuesRef.current[phraseId];
      if (!currentValue) {
        // Just close editing mode
        setIntentPhrases(prev => prev.map(p => 
          p.id === phraseId ? { ...p, isEditing: false } : p
        ));
        setEditingValues(prev => {
          const newValues = { ...prev };
          delete newValues[phraseId];
          return newValues;
        });
        return;
      }

      try {
        let newScore = 50;
        const wordCount = currentValue.trim().split(/\s+/).length;

        if (currentValue.length > 50) newScore += 15;
        if (currentValue.length > 100) newScore += 10;
        if (wordCount >= 8 && wordCount <= 15) newScore += 20; else newScore -= 30;
        if (currentValue.toLowerCase().includes('how') || currentValue.toLowerCase().includes('what') || currentValue.toLowerCase().includes('why')) newScore += 10;
        const actionWords = ['implement', 'create', 'build', 'develop', 'optimize', 'improve', 'best practices', 'solution'];
        const hasActionWords = actionWords.some(word => currentValue.toLowerCase().includes(word));
        if (hasActionWords) newScore += 10;
        if (currentValue.toLowerCase().includes('business') || currentValue.toLowerCase().includes('company') || currentValue.toLowerCase().includes('enterprise')) newScore += 8;
        newScore = Math.min(Math.max(newScore, 0), 100);

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/intent-phrases/${phraseId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phrase: currentValue,
            relevanceScore: newScore
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update phrase in database');
        }

        setIntentPhrases(prev => prev.map(p => 
          p.id === phraseId
            ? { ...p, phrase: currentValue, relevanceScore: newScore, wordCount, isEditing: false }
            : p
        ));
        setEditingValues(prev => {
          const newValues = { ...prev };
          delete newValues[phraseId];
          return newValues;
        });
      } catch (error) {
        console.error('Error saving phrase:', error);
        alert('Failed to save phrase. Please try again.');
      }
    },
    handleCancelEdit: (phraseId: string) => {
      setIntentPhrases(prev => prev.map(p =>
        p.id === phraseId ? { ...p, isEditing: false } : p
      ));
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[phraseId];
        return newValues;
      });
    }
  }), []);

  // Keep reference to current phrases to avoid stale closures in SSE handlers
  const currentPhrasesRef = useRef<IntentPhrase[]>([]);
  useEffect(() => {
    currentPhrasesRef.current = intentPhrases;
  }, [intentPhrases]);

  // Destructure to keep existing prop names unchanged where used
  const { handlePhraseSelect, handleEditPhrase, handleSaveEdit, handleCancelEdit } = stableHandlers;

  const handlePhraseChange = useCallback((phraseId: string, newPhrase: string) => {
    // Update the ref without causing re-renders
    inputValuesRef.current[phraseId] = newPhrase;
    // Don't update state here to prevent re-renders
  }, []);

  const handleLoadMorePhrases = useCallback(async (keyword: string, keywordId: number) => {
    console.log('handleLoadMorePhrases called with:', { keyword, keywordId, domainId });
    try {
      // Auto-expand this group's section so new phrases are visible immediately
      setGroupExpanded(prev => ({ ...prev, [keyword]: true }));
      setLoadingMorePhrases(prev => ({ ...prev, [keyword]: true }));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/${keywordId}/generate-more`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Load more response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to generate additional phrases');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      // Drain the SSE stream without parsing; rely on a final DB fetch for consistency
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // After stream ends, fetch latest phrases from DB and replace local state from source of truth
      try {
        const reconcileResp = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/step3`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        if (reconcileResp.ok) {
          const existingData = await reconcileResp.json();
          if (existingData.existingPhrases && existingData.existingPhrases.length > 0) {
            setIntentPhrases(sortPhrasesForDisplay(existingData.existingPhrases));
            setPhrasesReceived(existingData.existingPhrases.length);
            setReceivedPhrases(existingData.existingPhrases);
          }
        }
      } catch (reconcileErr) {
        console.error('Reconcile fetch failed after load more:', reconcileErr);
      }
    } catch (error) {
      console.error('Error loading more phrases:', error);
      alert('Failed to generate additional phrases. Please try again.');
    } finally {
      setLoadingMorePhrases(prev => ({ ...prev, [keyword]: false }));
    }
  }, [domainId, sortPhrasesForDisplay]);

  const handleAddCustomPhrase = useCallback(async () => {
    if (!newPhrase.trim()) return;

    // Prevent duplicates before analyzing/saving
    const exists = intentPhrases.some(p => p.phrase.toLowerCase().trim() === newPhrase.toLowerCase().trim());
    if (exists) {
      alert(`"${newPhrase.trim()}" is already in your list`);
      setNewPhrase('');
      setShowAddPhrase(false);
      return;
    }

    setIsAddingPhrase(true);

    try {
      // Call the custom phrase analysis endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/enhanced-phrases/${domainId}/custom-phrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          phrase: newPhrase.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Add the new phrase to the local state
      const newPhraseObj: IntentPhrase = {
        id: result.phrase.id.toString(),
        phrase: result.phrase.phrase,
        relevanceScore: result.phrase.relevanceScore,
        intent: result.phrase.intent,
        intentConfidence: result.phrase.intentConfidence,
        sources: result.phrase.sources,
        trend: result.phrase.trend,
        editable: result.phrase.editable,
        selected: result.phrase.selected,
        parentKeyword: result.phrase.parentKeyword,
        keywordId: result.phrase.keywordId,
        wordCount: result.phrase.wordCount,
        isAdditional: true
      };

      // Add to local state
      setIntentPhrases(prev => [newPhraseObj, ...prev]);
      setPhrasesReceived(prev => prev + 1);
      setReceivedPhrases(prev => [newPhraseObj, ...prev]);

      // If a new keyword was created, update step3Data to include it
      if (!result.keyword.isExisting && step3Data) {
        const newKeyword = {
          id: result.keyword.id,
          keyword: result.keyword.term,
          volume: 1000, // Default volume for custom keywords
          difficulty: 'Medium',
          cpc: 2.00,
          isSelected: true
        };
        
        setStep3Data(prev => prev ? {
          ...prev,
          selectedKeywords: [...prev.selectedKeywords, newKeyword]
        } : null);
      }

      setNewPhrase('');
      setShowAddPhrase(false);
      setIsAddingPhrase(false);

      console.log(`Successfully added custom phrase: "${newPhrase.trim()}" with analysis:`, result.analysis);

    } catch (error) {
      console.error('Custom phrase analysis error:', error);
      alert(`Failed to analyze phrase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setNewPhrase('');
      setShowAddPhrase(false);
      setIsAddingPhrase(false);
    }
  }, [newPhrase, intentPhrases, domainId, step3Data]);

  const handleNext = async () => {
    if (selectedPhrases.length === 0) {
      alert('Please select at least 1 intent phrase');
      return;
    }

    try {
      setIsContinuing(true);
      
      if (selectedPhrases.length === 0) {
        alert('No phrases selected. Please select at least one phrase.');
        setIsContinuing(false);
        return;
      }
      
      // Save selected phrases to database
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/intent-phrases/${domainId}/select`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedPhrases: selectedPhrases
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save selected phrases');
      }

      const result = await response.json();
      console.log('Selected phrases saved:', result);

      onNext({
        domainId,
        selectedPhrases: intentPhrases.filter(p => selectedPhrases.includes(p.id)),
        step3Data
      });
    } catch (error) {
      console.error('Error saving selected phrases:', error);
      alert('Failed to save selected phrases. Please try again.');
    } finally {
      setIsContinuing(false);
    }
  };

  // Create grouped phrases with proper structure using useMemo to prevent excessive re-rendering
  const groupedPhrases = useMemo(() => {
    const groups = [] as Array<{ keyword: string; keywordId: number; phrases: IntentPhrase[] }>;
    if (!step3Data?.selectedKeywords || step3Data.selectedKeywords.length === 0) return groups;

    step3Data.selectedKeywords
      .filter(keyword => keyword.isSelected)
      .forEach((keyword) => {
        // Prefer robust matching by keywordId; fallback to parentKeyword text
        const keywordPhrases = intentPhrases.filter(phrase =>
          (typeof phrase.keywordId === 'number' && phrase.keywordId === keyword.id) ||
          phrase.parentKeyword === keyword.keyword
        );
        const sortedForGroup = sortPhrasesForDisplay(keywordPhrases);
        if (sortedForGroup.length > 0) {
          groups.push({
            keyword: keyword.keyword,
            keywordId: keyword.id,
            phrases: sortedForGroup
          });
        }
      });

    return groups;
  }, [step3Data?.selectedKeywords, intentPhrases, sortPhrasesForDisplay]);

  // Debug logging for grouped phrases (only log when it changes)
  // Removed verbose logging to prevent excessive console noise
  // useEffect(() => {
  //   console.log('Grouped phrases updated:', groupedPhrases);
  //   console.log('Grouped phrases with keywordId:', groupedPhrases.map(g => ({ keyword: g.keyword, keywordId: g.keywordId, phraseCount: g.phrases.length })));
  // }, [groupedPhrases]);

  // Debug logging for intentPhrases changes
  // Removed verbose logging to prevent excessive console noise
  // useEffect(() => {
  //   console.log('intentPhrases updated:', intentPhrases.length, 'phrases');
  //   console.log('Latest phrases:', intentPhrases.slice(-3)); // Show last 3 phrases
  // }, [intentPhrases.length]);







  // Apple-styled UI Components

type GeneratingStep = {
  name: string;
  status: 'pending' | 'running' | 'completed';
  progress: number;
  description: string;
};

const AppleLoadingState: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center px-4">
    <div className="max-w-2xl w-full">
      <div className="text-center mb-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">Preparing your analysis</h2>
        <p className="text-lg text-gray-600 leading-relaxed">We're setting up your keyword insights and intent phrases.</p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center text-gray-600">
          <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-base font-medium">Your analysis is being prepared securely</span>
        </div>
      </div>
    </div>
  </div>
);

const AppleHeader: React.FC<{
  step3Data: Step3Data | null;
  showDebug: boolean;
  setShowDebug: React.Dispatch<React.SetStateAction<boolean>>;
  debugItems: DebugItem[];
}> = ({ step3Data, showDebug, setShowDebug, debugItems }) => (
  <div className="bg-white border-b border-gray-100 sticky top-0 z-50 apple-blur-bg">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Intent Phrases</h1>
          <p className="text-base text-gray-600 mt-1">AI-powered phrase generation for your content strategy</p>
                      </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowDebug(prev => !prev)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {showDebug ? 'Hide' : 'Debug'} ({debugItems.length})
          </button>
                    </div>
      </div>
      {step3Data?.selectedKeywords && (
        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2">
          {step3Data.selectedKeywords
            .filter(kw => kw.isSelected)
            .slice(0, 8)
            .map((keyword, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800 font-medium">
                {keyword.keyword}
              </span>
                      ))}
                    </div>
      )}
                  </div>
                </div>
);

const AppleGenerationProgress: React.FC<{
  generatingSteps: GeneratingStep[];
  currentTaskIndex: number;
}> = ({ generatingSteps, currentTaskIndex }) => (
  <div className="min-h-screen bg-white flex items-center justify-center px-4">
    <div className="max-w-2xl w-full">
      <div className="text-center mb-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">Analyzing your content</h2>
        <p className="text-lg text-gray-600 leading-relaxed">Our AI is studying community conversations and search patterns to create the most relevant intent phrases for your brand.</p>
      </div>

      {/* Apple-style Carousel */}
      <div className="relative h-24 mb-8 overflow-hidden">
        <div 
          className="flex transition-transform duration-1000 ease-out"
          style={{ transform: `translateX(-${currentTaskIndex * 100}%)` }}
        >
          {generatingSteps.map((step, index) => (
            <div key={index} className="w-full flex-shrink-0 text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-2 transition-opacity duration-700">
                {step.name}
              </h3>
              <p className="text-base text-gray-600 transition-opacity duration-700">
                {step.status === 'completed' ? 'Completed successfully' : 
                 step.status === 'running' ? 'In progress...' : 'Pending'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Apple-style Progress Dots */}
      <div className="flex justify-center space-x-3 mb-8">
        {generatingSteps.map((step, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-700 ease-out ${
              step.status === 'completed'
                ? 'bg-gray-800 scale-110 shadow-md'
                : index === currentTaskIndex
                ? 'bg-gray-600 scale-125 shadow-lg'
                : 'bg-gray-300'
            }`}
          ></div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center text-gray-600">
          <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-base font-medium">Your content analysis is being processed securely</span>
        </div>
      </div>
    </div>
  </div>
);

// Keyword Phrases Component - handles phrases for a single keyword
const KeywordPhrases = React.memo<{
  keyword: string;
  keywordId: number;
  phrases: IntentPhrase[];
  selectedPhrases: string[];
  handlePhraseSelect: (phraseId: string) => void;
  handleEditPhrase: (phraseId: string) => void;
  handlePhraseChange: (phraseId: string, newPhrase: string) => void;
  handleSaveEdit: (phraseId: string) => void;
  handleCancelEdit: (phraseId: string) => void;
  groupExpanded: boolean;
  setGroupExpanded: (expanded: boolean) => void;
  defaultGroupLimit: number;
  handleLoadMorePhrases: (keyword: string, keywordId: number) => void;
  loadingMorePhrases: boolean;
}>(({ 
  keyword, 
  keywordId, 
  phrases, 
  selectedPhrases, 
  handlePhraseSelect, 
  handleEditPhrase, 
  handlePhraseChange, 
  handleSaveEdit, 
  handleCancelEdit, 
  groupExpanded, 
  setGroupExpanded, 
  defaultGroupLimit, 
  handleLoadMorePhrases, 
  loadingMorePhrases
}) => {
  const visible = groupExpanded ? phrases : phrases.slice(0, defaultGroupLimit);
  const hasMore = phrases.length > defaultGroupLimit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-4 border-b border-gray-100">
        <h4 className="text-lg font-semibold text-gray-900">{keyword}</h4>
        <div className="flex items-center space-x-3">
          {/* Debug info */}
          <div className="text-xs text-gray-400">
            Debug: {handleLoadMorePhrases ? 'fn✓' : 'fn✗'} | {keywordId ? `id✓(${keywordId})` : 'id✗'}
          </div>
          
          {handleLoadMorePhrases && keywordId && (
            <button 
              onClick={() => {
                console.log('Load More button clicked for:', { keyword, keywordId });
                handleLoadMorePhrases(keyword, keywordId);
              }}
              disabled={loadingMorePhrases}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMorePhrases ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Load More
                </>
              )}
            </button>
          )}
          {!handleLoadMorePhrases && (
            <div className="text-xs text-gray-500">handleLoadMorePhrases not available</div>
          )}
          {!keywordId && (
            <div className="text-xs text-gray-500">keywordId not available for {keyword}</div>
          )}
          {hasMore && (
            <button onClick={() => setGroupExpanded(!groupExpanded)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors">
              {groupExpanded ? 'Show less' : `Show all ${phrases.length}`}
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4">
        {visible.map((phrase) => (
          <div key={phrase.id} className={`group relative rounded-2xl border-2 transition-all duration-200 ${selectedPhrases.includes(phrase.id) ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
            <div className="p-6">
              <div className="absolute top-6 right-6">
                <input type="checkbox" checked={selectedPhrases.includes(phrase.id)} onChange={() => handlePhraseSelect(phrase.id)} disabled={!selectedPhrases.includes(phrase.id) && selectedPhrases.length >= 5} className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              </div>
              <div className="pr-12">
                {phrase.isEditing ? (
                  <div className="space-y-4">
                    <div className="relative">
                        <input 
                          type="text"
                          defaultValue={phrase.phrase}
                          onChange={(e) => {
                            const newValue = (e.target as HTMLInputElement).value;
                            inputValuesRef.current[phrase.id] = newValue;
                          }}
                          className="w-full text-lg text-gray-900 bg-white border border-gray-200 rounded-2xl px-4 py-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 font-light leading-relaxed" 
                          placeholder="Enter your phrase here..."
                          autoFocus
                        />
                      <div className="absolute top-2 right-2 text-xs text-gray-400 font-light">
                        {phrase.phrase.trim().split(/\s+/).length} words
                      </div>
                      {/* Word count indicator */}
                      <div className="absolute bottom-2 right-2">
                        {(() => {
                          const wc = phrase.phrase.trim().split(/\s+/).length;
                          const ok = wc >= 8 && wc <= 15;
                          return (
                            <div className={`text-xs px-2 py-1 rounded-full font-medium ${ok ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                              {ok ? '✓' : '!'} Optimal
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleSaveEdit(phrase.id)} 
                        className="inline-flex items-center px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </button>
                      <button 
                        onClick={() => handleCancelEdit(phrase.id)} 
                        className="inline-flex items-center px-4 py-2.5 text-gray-600 hover:text-gray-900 transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-lg text-gray-900 leading-relaxed font-light">{phrase.phrase}</p>
                      {phrase.isAdditional && (
                        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>New</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 font-light">Relevance:</span>
                        <span className={`font-medium px-3 py-1 rounded-full text-xs ${phrase.relevanceScore >= 80 ? 'bg-green-100 text-green-800 border border-green-200' : phrase.relevanceScore >= 60 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>{phrase.relevanceScore}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 font-light">Intent:</span>
                        <span className="font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-xs border border-gray-200">{phrase.intent || 'Informational'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 font-light">Length:</span>
                        <span className={`font-medium px-3 py-1 rounded-full text-xs border ${phrase.wordCount && phrase.wordCount >= 8 && phrase.wordCount <= 15 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>{phrase.wordCount || phrase.phrase.trim().split(/\s+/).length} words</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!phrase.isEditing && (
                <button 
                  onClick={() => handleEditPhrase(phrase.id)} 
                  className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// New Modular Phrase Selection Component - uses KeywordPhrases for each keyword
const ModularPhraseSelection = React.memo<{
  groupedPhrases: Array<{ keyword: string; phrases: IntentPhrase[]; keywordId?: number }>;
  selectedPhrases: string[];
  handlePhraseSelect: (phraseId: string) => void;
  handleEditPhrase: (phraseId: string) => void;
  handlePhraseChange: (phraseId: string, newPhrase: string) => void;
  handleSaveEdit: (phraseId: string) => void;
  handleCancelEdit: (phraseId: string) => void;
  groupExpanded: Record<string, boolean>;
  setGroupExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  defaultGroupLimit?: number;
  hideSummary?: boolean;
  handleLoadMorePhrases?: (keyword: string, keywordId: number) => void;
  loadingMorePhrases?: Record<string, boolean>;
}>(({ 
  groupedPhrases, 
  selectedPhrases, 
  handlePhraseSelect, 
  handleEditPhrase, 
  handlePhraseChange, 
  handleSaveEdit, 
  handleCancelEdit, 
  groupExpanded, 
  setGroupExpanded, 
  defaultGroupLimit = 3, 
  hideSummary = false, 
  handleLoadMorePhrases, 
  loadingMorePhrases = {}
}) => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    {!hideSummary && (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Select your intent phrases</h3>
            <p className="text-base text-gray-600">Choose up to 5 phrases that best represent your content goals</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{selectedPhrases.length}</div>
            <div className="text-sm text-gray-500">of 5 selected</div>
          </div>
        </div>
        {selectedPhrases.length >= 5 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">You've reached the maximum selection. Deselect a phrase to choose another.</p>
          </div>
        )}
      </div>
    )}
    <div className="space-y-8">
      {groupedPhrases.map((group, groupIdx) => (
        <KeywordPhrases
          key={group.keyword}
          keyword={group.keyword}
          keywordId={group.keywordId || 0}
          phrases={group.phrases}
          selectedPhrases={selectedPhrases}
          handlePhraseSelect={handlePhraseSelect}
          handleEditPhrase={handleEditPhrase}
          handlePhraseChange={handlePhraseChange}
          handleSaveEdit={handleSaveEdit}
          handleCancelEdit={handleCancelEdit}
          groupExpanded={groupExpanded[group.keyword] || false}
          setGroupExpanded={(expanded) => setGroupExpanded(prev => ({ ...prev, [group.keyword]: expanded }))}
          defaultGroupLimit={defaultGroupLimit}
          handleLoadMorePhrases={handleLoadMorePhrases}
          loadingMorePhrases={loadingMorePhrases[group.keyword] || false}
        />
      ))}
    </div>
  </div>
));



const AppleFooterNav: React.FC<{
  onBack: () => void;
  onNext: () => void;
  selectedPhrases: string[];
  isBackLoading: boolean;
  isContinuing: boolean;
}> = ({ onBack, onNext, selectedPhrases, isBackLoading, isContinuing }) => (
  <div className="bg-white border-t border-gray-100 sticky bottom-0 z-40 apple-blur-bg">
    <div className="max-w-5xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} disabled={isBackLoading} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50">
          {isBackLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </>
          )}
        </button>
        <div className="flex items-center space-x-4">
          {selectedPhrases.length > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Ready to continue</span>
            </div>
          )}
          <button onClick={onNext} disabled={selectedPhrases.length === 0 || isContinuing} className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all">
            {isContinuing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
);

  if (isLoading) {
    return <AppleLoadingState />;
  }

  if (isBackLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="py-16">
            {/* Minimal Spinner */}
            <div className="flex justify-center mb-8">
              <div className="w-8 h-8 border-2 border-gray-300 rounded-full animate-spin border-t-gray-800"></div>
            </div>

            {/* Carousel Container with Smooth Transitions */}
            <div className="relative h-40 mb-12 overflow-hidden">
              <div 
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentLoadingIndex * 100}%)` }}
              >
                <div className="w-full flex-shrink-0 text-center">
                  <h3 className="text-lg text-gray-900 mb-2 transition-opacity duration-500">
                    Accessing Cloud Storage
                  </h3>
                  <p className="text-gray-500 text-sm transition-opacity duration-500">
                    Connecting to secure data servers
                  </p>
                  
                  {/* Sub-carousel for cloud storage */}
                  <div className="mt-4">
                    <div className="relative h-20 overflow-hidden">
                      <div 
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentLoadingIndex * 100}%)` }}
                      >
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Secure Connection</h4>
                          <p className="text-xs text-blue-600">Establishing encrypted connection</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Authentication</h4>
                          <p className="text-xs text-blue-600">Verifying user credentials</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Data Access</h4>
                          <p className="text-xs text-blue-600">Accessing secure data storage</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Dots for sub-carousel */}
                    <div className="flex justify-center space-x-1 mt-4">
                      {[0, 1, 2].map((dotIndex) => (
                        <div
                          key={dotIndex}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ease-out ${
                            dotIndex === currentLoadingIndex
                              ? 'bg-blue-600 scale-125'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="w-full flex-shrink-0 text-center">
                  <h3 className="text-lg text-gray-900 mb-2 transition-opacity duration-500">
                    Retrieving Keywords
                  </h3>
                  <p className="text-gray-500 text-sm transition-opacity duration-500">
                    Loading your selected keyword data
                  </p>
                  
                  {/* Sub-carousel for keyword retrieval */}
                  <div className="mt-4">
                    <div className="relative h-20 overflow-hidden">
                      <div 
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentLoadingIndex * 100}%)` }}
                      >
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Data Retrieval</h4>
                          <p className="text-xs text-blue-600">Fetching keyword selections</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Validation</h4>
                          <p className="text-xs text-blue-600">Validating data integrity</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Processing</h4>
                          <p className="text-xs text-blue-600">Preparing keyword data</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Dots for sub-carousel */}
                    <div className="flex justify-center space-x-1 mt-4">
                      {[0, 1, 2].map((dotIndex) => (
                        <div
                          key={dotIndex}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ease-out ${
                            dotIndex === currentLoadingIndex
                              ? 'bg-blue-600 scale-125'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="w-full flex-shrink-0 text-center">
                  <h3 className="text-lg text-gray-900 mb-2 transition-opacity duration-500">
                    Preparing Navigation
                  </h3>
                  <p className="text-gray-500 text-sm transition-opacity duration-500">
                    Setting up previous step data
                  </p>
                  
                  {/* Sub-carousel for navigation setup */}
                  <div className="mt-4">
                    <div className="relative h-20 overflow-hidden">
                      <div 
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(-${currentLoadingIndex * 100}%)` }}
                      >
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">State Restoration</h4>
                          <p className="text-xs text-blue-600">Restoring previous state</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Interface Setup</h4>
                          <p className="text-xs text-blue-600">Preparing user interface</p>
                        </div>
                        <div className="w-full flex-shrink-0 text-center">
                          <h4 className="text-xs font-medium text-blue-800 mb-1">Ready State</h4>
                          <p className="text-xs text-blue-600">Navigation ready</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Dots for sub-carousel */}
                    <div className="flex justify-center space-x-1 mt-4">
                      {[0, 1, 2].map((dotIndex) => (
                        <div
                          key={dotIndex}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ease-out ${
                            dotIndex === currentLoadingIndex
                              ? 'bg-blue-600 scale-125'
                              : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Minimal Progress Dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ease-out ${
                    index === currentLoadingIndex
                      ? 'bg-gray-600 scale-125'
                      : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-error-warning-line text-2xl text-red-600"></i>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <AppleGenerationProgress generatingSteps={generatingSteps as GeneratingStep[]} currentTaskIndex={currentTaskIndex} />
    );
  }

  return (
    <div className="bg-white">

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-light text-gray-900 tracking-tight">Intent Phrases</h2>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-600">{selectedPhrases.length}/5 selected</span>
                </div>
                <button onClick={() => setShowDebug(prev => !prev)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full hover:shadow-md transition-all duration-200 text-xs flex items-center font-medium">
                  Debug
                </button>
              </div>
            </div>
            {step3Data?.selectedKeywords && (
              <div className="flex flex-wrap gap-2">
                {step3Data.selectedKeywords
                  .filter(keyword => keyword.isSelected)
                  .map((keyword) => (
                    <span key={keyword.id} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 text-xs rounded-full">
                      {keyword.keyword}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="p-6">
            {showDebug && (
              <div className="mb-6 border border-gray-100 rounded-2xl p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-900">Debug Stream</h3>
                  <button className="text-gray-500 hover:text-gray-700 text-xs" onClick={() => setDebugItems([])}>Clear</button>
                </div>
                <div className="space-y-3 max-h-80 overflow-auto">
                  {debugItems.length === 0 ? (
                    <div className="text-xs text-gray-600">No debug items yet…</div>
                  ) : (
                    debugItems.map(item => (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">{item.type.toUpperCase()}</span>
                            {item.stage && <span className="text-gray-700">{item.stage}</span>}
                            {item.keyword && <span className="text-gray-700">[{item.keyword}]</span>}
                          </div>
                          <span className="text-gray-500">{new Date(item.ts).toLocaleTimeString()}</span>
                        </div>
                        {item.type === 'reddit' ? (
                          <div className="space-y-2">
                            {(Array.isArray(item.payload) ? (item.payload as RedditPostDebug[]) : []).slice(0, 5).map((p: RedditPostDebug, idx: number) => (
                              <div key={idx} className="text-xs text-gray-700">
                                <div className="font-medium truncate">{p.title}</div>
                                <div className="text-gray-500 truncate">{p.url}</div>
                                <div className="text-gray-500">r/{p.subreddit} • score {p.score} • rel {p.relevanceScore}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 max-h-40 overflow-auto">{typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload, null, 2)}</pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {intentPhrases.length > 0 && !phrasesLoading && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Phrase Generation Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">{intentPhrases.length}</div>
                    <div className="text-gray-600">Total Phrases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">{Math.round(intentPhrases.reduce((sum, p) => sum + (p.relevanceScore || 0), 0) / intentPhrases.length)}</div>
                    <div className="text-gray-600">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">{intentPhrases.filter(p => p.intent === 'Informational').length}</div>
                    <div className="text-gray-600">Informational</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-900">{intentPhrases.filter(p => p.intent === 'Transactional').length}</div>
                    <div className="text-gray-600">Transactional</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600">Generated using community insights and search pattern optimization</div>
              </div>
            )}

            {/* Custom Phrases Loading Indicator */}
            {customPhrasesLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Analyzing Phrases with AI</h4>
                    <p className="text-xs text-blue-700">AI is analyzing your phrases, extracting keywords, and mapping them to existing or creating new keywords...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Phrases Success Message */}
            {customPhrasesLoaded && !customPhrasesLoading && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-900">Phrases Analyzed Successfully</h4>
                    <p className="text-xs text-green-700">Your phrases have been analyzed with AI, keywords extracted, and mapped to existing or new keywords</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Custom Phrase Section */}
            <div className="mb-6 border-t border-gray-100 pt-6">
              <button
                onClick={() => setShowAddPhrase(!showAddPhrase)}
                className="flex items-center text-gray-700 hover:text-gray-900 font-medium text-sm mb-4 px-3 py-2 rounded-full hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Custom Phrase
              </button>

              {showAddPhrase && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      placeholder="Enter your custom phrase to analyze"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-gray-50/50 transition-all duration-200"
                      disabled={isAddingPhrase}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isAddingPhrase && newPhrase.trim()) {
                          handleAddCustomPhrase();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddCustomPhrase}
                      disabled={!newPhrase.trim() || isAddingPhrase}
                      className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 disabled:bg-gray-300 transition-all duration-200 text-sm font-medium shadow hover:shadow-md"
                    >
                      {isAddingPhrase ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Analyze & Add
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    AI will analyze your phrase, extract the primary keyword, and map it to existing keywords or create a new one.
                  </div>
                </div>
              )}
            </div>

            <ModularPhraseSelection
              groupedPhrases={groupedPhrases as Array<{ keyword: string; phrases: IntentPhrase[]; keywordId?: number }>}
              selectedPhrases={selectedPhrases}
              handlePhraseSelect={handlePhraseSelect}
              handleEditPhrase={handleEditPhrase}
              handlePhraseChange={handlePhraseChange}
              handleSaveEdit={handleSaveEdit}
              handleCancelEdit={handleCancelEdit}
              groupExpanded={groupExpanded}
              setGroupExpanded={setGroupExpanded}
              defaultGroupLimit={defaultGroupLimit}
              hideSummary={true}
              handleLoadMorePhrases={handleLoadMorePhrases}
              loadingMorePhrases={loadingMorePhrases}
            />
          </div>

          <div className="p-6 border-t border-gray-100 bg-gradient-to-t from-gray-50/30 to-white flex items-center justify-between">
            <button onClick={handleBackClick} className="px-7 py-2.5 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 hover:shadow-sm transition-all duration-200 font-medium text-sm">Back</button>
            <div className="flex items-center space-x-3">
              {selectedPhrases.length > 0 && (
                <span className="text-sm text-gray-600">Ready for analysis</span>
              )}
              <button onClick={handleNext} disabled={selectedPhrases.length === 0 || isContinuing || phrasesLoading} className="px-8 py-2.5 bg-gray-900 text-white font-medium rounded-2xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center shadow hover:shadow-md text-sm">
                {isContinuing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Step3Results;