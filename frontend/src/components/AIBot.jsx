import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

const AIBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am the Onion Slayer AI Assistant. Ask me how this platform works, what models we use, or about our infrastructure attribution.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    const delay = Math.floor(Math.random() * 1000) + 1500;

    setTimeout(() => {
      const response = generateResponse(userMsg);
      setMessages(prev => [...prev, { sender: 'bot', text: response }]);
      setIsTyping(false);
    }, delay);
  };

  const generateResponse = (query) => {
    const q = query.toLowerCase();

    if (q.match(/model|ai|machine learning|nlp/)) {
      return "We use a combination of Natural Language Processing (NLP) for forensic stylometryanalyzing vocabulary richness, punctuation patterns, and sentence structure. We also generate Semantic Embeddings to compare meaning and intent. These probabilstic models are combined with deterministic cryptographic evidence to generate explainable correlation scores.";
    }
    if (q.match(/how.*work|architecture|correlate/)) {
      return "The platform correlates fragmented digital footprints into a single relationship graph. It combines three major signals: identity and writing patterns, digital artifacts (like PGP and crypto addresses), and infrastructure-level evidence. We don't make the final attribution automatically; we give the analyst explainable correlation and keep a human in the loop.";
    }
    if (q.match(/focus|goal|objective|problem/)) {
      return "Threat actors rarely use the same identity for long. They change usernames, rotate crypto wallets, and move across marketplaces. The main challenge we focus on is answering one hard question: Are these different digital identities actually connected to the same threat actor? We turn fragmented dark-web footprints into explainable threat intelligence.";
    }
    if (q.match(/dark web|darknet|tor/)) {
      return "The dark web is a part of the internet that requires specific software, like Tor, to access. Threat actors use it to operate anonymously across hidden marketplaces, rotating identities and crypto wallets to avoid detection. Our tool pierces that anonymity by linking those rotated identities.";
    }
    if (q.match(/infrastructure|origin|tls|server/)) {
      return "Tor can hide the visible origin of a service, but operational mistakes expose traces. Our infrastructure intelligence layer checks indicators like misconfigured server information, TLS certificate relationships, favicon fingerprints, HTTP headers, and ETag patterns to connect hidden services with potentially related clearnet infrastructure.";
    }
    if (q.match(/different|special|differentiator/)) {
      return "Our key differentiator is combining multiple evidence layers in one platform. We are not relying only on AI, and not relying only on infrastructure. We combine deterministic digital artifacts with probabilistic linguistic signals, keeping the reasoning fully explainable so analysts can make evidence-based attribution decisions.";
    }
    if (q.match(/hi|hello|hey/)) {
      return "Hello there! Feel free to ask me about our AI models, the project's focus, how infrastructure attribution works, or general questions about the dark web.";
    }

    return "I'm a prototype AI assistant. You can ask me things like: 'What models are you using?', 'How does this project work?', 'What is the focus of this tool?', or 'How does infrastructure attribution work?'";
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 99999 }}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--brand-cyan)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bot size={28} />
        </button>
      )}

      {isOpen && (
        <div style={{
          width: '340px',
          height: '480px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-soft)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-soft)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} color="var(--brand-cyan)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>AI Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '8px',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}>
                {m.sender === 'bot' && (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Bot size={14} color="#fff" />
                  </div>
                )}
                <div style={{
                  background: m.sender === 'user' ? 'var(--brand-cyan)' : 'var(--bg-secondary)',
                  color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Bot size={14} color="#fff" />
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 0',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'blink 1.4s infinite both' }}></span>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'blink 1.4s infinite both 0.2s' }}></span>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', animation: 'blink 1.4s infinite both 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-soft)',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-soft)',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              style={{
                background: 'var(--brand-cyan)',
                border: 'none',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBot;

// Trigger HMR
