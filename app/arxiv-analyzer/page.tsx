'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

// Types
interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  published: string;
  updated: string;
  pdfLink: string;
  arxivLink: string;
  doi?: string;
  journalRef?: string;
  comment?: string;
}

interface PaperAnalysis {
  // Keyword extraction
  keywords: { word: string; count: number; relevance: number }[];
  
  // Topic classification
  topics: { name: string; confidence: number }[];
  
  // Reading metrics
  readingMetrics: {
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    complexityScore: number; // 1-10
    estimatedReadTime: number; // in minutes
    readabilityLevel: string;
  };
  
  // Key entities
  entities: {
    methods: string[];
    datasets: string[];
    metrics: string[];
    technologies: string[];
  };
  
  // Structure analysis
  structure: {
    hasEquations: boolean;
    hasAlgorithms: boolean;
    hasTheorems: boolean;
    hasExperiments: boolean;
    hasRelatedWork: boolean;
  };
  
  // Summary
  summary: string[];
}

// Category mappings for arXiv
const ARXIV_CATEGORIES: Record<string, string> = {
  'cs.AI': 'Artificial Intelligence',
  'cs.CL': 'Computation and Language',
  'cs.CV': 'Computer Vision',
  'cs.LG': 'Machine Learning',
  'cs.NE': 'Neural and Evolutionary Computing',
  'cs.RO': 'Robotics',
  'cs.SE': 'Software Engineering',
  'cs.DS': 'Data Structures and Algorithms',
  'cs.IR': 'Information Retrieval',
  'cs.HC': 'Human-Computer Interaction',
  'cs.CR': 'Cryptography and Security',
  'cs.DB': 'Databases',
  'cs.DC': 'Distributed Computing',
  'cs.PL': 'Programming Languages',
  'cs.SI': 'Social and Information Networks',
  'stat.ML': 'Machine Learning (Statistics)',
  'math.OC': 'Optimization and Control',
  'math.ST': 'Statistics Theory',
  'physics.comp-ph': 'Computational Physics',
  'quant-ph': 'Quantum Physics',
  'eess.SP': 'Signal Processing',
  'eess.IV': 'Image and Video Processing',
};

// Technical terms for detection
const TECHNICAL_TERMS = {
  methods: [
    'transformer', 'attention', 'convolution', 'neural network', 'deep learning',
    'reinforcement learning', 'supervised learning', 'unsupervised learning',
    'gradient descent', 'backpropagation', 'dropout', 'batch normalization',
    'recurrent', 'lstm', 'gru', 'encoder', 'decoder', 'embedding',
    'bert', 'gpt', 'vit', 'resnet', 'unet', 'gan', 'vae', 'diffusion',
    'self-supervised', 'contrastive learning', 'transfer learning', 'fine-tuning',
    'pruning', 'quantization', 'distillation', 'federated learning',
    'graph neural network', 'message passing', 'pooling', 'normalization'
  ],
  datasets: [
    'imagenet', 'cifar', 'mnist', 'coco', 'voc', 'cityscapes',
    'squad', 'glue', 'superglue', 'wikitext', 'c4', 'pile',
    'librispeech', 'voxceleb', 'audioset', 'kinetics',
    'movielens', 'amazon reviews', 'yelp', 'imdb'
  ],
  metrics: [
    'accuracy', 'precision', 'recall', 'f1 score', 'f1-score',
    'auc', 'roc', 'map', 'iou', 'dice', 'bleu', 'rouge', 'meteor',
    'perplexity', 'fid', 'inception score', 'ssim', 'psnr',
    'loss', 'cross-entropy', 'mse', 'mae', 'rmse'
  ],
  technologies: [
    'pytorch', 'tensorflow', 'jax', 'keras', 'cuda', 'gpu',
    'tpu', 'distributed', 'parallel', 'huggingface', 'transformers',
    'opencv', 'numpy', 'pandas', 'scikit-learn', 'python'
  ]
};

// Stop words for keyword extraction
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
  't', 'just', 'don', 'now', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he',
  'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i',
  'me', 'my', 'myself', 'we', 'us', 'ourselves', 'paper', 'work', 'method',
  'approach', 'propose', 'proposed', 'show', 'shown', 'results', 'result',
  'using', 'use', 'based', 'also', 'however', 'therefore', 'thus', 'hence'
]);

