// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/ImageGenerator.tsx
import React, { useState } from 'react';
import { Image, Download, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { PromptInput } from './PromptInput';
import { ResultViewer } from './ResultViewer';

interface ImageGeneratorProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
type ImageQuality = 'standard' | 'hd';
type ImageStyle = 'vivid' | 'natural';

export const ImageGenerator: React.FC < ImageGeneratorProps > = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState < ImageSize > ('1024x1024');
  const [quality, setQuality] = useState < ImageQuality > ('standard');
  const [style, setStyle] = useState < ImageStyle > ('vivid');
  const [numImages, setNumImages] = useState(1);
  const [result, setResult] = useState < string[] | null > (null);
  const [error, setError] = useState < string | null > (null);
  const [copied, setCopied] = useState(false);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      // Simulate API call – replace with actual backend call to DALL-E / Stable Diffusion
      await new Promise(resolve => setTimeout(resolve, 3000));
      // Mock image URLs
      const mockImages = [
        'https://placehold.co/1024x1024/3b82f6/white?text=Generated+Image+1',
        'https://placehold.co/1024x1024/10b981/white?text=Generated+Image+2',
      ].slice(0, numImages);
      setResult(mockImages);
    } catch (err) {
      setError('Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDownloadAll = () => {
    if (result) {
      result.forEach((url, idx) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated_image_${Date.now()}_${idx}.png`;
        a.click();
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Parameters panel */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Image Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Size</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as ImageSize)}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1792x1024">1792x1024 (landscape)</option>
              <option value="1024x1792">1024x1792 (portrait)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as ImageQuality)}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="standard">Standard</option>
              <option value="hd">HD (higher quality)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as ImageStyle)}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="vivid">Vivid (more vibrant)</option>
              <option value="natural">Natural (more realistic)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Number of Images</label>
            <select
              value={numImages}
              onChange={(e) => setNumImages(parseInt(e.target.value))}
              className="w-full px-2 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value={1}>1 image</option>
              <option value={2}>2 images</option>
              <option value={3}>3 images</option>
              <option value={4}>4 images</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-secondary-500 mb-1">Negative Prompt (optional)</label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Things to avoid in the image..."
            className="w-full px-3 py-1.5 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
      </div>

      {/* Prompt input */}
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleGenerate}
        isLoading={isLoading}
        placeholder="Describe the image you want to generate..."
      />

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Generated images */}
      {result && result.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Generated Images</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy Prompt
              </button>
              <button
                onClick={handleDownloadAll}
                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Download All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.map((imgUrl, idx) => (
              <div key={idx} className="relative group">
                <img src={imgUrl} alt={`Generated ${idx + 1}`} className="w-full rounded-lg border border-secondary-200 dark:border-secondary-700" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <a href={imgUrl} download={`image_${Date.now()}_${idx}.png`} className="p-2 bg-white rounded-lg text-secondary-900">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="text-center text-xs text-secondary-400">
        Powered by DALL-E 3 and Stable Diffusion. Images are AI-generated and may not be perfect.
      </div>
    </div>
  );
};
export default ImageGenerator;
