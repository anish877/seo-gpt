
'use client';

import { useState, useEffect } from 'react';

interface Step2Props {
  stepData: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

interface Keyword {
  id: string;
  keyword: string;
  intent: string;
  volume: number;
  kd: number;
  competition: string;
  cpc: number;
  organic: number;
  paid: number;
  trend: string;
  position: number;
  url: string;
  updated: string;
  isCustom?: boolean;
  selected?: boolean;
}

export default function Step2Analysis({ stepData, onNext, onBack }: Step2Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isBackLoading, setIsBackLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState([
    { name: 'Deep Website Crawling', status: 'running', progress: 0, description: 'Scanning all accessible pages and content' },
    { name: 'Content Semantic Analysis', status: 'pending', progress: 0, description: 'Analyzing page content and context' },
    { name: 'Keyword Discovery Engine', status: 'pending', progress: 0, description: 'Identifying relevant search terms' },
    { name: 'Competition Research', status: 'pending', progress: 0, description: 'Analyzing competitor performance' },
    { name: 'Search Volume Calculation', status: 'pending', progress: 0, description: 'Gathering search traffic data' },
    { name: 'Intent Classification', status: 'pending', progress: 0, description: 'Categorizing user search intent' },
    { name: 'SEO Metrics Processing', status: 'pending', progress: 0, description: 'Calculating keyword difficulty scores' }
  ]);

  const [metrics, setMetrics] = useState({
    pagesAnalyzed: 0,
    avgResponseTime: 0,
    keywordsFound: 0
  });

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    competition: '',
    intent: '',
    volume: '',
    trends: '',
    date: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    keyword: true,
    intent: true,
    volume: true,
    kd: true,
    competition: true,
    cpc: true,
    organic: true,
    paid: true,
    trend: true,
    position: true,
    url: true,
    updated: true
  });

  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  useEffect(() => {
    const runAnalysis = async () => {
      const tasks = [...loadingTasks];

      for (let i = 0; i < tasks.length; i++) {
        tasks[i] = { ...tasks[i], status: 'running' };
        setLoadingTasks([...tasks]);

        for (let progress = 0; progress <= 100; progress += 25) {
          tasks[i] = { ...tasks[i], progress };
          setLoadingTasks([...tasks]);

          setMetrics(prev => ({
            pagesAnalyzed: Math.min(247, Math.floor((i * 100 + progress) * 2.47)),
            avgResponseTime: Math.max(0.8, 2.5 - (i * 100 + progress) * 0.01),
            keywordsFound: Math.min(156, Math.floor((i * 100 + progress) * 1.56))
          }));

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        tasks[i] = { ...tasks[i], status: 'completed', progress: 100 };
        setLoadingTasks([...tasks]);
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      setTimeout(() => {
        setIsLoading(false);
        setMetrics({
          pagesAnalyzed: 247,
          avgResponseTime: 1.2,
          keywordsFound: 156
        });

        const mockKeywords: Keyword[] = [
          ...stepData.customKeywords.map((kw: string, idx: number) => ({
            id: `custom-${idx}`,
            keyword: kw,
            intent: 'Informational',
            volume: Math.floor(Math.random() * 10000) + 1000,
            kd: Math.floor(Math.random() * 100),
            competition: 'Medium',
            cpc: Math.random() * 5 + 0.5,
            organic: Math.floor(Math.random() * 1000),
            paid: Math.floor(Math.random() * 500),
            trend: 'Rising',
            position: Math.floor(Math.random() * 50) + 1,
            url: `https://${stepData.domain}/page-${idx + 1}`,
            updated: '2024-01-15',
            isCustom: true,
            selected: false
          })),
          {
            id: '1',
            keyword: 'web development services',
            intent: 'Commercial',
            volume: 8900,
            kd: 67,
            competition: 'High',
            cpc: 4.25,
            organic: 1200,
            paid: 890,
            trend: 'Rising',
            position: 12,
            url: `https://${stepData.domain}/services`,
            updated: '2024-01-15',
            selected: false
          },
          {
            id: '2',
            keyword: 'responsive web design',
            intent: 'Informational',
            volume: 12500,
            kd: 45,
            competition: 'Medium',
            cpc: 2.80,
            organic: 2100,
            paid: 650,
            trend: 'Stable',
            position: 8,
            url: `https://${stepData.domain}/portfolio`,
            updated: '2024-01-14',
            selected: false
          },
          {
            id: '3',
            keyword: 'mobile app development',
            intent: 'Commercial',
            volume: 6700,
            kd: 72,
            competition: 'High',
            cpc: 6.15,
            organic: 980,
            paid: 1200,
            trend: 'Rising',
            position: 15,
            url: `https://${stepData.domain}/mobile`,
            updated: '2024-01-13',
            selected: false
          },
          {
            id: '4',
            keyword: 'ecommerce solutions',
            intent: 'Commercial',
            volume: 4500,
            kd: 58,
            competition: 'Medium',
            cpc: 3.90,
            organic: 750,
            paid: 420,
            trend: 'Declining',
            position: 22,
            url: `https://${stepData.domain}/ecommerce`,
            updated: '2024-01-12',
            selected: false
          }
        ];

        setKeywords(mockKeywords);
      }, 1000);
    };

    runAnalysis();
  }, [stepData]);

  const handleBackClick = async () => {
    setIsBackLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onBack();
  };

  const handleKeywordSelect = (keywordId: string) => {
    if (selectedKeywords.includes(keywordId)) {
      setSelectedKeywords(prev => prev.filter(id => id !== keywordId));
    } else if (selectedKeywords.length < 5) {
      setSelectedKeywords(prev => [...prev, keywordId]);
    }
  };

  const handleNext = () => {
    if (selectedKeywords.length === 0) {
      alert('Please select at least one keyword');
      return;
    }

    const selectedKeywordData = keywords.filter(kw => selectedKeywords.includes(kw.id));
    onNext({ ...stepData, selectedKeywords: selectedKeywordData });
  };

  const handleAddCustomKeyword = async () => {
    if (!newKeyword.trim()) return;

    setIsAddingKeyword(true);

    setTimeout(() => {
      const customKeyword: Keyword = {
        id: `custom-new-${Date.now()}`,
        keyword: newKeyword.trim(),
        intent: ['Informational', 'Commercial', 'Transactional'][Math.floor(Math.random() * 3)],
        volume: Math.floor(Math.random() * 10000) + 1000,
        kd: Math.floor(Math.random() * 100),
        competition: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        cpc: Math.random() * 5 + 0.5,
        organic: Math.floor(Math.random() * 1000),
        paid: Math.floor(Math.random() * 500),
        trend: ['Rising', 'Stable', 'Declining'][Math.floor(Math.random() * 3)],
        position: Math.floor(Math.random() * 50) + 1,
        url: `https://${stepData.domain}/custom-page`,
        updated: new Date().toISOString().split('T')[0],
        isCustom: true,
        selected: false
      };

      setKeywords(prev => [customKeyword, ...prev]);
      setNewKeyword('');
      setShowAddKeyword(false);
      setIsAddingKeyword(false);
    }, 2000);
  };

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompetition = !filters.competition || keyword.competition === filters.competition;
    const matchesIntent = !filters.intent || keyword.intent === filters.intent;
    return matchesSearch && matchesCompetition && matchesIntent;
  });

  if (isBackLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Fetching Your Data</h2>
            <p className="text-gray-600 mb-6">Retrieving your saved configuration from our secure cloud servers</p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center">
                <i className="ri-shield-check-line w-5 h-5 flex items-center justify-center text-green-500 mr-3"></i>
                <span className="text-green-800 text-sm">Your data is secured with 256-bit encryption</span>
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Content Analysis in Progress</h2>

          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Analyzing: {stepData.domain}</span>
              <span className="text-sm text-blue-600">{stepData.targetCountry}</span>
            </div>
            {stepData.customKeywords.length > 0 && (
              <div className="text-sm text-blue-700">
                Focus Keywords: {stepData.customKeywords.join(', ')}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.pagesAnalyzed}</div>
              <div className="text-sm text-gray-600">Pages Analyzed</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.avgResponseTime.toFixed(1)}s</div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.keywordsFound}</div>
              <div className="text-sm text-gray-600">Keywords Found</div>
            </div>
          </div>

          <div className="space-y-4">
            {loadingTasks.map((task, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div
                      className={`w-3 h-3 rounded-full mr-3 ${
                        task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                      }`}
                    ></div>
                    <div>
                      <span className="font-medium">{task.name}</span>
                      <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                    </div>
                  </div>
                  <span className={`text-sm capitalize ${
                    task.status === 'completed' ? 'text-green-600' :
                      task.status === 'running' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {task.status === 'completed' ? 'Completed' :
                     task.status === 'running' ? 'Processing' : 'Queued'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'running' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
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
            <h2 className="text-2xl font-semibold text-gray-900">Keyword Analysis & Selection</h2>
            <div className="text-sm text-gray-500">
              {selectedKeywords.length}/5 keywords selected
            </div>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-blue-800">Add Custom Keywords</h3>
                <p className="text-sm text-blue-600">Add specific keywords you want to analyze beyond the automatically discovered ones</p>
              </div>
              <button
                onClick={() => setShowAddKeyword(!showAddKeyword)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Add Keyword
              </button>
            </div>

            {showAddKeyword && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Enter a keyword to analyze (e.g., digital marketing strategy)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={isAddingKeyword}
                    />
                  </div>
                  <button
                    onClick={handleAddCustomKeyword}
                    disabled={!newKeyword.trim() || isAddingKeyword}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap cursor-pointer"
                  >
                    {isAddingKeyword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <i className="ri-search-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                        Analyze
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddKeyword(false);
                      setNewKeyword('');
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="bg-white border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <i className="ri-information-line w-4 h-4 flex items-center justify-center text-blue-500 mr-2"></i>
                    <p className="text-sm text-blue-700">
                      New keywords will be analyzed for volume, competition, and ranking potential. This may take a few moments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm mt-3">
              <span className="text-blue-700">
                Custom keywords added: {keywords.filter(k => k.isCustom).length}
              </span>
              <span className="text-blue-600">
                Original keywords from Step 1: {stepData.customKeywords?.length || 0}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />

              <select
                value={filters.competition}
                onChange={(e) => setFilters(prev => ({ ...prev, competition: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
              >
                <option value="">All Competition</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <select
                value={filters.intent}
                onChange={(e) => setFilters(prev => ({ ...prev, intent: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
              >
                <option value="">All Intent</option>
                <option value="Informational">Informational</option>
                <option value="Commercial">Commercial</option>
                <option value="Transactional">Transactional</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowColumns(!showColumns)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer"
              >
                <i className="ri-layout-column-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Columns
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-download-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                Export
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-code-line w-4 h-4 flex items-center justify-center mr-2 inline-block"></i>
                API
              </button>
            </div>
          </div>

          {selectedKeywords.length >= 5 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">Maximum 5 keywords can be selected. Remove some to select others.</p>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                {visibleColumns.keyword && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>}
                {visibleColumns.intent && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent</th>}
                {visibleColumns.volume && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>}
                {visibleColumns.kd && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KD</th>}
                {visibleColumns.competition && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competition</th>}
                {visibleColumns.cpc && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPC</th>}
                {visibleColumns.organic && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organic</th>}
                {visibleColumns.paid && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>}
                {visibleColumns.trend && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>}
                {visibleColumns.position && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>}
                {visibleColumns.url && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>}
                {visibleColumns.updated && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredKeywords.map((keyword) => (
                <tr key={keyword.id} className={`hover:bg-gray-50 ${keyword.isCustom ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedKeywords.includes(keyword.id)}
                      onChange={() => handleKeywordSelect(keyword.id)}
                      disabled={!selectedKeywords.includes(keyword.id) && selectedKeywords.length >= 5}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  {visibleColumns.keyword && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span className={`text-sm ${keyword.isCustom ? 'font-medium text-blue-900' : 'text-gray-900'}`}>
                          {keyword.keyword}
                        </span>
                        {keyword.isCustom && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Custom</span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.intent && <td className="px-4 py-3 text-sm text-gray-600">{keyword.intent}</td>}
                  {visibleColumns.volume && <td className="px-4 py-3 text-sm text-gray-900">{keyword.volume.toLocaleString()}</td>}
                  {visibleColumns.kd && <td className="px-4 py-3 text-sm text-gray-900">{keyword.kd}</td>}
                  {visibleColumns.competition && (
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          keyword.competition === 'High' ? 'bg-red-100 text-red-800' :
                            keyword.competition === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                        }`}
                      >
                        {keyword.competition}
                      </span>
                    </td>
                  )}
                  {visibleColumns.cpc && <td className="px-4 py-3 text-sm text-gray-900">${keyword.cpc.toFixed(2)}</td>}
                  {visibleColumns.organic && <td className="px-4 py-3 text-sm text-gray-900">{keyword.organic}</td>}
                  {visibleColumns.paid && <td className="px-4 py-3 text-sm text-gray-900">{keyword.paid}</td>}
                  {visibleColumns.trend && (
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <i
                          className={`ri-arrow-${keyword.trend === 'Rising' ? 'up' : keyword.trend === 'Declining' ? 'down' : 'right'}-line w-4 h-4 flex items-center justify-center mr-1 ${
                            keyword.trend === 'Rising' ? 'text-green-500' : keyword.trend === 'Declining' ? 'text-red-500' : 'text-gray-500'
                          }`}
                        ></i>
                        <span className="text-sm text-gray-600">{keyword.trend}</span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.position && <td className="px-4 py-3 text-sm text-gray-900">#{keyword.position}</td>}
                  {visibleColumns.url && (
                    <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800">
                      <a href={keyword.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-xs block cursor-pointer">
                        {keyword.url}
                      </a>
                    </td>
                  )}
                  {visibleColumns.updated && <td className="px-4 py-3 text-sm text-gray-500">{keyword.updated}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Back to Setup
          </button>

          <div className="flex items-center space-x-4">
            {selectedKeywords.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <span className="text-green-800 text-sm font-medium">Ready to Generate Intent Phrases</span>
              </div>
            )}
            <button
              onClick={handleNext}
              disabled={selectedKeywords.length === 0}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
            >
              Finalize Keywords
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