// Helper functions
function parseArxivXML(xmlText: string): ArxivPaper | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  const entry = xmlDoc.querySelector('entry');
  if (!entry) return null;
  
  const getId = (el: Element | null) => el?.textContent?.trim() || '';
  const getLink = (rel: string) => {
    const links = entry.querySelectorAll('link');
    for (const link of links) {
      if (link.getAttribute('rel') === rel || link.getAttribute('title') === rel) {
        return link.getAttribute('href') || '';
      }
    }
    return '';
  };
  
  const id = getId(entry.querySelector('id'))?.split('/abs/')?.pop() || '';
  const title = getId(entry.querySelector('title'))?.replace(/\s+/g, ' ');
  const abstract = getId(entry.querySelector('summary'))?.replace(/\s+/g, ' ');
  const published = getId(entry.querySelector('published'));
  const updated = getId(entry.querySelector('updated'));
  
  const authors: string[] = [];
  entry.querySelectorAll('author name').forEach((el) => {
    const name = el.textContent?.trim();
    if (name) authors.push(name);
  });
  
  const categories: string[] = [];
  entry.querySelectorAll('category').forEach((el) => {
    const term = el.getAttribute('term');
    if (term) categories.push(term);
  });
  
  const pdfLink = getLink('pdf') || `https://arxiv.org/pdf/${id}.pdf`;
  const arxivLink = `https://arxiv.org/abs/${id}`;
  
  const doi = getId(entry.querySelector('arxiv\\:doi, doi'));
  const journalRef = getId(entry.querySelector('arxiv\\:journal_ref, journal_ref'));
  const comment = getId(entry.querySelector('arxiv\\:comment, comment'));
  
  return {
    id,
    title,
    authors,
    abstract,
    categories,
    published,
    updated,
    pdfLink,
    arxivLink,
    doi: doi || undefined,
    journalRef: journalRef || undefined,
    comment: comment || undefined,
  };
}

