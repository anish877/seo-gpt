import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Target, Users, Globe, AlertCircle, Crown, ChevronRight, Star, BarChart3, Activity, Lightbulb, FileText, MessageSquare, LayoutDashboard, History, CreditCard, RefreshCw, Eye, Cpu } from 'lucide-react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { TooltipContent } from '@/components/ui/tooltip';

interface DashboardProps {
  domain: string;
  brandContext: string;
  keywords: string[];
  phrases: Array<{keyword: string, phrases: string[]}>;
  queryResults: Array<{
    id: number;
    model: string;
    response: string;
    latency: number;
    cost: number;
    presence: number;
    relevance: number;
    accuracy: number;
    sentiment: number;
    overall: number;
    phraseId: number;
  }>;
  onPrev: () => void;
}

interface DomainData {
  id: number;
  url: string;
  context: string;
  crawlResults: Array<{
    pagesScanned: number;
    analyzedUrls: string[];
    extractedContext: string;
  }>;
  keywords: Array<{
    id: number;
    term: string;
    volume: number;
    difficulty: string;
    cpc: number;
    category: string;
    isSelected: boolean;
  }>;
  phrases: Array<{
    id: number;
    text: string;
    keywordId: number;
  }>;
  aiQueryResults: Array<{
    id: number;
    model: string;
    response: string;
    latency: number;
    cost: number;
    presence: number;
    relevance: number;
    accuracy: number;
    sentiment: number;
    overall: number;
    phraseId: number;
  }>;
}

interface CompetitorAnalysis {
  domain?: string;
  visibilityScore?: number;
  mentionRate?: number;
  avgRelevance?: number;
  avgAccuracy?: number;
  avgSentiment?: number;
  keyStrengths?: string[];
  keyWeaknesses?: string[];
  comparison?: {
    better: string[];
    worse: string[];
    similar: string[];
  };
  summary?: string;
  metricsTable?: Array<Record<string, unknown>>;
  keywordOverlap?: { percent: number; keywords: string[] };
  phraseOverlap?: { percent: number; phrases: string[] };
  aiVisibility?: Array<{ domain: string; score: number; mentionRate: number }>;
  swot?: {
    target: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    competitor: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  };
  recommendations?: Array<{ action: string; impact: string; effort: string }>;
  marketMap?: Array<{ domain: string; position: string; justification: string }>;
  recentNews?: Array<{ domain: string; headline: string; url: string }>;
}

