import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { TrendingUp, TrendingDown, Minus, Users, Target, BarChart3 } from 'lucide-react';

interface CompetitorMention {
  name: string;
  domain: string;
  position: number;
  context: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  mentionType: 'url' | 'text' | 'brand';
}

interface TopCompetitor {
  name: string;
  domain: string;
  mentions: number;
  sentiment: { positive: number; neutral: number; negative: number };
  contexts: string[];
  averagePosition: number;
}

interface CompetitorAnalysis {
  totalMentions: number;
  uniqueCompetitors: string[];
  topCompetitors: TopCompetitor[];
  mentionsByPhrase: Array<{
    phrase: string;
    keyword: string;
    competitors: CompetitorMention[];
  }>;
  summary: {
    totalPhrases: number;
    phrasesWithCompetitors: number;
    mostFrequentCompetitor: string | null;
    averageMentionsPerPhrase: number;
  };
}

interface CompetitorAnalysisProps {
  domainId: string;
}

const CompetitorAnalysis: React.FC<CompetitorAnalysisProps> = ({ domainId }) => {
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompetitorAnalysis();
  }, [domainId]);

  const fetchCompetitorAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-queries/competitors/${domainId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch competitor analysis');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMentionTypeColor = (type: 'url' | 'text' | 'brand') => {
    switch (type) {
      case 'url':
        return 'bg-blue-100 text-blue-800';
      case 'brand':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading competitor analysis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error loading competitor analysis: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!analysis) {
    return (
      <Alert>
        <AlertDescription>No competitor analysis data available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Mentions</p>
                <p className="text-2xl font-bold">{analysis.totalMentions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Competitors</p>
                <p className="text-2xl font-bold">{analysis.uniqueCompetitors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Mentions/Phrase</p>
                <p className="text-2xl font-bold">{analysis.summary.averageMentionsPerPhrase.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Coverage Rate</p>
                <p className="text-2xl font-bold">
                  {analysis.summary.totalPhrases > 0 
                    ? Math.round((analysis.summary.phrasesWithCompetitors / analysis.summary.totalPhrases) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="top-competitors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="top-competitors">Top Competitors</TabsTrigger>
          <TabsTrigger value="mentions-by-phrase">Mentions by Phrase</TabsTrigger>
          <TabsTrigger value="sentiment-analysis">Sentiment Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="top-competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Competitors by Mention Frequency</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Mentions</TableHead>
                    <TableHead>Avg Position</TableHead>
                    <TableHead>Sentiment Distribution</TableHead>
                    <TableHead>Sample Contexts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.topCompetitors.map((competitor, index) => (
                    <TableRow key={competitor.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span>{competitor.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold">{competitor.mentions}</span>
                          <Progress 
                            value={(competitor.mentions / analysis.totalMentions) * 100} 
                            className="w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{competitor.averagePosition}%</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Badge className="bg-green-100 text-green-800">
                            +{competitor.sentiment.positive}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            ~{competitor.sentiment.neutral}
                          </Badge>
                          <Badge className="bg-red-100 text-red-800">
                            -{competitor.sentiment.negative}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {competitor.contexts.slice(0, 2).map((context, idx) => (
                            <p key={idx} className="text-xs text-gray-600 truncate">
                              "{context}"
                            </p>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentions-by-phrase" className="space-y-4">
            <Card>
            <CardHeader>
              <CardTitle>Competitor Mentions by Phrase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.mentionsByPhrase.map((phraseData, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{phraseData.phrase}</h4>
                        <p className="text-sm text-gray-600">Keyword: {phraseData.keyword}</p>
                      </div>
                      <Badge variant="outline">
                        {phraseData.competitors.length} mentions
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {phraseData.competitors.map((mention, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{mention.name}</span>
                            <Badge className={getMentionTypeColor(mention.mentionType)}>
                              {mention.mentionType}
                            </Badge>
                            <Badge className={getSentimentColor(mention.sentiment)}>
                              {getSentimentIcon(mention.sentiment)}
                              {mention.sentiment}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Position: {mention.position}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment-analysis" className="space-y-4">
            <Card>
            <CardHeader>
              <CardTitle>Competitor Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.topCompetitors.map((competitor) => (
                  <div key={competitor.name} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">{competitor.name}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Positive</span>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(competitor.sentiment.positive / competitor.mentions) * 100} 
                            className="w-20"
                          />
                          <span className="text-sm font-medium">{competitor.sentiment.positive}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Neutral</span>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(competitor.sentiment.neutral / competitor.mentions) * 100} 
                            className="w-20"
                          />
                          <span className="text-sm font-medium">{competitor.sentiment.neutral}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Negative</span>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(competitor.sentiment.negative / competitor.mentions) * 100} 
                            className="w-20"
                          />
                          <span className="text-sm font-medium">{competitor.sentiment.negative}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompetitorAnalysis; 