# Enhanced Phrases - Prompt Analysis & Logic Flow

## Overview
This document analyzes all prompts used in each phase of the Enhanced Phrases generation flow and validates their logical consistency with the flowchart.

## Phase 1: Semantic Content Analysis

### **Main Endpoint Prompt:**
```typescript
const semanticPrompt = `
Analyze the brand voice, theme, and target audience for the domain ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}

Please provide a comprehensive analysis including:
1. Brand voice and tone characteristics
2. Target audience demographics and psychographics
3. Industry themes and positioning
4. Content style and messaging approach
5. Community and domain belonging context
6. Related FAQs and questions for the domain service

This analysis will be used to guide community data mining and phrase generation.

Format as JSON with keys: brandVoice, targetAudience, themes, contentStyle, communityContext, relatedFAQs
`;
```

### **Step3Results Endpoint Prompt (Enhanced):**
```typescript
const semanticPrompt = `
Analyze the domain context and extract comprehensive semantic insights for strategic content and community research planning.

**Domain Information:**
- URL: ${domain.url || '[URL not provided]'}
- Context: ${domain.context || '[No context provided]'}
- Location: ${domain.location || 'Global'}

**Analysis Requirements:**

Provide detailed analysis in the following areas, making reasonable inferences where direct information is limited. Clearly distinguish between observed facts and educated assumptions.

## 1. Brand Voice Analysis
Analyze and identify:
- **Tone**: Professional level, emotional approach, formality
- **Personality**: 3-5 key personality traits with examples
- **Communication Style**: How they speak to their audience
- **Brand Values**: Core principles reflected in messaging
- **Unique Voice Elements**: Distinctive communication patterns

## 2. Theme Analysis
Identify:
- **Primary Themes**: Top 3-5 content themes (with confidence scores)
- **Industry Focus**: Specific industry/sector positioning
- **Content Categories**: Types of content they likely produce
- **Seasonal/Trending Topics**: Time-sensitive themes relevant to their space
- **Content Gaps**: Potential unexplored themes in their domain

## 3. Target Audience Analysis
Profile the likely audience:
- **Demographics**: Age, location, professional background
- **Psychographics**: Interests, values, lifestyle
- **User Personas**: 2-3 distinct user types with names and descriptions
- **Pain Points**: 5-7 specific problems they face
- **Goals**: What they're trying to achieve
- **Information-Seeking Behavior**: How and where they search for solutions

## 4. FAQ and Questions Analysis
Generate likely questions:
- **Product/Service Questions**: Direct inquiries about offerings
- **Process Questions**: How-to and procedural inquiries
- **Comparison Questions**: Versus competitors or alternatives
- **Troubleshooting**: Common problems and solutions
- **Pricing/Cost**: Financial considerations
- **Implementation**: Getting started and onboarding queries

## 5. Community Context Analysis
Identify relevant communities:
- **Primary Platforms**: Top 3 platforms where target audience congregates
- **Subreddit Recommendations**: 5-7 relevant subreddits with subscriber counts
- **Quora Spaces**: Relevant Quora topics and spaces
- **Professional Communities**: LinkedIn groups, industry forums
- **Discussion Topics**: What conversations happen in these spaces
- **Engagement Patterns**: How the audience typically interacts

## 6. Search Intent Analysis
Predict search behavior:
- **Informational Queries**: Learning and research-focused searches
- **Commercial Queries**: Comparison and evaluation searches
- **Transactional Queries**: Ready-to-buy searches
- **Local Queries**: Location-specific searches (if applicable)
- **Long-tail Opportunities**: Specific, niche search phrases