const Dashboard: React.FC<DashboardProps> = ({
  domain,
  brandContext,
  keywords,
  phrases,
  queryResults,
  onPrev
}) => {
  const [domainData, setDomainData] = useState<DomainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [competitorDomain, setCompetitorDomain] = useState('');
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  const [competitorAnalysis, setCompetitorAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const { toast } = useToast();
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [allUnlocked, setAllUnlocked] = useState(false); // Placeholder for actual unlock logic
  const [reanalyzingPhrases, setReanalyzingPhrases] = useState<Set<number>>(new Set());

  // Fetch domain data from database
  useEffect(() => {
    const fetchDomainData = async () => {
      try {
        setIsLoading(true);
        
        // Get domain ID from the current domain
        const domainResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/domain/search?url=${encodeURIComponent(domain)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        if (!domainResponse.ok) throw new Error('Failed to fetch domain data');
        
        const domainInfo = await domainResponse.json();
        const domainId = domainInfo.domain?.id;
        
        if (!domainId) throw new Error('Domain not found in database');

        // Fetch comprehensive domain data
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/${domainId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        
        const data = await response.json();
        setDomainData(data);
        toast({
          title: "Dashboard Data Loaded",
          description: "Successfully loaded dashboard data from the database.",
        });
      } catch (error) {
        console.error('Error fetching domain data:', error);
        toast({
          title: "Dashboard Data Load Error",
          description: "Failed to load dashboard data from the database. Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDomainData();
  }, [domain, toast]);

  // Calculate real AI Visibility Score from actual data
  const calculateVisibilityScore = () => {
    if (!domainData?.aiQueryResults?.length) return 0;
    
    const totalResponses = domainData.aiQueryResults.length;
    const mentionedResponses = domainData.aiQueryResults.filter(r => r.presence > 0).length;
    const avgQuality = domainData.aiQueryResults.reduce((sum, r) => sum + r.overall, 0) / totalResponses;
    
    return Math.round(((mentionedResponses / totalResponses) * 100 * (avgQuality / 5)) * 10) / 10;
  };

  const visibilityScore = calculateVisibilityScore();

  // Real data for charts
  const modelPerformanceData = domainData?.aiQueryResults ? 
    Object.entries(
      domainData.aiQueryResults.reduce((acc, result) => {
        if (!acc[result.model]) {
          acc[result.model] = { responses: 0, mentions: 0, totalScore: 0 };
        }
        acc[result.model].responses++;
        if (result.presence > 0) acc[result.model].mentions++;
        acc[result.model].totalScore += result.overall;
        return acc;
      }, {} as Record<string, { responses: number; mentions: number; totalScore: number }>)
    ).map(([model, data]) => ({
      model,
      score: Math.round((data.mentions / data.responses) * 100),
      responses: data.responses,
      mentions: data.mentions,
      avgScore: Math.round((data.totalScore / data.responses) * 10) / 10
    })) : [];

  const keywordPerformanceData = domainData?.keywords?.slice(0, 8).map(keyword => {
    const keywordResults = domainData.aiQueryResults?.filter(r => {
      const phrase = domainData.phrases?.find(p => p.id === r.phraseId);
      return phrase && phrase.text.toLowerCase().includes(keyword.term.toLowerCase());
    }) || [];
    
    const visibility = keywordResults.length > 0 ? 
      (keywordResults.filter(r => r.presence > 0).length / keywordResults.length) * 100 : 0;
    const avgSentiment = keywordResults.length > 0 ? 
      keywordResults.reduce((sum, r) => sum + r.sentiment, 0) / keywordResults.length : 0;
    
    return {
      keyword: keyword.term.length > 15 ? keyword.term.substring(0, 15) + '...' : keyword.term,
      visibility: Math.round(visibility),
      mentions: keywordResults.filter(r => r.presence > 0).length,
      sentiment: Math.round(avgSentiment * 10) / 10,
      volume: keyword.volume,
      difficulty: keyword.difficulty
    };
  }) || [];

  const pieData = domainData?.aiQueryResults ? [
    { 
      name: 'Domain Present', 
      value: domainData.aiQueryResults.filter(r => r.presence > 0).length,
      color: '#10b981' 
    },
    { 
      name: 'Domain Not Found', 
      value: domainData.aiQueryResults.filter(r => r.presence === 0).length,
      color: '#ef4444' 
    }
  ] : [];

  const trendData = [
    { month: 'Jan', score: 45 },
    { month: 'Feb', score: 52 },
    { month: 'Mar', score: 58 },
    { month: 'Apr', score: 65 },
    { month: 'May', score: 71 },
    { month: 'Jun', score: visibilityScore }
  ];

  const topPhrases = domainData?.aiQueryResults
    ?.filter(r => r.presence > 0)
    ?.sort((a, b) => b.overall - a.overall)
    ?.slice(0, 5)
    ?.map(result => {
      const phrase = domainData.phrases?.find(p => p.id === result.phraseId);
      return {
        phrase: phrase?.text || 'Unknown phrase',
        score: Math.round(result.overall * 20), // Convert 1-5 to 0-100
        mentions: result.presence > 0 ? 1 : 0,
        model: result.model,
        relevance: result.relevance,
        accuracy: result.accuracy
      };
    }) || [];

  const improvementOpportunities = domainData?.aiQueryResults
    ?.filter(r => r.presence === 0 || r.overall < 3)
    ?.sort((a, b) => a.overall - b.overall)
    ?.slice(0, 5)
    ?.map(result => {
      const phrase = domainData.phrases?.find(p => p.id === result.phraseId);
      return {
        phrase: phrase?.text || 'Unknown phrase',
        score: Math.round(result.overall * 20),
        mentions: result.presence > 0 ? 1 : 0,
        model: result.model,
        issue: result.presence === 0 ? 'Domain not found' : 'Low quality response'
      };
    }) || [];

  // Reanalyze individual phrase function
  const reanalyzePhrase = async (phraseId: number, model: string) => {
    try {
      setReanalyzingPhrases(prev => new Set(prev).add(phraseId));
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai-queries/reanalyze-phrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          phraseId: phraseId,
          model: model,
          domain: domain,
          context: brandContext
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reanalyze phrase');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the domain data with the new result
        setDomainData(prevData => {
          if (!prevData) return prevData;
          
          const updatedResults = prevData.aiQueryResults.map(r => 
            r.phraseId === phraseId && r.model === model 
              ? { ...r, ...result.result }
              : r
          );
          
          return { ...prevData, aiQueryResults: updatedResults };
        });

        toast({
          title: "Phrase Reanalyzed",
          description: `Successfully reanalyzed phrase with ${model}`,
        });
      }
    } catch (error) {
      console.error('Error reanalyzing phrase:', error);
      toast({
        title: "Reanalysis Failed",
        description: "Failed to reanalyze phrase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setReanalyzingPhrases(prev => {
        const newSet = new Set(prev);
        newSet.delete(phraseId);
        return newSet;
      });
    }
  };

  // Competitor analysis function
  const analyzeCompetitor = async () => {
    if (!competitorDomain.trim()) {
      setCompetitorError('Please enter a competitor domain');
      return;
    }

    setIsAnalyzingCompetitor(true);
    setCompetitorError(null);
    setCompetitorAnalysis(null);

    try {
      const ctrl = new AbortController();
      
      fetchEventSource(`${import.meta.env.VITE_API_URL}/api/competitor/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ 
          targetDomain: domain,
          competitorDomain: competitorDomain.trim(),
          context: brandContext,
          keywords: keywords,
          phrases: phrases.flatMap(p => p.phrases)
        }),
        signal: ctrl.signal,
        onmessage(ev) {
          if (ev.event === 'analysis') {
            const data = JSON.parse(ev.data);
            setCompetitorAnalysis(data);
            toast({
              title: "Competitor Analysis Completed",
              description: "Successfully completed competitor analysis."
            });
          } else if (ev.event === 'error') {
            const data = JSON.parse(ev.data);
            setCompetitorError(data.error || 'Analysis failed');
          }
        },
        onclose() {
          setIsAnalyzingCompetitor(false);
          ctrl.abort();
        },
        onerror(err) {
          setCompetitorError('Failed to analyze competitor');
          setIsAnalyzingCompetitor(false);
          ctrl.abort();
          throw err;
        }
      });
    } catch (error) {
      setCompetitorError('Failed to start competitor analysis');
      setIsAnalyzingCompetitor(false);
    }
  };

  // Payment Popup Component
const PaymentPopup: React.FC<{ isOpen: boolean; onClose: () => void; featureName: string; onUnlockAll?: () => void }> = ({ isOpen, onClose, featureName, onUnlockAll }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[9999] p-6 bg-white border border-slate-200 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Upgrade to Pro</h2>
          <p className="text-slate-600">Unlock {featureName} and access premium analytics</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <span className="text-slate-700">Advanced Analytics</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <span className="text-slate-700">Competitor Analysis</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-black rounded-full"></div>
            <span className="text-slate-700">AI Insights</span>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="text-3xl font-bold text-slate-900">$29</div>
          <div className="text-slate-600">per month</div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <Button 
            className="w-full bg-black text-white hover:bg-slate-800"
            onClick={() => {
              if (onUnlockAll) {
                onUnlockAll();
              }
              onClose();
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Test: Unlock All Features
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

  // Navigation items for sidebar
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Key metrics and insights',
      locked: false
    },
    {
      id: 'airesults',
      label: 'AI Results',
      icon: Globe,
      description: 'Raw AI query results',
      locked: false
    },
    {
      id: 'competitors',
      label: 'Competitors',
      icon: Users,
      description: 'Competitive analysis',
      locked: false
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: TrendingUp,
      description: 'Performance analytics',
      locked: !allUnlocked
    },
    {
      id: 'keywords',
      label: 'Keywords',
      icon: Target,
      description: 'Keyword analysis',
      locked: !allUnlocked
    },
    {
      id: 'content',
      label: 'Content',
      icon: FileText,
      description: 'Content performance',
      locked: !allUnlocked
    },
    {
      id: 'models',
      label: 'AI Models',
      icon: Activity,
      description: 'AI model performance',
      locked: !allUnlocked
    },
    {
      id: 'phrases',
      label: 'Top Phrases',
      icon: MessageSquare,
      description: 'Best performing phrases',
      locked: !allUnlocked
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Lightbulb,
      description: 'AI-generated insights',
      locked: !allUnlocked
    },
    {
      id: 'history',
      label: 'Version History',
      icon: History,
      description: 'Version comparison',
      locked: !allUnlocked
    }
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Loading Dashboard</h2>
          <p className="text-slate-600">Fetching real-time data from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-4">
          AI Visibility Dashboard
        </h2>
        <p className="text-lg text-slate-600">
          Real-time insights into your brand's AI visibility performance
        </p>
      </div>


      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="airesults">AI Results</TabsTrigger>
          <TabsTrigger value="competitor">Competitor</TabsTrigger>
        </TabsList>
        
        {/* Pro Features Button */}
        <div className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            onClick={() => {
              setLockedFeature('Premium Features');
              setPaymentPopupOpen(true);
            }}
            className="bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 border-slate-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Unlock Premium Features
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Welcome Section */}
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Your AI Visibility Dashboard</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Track how your domain performs in AI responses and discover insights to improve your visibility
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {domainData?.aiQueryResults ? 
                    Math.round((domainData.aiQueryResults.filter(r => r.presence > 0).length / domainData.aiQueryResults.length) * 100) : 0}%
                </div>
                <div className="text-sm text-slate-600">Domain Presence Rate</div>
                <div className="text-xs text-slate-500 mt-2">How often you appear in AI responses</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {domainData?.aiQueryResults ? 
                    Math.round((domainData.aiQueryResults.reduce((sum, r) => sum + r.relevance, 0) / domainData.aiQueryResults.length) * 10) / 10 : 0}/5
                </div>
                <div className="text-sm text-slate-600">Avg Search Relevance</div>
                <div className="text-xs text-slate-500 mt-2">Quality of AI responses</div>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg relative ${!allUnlocked ? 'opacity-60' : ''}`}>
              <CardContent className="p-6 text-center">
                {!allUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                  </div>
                )}
                <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {allUnlocked ? (domainData?.phrases?.length || 0) : '—'}
                </div>
                <div className="text-sm text-slate-600">Total Phrases Analyzed</div>
                <div className="text-xs text-slate-500 mt-2">
                  {allUnlocked ? 'Keywords being tracked' : 'Unlock to track phrases'}
                </div>
                {!allUnlocked && (
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded-lg text-xs"
                      onClick={() => {
                        setLockedFeature('Phrase Analysis');
                        setPaymentPopupOpen(true);
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Unlock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg relative ${!allUnlocked ? 'opacity-60' : ''}`}>
              <CardContent className="p-6 text-center">
                {!allUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Crown className="h-5 w-5 text-orange-600" />
                  </div>
                )}
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {allUnlocked ? (domainData?.keywords?.filter(k => k.isSelected).length || 0) : '—'}
                </div>
                <div className="text-sm text-slate-600">Selected Keywords</div>
                <div className="text-xs text-slate-500 mt-2">
                  {allUnlocked ? 'Active monitoring' : 'Unlock to select keywords'}
                </div>
                {!allUnlocked && (
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1 rounded-lg text-xs"
                      onClick={() => {
                        setLockedFeature('Keyword Selection');
                        setPaymentPopupOpen(true);
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Unlock
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* AI Results Card */}
            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl shadow-slate-900/10 rounded-3xl overflow-hidden hover:shadow-3xl hover:shadow-slate-900/20 transition-all duration-300 cursor-pointer group"
                  onClick={() => {
                    const airesultsTab = document.querySelector('[value="airesults"]') as HTMLElement;
                    if (airesultsTab) airesultsTab.click();
                  }}>
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Cpu className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">AI Query Results</h3>
                      <p className="text-slate-600">Analyze how AI models respond to your keywords</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Responses</span>
                    <span className="font-semibold text-slate-900">{domainData?.aiQueryResults?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">AI Models Tested</span>
                    <span className="font-semibold text-slate-900">
                      {domainData?.aiQueryResults ? 
                        new Set(domainData.aiQueryResults.map(r => r.model)).size : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Avg Response Quality</span>
                    <span className="font-semibold text-slate-900">
                      {domainData?.aiQueryResults ? 
                        Math.round((domainData.aiQueryResults.reduce((sum, r) => sum + r.overall, 0) / domainData.aiQueryResults.length) * 10) / 10 : 0}/5
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-2xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">What you'll discover:</span>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• How often your domain is mentioned</li>
                    <li>• Response quality and sentiment analysis</li>
                    <li>• Performance across different AI models</li>
                    <li>• Detailed query-by-query breakdowns</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {domainData?.aiQueryResults?.length || 0} Results Available
                  </Badge>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl">
                    View Results
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Competitor Analysis Card */}
            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl shadow-slate-900/10 rounded-3xl overflow-hidden hover:shadow-3xl hover:shadow-slate-900/20 transition-all duration-300 cursor-pointer group"
                  onClick={() => {
                    const competitorTab = document.querySelector('[value="competitor"]') as HTMLElement;
                    if (competitorTab) competitorTab.click();
                  }}>
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 mb-2">Competitor Analysis</h3>
                      <p className="text-slate-600">Understand your competitive landscape</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Competitors Analyzed</span>
                    <span className="font-semibold text-slate-900">{competitorAnalysis ? '1' : '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Market Position</span>
                    <span className="font-semibold text-slate-900 capitalize">
                      {competitorAnalysis?.comparison?.better?.length > 0 ? 'Strong' : 'Developing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Analysis Status</span>
                    <span className="font-semibold text-slate-900">
                      {competitorAnalysis ? 'Complete' : 'Ready to Start'}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-900">What you'll discover:</span>
                  </div>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    <li>• Direct and indirect competitors</li>
                    <li>• Market share and positioning</li>
                    <li>• Competitive strengths and weaknesses</li>
                    <li>• Strategic recommendations</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    {competitorAnalysis ? 'Analysis Complete' : 'Ready to Analyze'}
                  </Badge>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl">
                    {competitorAnalysis ? 'View Analysis' : 'Start Analysis'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visibility Trend */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Visibility Trend</CardTitle>
                <CardDescription>AI visibility score over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Mention Distribution */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Domain Presence Distribution</CardTitle>
                <CardDescription>Brand presence across AI responses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center space-x-4 mt-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm">
                      Present ({pieData[0]?.value || 0} responses)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm">
                      Not Found ({pieData[1]?.value || 0} responses)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="airesults" className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>AI Query Results</CardTitle>
              <CardDescription>Raw results from all AI model queries for this domain</CardDescription>
            </CardHeader>
            <CardContent>
              {domainData?.aiQueryResults && domainData.aiQueryResults.length > 0 ? (
                <div className="space-y-4">
                  {domainData.aiQueryResults.slice(0, 10).map((result, index) => {
                    const phrase = domainData.phrases?.find(p => p.id === result.phraseId);
                    const isReanalyzing = reanalyzingPhrases.has(result.phraseId);
                    
                    return (
                      <div key={index} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-100 text-blue-800">{result.model}</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reanalyzePhrase(result.phraseId, result.model)}
                              disabled={isReanalyzing}
                              className="h-6 px-2 text-xs"
                            >
                              {isReanalyzing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              {isReanalyzing ? 'Reanalyzing...' : 'Reanalyze'}
                            </Button>
                          </div>
                          <div className="text-sm text-slate-600">
                            Latency: {result.latency.toFixed(2)}s • Cost: ${result.cost.toFixed(4)}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700 mb-2">
                          <div className="font-medium mb-1">Phrase: {phrase?.text || 'Unknown phrase'}</div>
                          <div>{result.response.length > 200 ? result.response.substring(0, 200) + '...' : result.response}</div>
                        </div>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className={result.presence > 0 ? 'text-green-600' : 'text-red-600'}>
                            {result.presence > 0 ? '✓ Domain Found' : '✗ Domain Not Found'}
                          </span>
                          <span>Relevance: {result.relevance}/5</span>
                          <span>Accuracy: {result.accuracy}/5</span>
                          <span>Sentiment: {result.sentiment}/5</span>
                          <span>Overall: {result.overall}/5</span>
                        </div>
                      </div>
                    );
                  })}
                  {domainData.aiQueryResults.length > 10 && (
                    <div className="text-center text-slate-600">
                      Showing 10 of {domainData.aiQueryResults.length} results
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-12">
                  <p>No AI query results available for this domain.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>AI Model Performance Comparison</CardTitle>
              <CardDescription>How different AI models perform for your brand</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modelPerformanceData.map((model) => (
              <Card key={model.model} className="bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{model.model}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Visibility Score:</span>
                    <span className="font-bold">{model.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Responses:</span>
                    <span className="font-medium">{model.responses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Domain Mentions:</span>
                    <span className="font-medium">{model.mentions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Quality:</span>
                    <span className="font-medium">{model.avgScore}/5</span>
                  </div>
                  <Progress value={model.score} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Keyword Performance</CardTitle>
              <CardDescription>AI visibility by keyword</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={keywordPerformanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="keyword" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="visibility" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phrases" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Phrases */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-green-600">High Visibility Phrases</CardTitle>
                <CardDescription>Phrases where your domain appears in AI responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPhrases.map((phrase, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">{phrase.phrase}</div>
                        <div className="text-xs text-slate-600">
                          {phrase.model} • Relevance: {phrase.relevance}/5 • Accuracy: {phrase.accuracy}/5
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        {phrase.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Improvement Opportunities */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-red-600">Improvement Opportunities</CardTitle>
                <CardDescription>Phrases where your domain needs better visibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {improvementOpportunities.map((phrase, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">{phrase.phrase}</div>
                        <div className="text-xs text-slate-600">
                          {phrase.model} • {phrase.issue}
                        </div>
                      </div>
                      <Badge className="bg-red-100 text-red-800">
                        {phrase.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitor" className="space-y-6">
          <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardDescription>Compare your AI visibility with competitors using AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter competitor domain (e.g., competitor.com)"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={analyzeCompetitor}
                  disabled={isAnalyzingCompetitor}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {isAnalyzingCompetitor ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Competitor'
                  )}
                </Button>
              </div>

              {competitorError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-red-700">{competitorError}</span>
                  </div>
                </div>
              )}

              {competitorAnalysis && (
                <div className="space-y-6">
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="mb-4 grid grid-cols-8">
                      <TabsTrigger value="summary">Summary</TabsTrigger>
                      <TabsTrigger value="metrics">Metrics</TabsTrigger>
                      <TabsTrigger value="keywordOverlap">Keyword Overlap</TabsTrigger>
                      <TabsTrigger value="phraseOverlap">Phrase Overlap</TabsTrigger>
                      <TabsTrigger value="aiVisibility">AI Visibility</TabsTrigger>
                      <TabsTrigger value="swot">SWOT</TabsTrigger>
                      <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                      <TabsTrigger value="marketMap">Market Map</TabsTrigger>
                      <TabsTrigger value="recentNews">News</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary">
                      <p className="text-slate-700 whitespace-pre-line">{competitorAnalysis?.summary || 'No summary available.'}</p>
                    </TabsContent>
                    <TabsContent value="metrics">
                      <table className="min-w-full text-sm border">
                        <thead>
                          <tr>
                            {competitorAnalysis?.metricsTable && competitorAnalysis.metricsTable[0] && Object.keys(competitorAnalysis.metricsTable[0]).map((key) => (
                              <th key={key} className="px-2 py-1 border-b bg-slate-100 text-slate-700">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {competitorAnalysis?.metricsTable?.map((row, i) => (
                            <tr key={i} className="border-b">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="px-2 py-1">{String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TabsContent>
                    <TabsContent value="keywordOverlap">
                      <div>
                        <div className="font-semibold mb-2">{competitorAnalysis?.keywordOverlap?.percent || 0}% overlap</div>
                        <ul className="list-disc ml-6">
                          {competitorAnalysis?.keywordOverlap?.keywords?.map((kw, i) => <li key={i}>{kw}</li>)}
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="phraseOverlap">
                      <div>
                        <div className="font-semibold mb-2">{competitorAnalysis?.phraseOverlap?.percent || 0}% overlap</div>
                        <ul className="list-disc ml-6">
                          {competitorAnalysis?.phraseOverlap?.phrases?.map((ph, i) => <li key={i}>{ph}</li>)}
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="aiVisibility">
                      <table className="min-w-full text-sm border">
                        <thead>
                          <tr>
                            <th className="px-2 py-1 border-b bg-slate-100 text-slate-700">Domain</th>
                            <th className="px-2 py-1 border-b bg-slate-100 text-slate-700">Score</th>
                            <th className="px-2 py-1 border-b bg-slate-100 text-slate-700">Mention Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitorAnalysis?.aiVisibility?.map((row, i) => (
                            <tr key={i} className="border-b">
                              <td className="px-2 py-1">{row.domain}</td>
                              <td className="px-2 py-1">{row.score}</td>
                              <td className="px-2 py-1">{row.mentionRate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TabsContent>
                    <TabsContent value="swot">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="font-bold mb-2">Your Domain</div>
                          <div className="mb-1 font-semibold">Strengths</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.target?.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Weaknesses</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.target?.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Opportunities</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.target?.opportunities?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Threats</div>
                          <ul className="list-disc ml-6">{competitorAnalysis?.swot?.target?.threats?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        </div>
                        <div>
                          <div className="font-bold mb-2">Competitor</div>
                          <div className="mb-1 font-semibold">Strengths</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.competitor?.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Weaknesses</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.competitor?.weaknesses?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Opportunities</div>
                          <ul className="list-disc ml-6 mb-2">{competitorAnalysis?.swot?.competitor?.opportunities?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                          <div className="mb-1 font-semibold">Threats</div>
                          <ul className="list-disc ml-6">{competitorAnalysis?.swot?.competitor?.threats?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="recommendations">
                      <ul className="space-y-2">
                        {(competitorAnalysis?.recommendations ?? []).map((rec, i) => (
                          typeof rec === 'object' && rec !== null && 'action' in rec ? (
                            <li key={i} className="flex items-center gap-2">
                              <span className="font-medium">{rec.action}</span>
                              <Badge className={rec.impact === 'high' ? 'bg-green-100 text-green-800' : rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{rec.impact}</Badge>
                              <Badge className={rec.effort === 'low' ? 'bg-green-50 text-green-700' : rec.effort === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}>{rec.effort}</Badge>
                            </li>
                          ) : null
                        ))}
                      </ul>
                    </TabsContent>
                    <TabsContent value="marketMap">
                      <ul className="space-y-2">
                        {competitorAnalysis?.marketMap?.map((m, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="font-medium">{m.domain}</span>
                            <Badge className={m.position === 'leader' ? 'bg-green-100 text-green-800' : m.position === 'challenger' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{m.position}</Badge>
                            <span className="text-xs text-slate-500">{m.justification}</span>
                          </li>
                        ))}
                      </ul>
                    </TabsContent>
                    <TabsContent value="recentNews">
                      <ul className="space-y-2">
                        {competitorAnalysis?.recentNews?.map((n, i) => (
                          <li key={i}>
                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">{n.headline}</a>
                            <span className="ml-2 text-xs text-slate-500">({n.domain})</span>
                          </li>
                        ))}
                      </ul>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <Button variant="outline" onClick={onPrev}>
          Back to Scoring
        </Button>
        <Button 
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Start New Analysis
        </Button>
        <Button 
          variant="outline"
          onClick={() => alert('Export functionality would be implemented here')}
        >
          Export Report
        </Button>
      </div>

      <PaymentPopup 
        isOpen={paymentPopupOpen} 
        onClose={() => setPaymentPopupOpen(false)} 
        featureName={lockedFeature || 'Premium Features'} 
        onUnlockAll={() => {
          setAllUnlocked(true);
          setPaymentPopupOpen(false);
        }} 
      />
    </div>
  );
};

export default Dashboard;