// Utility function to clean and normalize arXiv IDs from various input formats
function cleanArxivId(input: string): string {
  let cleanId = input.trim();
  // Remove arxiv.org URL parts if present
  cleanId = cleanId.replace(/https?:\/\/(www\.)?arxiv\.org\/(abs|pdf)\//i, '');
  // Remove .pdf extension
  cleanId = cleanId.replace(/\.pdf$/i, '');
  // Remove arxiv: prefix
  cleanId = cleanId.replace(/^arxiv:/i, '');
  return cleanId;
}

function extractKeywords(text: string): { word: string; count: number; relevance: number }[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Use reduce instead of spread operator to avoid stack overflow on large arrays
  const counts = Object.values(wordCount);
  const maxCount = counts.length > 0 ? counts.reduce((max, val) => Math.max(max, val), 0) : 1;
  
  return Object.entries(wordCount)
    .map(([word, count]) => ({
      word,
      count,
      relevance: count / maxCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function detectEntities(text: string): PaperAnalysis['entities'] {
  const lowerText = text.toLowerCase();
  
  const findMatches = (terms: string[]) => {
    return terms.filter(term => lowerText.includes(term.toLowerCase()));
  };
  
  return {
    methods: findMatches(TECHNICAL_TERMS.methods),
    datasets: findMatches(TECHNICAL_TERMS.datasets),
    metrics: findMatches(TECHNICAL_TERMS.metrics),
    technologies: findMatches(TECHNICAL_TERMS.technologies),
  };
}

function analyzeStructure(text: string): PaperAnalysis['structure'] {
  const lowerText = text.toLowerCase();
  
  return {
    hasEquations: /equation|formula|∑|∫|∂|≤|≥|≠|∈|∀|∃/.test(text) || 
                  lowerText.includes('equation') || lowerText.includes('formula'),
    hasAlgorithms: lowerText.includes('algorithm') || lowerText.includes('pseudo') || 
                   lowerText.includes('procedure'),
    hasTheorems: lowerText.includes('theorem') || lowerText.includes('lemma') || 
                 lowerText.includes('proof') || lowerText.includes('corollary'),
    hasExperiments: lowerText.includes('experiment') || lowerText.includes('evaluation') || 
                    lowerText.includes('benchmark') || lowerText.includes('ablation'),
    hasRelatedWork: lowerText.includes('related work') || lowerText.includes('previous work') || 
                    lowerText.includes('prior work'),
  };
}

function calculateReadingMetrics(text: string): PaperAnalysis['readingMetrics'] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const avgWordsPerSentence = wordCount / sentenceCount;
  
  // Calculate complexity based on various factors
  const longWords = words.filter(w => w.length > 8).length;
  // Convert to lowercase once and reuse
  const lowerText = text.toLowerCase();
  const technicalTermCount = TECHNICAL_TERMS.methods.filter(t => 
    lowerText.includes(t)
  ).length;
  
  const complexityScore = Math.min(10, Math.round(
    (avgWordsPerSentence / 25) * 3 +
    (longWords / wordCount) * 30 +
    (technicalTermCount / 5) * 2
  ));
  
  // Estimate read time (average reading speed for technical content: ~150 words/min)
  const estimatedReadTime = Math.ceil(wordCount / 150);
  
  let readabilityLevel: string;
  if (complexityScore <= 3) readabilityLevel = 'Accessible';
  else if (complexityScore <= 5) readabilityLevel = 'Intermediate';
  else if (complexityScore <= 7) readabilityLevel = 'Advanced';
  else readabilityLevel = 'Expert';
  
  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    complexityScore,
    estimatedReadTime,
    readabilityLevel,
  };
}

function classifyTopics(categories: string[], text: string): PaperAnalysis['topics'] {
  const topics: { name: string; confidence: number }[] = [];
  
  // Add categories as topics
  categories.forEach((cat, idx) => {
    const name = ARXIV_CATEGORIES[cat] || cat;
    topics.push({
      name,
      confidence: Math.max(0.5, 1 - idx * 0.15), // Primary category has highest confidence
    });
  });
  
  // Detect additional topics from text
  const lowerText = text.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    'Natural Language Processing': ['nlp', 'language model', 'text', 'semantic', 'syntax', 'translation', 'sentiment'],
    'Computer Vision': ['image', 'visual', 'object detection', 'segmentation', 'recognition', 'video'],
    'Generative Models': ['generative', 'generation', 'synthesis', 'gan', 'vae', 'diffusion'],
    'Reinforcement Learning': ['reinforcement', 'reward', 'policy', 'agent', 'environment', 'mdp'],
    'Optimization': ['optimization', 'minimize', 'maximize', 'convergence', 'gradient'],
    'Graph Learning': ['graph', 'node', 'edge', 'network', 'gnn'],
    'Speech & Audio': ['speech', 'audio', 'acoustic', 'voice', 'sound'],
    'Robotics': ['robot', 'manipulation', 'navigation', 'control', 'motion'],
  };
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const matches = keywords.filter(k => lowerText.includes(k)).length;
    if (matches >= 2) {
      topics.push({
        name: topic,
        confidence: Math.min(0.9, matches * 0.2),
      });
    }
  });
  
  return topics.slice(0, 6);
}

function generateSummary(paper: ArxivPaper): string[] {
  const summary: string[] = [];
  const lowerAbstract = paper.abstract.toLowerCase();
  
  // Extract key sentences from abstract
  const sentences = paper.abstract.split(/[.!?]+/).filter(s => s.trim().length > 30);
  
  // Find problem statement (usually first 1-2 sentences)
  if (sentences.length > 0) {
    const problemIndicators = ['challenge', 'problem', 'difficult', 'limitation', 'issue'];
    const problemSentence = sentences.find(s => 
      problemIndicators.some(ind => s.toLowerCase().includes(ind))
    ) || sentences[0];
    summary.push(`📌 Problem: ${problemSentence.trim()}.`);
  }
  
  // Find proposed solution
  const solutionIndicators = ['propose', 'introduce', 'present', 'develop', 'design'];
  const solutionSentence = sentences.find(s =>
    solutionIndicators.some(ind => s.toLowerCase().includes(ind))
  );
  if (solutionSentence) {
    summary.push(`💡 Solution: ${solutionSentence.trim()}.`);
  }
  
  // Find results/achievements
  const resultIndicators = ['achieve', 'outperform', 'improve', 'state-of-the-art', 'sota', 'surpass', 'demonstrate'];
  const resultSentence = sentences.find(s =>
    resultIndicators.some(ind => s.toLowerCase().includes(ind))
  );
  if (resultSentence) {
    summary.push(`📊 Results: ${resultSentence.trim()}.`);
  }
  
  // Add key contribution if different from solution
  if (lowerAbstract.includes('contribution') || lowerAbstract.includes('key insight')) {
    const contributionSentence = sentences.find(s =>
      s.toLowerCase().includes('contribution') || s.toLowerCase().includes('key')
    );
    if (contributionSentence && contributionSentence !== solutionSentence) {
      summary.push(`🎯 Key Insight: ${contributionSentence.trim()}.`);
    }
  }
  
  return summary.length > 0 ? summary : ['Unable to extract key points. Please read the abstract for details.'];
}