## Output Format
Structure as valid JSON with this exact schema:
{
  "analysisConfidence": "high|medium|low",
  "dataLimitations": "Description of any analysis limitations",
  "brandVoice": { ... },
  "themes": { ... },
  "targetAudience": { ... },
  "faqs": { ... },
  "communityContext": { ... },
  "searchIntents": { ... },
  "recommendations": { ... }
}
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Analyzes brand voice, theme, and target audience  
✅ **Correct**: Extracts community context and FAQs  
✅ **Correct**: Sets up for data mining  
✅ **Enhanced**: Step3Results version is much more comprehensive  
❌ **Issue**: Main endpoint prompt is too basic compared to flowchart requirements  

---

## Phase 2: Community Data Mining

### **Main Endpoint Prompt:**
```typescript
const communityPrompt = `
Analyze community discussions and forums for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}

Please provide insights from community discussions including:
1. Common questions and pain points
2. Popular solutions and recommendations
3. User sentiment and preferences
4. Trending topics and discussions
5. Sources (Reddit, Quora, forums, etc.)

Format as JSON with keys: sources, summary
`;
```

### **Step3Results Endpoint Prompt (Enhanced with SERP API):**
```typescript
// Uses actual SERP API calls to Reddit and Quora
// Generates contextual search queries based on semantic analysis
// Mines real data from target communities
// Extracts actual FAQs and questions from community discussions
```

### **Logic Flow Analysis:**
✅ **Correct**: Extracts insights from Reddit and Quora  
✅ **Correct**: Gets FAQs and questions from communities  
❌ **Issue**: Main endpoint doesn't use SERP API (just AI simulation)  
❌ **Issue**: Main endpoint doesn't use semantic context from previous step  
✅ **Enhanced**: Step3Results version properly uses SERP API and semantic context  

---

## Phase 3: Competitor Research

### **Main Endpoint Prompt:**
```typescript
const competitorPrompt = `
Research competitors mentioned in community discussions for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}
Semantic Context: ${semanticContext}

Please identify and analyze competitors including:
1. Direct competitors mentioned in Reddit/Quora discussions
2. Indirect competitors and alternatives
3. Competitor strengths and weaknesses
4. Market positioning insights
5. Competitive advantages and differentiators

Format as JSON with keys: competitors, analysis, insights
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Researches competitors from community discussions  
✅ **Correct**: Uses semantic context from previous step  
✅ **Correct**: Analyzes competitive landscape  
✅ **Correct**: Extracts competitor mentions from mined data  

---

## Phase 4: Search Pattern Analysis

### **Main Endpoint Prompt:**
```typescript
const patternPrompt = `
Analyze search behavior patterns for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}

Please identify search patterns including:
1. Search intent variations (informational, navigational, transactional)
2. Common search modifiers and qualifiers
3. Seasonal and trending patterns
4. User journey patterns
5. Search volume distribution

Format as JSON with keys: patterns, summary
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Analyzes user search behaviors  
❌ **Issue**: Doesn't use community data from previous steps  
❌ **Issue**: Should analyze patterns from mined community data  
✅ **Correct**: Extracts search patterns and user questions  

---

## Phase 5: Creating Optimized Intent Phrases

### **Main Endpoint Prompt:**
```typescript
const phrasePrompt = `
Generate 3-5 optimized search phrases for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}
Semantic Context: ${semanticContext}

Requirements:
1. Include the keyword naturally
2. Target different user intents (informational, navigational, transactional)
3. Use long-tail variations
4. Include location-specific terms if relevant
5. Make them sound natural and conversational
6. Consider competitive positioning and market insights
7. Align with brand voice and target audience
8. CRITICAL: Each phrase must be exactly 8-15 words long (count words carefully)
9. Make phrases search-friendly and SEO-optimized
10. Include question formats, how-to phrases, and comparison phrases

Format as JSON array of strings.
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Generates phrases using semantic context  
❌ **Issue**: Doesn't use community data from step 2  
❌ **Issue**: Doesn't use competitor data from step 3  
❌ **Issue**: Doesn't use search patterns from step 4  
❌ **Issue**: Should use "all three above contexts" as per flowchart  
✅ **Correct**: Creates 8-15 word optimized phrases  

---

## Phase 6: Intent Classification

