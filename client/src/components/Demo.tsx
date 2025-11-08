import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Terminal, Skull, Code, Zap, Ghost, Check, X, Copy, GitPullRequest } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { ParallaxContainer } from './ParallaxContainer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { reviewCode, ReviewResponse, createPullRequest, fetchGitHubRepos, getStoredGitHubToken } from '../services/api';

const codeTemplates: Record<string, { code: string; extension: string }> = {
  javascript: {
    code: `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}

while(true) {
  console.log("Processing...");
}`,
    extension: 'js',
  },
  python: {
    code: `def calculate_total(items):
    total = 0
    for i in range(len(items) + 1):
        total += items[i]['price']
    return total

while True:
    print("Processing...")`,
    extension: 'py',
  },
  cpp: {
    code: `#include <iostream>
using namespace std;

int calculateTotal(int items[], int size) {
    int total = 0;
    for (int i = 0; i <= size; i++) {
        total += items[i];
    }
    return total;
}

int main() {
    while(true) {
        cout << "Processing..." << endl;
    }
    return 0;
}`,
    extension: 'cpp',
  },
  java: {
    code: `public class Calculator {
    public static int calculateTotal(int[] items) {
        int total = 0;
        for (int i = 0; i <= items.length; i++) {
            total += items[i];
        }
        return total;
    }
    
    public static void main(String[] args) {
        while(true) {
            System.out.println("Processing...");
        }
    }
}`,
    extension: 'java',
  },
  typescript: {
    code: `interface Item {
  price: number;
}

function calculateTotal(items: Item[]): number {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}

while(true) {
  console.log("Processing...");
}`,
    extension: 'ts',
  },
  rust: {
    code: `fn calculate_total(items: &[i32]) -> i32 {
    let mut total = 0;
    for i in 0..=items.len() {
        total += items[i];
    }
    total
}

fn main() {
    loop {
        println!("Processing...");
    }
}`,
    extension: 'rs',
  },
};


interface DemoProps {
  onErrorIntensityChange?: (intensity: number) => void;
}

