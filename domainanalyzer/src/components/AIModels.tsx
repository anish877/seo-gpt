import React from 'react';

const AIModels = () => {
  const models = [
    {
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: 'Advanced reasoning and comprehensive responses with web search capabilities',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M9 9h6v6H9z"/>
        </svg>
      ),
      features: ['Web Search Integration', 'Advanced Reasoning', 'Comprehensive Analysis']
    },
    {
      name: 'Claude 3',
      provider: 'Anthropic',
      description: 'Sophisticated analysis with strong safety and helpfulness principles',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      ),
      features: ['Safety-First Approach', 'Deep Analysis', 'Contextual Understanding']
    },
    {
      name: 'Gemini 1.5',
      provider: 'Google',
      description: 'Multimodal AI with extensive knowledge and real-time information access',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      features: ['Multimodal Processing', 'Real-time Data', 'Google Integration']
    }
  ];

  return (
    <section className="py-24 md:py-40" style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
      background: '#f8f9fa'
    }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-20">
          <h2 style={{ 
            fontSize: 'clamp(40px, 5vw, 72px)',
            fontWeight: '200',
            letterSpacing: '-0.003em',
            lineHeight: '1.1',
            color: '#1d1d1f',
            margin: '0 0 24px 0'
          }}>Powered by Leading AI Models</h2>
          <p style={{ 
            fontSize: 'clamp(19px, 2.5vw, 28px)',
            fontWeight: '300',
            letterSpacing: '0.011em',
            color: '#86868b',
            lineHeight: '1.4',
            margin: '0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>Test your brand's visibility across the most advanced AI models to ensure comprehensive coverage and accurate insights.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {models.map((model, index) => (
            <div 
              key={index}
              className="relative group"
              style={{
                padding: '40px 32px',
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid #e9ecef',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                style={{ 
                  borderRadius: '20px',
                  background: model.gradient
                }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: model.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    marginRight: '16px'
                  }}>
                    {model.icon}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '24px',
                      fontWeight: '500',
                      letterSpacing: '-0.022em',
                      color: '#1d1d1f',
                      margin: '0 0 4px 0',
                      lineHeight: '1.2'
                    }}>
                      {model.name}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '400',
                      letterSpacing: '0.05em',
                      color: '#6b7280',
                      margin: '0',
                      textTransform: 'uppercase'
                    }}>
                      {model.provider}
                    </p>
                  </div>
                </div>

                <p style={{
                  fontSize: '16px',
                  fontWeight: '300',
                  letterSpacing: '0.011em',
                  color: '#6b7280',
                  lineHeight: '1.6',
                  margin: '0 0 24px 0'
                }}>
                  {model.description}
                </p>

                <div className="space-y-2">
                  {model.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center">
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: model.gradient,
                        marginRight: '12px'
                      }} />
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        letterSpacing: '0.011em',
                        color: '#4b5563'
                      }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div style={{
            padding: '24px 40px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1d1d1f 0%, #2d2d30 100%)',
            color: 'white',
            display: 'inline-block'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '500',
              letterSpacing: '-0.022em',
              margin: '0 0 8px 0'
            }}>
              Comprehensive Coverage
            </h3>
            <p style={{
              fontSize: '16px',
              fontWeight: '300',
              letterSpacing: '0.011em',
              margin: '0',
              opacity: '0.8'
            }}>
              Get insights from all major AI models to ensure your brand is visible across the entire AI landscape
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIModels;