### **Main Endpoint Prompt:**
```typescript
const intentPrompt = `
Classify the search intent for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}

Classify into these intent categories:
1. Informational (seeking information, learning)
2. Navigational (looking for specific website/brand)
3. Transactional (ready to buy/purchase)
4. Commercial Investigation (researching before purchase)

Provide confidence score (1-100) and reasoning.

Format as JSON with keys: intent, confidence, reasoning
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Classifies generated phrases by intent  
❌ **Issue**: Classifies keywords, not generated phrases  
❌ **Issue**: Should work on phrases from step 5, not keywords  
✅ **Correct**: Categorizes by user intent  
✅ **Correct**: Assigns confidence scores  

---

## Phase 7: Relevance Score

### **Main Endpoint Prompt:**
```typescript
const relevancePrompt = `
Calculate a relevance score for the keyword "${keyword.term}" in the context of ${domain.url}.

Business Context: ${domain.context || 'No context provided'}
Location: ${domain.location || 'Global'}

Consider factors:
1. Semantic similarity to business context (30%)
2. Search volume and competition (25%)
3. User intent alignment (20%)
4. Geographic relevance (15%)
5. Trend analysis (10%)

Provide score (1-100) and breakdown.

Format as JSON with keys: score, breakdown
`;
```

### **Logic Flow Analysis:**
✅ **Correct**: Calculates relevance scores  
❌ **Issue**: Scores keywords, not generated phrases  
❌ **Issue**: Should score phrases from step 5  
✅ **Correct**: Uses multiple factors for scoring  
✅ **Correct**: Provides detailed breakdown  

---

## Critical Issues Found

### 1. **Missing Context Dependencies**
- **Phase 2**: Main endpoint doesn't use semantic context from Phase 1
- **Phase 4**: Doesn't use community data from Phase 2
- **Phase 5**: Doesn't use community, competitor, and search pattern data
- **Phase 6**: Works on keywords instead of generated phrases
- **Phase 7**: Works on keywords instead of generated phrases

### 2. **Inconsistent Data Flow**
- **Main Endpoint**: Basic prompts that don't build on previous steps
- **Step3Results Endpoint**: More comprehensive but still has gaps
- **Missing Integration**: Steps don't properly use outputs from previous steps

### 3. **Wrong Data Types**
- **Intent Classification**: Should classify phrases, not keywords
- **Relevance Scoring**: Should score phrases, not keywords
- **Search Patterns**: Should analyze patterns from community data

## Recommended Fixes

### 1. **Enhance Main Endpoint Prompts**
```typescript
// Phase 2: Use semantic context
const communityPrompt = `
Analyze community discussions for "${keyword.term}" using this semantic context: ${semanticContext}
...
`;

// Phase 4: Use community data
const patternPrompt = `
Analyze search patterns from this community data: ${communityData}
...
`;

// Phase 5: Use all three contexts
const phrasePrompt = `
Generate phrases using:
- Semantic Context: ${semanticContext}
- Community Data: ${communityData}
- Search Patterns: ${searchPatternData}
...
`;

// Phase 6: Classify generated phrases
const intentPrompt = `
Classify the intent of these generated phrases: ${generatedPhrases}
...
`;

// Phase 7: Score generated phrases
const relevancePrompt = `
Calculate relevance for these phrases: ${generatedPhrases}
...
`;
```

### 2. **Fix Data Flow**
- Pass outputs from each step to subsequent steps
- Ensure phrases are generated before intent classification
- Ensure phrases are generated before relevance scoring

### 3. **Standardize Prompt Quality**
- Make main endpoint prompts as comprehensive as Step3Results
- Ensure all prompts use context from previous steps
- Add proper error handling and fallbacks

## Conclusion

The current implementation has the **correct order** but **missing logical dependencies**. The prompts need to be enhanced to properly use outputs from previous steps, especially for the main endpoint. The Step3Results endpoint is more comprehensive but still needs improvements in data flow consistency.