export function Demo({ onErrorIntensityChange }: DemoProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [curseLevel, setCurseLevel] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(codeTemplates.javascript.code);
  const [showGhosts, setShowGhosts] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [improvedCode, setImprovedCode] = useState<string | null>(null);
  const [codeAccepted, setCodeAccepted] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [showPRModal, setShowPRModal] = useState(false);
  const isRequestInProgressRef = useRef(false);
  const [showUpdatedCodeModal, setShowUpdatedCodeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Update error intensity based on curse level
  useEffect(() => {
    if (onErrorIntensityChange) {
      onErrorIntensityChange(curseLevel);
    }
  }, [curseLevel, onErrorIntensityChange]);

  useEffect(() => {
    // Initialize audio context on user interaction
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const playScreamSound = () => {
    if (!audioContextRef.current) return;
    
    const context = audioContextRef.current;
    
    // Create a creepy scream-like sound using oscillators
    const screamDuration = 0.8;
    
    // Main oscillator - creates the base scream
    const oscillator1 = context.createOscillator();
    const gainNode1 = context.createGain();
    
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(800, context.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(200, context.currentTime + screamDuration);
    
    gainNode1.gain.setValueAtTime(0.3, context.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, context.currentTime + screamDuration);
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(context.destination);
    
    // Second oscillator for depth
    const oscillator2 = context.createOscillator();
    const gainNode2 = context.createGain();
    
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(600, context.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(150, context.currentTime + screamDuration);
    
    gainNode2.gain.setValueAtTime(0.2, context.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + screamDuration);
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(context.destination);
    
    oscillator1.start(context.currentTime);
    oscillator2.start(context.currentTime);
    oscillator1.stop(context.currentTime + screamDuration);
    oscillator2.stop(context.currentTime + screamDuration);
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCode(codeTemplates[language].code);
    setShowResponse(false);
    setReviewData(null);
    setError(null);
  };


  const summonReaper = async () => {
    console.log('🔴 summonReaper called - checking guards...');
    
    if (!code.trim()) {
      console.warn('⚠️ Cannot review: code is empty');
      return;
    }

    // STRICT duplicate request prevention - check both state and ref
    if (isAnalyzing) {
      console.warn('⚠️ Already analyzing (state check), skipping duplicate request');
      return;
    }
    
    if (isRequestInProgressRef.current) {
      console.warn('⚠️ Request in progress (ref check), skipping duplicate request');
      return;
    }
    
    // Set flag IMMEDIATELY to prevent any duplicate calls
    isRequestInProgressRef.current = true;
    setIsAnalyzing(true);
    
    console.log('✅ Guards passed - making API call now');
    setShowResponse(false);
    setReviewData(null);
    setCurseLevel(0);
    setShowGhosts(true);
    setError(null);

    // Play scream sound
    playScreamSound();

    // Flash effect with shake
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-red-600 pointer-events-none z-50';
    flash.style.opacity = '0';
    document.body.appendChild(flash);
    
    // Add screen shake
    document.body.style.animation = 'shake 0.5s';
    
    setTimeout(() => {
      flash.style.transition = 'opacity 0.1s';
      flash.style.opacity = '0.4';
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => {
          flash.remove();
          document.body.style.animation = '';
        }, 100);
      }, 150);
    }, 300);

    // Animate curse level while API call is in progress
    let level = 0;
    const interval = setInterval(() => {
      level += 5;
      setCurseLevel(Math.min(level, 90)); // Don't go to 100 until API responds
    }, 50);

    try {
      // Call the review API - ONLY ONCE
      console.log('📞 Calling reviewCode API...');
      const result = await reviewCode(code, selectedLanguage);
      console.log('✅ API call completed successfully');
      
      // Stop the progress animation
      clearInterval(interval);
      
      // Set the actual curse level from the response
      setCurseLevel(result.curseLevel);
      setReviewData(result);
      
      // Use updatedCode from review response if available
      if (result.updatedCode) {
        setImprovedCode(result.updatedCode);
        setCodeAccepted(false); // Reset acceptance state for new review
        // Show modal with updated code after a brief delay
        setTimeout(() => {
          setShowUpdatedCodeModal(true);
        }, 500);
      } else {
        setImprovedCode(null);
        setCodeAccepted(false);
        setShowUpdatedCodeModal(false);
      }
      
      // Show response after a brief delay
      setTimeout(() => {
        setIsAnalyzing(false);
        isRequestInProgressRef.current = false;
        setShowResponse(true);
        setShowGhosts(false);
      }, 300);
      
    } catch (err) {
      clearInterval(interval);
      setCurseLevel(0);
      
      // Extract error message
      let errorMessage = 'Failed to review code';
      let isRateLimited = false;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check if it's a rate limit error
        if (errorMessage.includes('overwhelmed') || errorMessage.includes('Too many requests') || errorMessage.includes('429')) {
          isRateLimited = true;
          setRateLimited(true);
          setRateLimitCooldown(10); // 10 second cooldown
          
          // Countdown timer
          const cooldownInterval = setInterval(() => {
            setRateLimitCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(cooldownInterval);
                setRateLimited(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      console.error('❌ Review error:', err);
      console.error('Error details:', {
        message: errorMessage,
        type: typeof err,
        err
      });
      
      setError(errorMessage);
      setIsAnalyzing(false);
      isRequestInProgressRef.current = false;
      setShowResponse(true);
      setShowGhosts(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAcceptCode = async () => {
    if (!improvedCode) return;
    setCode(improvedCode);
    setCodeAccepted(true);
    setShowUpdatedCodeModal(false);
    showToast('💀 Code accepted! Opening PR creation...');
    // Automatically open PR modal after accepting
    setTimeout(async () => {
      await handleOpenPRModal();
    }, 500);
  };

  const handleDiscardCode = () => {
    setImprovedCode(null);
    setCodeAccepted(false);
    setShowUpdatedCodeModal(false);
    showToast('🗑️ Changes discarded');
  };

  const handleCopyCode = async () => {
    if (!improvedCode) return;
    try {
      await navigator.clipboard.writeText(improvedCode);
      showToast('📋 Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('❌ Failed to copy to clipboard');
    }
  };

  const handleOpenPRModal = async () => {
    if (!improvedCode || !reviewData) {
      setError('No improved code available. Please review your code first.');
      return;
    }

    const token = getStoredGitHubToken();
    if (!token) {
      // Trigger GitHub OAuth - use the API service function
      const { initiateGitHubOAuth } = await import('../services/api');
      initiateGitHubOAuth();
      return;
    }

    try {
      const reposData = await fetchGitHubRepos(token);
      setRepos(reposData.repos);
      setShowPRModal(true);
    } catch (err) {
      console.error('Failed to fetch repos:', err);
      setError('Failed to fetch repositories. Please reconnect GitHub.');
    }
  };

  const handleCreatePR = async () => {
    if (!selectedRepo || !filePath || !improvedCode || !reviewData) return;
    
    const token = getStoredGitHubToken();
    if (!token) {
      setError('GitHub token not found. Please reconnect.');
      return;
    }

    const [owner, repo] = selectedRepo.split('/');
    if (!owner || !repo) {
      setError('Invalid repository format');
      return;
    }

    setIsCreatingPR(true);
    try {
      // Determine category from review data
      const category = reviewData.errors.length > 0 ? 'Bug Fix' : 
                      reviewData.warnings.length > 0 ? 'Code Quality' : 
                      'Best Practices';
      
      const result = await createPullRequest(
        token,
        owner,
        repo,
        filePath,
        improvedCode,
        category,
        reviewData.verdict
      );

      // Open PR in new tab
      window.open(result.url, '_blank');
      setShowPRModal(false);
      setCodeAccepted(false);
      setImprovedCode(null);
      setShowUpdatedCodeModal(false);
      showToast('💀 Pull request raised from the underworld!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create PR';
      setError(errorMessage);
    } finally {
      setIsCreatingPR(false);
    }
  };

  return (
    <section id="demo-section" className="min-h-screen py-20 px-4 relative">
      {/* Floating ghosts during analysis */}
      <AnimatePresence>
        {showGhosts && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100,
                  opacity: 0,
                  rotate: 0,
                }}
                animate={{ 
                  y: -200,
                  opacity: [0, 0.7, 0.7, 0],
                  rotate: 360,
                  x: Math.random() * window.innerWidth,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 3,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
                className="fixed pointer-events-none z-40"
              >
                <Ghost className="w-12 h-12 text-purple-500/70" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2
            className="text-5xl md:text-6xl mb-4 text-red-500"
            style={{ fontFamily: "'Creepster', cursive" }}
            animate={{
              textShadow: [
                '0 0 20px rgba(255,0,0,0.5)',
                '0 0 40px rgba(255,0,0,0.8), 0 0 60px rgba(128,0,128,0.5)',
                '0 0 20px rgba(255,0,0,0.5)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            Interactive Demo
          </motion.h2>
          <p
            className="text-xl text-gray-400"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            Watch the AI unleash your code's darkest secrets
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Code Editor */}
          <ParallaxContainer strength={5}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex flex-col"
              animate={isAnalyzing ? { 
                boxShadow: [
                  '0 0 20px rgba(255,0,0,0.3), 0 0 0 1px rgba(255,0,0,0.2)',
                  '0 0 40px rgba(255,0,0,0.6), 0 0 0 2px rgba(255,0,0,0.4)',
                  '0 0 20px rgba(255,0,0,0.3), 0 0 0 1px rgba(255,0,0,0.2)',
                ]
              } : {
                boxShadow: '0 0 15px rgba(255,0,0,0.1), 0 0 0 1px rgba(255,0,0,0.15)',
              }}
              style={{ borderRadius: '0.5rem' }}
            >
              <div className="bg-black/50 border-2 border-red-900/50 rounded-lg overflow-hidden backdrop-blur-sm flex flex-col h-full min-h-[600px] relative">
                {/* Animated scanline effect */}
                {isAnalyzing && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                      background: 'linear-gradient(to bottom, transparent 0%, rgba(255,0,0,0.1) 50%, transparent 100%)',
                      height: '100px',
                    }}
                    animate={{
                      y: [-100, 700],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )}
                
                {/* Header with language selector */}
                <div className="bg-red-950/30 px-4 py-2 flex items-center justify-between border-b border-red-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-red-500/50"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-yellow-500/50"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                      />
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-green-500/50"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                      />
                    </div>
                    <span
                      className="text-sm text-gray-400 ml-2"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      cursed_code.{codeTemplates[selectedLanguage].extension}
                    </span>
                  </div>
                  
                  {/* Language Selector */}
                  <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[150px] h-8 bg-black/50 border-red-900/50 text-gray-300 hover:border-red-500/50 transition-colors">
                      <Code className="w-3 h-3 mr-1 flex-shrink-0" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-red-900/50 text-gray-300">
                      <SelectItem value="javascript" className="text-gray-300">JavaScript</SelectItem>
                      <SelectItem value="typescript" className="text-gray-300">TypeScript</SelectItem>
                      <SelectItem value="python" className="text-gray-300">Python</SelectItem>
                      <SelectItem value="cpp" className="text-gray-300">C++</SelectItem>
                      <SelectItem value="java" className="text-gray-300">Java</SelectItem>
                      <SelectItem value="rust" className="text-gray-300">Rust</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Editable Code Area */}
                <div className="p-4 flex-1 flex flex-col relative">
                  <Textarea
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      // Clear improved code and acceptance state when user types
                      setImprovedCode(null);
                      setCodeAccepted(false);
                      setShowResponse(false);
                      setReviewData(null);
                    }}
                    className="flex-1 bg-transparent border-none text-green-400 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 overflow-auto"
                    style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    placeholder="Paste your cursed code here... Click 'Summon the Reaper' to review"
                    spellCheck={false}
                  />
                  {/* Cursor blink effect */}
                  <motion.div
                    className="absolute bottom-6 left-6 w-2 h-4 bg-green-400"
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              </div>
            </motion.div>
          </ParallaxContainer>

          {/* Response Terminal */}
          <ParallaxContainer strength={5}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex flex-col"
              animate={showResponse ? { 
                boxShadow: [
                  '0 0 20px rgba(128,0,128,0.3), 0 0 0 1px rgba(128,0,128,0.2)',
                  '0 0 40px rgba(128,0,128,0.6), 0 0 0 2px rgba(128,0,128,0.4)',
                  '0 0 20px rgba(128,0,128,0.3), 0 0 0 1px rgba(128,0,128,0.2)',
                ]
              } : {
                boxShadow: '0 0 15px rgba(128,0,128,0.1), 0 0 0 1px rgba(128,0,128,0.15)',
              }}
              style={{ borderRadius: '0.5rem' }}
            >
              <div className="bg-black/50 border-2 border-purple-900/50 rounded-lg overflow-hidden backdrop-blur-sm flex flex-col h-full min-h-[600px] relative">
                {/* Lightning effects during analysis */}
                {isAnalyzing && (
                  <>
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
                      animate={{
                        opacity: [0, 1, 0],
                        scaleX: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.3,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    />
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          x: [Math.random() * 400, Math.random() * 400],
                          y: [Math.random() * 500, Math.random() * 500],
                        }}
                        transition={{
                          duration: 0.2,
                          repeat: Infinity,
                          repeatDelay: 2 + i,
                          delay: i * 0.5,
                        }}
                      >
                        <Zap className="w-6 h-6 text-purple-400" />
                      </motion.div>
                    ))}
                  </>
                )}
                
                <div className="bg-purple-950/30 px-4 py-2 flex items-center gap-2 border-b border-purple-900/50">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span
                    className="text-sm text-gray-400"
                    style={{ fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    reaper_output.terminal
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto">
                    <AnimatePresence mode="wait">
                      {!isAnalyzing && !showResponse && (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center"
                        >
                          <motion.div
                            animate={{ 
                              rotate: [0, 10, -10, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{ 
                              duration: 3,
                              repeat: Infinity,
                            }}
                          >
                            <Skull className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
                          </motion.div>
                          <p
                            className="text-purple-500/50"
                            style={{ fontFamily: "'Share Tech Mono', monospace" }}
                          >
                            Awaiting your cursed code...
                          </p>
                        </motion.div>
                      )}

                      {isAnalyzing && (
                        <motion.div
                          key="analyzing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-full"
                        >
                          <motion.div
                            animate={{
                              rotate: 360,
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              rotate: {
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                              },
                              scale: {
                                duration: 1,
                                repeat: Infinity,
                              },
                            }}
                            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"
                          />
                          <p
                            className="text-center text-purple-400 mb-4"
                            style={{ fontFamily: "'Share Tech Mono', monospace" }}
                          >
                            <motion.span
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              Summoning the spirits...
                            </motion.span>
                          </p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                              <span style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                Curse Level
                              </span>
                              <motion.span 
                                style={{ fontFamily: "'Share Tech Mono', monospace" }}
                                animate={{ 
                                  color: curseLevel > 75 ? '#ef4444' : curseLevel > 50 ? '#eab308' : '#22c55e'
                                }}
                              >
                                {curseLevel}%
                              </motion.span>
                            </div>
                            <motion.div
                              animate={curseLevel > 50 ? {
                                scale: [1, 1.02, 1],
                              } : {}}
                              transition={{
                                duration: 0.8,
                                repeat: curseLevel > 50 ? Infinity : 0,
                                ease: 'easeInOut',
                              }}
                            >
                              <Progress
                                value={curseLevel}
                                className="h-2 bg-gray-800"
                              />
                            </motion.div>
                          </div>
                        </motion.div>
                      )}

                      {showResponse && reviewData && (
                        <motion.div
                          key="response"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="w-full space-y-4 overflow-auto"
                        >
                          {/* Verdict Banner */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-red-950/40 border-2 border-red-500/50 rounded-lg"
                          >
                            <p className="text-red-400 text-lg font-bold mb-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              💀 Verdict
                            </p>
                            <p className="text-red-300" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              {reviewData.verdict}
                            </p>
                          </motion.div>

                          {/* Curse Level Display */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                Curse Level
                              </span>
                              <motion.span
                                className="font-bold"
                                style={{ 
                                  fontFamily: "'Share Tech Mono', monospace",
                                  color: curseLevel > 75 ? '#ef4444' : curseLevel > 50 ? '#eab308' : '#22c55e'
                                }}
                                animate={{ 
                                  scale: curseLevel > 75 ? [1, 1.1, 1] : 1
                                }}
                                transition={{ duration: 0.5, repeat: curseLevel > 75 ? Infinity : 0 }}
                              >
                                {curseLevel}%
                              </motion.span>
                            </div>
                            <Progress
                              value={curseLevel}
                              className="h-3 bg-gray-800"
                            />
                          </div>

                          {/* Errors */}
                          {reviewData.errors.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-2"
                            >
                              <p className="text-red-500 font-bold text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                🔴 Errors ({reviewData.errors.length})
                              </p>
                              {reviewData.errors.map((err, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="border-l-2 border-red-500 pl-3 py-2 bg-red-950/20 rounded"
                                >
                                  <p className="text-red-400 text-xs" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                    Line {err.line}: {err.message}
                                  </p>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}

                          {/* Warnings */}
                          {reviewData.warnings.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-2"
                            >
                              <p className="text-yellow-500 font-bold text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                ⚠️ Warnings ({reviewData.warnings.length})
                              </p>
                              {reviewData.warnings.map((warn, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="border-l-2 border-yellow-500 pl-3 py-2 bg-yellow-950/20 rounded"
                                >
                                  <p className="text-yellow-400 text-xs" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                    Line {warn.line}: {warn.message}
                                  </p>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}

                          {/* Suggestions */}
                          {reviewData.suggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="space-y-2"
                            >
                              <p className="text-purple-500 font-bold text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                💡 Suggestions ({reviewData.suggestions.length})
                              </p>
                              {reviewData.suggestions.map((sugg, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="border-l-2 border-purple-500 pl-3 py-2 bg-purple-950/20 rounded"
                                >
                                  <p className="text-purple-400 text-xs" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                    Line {sugg.line}: {sugg.fix}
                                  </p>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}

                          {/* No issues found */}
                          {reviewData.errors.length === 0 && reviewData.warnings.length === 0 && reviewData.suggestions.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-4 bg-green-950/30 border border-green-500/50 rounded-lg text-center"
                            >
                              <p className="text-green-400" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                ✨ The code is clean! No curses detected.
                              </p>
                            </motion.div>
                          )}

                          {/* Show updated code indicator if available */}
                          {reviewData?.updatedCode && !showUpdatedCodeModal && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg cursor-pointer hover:bg-purple-950/60 transition-colors"
                              onClick={() => setShowUpdatedCodeModal(true)}
                            >
                              <p className="text-purple-300 text-sm flex items-center gap-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                <Ghost className="w-4 h-4" />
                                <span>👻 The Reaper has improved your code. Click to view changes.</span>
                              </p>
                            </motion.div>
                          )}

                        </motion.div>
                      )}

                      {showResponse && error && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-5 bg-red-950/50 border-2 border-red-500/70 rounded-lg shadow-xl"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Skull className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 font-bold text-base" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              💀 Error
                            </p>
                          </div>
                          <p className="text-red-300 text-sm mb-2 leading-relaxed" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                            {error}
                          </p>
                          {error.includes('overwhelmed') || error.includes('Too many requests') || error.includes('quota limit') || error.includes('daily quota') ? (
                            <div className="mt-3 p-3 bg-yellow-950/30 border border-yellow-500/50 rounded">
                              <p className="text-yellow-300 text-xs leading-relaxed" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                                ⚠️ {error.includes('daily quota') ? (
                                  <>
                                    <strong>Daily Quota Reached:</strong> You've hit the free tier limit of 200 requests/day. 
                                    The quota resets daily (usually at midnight Pacific Time). 
                                    {error.includes('wait') && error.match(/wait (\d+)/) && (
                                      <> You can retry in {error.match(/wait (\d+)/)?.[1]} seconds, or wait for the daily reset.</>
                                    )}
                                    <br /><br />
                                    <strong>Options:</strong>
                                    <br />• Wait for the daily reset (usually midnight PT)
                                    <br />• Upgrade your Google Cloud plan for higher quotas
                                    <br />• Use a different API key if you have one
                                  </>
                                ) : (
                                  'The Reaper needs a moment to rest. Please wait before summoning again.'
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="text-red-400/70 text-xs mt-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              Check the browser console for more details.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-3 mt-6">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                    <Button
                      id="summon-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Button clicked - calling summonReaper');
                        summonReaper();
                      }}
                      disabled={isAnalyzing || !code.trim() || rateLimited}
                      className="w-full bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 border-2 border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    >
                        {/* Animated gradient on hover */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatDelay: 1,
                          }}
                        />
                      <span className="relative z-10">
                        {rateLimited 
                          ? `⏳ The Reaper is resting... (${rateLimitCooldown}s)`
                          : isAnalyzing 
                            ? 'Summoning the Reaper...' 
                            : 'Summon the Reaper'}
                      </span>
                    </Button>
                  </motion.div>

                  </div>
                </div>
              </div>
            </motion.div>
          </ParallaxContainer>
        </div>
      </div>

      {/* PR Creation Modal */}
      <Dialog open={showPRModal} onOpenChange={setShowPRModal}>
        <DialogContent className="bg-black/95 border-purple-500/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-purple-400" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Create Pull Request
            </DialogTitle>
            <DialogDescription className="text-gray-400" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Select repository and file path for your improved code
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                Repository
              </label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {repos.map((repo) => (
                    <SelectItem key={repo.full_name} value={repo.full_name} className="text-white">
                      {repo.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                File Path (e.g., src/main.js)
              </label>
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="src/main.js"
                className="bg-gray-900 border-gray-700 text-white"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowPRModal(false)}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePR}
              disabled={!selectedRepo || !filePath || isCreatingPR}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              {isCreatingPR ? 'Creating...' : 'Create PR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Updated Code Modal with Diff */}
      <Dialog open={showUpdatedCodeModal} onOpenChange={setShowUpdatedCodeModal}>
        <DialogContent className="bg-[#0A0A0A] border-2 border-red-500/70 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          {/* Subtle overlay effect - much more opaque */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-purple-950/40 to-red-950/40 pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-red-400 flex items-center gap-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              <Ghost className="w-5 h-5" />
              The Reaper Has Improved Your Code
            </DialogTitle>
            <DialogDescription className="text-gray-400" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Review the changes below and choose an action
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative z-10 flex-1 overflow-auto space-y-4 py-4">
            {/* Changes Summary */}
            {reviewData?.changes && reviewData.changes.length > 0 && (
              <div className="bg-[#1A1A1A] border-2 border-purple-500/70 rounded-lg p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-purple-300" />
                  <p className="text-base font-bold text-purple-200" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    Changes Detected ({reviewData.changes.length} line{reviewData.changes.length !== 1 ? 's' : ''})
                  </p>
                </div>
                <div className="space-y-3 max-h-48 overflow-auto">
                  {reviewData.changes.map((change, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-[#0F0F0F] border border-gray-600/70 rounded-lg p-3 hover:border-purple-400/70 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-purple-300 font-bold text-sm flex-shrink-0 min-w-[60px]" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          Line {change.line}:
                        </span>
                        <div className="flex-1 space-y-2">
                          <div className="bg-red-950/60 border-l-4 border-red-400 rounded px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-red-400 font-bold">-</span>
                              <span className="text-xs text-red-300 uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Removed</span>
                            </div>
                            <p className="text-red-200 text-sm line-through opacity-90" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              {change.old}
                            </p>
                          </div>
                          <div className="bg-green-950/60 border-l-4 border-green-400 rounded px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-green-400 font-bold">+</span>
                              <span className="text-xs text-green-300 uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Added</span>
                            </div>
                            <p className="text-green-200 text-sm font-semibold" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              {change.new}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Updated Code Preview */}
            {improvedCode && (
              <div className="bg-[#1A1A1A] border-2 border-purple-500/70 rounded-lg overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-purple-900 to-red-900 px-4 py-3 border-b-2 border-purple-500/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-300" />
                    <p className="text-base font-bold text-purple-200" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      ✨ Exorcised Code
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-200 px-2 py-1 bg-purple-800/50 rounded border border-purple-400/50" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {selectedLanguage.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="p-6 bg-[#0F0F0F] max-h-[500px] overflow-auto">
                  <pre className="text-green-300 text-sm leading-relaxed whitespace-pre-wrap relative" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    <code className="block">
                      {improvedCode.split('\n').map((line, lineNum) => {
                        const lineNumber = lineNum + 1;
                        const isChanged = reviewData?.changes?.some(c => c.line === lineNumber);
                        return (
                          <div
                            key={lineNum}
                            className={`px-3 py-1.5 hover:bg-gray-800/60 transition-colors ${
                              isChanged 
                                ? 'bg-purple-900/60 border-l-4 border-purple-400 shadow-lg shadow-purple-500/30' 
                                : 'border-l-2 border-transparent'
                            }`}
                            title={isChanged ? '👻 The Reaper altered this line' : ''}
                          >
                            <span className="text-gray-400 text-xs mr-3 select-none">{String(lineNumber).padStart(3, ' ')}</span>
                            <span className={isChanged ? 'text-green-200 font-semibold' : 'text-green-300'}>
                              {line || '\u00A0'}
                            </span>
                          </div>
                        );
                      })}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="relative z-10 gap-3 flex-wrap">
            <Button
              onClick={handleDiscardCode}
              variant="outline"
              className="border-2 border-red-500/70 text-red-400 hover:bg-red-950/70 hover:border-red-500 px-6 py-3 text-sm font-medium transition-all"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              <X className="w-4 h-4 mr-2" />
              Discard
            </Button>
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="border-2 border-purple-500/70 text-purple-400 hover:bg-purple-950/70 hover:border-purple-500 px-6 py-3 text-sm font-medium transition-all relative overflow-hidden group"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
              <Copy className="w-4 h-4 mr-2 relative z-10" />
              <span className="relative z-10">Copy to Clipboard</span>
            </Button>
            <Button
              onClick={handleAcceptCode}
              className="bg-gradient-to-r from-red-600 via-purple-600 to-red-600 hover:from-red-700 hover:via-purple-700 hover:to-red-700 text-white px-6 py-3 text-sm font-bold border-2 border-purple-500/50 shadow-lg shadow-purple-500/30 transition-all relative overflow-hidden group"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
              <Check className="w-5 h-5 mr-2 relative z-10" />
              <span className="relative z-10">Accept Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 border-2 border-purple-500/50 rounded-lg px-6 py-3 shadow-2xl backdrop-blur-sm"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            <p className="text-white text-sm font-medium">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add shake keyframes to global styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </section>
  );
}