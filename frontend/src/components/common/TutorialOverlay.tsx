import { Play } from 'lucide-react';

interface TutorialOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function TutorialOverlay({ isVisible, onComplete }: TutorialOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm">
      {/* Pinch icon in the center */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="flex flex-col items-center gap-4">
          {/* Pinch icon SVG */}
          <svg className="w-24 h-24 text-white/80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={2}>
            {/* Left hand */}
            <path d="M20 40 L20 30 Q20 20 30 20 L35 20" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 60 L20 70 Q20 80 30 80 L35 80" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 45 L25 55" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Right hand */}
            <path d="M80 40 L80 30 Q80 20 70 20 L65 20" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M80 60 L80 70 Q80 80 70 80 L65 80" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M75 45 L75 55" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Arrows indicating pinch out */}
            <path d="M25 35 L20 30 L30 30" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M75 35 L80 30 L70 30" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 65 L20 70 L30 70" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M75 65 L80 70 L70 70" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          
          <p className="text-white text-center text-lg font-medium px-4">
           Start by pinching or zooming on the map to view posts, or click Play Posts to automatically zoom on posts.
          </p>
        </div>
         <button onClick={onComplete} className="text-white text-center text-lg font-medium px-4 mt-4 bg-white border py-1 rounded-full"><span className='text-base text-black'>Got it!</span></button>
      </div>

     

      {/* Play button positioned exactly like in OptimizedMapsPage */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-3 py-2 md:px-4 text-sm md:text-base md:py-3 rounded-full transition-colors bg-secondary/80 backdrop-blur-[5px] [-webkit-backdrop-filter:blur(5px)] hover:bg-secondary-50 text-white"
          title="Play Posts"
        >
          <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
          <span className="font-medium">Play Posts</span>
        </button>
      </div>
    </div>
  );
}
