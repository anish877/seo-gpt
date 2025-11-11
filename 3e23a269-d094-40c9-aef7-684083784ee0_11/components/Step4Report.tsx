
'use client';

import { useState } from 'react';

interface Step4Props {
  stepData: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function Step4Report({ stepData, onBack, onComplete }: Step4Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [reportSections, setReportSections] = useState([
    { name: 'Executive Summary Generation', completed: true },
    { name: 'Performance Analysis', completed: true },
    { name: 'Competitive Insights', completed: true },
    { name: 'Strategic Recommendations', completed: true },
    { name: 'Action Plan Creation', completed: true }
  ]);
  const [overallScore] = useState(78);
  const [showFormula, setShowFormula] = useState(false);

  const scoreBreakdown = {
    phrasePerformance: { weight: 40, score: 82, label: 'Phrase Performance' },
    keywordOpportunity: { weight: 25, score: 75, label: 'Keyword Opportunity' },
    domainAuthority: { weight: 20, score: 68, label: 'Domain Authority/Pages' },
    onPageOptimization: { weight: 10, score: 88, label: 'On-Page Optimization' },
    competitorGaps: { weight: 5, score: 92, label: 'Competitor Gaps' }
  };

  const summaryData = [
    {
      category: 'Keywords',
      items: stepData.selectedKeywords?.map((kw: any) => ({
        name: kw.keyword,
        volume: kw.volume,
        difficulty: kw.kd,
        opportunity: kw.kd < 50 ? 'High' : kw.kd < 70 ? 'Medium' : 'Low'
      })) || []
    },
    {
      category: 'Intent Phrases',
      items: stepData.intentPhrases?.map((phrase: any) => ({
        name: phrase.phrase,
        relevance: phrase.relevanceScore,
        trend: phrase.trend,
        sources: phrase.sources.join(', ')
      })) || []
    },
    {
      category: 'Model Performance',
      items: stepData.llmResults?.reduce((acc: any[], result: any) => {
        const existing = acc.find(item => item.model === result.model);
        if (existing) {
          existing.avgConfidence = Math.round((existing.avgConfidence + result.confidence) / 2);
          existing.responses += 1;
        } else {
          acc.push({
            model: result.model,
            avgConfidence: result.confidence,
            responses: 1,
            topSource: result.sources[0]
          });
        }
        return acc;
      }, []) || []
    }
  ];

  const recommendations = [
    {
      priority: 'High',
      type: 'Content Optimization',
      description: 'Focus on creating intent-driven content for high-volume, low-competition keywords',
      impact: 'Could increase organic traffic by 35-50%'
    },
    {
      priority: 'High',
      type: 'Competitor Analysis',
      description: 'Target competitor content gaps identified in LLM analysis',
      impact: 'Potential to capture 20-30% market share in identified niches'
    },
    {
      priority: 'Medium',
      type: 'Technical SEO',
      description: 'Improve page load speed and mobile optimization for better rankings',
      impact: 'Expected 10-15% improvement in search visibility'
    },
    {
      priority: 'Low',
      type: 'Long-tail Strategy',
      description: 'Expand content to cover related intent phrases with lower competition',
      impact: 'Steady growth in qualified organic traffic'
    }
  ];

  const handleBackClick = async () => {
    setIsBackLoading(true);
    // Simulate loading previous LLM results
    await new Promise(resolve => setTimeout(resolve, 1000));
    onBack();
  };

  const handleDownloadReport = async () => {
    setIsLoading(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    alert('Report downloaded successfully!');
  };

  const handleDownloadPDF = () => {
    // Simulate PDF download
    alert('PDF report download started');
  };

  const handleDownloadCSV = () => {
    // Simulate CSV download
    alert('CSV data export started');
  };

  const handleScheduleReport = () => {
    alert('Report scheduling setup');
  };

  const handleSaveToDashboard = () => {
    alert('Report saved to dashboard');
    onComplete();
  };

  if (isBackLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loading Analysis Data</h2>
            <p className="text-gray-600 mb-6">Retrieving your LLM analysis results from our secure servers</p>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center">
                <i className="ri-brain-line w-5 h-5 flex items-center justify-center text-purple-500 mr-3"></i>
                <span className="text-purple-800 text-sm">AI analysis data secured with enterprise encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Generating Comprehensive Report</h2>
          
          <div className="space-y-4 mb-8">
            {reportSections.map((section, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-check-line w-4 h-4 flex items-center justify-center"></i>
                  </div>
                  <span className="font-medium text-gray-900">{section.name}</span>
                </div>
                <span className="text-green-600 text-sm font-medium">Completed</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 rounded-full animate-spin border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">Compiling final report with charts and visualizations...</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm mx-auto">
              <span className="text-blue-800 text-sm">Estimated completion: 30 seconds</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Analysis Report & Score</h2>
              <p className="text-gray-600 mt-1">Domain: {stepData.domain} | Target: {stepData.targetCountry}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer"
              >
                <i className="ri-file-pdf-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Download PDF
              </button>
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer"
              >
                <i className="ri-download-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Export CSV
              </button>
              <button
                onClick={handleScheduleReport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer"
              >
                <i className="ri-calendar-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Schedule
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Overall Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{overallScore}</div>
                  <div className="text-blue-100 text-lg font-medium">Overall Score</div>
                  <div className="mt-4">
                    <div className="w-full bg-blue-400/30 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${overallScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFormula(!showFormula)}
                    className="mt-3 text-blue-100 text-sm hover:text-white cursor-pointer"
                  >
                    <i className="ri-information-line w-4 h-4 flex items-center justify-center mr-1 inline-block"></i>
                    View Formula
                  </button>
                </div>
              </div>

              {showFormula && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Score Breakdown</h4>
                  <div className="space-y-2">
                    {Object.values(scoreBreakdown).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="text-gray-900 font-medium">{item.weight}% × {item.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    Normalized weighted average with industry benchmarks
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(scoreBreakdown).map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                      <span className="text-sm text-gray-500">{item.weight}%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className={`h-2 rounded-full ${
                            item.score >= 80 ? 'bg-green-500' : 
                            item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabular Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Summary</h3>
            <div className="space-y-6">
              {summaryData.map((section, sectionIdx) => (
                <div key={sectionIdx}>
                  <h4 className="font-medium text-gray-800 mb-3">{section.category}</h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            {section.category === 'Keywords' && (
                              <>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opportunity</th>
                              </>
                            )}
                            {section.category === 'Intent Phrases' && (
                              <>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phrase</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Relevance</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sources</th>
                              </>
                            )}
                            {section.category === 'Model Performance' && (
                              <>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Confidence</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Responses</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Top Source</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {section.items.map((item: any, itemIdx: number) => (
                            <tr key={itemIdx}>
                              {section.category === 'Keywords' && (
                                <>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.volume?.toLocaleString()}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.difficulty}</td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      item.opportunity === 'High' ? 'bg-green-100 text-green-800' :
                                      item.opportunity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {item.opportunity}
                                    </span>
                                  </td>
                                </>
                              )}
                              {section.category === 'Intent Phrases' && (
                                <>
                                  <td className="px-4 py-2 text-sm text-gray-900 max-w-md truncate">{item.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.relevance}</td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      item.trend === 'Rising' ? 'bg-green-100 text-green-800' :
                                      item.trend === 'Stable' ? 'bg-blue-100 text-blue-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {item.trend}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">{item.sources}</td>
                                </>
                              )}
                              {section.category === 'Model Performance' && (
                                <>
                                  <td className="px-4 py-2 text-sm text-gray-900">{item.model}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.avgConfidence}%</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.responses}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{item.topSource}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium mr-3 ${
                          rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {rec.priority} Priority
                        </span>
                        <span className="font-medium text-gray-900">{rec.type}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <p className="text-sm text-blue-600 font-medium">{rec.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Back to Results
          </button>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSaveToDashboard}
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Save to Dashboard
            </button>
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Complete Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
