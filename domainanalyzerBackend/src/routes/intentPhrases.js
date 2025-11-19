"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../generated/prisma");
const auth_1 = require("../middleware/auth");
const intentPhraseService_1 = __importDefault(require("../services/intentPhraseService"));
const domain_1 = require("./domain");
const router = (0, express_1.Router)();
const prisma = new prisma_1.PrismaClient();
// POST /api/intent-phrases/:domainId/stream - Stream AI-powered intent phrase generation with selected keywords
router.post('/:domainId/stream', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    const { keywords: selectedKeywordTerms, domainContext, location } = req.body;
    if (!domainId) {
        return res.status(400).json({ error: 'Invalid domainId' });
    }
    console.log('Received request:', { domainId, selectedKeywordTerms, domainContext, location });
    if (!selectedKeywordTerms || !Array.isArray(selectedKeywordTerms) || selectedKeywordTerms.length === 0) {
        console.log('No keywords provided, will use fallback');
        // Don't return error, let the fallback logic handle it
    }
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, url: true, context: true, location: true, userId: true }
        });
        if (!domain || domain.userId !== authReq.user.userId) {
            sendEvent('error', { error: 'Access denied' });
            res.end();
            return;
        }
        // Get selected keywords from database that match the provided terms
        let keywords = await prisma.keyword.findMany({
            where: {
                domainId,
                isSelected: true,
                ...(selectedKeywordTerms && selectedKeywordTerms.length > 0 && { term: { in: selectedKeywordTerms } })
            },
            orderBy: { volume: 'desc' },
            select: { id: true, term: true, volume: true }
        });
        if (keywords.length === 0) {
            // Try to get all keywords for this domain as fallback
            const allKeywords = await prisma.keyword.findMany({
                where: { domainId },
                orderBy: { volume: 'desc' },
                take: 5, // Limit to top 5 keywords
                select: { id: true, term: true, volume: true }
            });
            if (allKeywords.length === 0) {
                sendEvent('error', { error: 'No keywords found for this domain' });
                res.end();
                return;
            }
            // Use all keywords as fallback
            keywords = allKeywords;
            console.log('Using fallback keywords:', keywords);
        }
        // Check if generation is already in progress
        const existingGeneration = await prisma.intentPhraseGeneration.findFirst({
            where: { domainId, status: 'running' }
        });
        if (existingGeneration) {
            sendEvent('error', { error: 'Intent phrase generation already in progress' });
            res.end();
            return;
        }
        // Create generation record
        await prisma.intentPhraseGeneration.create({
            data: {
                domainId,
                phase: 'semantic_analysis',
                status: 'running',
                progress: 0
            }
        });
        // Initialize progress tracking
        let currentPhase = 'semantic_analysis';
        let phaseProgress = 0;
        const phases = [
            'semantic_analysis',
            'community_mining',
            'competitor_analysis',
            'search_patterns',
            'phrase_generation',
            'intent_classification',
            'relevance_scoring'
        ];
        const progressCallback = (progress) => {
            // Update generation record
            prisma.intentPhraseGeneration.updateMany({
                where: { domainId, phase: progress.phase },
                data: {
                    status: progress.progress === 100 ? 'completed' : 'running',
                    progress: progress.progress,
                    result: progress.data
                }
            }).catch(console.error);
            // Send progress event
            sendEvent('progress', {
                phase: progress.phase,
                step: progress.step,
                progress: progress.progress,
                message: progress.message,
                data: progress.data
            });
            // Update overall progress
            if (progress.phase !== currentPhase) {
                currentPhase = progress.phase;
                phaseProgress = phases.indexOf(currentPhase);
            }
        };
        // Callback for when phrases are generated
        const phraseGeneratedCallback = (phrase) => {
            sendEvent('phrase', phrase);
        };
        // Create domain object with context from request
        const domainObj = {
            ...domain,
            context: domainContext || domain.context || '',
            location: location || domain.location || 'Global'
        };
        // Start AI-powered generation
        const intentPhraseService = new intentPhraseService_1.default(domainId, keywords, domainObj, progressCallback, phraseGeneratedCallback);
        try {
            const phrases = await intentPhraseService.generateIntentPhrases();
            // Send completion event
            sendEvent('complete', {
                message: 'Intent phrase generation completed successfully',
                totalPhrases: phrases.length,
                phases: phases.length
            });
            // Update final status
            await prisma.intentPhraseGeneration.updateMany({
                where: { domainId },
                data: {
                    status: 'completed',
                    progress: 100,
                    endTime: new Date()
                }
            });
        }
        catch (error) {
            console.error('Intent phrase generation error:', error);
            // Update error status
            await prisma.intentPhraseGeneration.updateMany({
                where: { domainId },
                data: {
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    endTime: new Date()
                }
            });
            sendEvent('error', {
                error: 'Intent phrase generation failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        res.end();
    }
    catch (error) {
        console.error('Error in intent phrase generation:', error);
        sendEvent('error', {
            error: 'Failed to start intent phrase generation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        res.end();
    }
});
// GET /api/intent-phrases/:domainId - Get generated intent phrases
router.get('/:domainId', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    if (!domainId) {
        return res.status(400).json({ error: 'Invalid domainId' });
    }
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, userId: true }
        });
        if (!domain || domain.userId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Get generated phrases with keyword information
        const phrases = await prisma.generatedIntentPhrase.findMany({
            where: { domainId },
            include: {
                keyword: {
                    select: { term: true, volume: true }
                },
                relevanceScoreResults: {
                    select: { score: true, breakdown: true }
                }
            },
            orderBy: { relevanceScore: 'desc' }
        });
        // Group phrases by keyword
        const groupedPhrases = phrases.reduce((acc, phrase) => {
            const keyword = phrase.keyword?.term || 'Unknown';
            if (!acc[keyword]) {
                acc[keyword] = [];
            }
            acc[keyword].push({
                id: phrase.id,
                phrase: phrase.phrase,
                relevanceScore: phrase.relevanceScore,
                sources: phrase.sources,
                trend: phrase.trend,
                intent: phrase.intent,
                isSelected: phrase.isSelected,
                communityInsights: phrase.communityInsights,
                searchPatterns: phrase.searchPatterns
            });
            return acc;
        }, {});
        res.json({
            success: true,
            phrases: groupedPhrases,
            totalPhrases: phrases.length,
            totalKeywords: Object.keys(groupedPhrases).length
        });
    }
    catch (error) {
        console.error('Error fetching intent phrases:', error);
        res.status(500).json({ error: 'Failed to fetch intent phrases' });
    }
});
// POST /api/intent-phrases/:domainId/select - Select/deselect phrases
router.post('/:domainId/select', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    const { selectedPhrases } = req.body;
    console.log('Select phrases request:', { domainId, selectedPhrases, userId: authReq.user?.userId });
    if (!domainId || !selectedPhrases || !Array.isArray(selectedPhrases)) {
        return res.status(400).json({ error: 'DomainId and selectedPhrases array are required' });
    }
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, userId: true }
        });
        console.log('Domain found:', domain);
        if (!domain || domain.userId !== authReq.user.userId) {
            console.log('Access denied:', { domainUserId: domain?.userId, requestUserId: authReq.user.userId });
            return res.status(403).json({ error: 'Access denied' });
        }
        console.log('Saving selected phrases:', { domainId, selectedPhrases });
        // First, unselect all phrases for this domain
        const unselectResult = await prisma.generatedIntentPhrase.updateMany({
            where: {
                domainId: domainId
            },
            data: {
                isSelected: false
            }
        });
        console.log('Unselected phrases count:', unselectResult.count);
        // Then select the specified phrases
        const updatePromises = selectedPhrases.map(async (phraseId) => {
            const id = typeof phraseId === 'string' ? parseInt(phraseId) : phraseId;
            // Check if the parsed ID is valid
            if (isNaN(id)) {
                console.log(`Invalid phrase ID: ${phraseId} - cannot parse as number`);
                return null; // Skip invalid IDs
            }
            console.log('Selecting phrase with ID:', id);
            // First verify the phrase exists and belongs to this domain
            const existingPhrase = await prisma.generatedIntentPhrase.findFirst({
                where: {
                    id: id,
                    domainId: domainId
                }
            });
            if (!existingPhrase) {
                console.log(`Phrase with ID ${id} not found or doesn't belong to domain ${domainId}`);
                return null; // Skip this phrase
            }
            return prisma.generatedIntentPhrase.update({
                where: { id },
                data: { isSelected: true }
            });
        });
        const updateResults = await Promise.all(updatePromises);
        const successfulUpdates = updateResults.filter(result => result !== null);
        console.log('Updated phrases count:', successfulUpdates.length);
        if (successfulUpdates.length > 0) {
            await (0, domain_1.advanceDomainStep)(domainId, 3);
        }
        res.json({
            success: true,
            message: `Successfully selected ${successfulUpdates.length} phrases`,
            selectedCount: successfulUpdates.length,
            requestedCount: selectedPhrases.length,
            skippedCount: selectedPhrases.length - successfulUpdates.length
        });
    }
    catch (error) {
        console.error('Error updating phrase selection:', error);
        res.status(500).json({ error: 'Failed to update phrase selection' });
    }
});
// PUT /api/intent-phrases/:phraseId - Update phrase text
router.put('/:phraseId', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const phraseId = Number(req.params.phraseId);
    const { phrase: newPhraseText, relevanceScore } = req.body;
    if (!phraseId || !newPhraseText) {
        return res.status(400).json({ error: 'Phrase ID and new text are required' });
    }
    try {
        // First verify the phrase exists and belongs to a domain owned by this user
        const existingPhrase = await prisma.generatedIntentPhrase.findFirst({
            where: {
                id: phraseId
            },
            include: {
                domain: {
                    select: { userId: true }
                }
            }
        });
        if (!existingPhrase) {
            return res.status(404).json({ error: 'Phrase not found' });
        }
        if (existingPhrase.domain.userId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Update the phrase
        const updatedPhrase = await prisma.generatedIntentPhrase.update({
            where: { id: phraseId },
            data: {
                phrase: newPhraseText,
                relevanceScore: relevanceScore || existingPhrase.relevanceScore
            }
        });
        res.json({
            success: true,
            message: 'Phrase updated successfully',
            phrase: updatedPhrase
        });
    }
    catch (error) {
        console.error('Error updating phrase:', error);
        res.status(500).json({ error: 'Failed to update phrase' });
    }
});
// GET /api/intent-phrases/:domainId/status - Get generation status
router.get('/:domainId/status', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    if (!domainId) {
        return res.status(400).json({ error: 'Invalid domainId' });
    }
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, userId: true }
        });
        if (!domain || domain.userId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Get generation status
        const generations = await prisma.intentPhraseGeneration.findMany({
            where: { domainId },
            orderBy: { createdAt: 'desc' }
        });
        const phases = [
            'semantic_analysis',
            'community_mining',
            'search_patterns',
            'intent_classification',
            'relevance_scoring',
            'phrase_generation'
        ];
        const status = phases.map(phase => {
            const generation = generations.find(g => g.phase === phase);
            return {
                phase,
                status: generation?.status || 'pending',
                progress: generation?.progress || 0,
                startTime: generation?.startTime,
                endTime: generation?.endTime,
                error: generation?.error
            };
        });
        const isRunning = status.some(s => s.status === 'running');
        const isCompleted = status.every(s => s.status === 'completed');
        const hasError = status.some(s => s.status === 'failed');
        res.json({
            success: true,
            status,
            isRunning,
            isCompleted,
            hasError,
            totalPhases: phases.length,
            completedPhases: status.filter(s => s.status === 'completed').length
        });
    }
    catch (error) {
        console.error('Error fetching generation status:', error);
        res.status(500).json({ error: 'Failed to fetch generation status' });
    }
});
// POST /api/intent-phrases/analyze - Analyze a single phrase using AI
router.post('/analyze', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const { phrase, domain, location, domainId } = req.body;
    if (!phrase || !domain) {
        return res.status(400).json({ error: 'Phrase and domain are required' });
    }
    try {
        // First, analyze the phrase using AI directly instead of HTTP request
        let analysisResult;
        try {
            // Import OpenAI dynamically to avoid circular dependencies
            const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OPENAI_API_KEY is not set');
            const openai = new OpenAI({ apiKey });
            // Get domain context if domainId is provided
            let domainContext = '';
            try {
                const domainRecord = await prisma.domain.findUnique({
                    where: { id: domainId },
                    select: { context: true, locationContext: true }
                });
                if (domainRecord?.context) {
                    domainContext = domainRecord.context;
                }
            }
            catch (error) {
                console.warn('Could not fetch domain context:', error);
            }
            // Create comprehensive AI analysis prompt for phrases
            const analysisPrompt = `
You are an expert SEO analyst and search behavior specialist. Analyze the search phrase "${phrase}" for the domain ${domain.url}.

Domain Context: ${domainContext || 'No specific context provided'}
Location: Global

Please provide a comprehensive analysis with the following data:

1. **Primary Keyword**: Extract the main keyword from this phrase
2. **Search Intent**: Informational, Commercial, Transactional, or Navigational
3. **Relevance Score**: Score from 0-100 based on how relevant this phrase is to the domain
4. **Search Volume**: Estimate monthly search volume (realistic numbers)
5. **Competition Level**: Low, Medium, or High
6. **Trend**: Rising, Stable, or Declining
7. **Word Count**: Number of words in the phrase
8. **Search Pattern**: Type of search pattern (question, comparison, local, etc.)
9. **User Intent**: What the user is trying to accomplish
10. **Content Type**: What type of content would best answer this search

Consider the following factors:
- Phrase length and specificity
- User search behavior patterns
- Commercial intent and monetization potential
- Location-specific factors if applicable
- Domain relevance and content alignment
- Search engine optimization potential

Return ONLY a JSON object with this exact structure:
{
  "phrase": "exact phrase as provided",
  "primaryKeyword": "main keyword extracted",
  "relevanceScore": 85,
  "intent": "Informational",
  "searchVolume": 1200,
  "competition": "Medium",
  "trend": "Stable",
  "wordCount": 8,
  "searchPattern": "question",
  "userIntent": "User wants to learn about the topic",
  "contentType": "how-to guide",
  "analysis": "Brief analysis of phrase potential and strategy"
}
`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: analysisPrompt }],
                temperature: 0.3,
                max_tokens: 1000
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from AI analysis');
            }
            try {
                // Clean the response to remove markdown formatting
                let cleanResponse = response.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                }
                else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                const parsedResult = JSON.parse(cleanResponse);
                // Validate and ensure all required fields are present
                analysisResult = {
                    phrase: parsedResult.phrase || phrase,
                    primaryKeyword: parsedResult.primaryKeyword || phrase.split(' ')[0],
                    relevanceScore: parsedResult.relevanceScore || 75,
                    intent: parsedResult.intent || 'Informational',
                    searchVolume: parsedResult.searchVolume || 500,
                    competition: parsedResult.competition || 'Medium',
                    trend: parsedResult.trend || 'Stable',
                    wordCount: parsedResult.wordCount || phrase.trim().split(/\s+/).length,
                    searchPattern: parsedResult.searchPattern || 'general',
                    userIntent: parsedResult.userIntent || 'User is searching for information',
                    contentType: parsedResult.contentType || 'general content',
                    analysis: parsedResult.analysis || 'AI analysis completed successfully',
                    tokenUsage: completion.usage?.total_tokens || 0
                };
            }
            catch (parseError) {
                console.error('Error parsing AI analysis response:', parseError);
                throw new Error('Failed to parse AI analysis response');
            }
        }
        catch (aiError) {
            console.error('AI analysis failed:', aiError);
            // Fallback to basic analysis if AI fails
            analysisResult = {
                phrase: phrase,
                primaryKeyword: phrase.split(' ')[0],
                relevanceScore: 75,
                intent: 'Informational',
                searchVolume: 500,
                competition: 'Medium',
                trend: 'Stable',
                wordCount: phrase.trim().split(/\s+/).length,
                searchPattern: 'general',
                userIntent: 'User is searching for information',
                contentType: 'general content',
                analysis: 'Basic analysis (AI analysis failed)',
                tokenUsage: 0
            };
        }
        res.json({
            success: true,
            ...analysisResult
        });
    }
    catch (error) {
        console.error('Phrase analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze phrase with AI',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/intent-phrases/:domainId/custom - Add custom intent phrase with AI analysis
router.post('/:domainId/custom', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    const { phrase, keywordId, relevanceScore, intent, sources, trend } = req.body;
    if (!domainId || !phrase) {
        return res.status(400).json({ error: 'DomainId and phrase are required' });
    }
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, userId: true, url: true }
        });
        if (!domain || domain.userId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // First, analyze the phrase using AI directly instead of HTTP request
        let analysisResult;
        try {
            // Import OpenAI dynamically to avoid circular dependencies
            const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OPENAI_API_KEY is not set');
            const openai = new OpenAI({ apiKey });
            // Get domain context if domainId is provided
            let domainContext = '';
            try {
                const domainRecord = await prisma.domain.findUnique({
                    where: { id: domainId },
                    select: { context: true, locationContext: true }
                });
                if (domainRecord?.context) {
                    domainContext = domainRecord.context;
                }
            }
            catch (error) {
                console.warn('Could not fetch domain context:', error);
            }
            // Create comprehensive AI analysis prompt for phrases
            const analysisPrompt = `
You are an expert SEO analyst and search behavior specialist. Analyze the search phrase "${phrase}" for the domain ${domain.url}.

Domain Context: ${domainContext || 'No specific context provided'}
Location: Global

Please provide a comprehensive analysis with the following data:

1. **Primary Keyword**: Extract the main keyword from this phrase
2. **Search Intent**: Informational, Commercial, Transactional, or Navigational
3. **Relevance Score**: Score from 0-100 based on how relevant this phrase is to the domain
4. **Search Volume**: Estimate monthly search volume (realistic numbers)
5. **Competition Level**: Low, Medium, or High
6. **Trend**: Rising, Stable, or Declining
7. **Word Count**: Number of words in the phrase
8. **Search Pattern**: Type of search pattern (question, comparison, local, etc.)
9. **User Intent**: What the user is trying to accomplish
10. **Content Type**: What type of content would best answer this search

Consider the following factors:
- Phrase length and specificity
- User search behavior patterns
- Commercial intent and monetization potential
- Location-specific factors if applicable
- Domain relevance and content alignment
- Search engine optimization potential

Return ONLY a JSON object with this exact structure:
{
  "phrase": "exact phrase as provided",
  "primaryKeyword": "main keyword extracted",
  "relevanceScore": 85,
  "intent": "Informational",
  "searchVolume": 1200,
  "competition": "Medium",
  "trend": "Stable",
  "wordCount": 8,
  "searchPattern": "question",
  "userIntent": "User wants to learn about the topic",
  "contentType": "how-to guide",
  "analysis": "Brief analysis of phrase potential and strategy"
}
`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: analysisPrompt }],
                temperature: 0.3,
                max_tokens: 1000
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from AI analysis');
            }
            try {
                // Clean the response to remove markdown formatting
                let cleanResponse = response.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                }
                else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                const parsedResult = JSON.parse(cleanResponse);
                // Validate and ensure all required fields are present
                analysisResult = {
                    phrase: parsedResult.phrase || phrase,
                    primaryKeyword: parsedResult.primaryKeyword || phrase.split(' ')[0],
                    relevanceScore: parsedResult.relevanceScore || 75,
                    intent: parsedResult.intent || 'Informational',
                    searchVolume: parsedResult.searchVolume || 500,
                    competition: parsedResult.competition || 'Medium',
                    trend: parsedResult.trend || 'Stable',
                    wordCount: parsedResult.wordCount || phrase.trim().split(/\s+/).length,
                    searchPattern: parsedResult.searchPattern || 'general',
                    userIntent: parsedResult.userIntent || 'User is searching for information',
                    contentType: parsedResult.contentType || 'general content',
                    analysis: parsedResult.analysis || 'AI analysis completed successfully',
                    tokenUsage: completion.usage?.total_tokens || 0
                };
            }
            catch (parseError) {
                console.error('Error parsing AI analysis response:', parseError);
                throw new Error('Failed to parse AI analysis response');
            }
        }
        catch (aiError) {
            console.error('AI analysis failed:', aiError);
            // Fallback to basic analysis if AI fails
            analysisResult = {
                phrase: phrase,
                primaryKeyword: phrase.split(' ')[0],
                relevanceScore: 75,
                intent: 'Informational',
                searchVolume: 500,
                competition: 'Medium',
                trend: 'Stable',
                wordCount: phrase.trim().split(/\s+/).length,
                searchPattern: 'general',
                userIntent: 'User is searching for information',
                contentType: 'general content',
                analysis: 'Basic analysis (AI analysis failed)',
                tokenUsage: 0
            };
        }
        // Find the best matching keyword for this phrase
        let bestKeywordId = keywordId;
        if (!bestKeywordId) {
            const keywords = await prisma.keyword.findMany({
                where: { domainId: domainId },
                select: { id: true, term: true }
            });
            // Find keyword that best matches the primary keyword from analysis
            const primaryKeyword = analysisResult.primaryKeyword?.toLowerCase();
            const bestMatch = keywords.find(kw => kw.term.toLowerCase().includes(primaryKeyword) ||
                primaryKeyword?.includes(kw.term.toLowerCase()));
            if (bestMatch) {
                bestKeywordId = bestMatch.id;
            }
        }
        // Verify keyword exists and belongs to this domain
        if (bestKeywordId) {
            const keyword = await prisma.keyword.findFirst({
                where: {
                    id: bestKeywordId,
                    domainId: domainId
                }
            });
            if (!keyword) {
                bestKeywordId = null; // Reset if keyword not found
            }
        }
        // Create the custom phrase with AI analysis results
        const newPhrase = await prisma.generatedIntentPhrase.create({
            data: {
                domainId: domainId,
                keywordId: bestKeywordId,
                phrase: analysisResult.phrase,
                relevanceScore: analysisResult.relevanceScore,
                intent: analysisResult.intent,
                sources: sources || ['Custom Input', 'AI Analysis'],
                trend: analysisResult.trend,
                isSelected: false
            }
        });
        res.json({
            success: true,
            message: 'Custom phrase analyzed and added successfully',
            phrase: {
                id: newPhrase.id,
                phrase: newPhrase.phrase,
                relevanceScore: newPhrase.relevanceScore,
                intent: newPhrase.intent,
                sources: newPhrase.sources,
                trend: newPhrase.trend,
                keywordId: newPhrase.keywordId,
                isSelected: newPhrase.isSelected,
                analysis: analysisResult.analysis,
                primaryKeyword: analysisResult.primaryKeyword,
                searchVolume: analysisResult.searchVolume,
                competition: analysisResult.competition,
                wordCount: analysisResult.wordCount,
                searchPattern: analysisResult.searchPattern,
                userIntent: analysisResult.userIntent,
                contentType: analysisResult.contentType
            }
        });
    }
    catch (error) {
        console.error('Error adding custom phrase:', error);
        res.status(500).json({ error: 'Failed to add custom phrase' });
    }
});
exports.default = router;
// POST /api/intent-phrases/:domainId/analyze-custom - Analyze custom phrase and create keyword if needed
router.post('/:domainId/analyze-custom', auth_1.authenticateToken, async (req, res) => {
    const authReq = req;
    const domainId = Number(req.params.domainId);
    const { phrase } = req.body;
    if (!domainId || !phrase) {
        return res.status(400).json({ error: 'DomainId and phrase are required' });
    }
    try {
        // Verify domain access
        const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { id: true, userId: true, url: true, context: true, locationContext: true }
        });
        if (!domain || domain.userId !== authReq.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Analyze the phrase using AI to extract keyword and metrics
        let analysisResult;
        try {
            // Import OpenAI dynamically to avoid circular dependencies
            const { default: OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OPENAI_API_KEY is not set');
            const openai = new OpenAI({ apiKey });
            const domainContext = domain.context || domain.locationContext || '';
            // Create comprehensive AI analysis prompt for phrases
            const analysisPrompt = `
You are an expert SEO analyst and search behavior specialist. Analyze the search phrase "${phrase}" for the domain ${domain.url}.

Domain Context: ${domainContext || 'No specific context provided'}
Location: Global

Please provide a comprehensive analysis with the following data:

1. **Primary Keyword**: Extract the main keyword from this phrase
2. **Search Intent**: Informational, Commercial, Transactional, or Navigational
3. **Relevance Score**: Score from 0-100 based on how relevant this phrase is to the domain
4. **Search Volume**: Estimate monthly search volume (realistic numbers)
5. **Competition Level**: Low, Medium, or High
6. **Trend**: Rising, Stable, or Declining
7. **Word Count**: Number of words in the phrase
8. **Search Pattern**: Type of search pattern (question, comparison, local, etc.)
9. **User Intent**: What the user is trying to accomplish
10. **Content Type**: What type of content would best answer this search

Consider the following factors:
- Phrase length and specificity
- User search behavior patterns
- Commercial intent and monetization potential
- Location-specific factors if applicable
- Domain relevance and content alignment
- Search engine optimization potential

Return ONLY a JSON object with this exact structure:
{
  "phrase": "exact phrase as provided",
  "primaryKeyword": "main keyword extracted",
  "relevanceScore": 85,
  "intent": "Informational",
  "searchVolume": 1200,
  "competition": "Medium",
  "trend": "Stable",
  "wordCount": 8,
  "searchPattern": "question",
  "userIntent": "User wants to learn about the topic",
  "contentType": "how-to guide",
  "analysis": "Brief analysis of phrase potential and strategy"
}
`;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: analysisPrompt }],
                temperature: 0.3,
                max_tokens: 1000
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from AI analysis');
            }
            try {
                // Clean the response to remove markdown formatting
                let cleanResponse = response.trim();
                if (cleanResponse.startsWith('```json')) {
                    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                }
                else if (cleanResponse.startsWith('```')) {
                    cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                const parsedResult = JSON.parse(cleanResponse);
                // Validate and ensure all required fields are present
                analysisResult = {
                    phrase: parsedResult.phrase || phrase,
                    primaryKeyword: parsedResult.primaryKeyword || phrase.split(' ')[0],
                    relevanceScore: parsedResult.relevanceScore || 75,
                    intent: parsedResult.intent || 'Informational',
                    searchVolume: parsedResult.searchVolume || 500,
                    competition: parsedResult.competition || 'Medium',
                    trend: parsedResult.trend || 'Stable',
                    wordCount: parsedResult.wordCount || phrase.trim().split(/\s+/).length,
                    searchPattern: parsedResult.searchPattern || 'general',
                    userIntent: parsedResult.userIntent || 'User is searching for information',
                    contentType: parsedResult.contentType || 'general content',
                    analysis: parsedResult.analysis || 'AI analysis completed successfully',
                    tokenUsage: completion.usage?.total_tokens || 0
                };
            }
            catch (parseError) {
                console.error('Error parsing AI analysis response:', parseError);
                throw new Error('Failed to parse AI analysis response');
            }
        }
        catch (aiError) {
            console.error('AI analysis failed:', aiError);
            // Fallback to basic analysis if AI fails
            analysisResult = {
                phrase: phrase,
                primaryKeyword: phrase.split(' ')[0],
                relevanceScore: 75,
                intent: 'Informational',
                searchVolume: 500,
                competition: 'Medium',
                trend: 'Stable',
                wordCount: phrase.trim().split(/\s+/).length,
                searchPattern: 'general',
                userIntent: 'User is searching for information',
                contentType: 'general content',
                analysis: 'Basic analysis (AI analysis failed)',
                tokenUsage: 0
            };
        }
        // Check if the primary keyword already exists for this domain
        let keywordRecord = await prisma.keyword.findFirst({
            where: {
                term: analysisResult.primaryKeyword,
                domainId: domainId
            }
        });
        // If keyword doesn't exist, create it
        if (!keywordRecord) {
            keywordRecord = await prisma.keyword.create({
                data: {
                    term: analysisResult.primaryKeyword,
                    volume: analysisResult.searchVolume,
                    difficulty: analysisResult.competition,
                    cpc: 2.50, // Default CPC
                    intent: analysisResult.intent,
                    domainId: domainId,
                    isSelected: false
                }
            });
        }
        res.json({
            success: true,
            message: 'Custom phrase analyzed successfully',
            phrase: analysisResult.phrase,
            primaryKeyword: analysisResult.primaryKeyword,
            relevanceScore: analysisResult.relevanceScore,
            intent: analysisResult.intent,
            searchVolume: analysisResult.searchVolume,
            competition: analysisResult.competition,
            trend: analysisResult.trend,
            wordCount: analysisResult.wordCount,
            searchPattern: analysisResult.searchPattern,
            userIntent: analysisResult.userIntent,
            contentType: analysisResult.contentType,
            analysis: analysisResult.analysis,
            keywordId: keywordRecord.id,
            keywordCreated: !await prisma.keyword.findFirst({
                where: {
                    term: analysisResult.primaryKeyword,
                    domainId: domainId,
                    id: { lt: keywordRecord.id } // Check if this was a new keyword
                }
            })
        });
    }
    catch (error) {
        console.error('Error analyzing custom phrase:', error);
        res.status(500).json({ error: 'Failed to analyze custom phrase' });
    }
});