function analyzePaper(paper: ArxivPaper): PaperAnalysis {
  const fullText = `${paper.title} ${paper.abstract}`;
  
  return {
    keywords: extractKeywords(fullText),
    topics: classifyTopics(paper.categories, fullText),
    readingMetrics: calculateReadingMetrics(paper.abstract),
    entities: detectEntities(fullText),
    structure: analyzeStructure(paper.abstract),
    summary: generateSummary(paper),
  };
}

// Components
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, subtext, color = 'blue' }: {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-500/50 text-blue-400',
    green: 'bg-green-900/30 border-green-500/50 text-green-400',
    purple: 'bg-purple-900/30 border-purple-500/50 text-purple-400',
    orange: 'bg-orange-900/30 border-orange-500/50 text-orange-400',
    red: 'bg-red-900/30 border-red-500/50 text-red-400',
  };
  
  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs opacity-60 mt-1">{subtext}</p>}
    </div>
  );
}

function KeywordCloud({ keywords }: { keywords: PaperAnalysis['keywords'] }) {
  if (keywords.length === 0) return null;
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        🏷️ Extracted Keywords
      </h3>
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, 20).map((kw, idx) => {
          const size = kw.relevance > 0.7 ? 'text-base' : kw.relevance > 0.4 ? 'text-sm' : 'text-xs';
          const opacity = kw.relevance > 0.5 ? 'opacity-100' : 'opacity-75';
          return (
            <span
              key={idx}
              className={`px-3 py-1 bg-blue-900/40 text-blue-300 rounded-full ${size} ${opacity} hover:bg-blue-900/60 transition cursor-default`}
              title={`Count: ${kw.count}`}
            >
              {kw.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TopicsSection({ topics }: { topics: PaperAnalysis['topics'] }) {
  if (topics.length === 0) return null;
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📂 Topics & Categories
      </h3>
      <div className="space-y-3">
        {topics.map((topic, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white">{topic.name}</span>
              <span className="text-sm text-slate-400">{Math.round(topic.confidence * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${topic.confidence * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntitiesSection({ entities }: { entities: PaperAnalysis['entities'] }) {
  const sections = [
    { title: 'Methods & Techniques', icon: '🔧', items: entities.methods, color: 'blue' },
    { title: 'Datasets', icon: '📊', items: entities.datasets, color: 'green' },
    { title: 'Evaluation Metrics', icon: '📐', items: entities.metrics, color: 'purple' },
    { title: 'Technologies', icon: '💻', items: entities.technologies, color: 'orange' },
  ];
  
  const nonEmptySections = sections.filter(s => s.items.length > 0);
  if (nonEmptySections.length === 0) return null;
  
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-900/40 text-blue-300',
    green: 'bg-green-900/40 text-green-300',
    purple: 'bg-purple-900/40 text-purple-300',
    orange: 'bg-orange-900/40 text-orange-300',
  };
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        🔍 Detected Entities
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {nonEmptySections.map((section, idx) => (
          <div key={idx} className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              {section.icon} {section.title}
            </h4>
            <div className="flex flex-wrap gap-1">
              {section.items.map((item, i) => (
                <span key={i} className={`px-2 py-0.5 rounded text-xs ${colorClasses[section.color]}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureAnalysis({ structure }: { structure: PaperAnalysis['structure'] }) {
  const items = [
    { label: 'Mathematical Equations', value: structure.hasEquations, icon: '➗' },
    { label: 'Algorithms/Pseudocode', value: structure.hasAlgorithms, icon: '📝' },
    { label: 'Theorems/Proofs', value: structure.hasTheorems, icon: '📐' },
    { label: 'Experiments/Evaluation', value: structure.hasExperiments, icon: '🧪' },
    { label: 'Related Work', value: structure.hasRelatedWork, icon: '📚' },
  ];
  
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📋 Paper Structure
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-3 text-center transition ${
              item.value
                ? 'bg-green-900/30 border border-green-500/50'
                : 'bg-slate-800 border border-slate-600'
            }`}
          >
            <span className="text-2xl block mb-1">{item.icon}</span>
            <span className={`text-xs ${item.value ? 'text-green-400' : 'text-slate-400'}`}>
              {item.label}
            </span>
            <div className="mt-1">
              {item.value ? (
                <span className="text-green-400 text-sm">✓</span>
              ) : (
                <span className="text-slate-500 text-sm">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummarySection({ summary }: { summary: string[] }) {
  return (
    <div className="bg-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📝 Key Points Summary
      </h3>
      <div className="space-y-3">
        {summary.map((point, idx) => (
          <p key={idx} className="text-slate-300 text-sm leading-relaxed">
            {point}
          </p>
        ))}
      </div>
    </div>
  );
}

// Main Component
export default function ArxivAnalyzerPage() {
  const [arxivId, setArxivId] = useState('');
  const [paper, setPaper] = useState<ArxivPaper | null>(null);
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const fetchPaper = useCallback(async (id: string) => {
    // Clean the ID using utility function
    const cleanId = cleanArxivId(id);
    
    if (!cleanId) {
      setError('Please enter a valid arXiv ID');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPaper(null);
    setAnalysis(null);
    
    try {
      // Use our API route to proxy the request (avoids CORS issues)
      const response = await fetch(
        `/api/arxiv?id=${encodeURIComponent(cleanId)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch paper from arXiv');
      }
      
      const xmlText = await response.text();
      const parsedPaper = parseArxivXML(xmlText);
      
      if (!parsedPaper || !parsedPaper.title) {
        throw new Error('Paper not found. Please check the arXiv ID.');
      }
      
      setPaper(parsedPaper);
      setAnalysis(analyzePaper(parsedPaper));
      
      // Update recent searches
      setRecentSearches(prev => {
        const updated = [cleanId, ...prev.filter(s => s !== cleanId)].slice(0, 5);
        return updated;
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the paper');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    fetchPaper(arxivId);
  }, [arxivId, fetchPaper]);
  
  const examplePapers = [
    { id: '1706.03762', title: 'Attention Is All You Need (Transformers)' },
    { id: '2303.08774', title: 'GPT-4 Technical Report' },
    { id: '2010.11929', title: 'An Image is Worth 16x16 Words (ViT)' },
    { id: '1810.04805', title: 'BERT' },
    { id: '2112.10752', title: 'High-Resolution Image Synthesis (Stable Diffusion)' },
  ];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-white hover:text-blue-400 transition flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white">📄 arXiv Paper Analyzer</h1>
          <div className="w-[140px]" />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Introduction */}
        <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">📚 About This Tool</h2>
          <p className="text-slate-300 mb-3">
            This tool analyzes academic papers from <strong>arXiv</strong> - the open-access repository 
            for scientific research. Simply enter an arXiv paper ID to get comprehensive analysis including:
          </p>
          <ul className="grid md:grid-cols-2 gap-2 text-slate-400 text-sm">
            <li className="flex items-center gap-2">🏷️ Keyword extraction and topic classification</li>
            <li className="flex items-center gap-2">📊 Reading complexity and time estimation</li>
            <li className="flex items-center gap-2">🔍 Technical entity detection (methods, datasets, metrics)</li>
            <li className="flex items-center gap-2">📋 Paper structure analysis</li>
            <li className="flex items-center gap-2">📝 Automatic key points summary</li>
            <li className="flex items-center gap-2">📂 Category and topic identification</li>
          </ul>
        </div>
        
        {/* Search Section */}
        <div className="bg-slate-700 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔍 Search Paper</h3>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              value={arxivId}
              onChange={(e) => setArxivId(e.target.value)}
              placeholder="Enter arXiv ID (e.g., 1706.03762 or 2303.08774)"
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isLoading || !arxivId.trim()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Paper'}
            </button>
          </form>
          
          {/* Example Papers */}
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-2">Try these popular papers:</p>
            <div className="flex flex-wrap gap-2">
              {examplePapers.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => { setArxivId(ex.id); fetchPaper(ex.id); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-600 text-slate-300 rounded-full text-sm transition"
                  title={ex.title}
                >
                  {ex.id}
                </button>
              ))}
            </div>
          </div>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <p className="text-sm text-slate-400 mb-2">Recent searches:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((id) => (
                  <button
                    key={id}
                    onClick={() => { setArxivId(id); fetchPaper(id); }}
                    className="px-3 py-1 bg-slate-800/50 hover:bg-slate-600 text-slate-400 rounded-full text-sm transition"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6">
            <p className="text-red-400 flex items-center gap-2">
              <span>⚠️</span> {error}
            </p>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && <LoadingSpinner />}
        
        {/* Results */}
        {paper && analysis && !isLoading && (
          <div className="space-y-6">
            {/* Paper Info */}
            <div className="bg-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{paper.title}</h2>
                  <p className="text-slate-400 mb-2">
                    {paper.authors.slice(0, 5).join(', ')}
                    {paper.authors.length > 5 && ` and ${paper.authors.length - 5} more`}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {paper.categories.map((cat, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-900/40 text-purple-300 rounded text-xs">
                        {ARXIV_CATEGORIES[cat] || cat}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">
                    Published: {new Date(paper.published).toLocaleDateString('en-US', { 
                      year: 'numeric', month: 'long', day: 'numeric' 
                    })}
                    {paper.updated !== paper.published && (
                      <> | Updated: {new Date(paper.updated).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      })}</>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={paper.arxivLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    📄 View on arXiv
                  </a>
                  <a
                    href={paper.pdfLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    📥 Download PDF
                  </a>
                </div>
              </div>
              
              {/* Abstract */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Abstract</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{paper.abstract}</p>
              </div>
              
              {/* Additional Info */}
              {(paper.doi || paper.journalRef || paper.comment) && (
                <div className="mt-4 grid md:grid-cols-3 gap-3">
                  {paper.doi && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <span className="text-xs text-slate-500">DOI</span>
                      <p className="text-sm text-slate-300">{paper.doi}</p>
                    </div>
                  )}
                  {paper.journalRef && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <span className="text-xs text-slate-500">Journal Reference</span>
                      <p className="text-sm text-slate-300">{paper.journalRef}</p>
                    </div>
                  )}
                  {paper.comment && (
                    <div className="bg-slate-800 rounded-lg p-3">
                      <span className="text-xs text-slate-500">Comment</span>
                      <p className="text-sm text-slate-300">{paper.comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Reading Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                icon="📖"
                label="Word Count"
                value={analysis.readingMetrics.wordCount}
                color="blue"
              />
              <MetricCard
                icon="⏱️"
                label="Read Time"
                value={`${analysis.readingMetrics.estimatedReadTime} min`}
                subtext="For abstract"
                color="green"
              />
              <MetricCard
                icon="📊"
                label="Complexity"
                value={`${analysis.readingMetrics.complexityScore}/10`}
                subtext={analysis.readingMetrics.readabilityLevel}
                color="purple"
              />
              <MetricCard
                icon="📝"
                label="Sentences"
                value={analysis.readingMetrics.sentenceCount}
                color="orange"
              />
              <MetricCard
                icon="📏"
                label="Avg Words/Sent"
                value={analysis.readingMetrics.avgWordsPerSentence}
                color="blue"
              />
            </div>
            
            {/* Summary */}
            <SummarySection summary={analysis.summary} />
            
            {/* Analysis Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <KeywordCloud keywords={analysis.keywords} />
              <TopicsSection topics={analysis.topics} />
            </div>
            
            {/* Entities */}
            <EntitiesSection entities={analysis.entities} />
            
            {/* Structure Analysis */}
            <StructureAnalysis structure={analysis.structure} />
          </div>
        )}
        
        {/* Tips Section */}
        {!paper && !isLoading && (
          <div className="bg-slate-700/50 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              💡 Tips for Finding Papers
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Finding arXiv IDs</h4>
                <p className="text-sm text-slate-400">
                  The arXiv ID is in the URL. For example, in <code className="text-blue-400">arxiv.org/abs/2303.08774</code>, 
                  the ID is <code className="text-blue-400">2303.08774</code>
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">ID Formats</h4>
                <p className="text-sm text-slate-400">
                  arXiv uses formats like <code className="text-blue-400">YYMM.NNNNN</code> (new) or 
                  <code className="text-blue-400">category/YYMMNNN</code> (old)
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Paste Full URLs</h4>
                <p className="text-sm text-slate-400">
                  You can also paste the full arXiv URL - the tool will automatically extract the paper ID
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>arXiv Paper Analyzer - Analyze and understand research papers</p>
          <p className="mt-1">Built with Next.js, TypeScript, and Tailwind CSS</p>
          <p className="mt-2 text-xs text-slate-500">
            Data sourced from <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">arXiv.org</a> API
          </p>
        </div>
      </footer>
    </div>
  );
}
