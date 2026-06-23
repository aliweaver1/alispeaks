import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  base64Audio: string;
  contentType: string;
  autoPlay?: boolean;
  filename?: string;
}

export function AudioPlayer({ base64Audio, contentType, autoPlay = false, filename = "audio.mp3" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: contentType });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });

      audio.addEventListener("timeupdate", () => {
        setProgress(audio.currentTime);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
      });

      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(console.error);
      }

      return () => {
        audio.pause();
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
        audioRef.current = null;
      };
    } catch (err) {
      console.error("Failed to parse audio base64", err);
    }
  }, [base64Audio, contentType, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!blobUrlRef.current) return;
    const a = document.createElement("a");
    a.href = blobUrlRef.current;
    a.download = filename;
    a.click();
  };

  const handleSliderChange = (vals: number[]) => {
    if (!audioRef.current) return;
    const val = vals[0];
    audioRef.current.currentTime = val;
    setProgress(val);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border border-border/50">
      <Button
        variant="outline"
        size="icon"
        className={cn("h-12 w-12 rounded-full shrink-0", isPlaying ? "text-primary border-primary" : "")}
        onClick={togglePlay}
        data-testid="btn-play-audio"
      >
        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
      </Button>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          value={[progress]}
          max={duration || 100}
          step={0.01}
          onValueChange={handleSliderChange}
          className="cursor-pointer [&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
        />
      </div>

      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Volume2 className="hidden sm:block h-4 w-4" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDownload}
          title="Download MP3"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
