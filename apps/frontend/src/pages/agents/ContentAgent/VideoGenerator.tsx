// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/VideoGenerator.tsx
import React, { useState } from 'react';
import { Video, Download, Copy, AlertCircle, Clock, Film } from 'lucide-react';
import { PromptInput } from './PromptInput';

interface VideoGeneratorProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type VideoDuration = 4 | 8 | 12;
type VideoResolution = '720p' | '1080p';

export const VideoGenerator: React.FC < VideoGeneratorProps > = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState < VideoDuration > (4);
  const [resolution, setResolution] = useState < VideoResolution > ('720p');
  const [result, setResult] = useState < string | null > (null);
  const [error, setError] = useState < string | null > (null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      // Simulate video generation progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setProgress(i);
      }
      // Mock video URL
      setResult('https://placehold.co/1920x1080/8b5cf6/white?text=Generated+Video+Preview');
    } catch (err) {
      setError('Failed to generate video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownload = () => {
    if (result) {
      const a = document.createElement('a');
      a.href = result;
      a.download = `generated_video_${Date.now()}.mp4`;
      a.click();
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Enterprise notice */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3">
          <Film className="h-8 w-8 text-purple-600" />
          <div>
            <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">Enterprise Feature</h3>
            <p className="text-xs text-purple-600 dark:text-purple-400">Video generation is available on Enterprise plans only.</p>
          </div>
        </div>
      </div>

      {/* Parameters panel */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Video Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) as VideoDuration)}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              disabled
            >
              <option value={4}>4 seconds</option>
              <option value={8}>8 seconds</option>
              <option value={12}>12 seconds</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as VideoResolution)}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              disabled
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompt input */}
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleGenerate}
        isLoading={isLoading}
        placeholder="Describe the video you want to generate..."
      />

      {/* Progress bar during generation */}
      {isLoading && progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-secondary-500">
            <span>Generating video...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Generated video preview */}
      {result && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Generated Video</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy Prompt
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Download Video
              </button>
            </div>
          </div>
          <div className="relative aspect-video bg-secondary-900 rounded-lg overflow-hidden">
            <img src={result} alt="Video preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Video className="h-12 w-12 text-white opacity-75" />
            </div>
          </div>
          <p className="text-xs text-secondary-500 text-center">
            Video generation is simulated. In production, this would be a real video from Runway or Pika Labs.
          </p>
        </div>
      )}

      {/* Info note */}
      <div className="text-center text-xs text-secondary-400">
        Powered by Runway Gen-2 and Pika Labs. Videos are generated at 24fps.
      </div>
    </div>
  );
};
export default VideoGenerator;
