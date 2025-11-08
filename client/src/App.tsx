import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { Github } from 'lucide-react';
import { Hero } from './components/Hero';
import { Demo } from './components/Demo';
import { HowItWorks } from './components/HowItWorks';
import { FogBackground } from './components/FogBackground';
import { BinaryRain } from './components/BinaryRain';
import { LightningFlash } from './components/LightningFlash';
import { GhostFlicker } from './components/GhostFlicker';
import { AudioControls } from './components/AudioControls';
import { getGitHubTokenFromURL, storeGitHubToken, initiateGitHubOAuth, getStoredGitHubToken, getGitHubOAuthError } from './services/api';

export default function App() {
  const [errorIntensity, setErrorIntensity] = useState(0);
  const [hasGitHubToken, setHasGitHubToken] = useState(false);
  const [githubError, setGitHubError] = useState<string | null>(null);

  useEffect(() => {
    // Handle GitHub OAuth callback
    const token = getGitHubTokenFromURL();
    if (token) {
      storeGitHubToken(token);
      setHasGitHubToken(true);
      setGitHubError(null); // Clear any previous errors
      // Clean up URL (getGitHubTokenFromURL already handles this, but ensure it's clean)
      if (window.location.hash) {
        window.location.hash = '';
      }
      if (window.location.search.includes('token=')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else {
      // Check for OAuth errors
      const error = getGitHubOAuthError();
      if (error) {
        setGitHubError(error);
        // Auto-dismiss after 10 seconds
        setTimeout(() => setGitHubError(null), 10000);
      }
    }

    // Check for existing GitHub token
    const checkToken = () => {
      const existingToken = getStoredGitHubToken();
      setHasGitHubToken(!!existingToken);
    };
    
    checkToken();
    // Check periodically in case token is added from OAuth callback
    const interval = setInterval(checkToken, 1000);

    // Keyboard shortcut Ctrl + Shift + R
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
        // Trigger the reaper
        const summonBtn = document.getElementById('summon-btn');
        if (summonBtn) {
          summonBtn.click();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
      clearInterval(interval);
    };
  }, []);

  const handleGitHubAuth = () => {
    initiateGitHubOAuth();
  };

  return (
    <div className="relative bg-[#0A0A0A] text-white overflow-x-hidden min-h-screen">
      {/* GitHub OAuth Error Toast */}
      {githubError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] max-w-md"
        >
          <div className="bg-red-950/95 border-2 border-red-500/70 rounded-lg p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="flex-1">
                <p className="text-red-200 font-bold mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  GitHub OAuth Error
                </p>
                <p className="text-red-300 text-sm leading-relaxed" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {githubError}
                </p>
              </div>
              <button
                onClick={() => setGitHubError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* GitHub Button - Sticky Top Right - Always Visible */}
      <motion.div
        className="fixed top-6 right-6 z-50"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <Button
          onClick={handleGitHubAuth}
          className="relative group bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-6 py-3 text-sm font-semibold border-2 border-purple-400/60 overflow-hidden flex items-center gap-2 shadow-2xl transition-all hover:scale-110 hover:shadow-purple-500/50"
          style={{ 
            fontFamily: "'Share Tech Mono', monospace",
            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.6), 0 0 30px rgba(147, 51, 234, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Animated gradient shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: 'linear'
            }}
          />
          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-0 rounded-lg"
            animate={{
              boxShadow: [
                '0 0 20px rgba(147, 51, 234, 0.5)',
                '0 0 40px rgba(147, 51, 234, 0.8)',
                '0 0 20px rgba(147, 51, 234, 0.5)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
          <Github className="w-5 h-5 relative z-10 drop-shadow-lg" />
          <span className="relative z-10 whitespace-nowrap">
            {hasGitHubToken ? '✓ GitHub' : 'Connect GitHub'}
          </span>
        </Button>
      </motion.div>

      <FogBackground errorIntensity={errorIntensity} />
      <BinaryRain />
      <LightningFlash />
      <GhostFlicker />
      <AudioControls />
      
      <div className="relative z-10">
        <Hero />
        <Demo onErrorIntensityChange={setErrorIntensity} />
        <HowItWorks />
      </div>
    </div>
  );
}