'use client';

import React, { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isProcessing: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isProcessing }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isProcessing) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const examplePrompts = [
    "Build a UK bank that supports Faster Payments",
    "Create a social media platform with load balancing",
    "Design a DNS infrastructure for a university",
    "Set up an e-commerce platform with payment processing"
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Describe your infrastructure in natural language:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="e.g., Build a UK bank that supports Faster Payments with web portal, database, and load balancer..."
            disabled={isProcessing}
          />
        </div>
        
        <button
          type="submit"
          disabled={!prompt.trim() || isProcessing}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Generate Infrastructure'}
        </button>
      </form>

      <div>
        <p className="text-sm text-gray-400 mb-2">Try these examples:</p>
        <div className="space-y-1">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(example)}
              className="block w-full text-left text-sm text-gray-300 hover:text-cyan-400 transition-colors"
              disabled={isProcessing}
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
