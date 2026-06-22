import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Settings2, SlidersHorizontal, Info, Mic } from "lucide-react";
import { useListVoices, useGenerateSpeech, useGetHistory, getGetHistoryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { HistoryList } from "@/components/HistoryList";
import { AudioPlayer } from "@/components/AudioPlayer";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: voices = [], isLoading: isLoadingVoices } = useListVoices({}, { query: { enabled: true } });
  const { data: history = [], isLoading: isLoadingHistory } = useGetHistory({}, { query: { enabled: true } });
  
  const generateSpeech = useGenerateSpeech();

  const maxChars = 5000;
  const isOverLimit = text.length > maxChars;

  const handleGenerate = () => {
    if (!text.trim()) {
      toast({ title: "Error", description: "Please enter text to generate speech.", variant: "destructive" });
      return;
    }
    if (!voiceId) {
      toast({ title: "Error", description: "Please select a voice.", variant: "destructive" });
      return;
    }
    if (isOverLimit) {
      toast({ title: "Error", description: "Character limit exceeded.", variant: "destructive" });
      return;
    }

    generateSpeech.mutate(
      {
        data: {
          text,
          voice_id: voiceId,
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
          toast({ title: "Success", description: "Speech generated successfully!" });
        },
        onError: (err) => {
          toast({ 
            title: "Generation failed", 
            description: err?.error?.error || "Unknown error occurred.", 
            variant: "destructive" 
          });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground p-6 md:p-10 font-sans selection:bg-primary/30 dark">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-7 space-y-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Mic className="text-primary h-8 w-8" />
              TTS Studio
            </h1>
            <p className="text-muted-foreground mt-2">Professional synthesis control room.</p>
          </header>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Voice Selection</Label>
            </div>
            <Select value={voiceId} onValueChange={setVoiceId} disabled={isLoadingVoices}>
              <SelectTrigger className="w-full h-12 bg-card border-border">
                <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : "Select a voice"} />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} <span className="text-muted-foreground ml-2">({v.category})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Script</Label>
              <span className={`text-xs font-mono ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {text.length} / {maxChars}
              </span>
            </div>
            <Textarea
              placeholder="Enter your script here..."
              className="min-h-[240px] resize-y bg-card border-border text-base leading-relaxed p-4"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="border border-border rounded-lg bg-card overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex justify-between items-center p-4 h-auto rounded-none hover:bg-muted/50">
                <span className="flex items-center gap-2 font-medium">
                  <Settings2 className="h-4 w-4" />
                  Voice Settings
                </span>
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-6 pt-2 space-y-6 border-t border-border">
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm">Stability</Label>
                  <span className="text-xs font-mono text-muted-foreground">{stability.toFixed(2)}</span>
                </div>
                <Slider value={[stability]} min={0} max={1} step={0.01} onValueChange={([v]) => setStability(v)} />
                <p className="text-xs text-muted-foreground">Lower values mean more emotion and randomness, higher values are more consistent but can be monotonous.</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm">Similarity Boost</Label>
                  <span className="text-xs font-mono text-muted-foreground">{similarityBoost.toFixed(2)}</span>
                </div>
                <Slider value={[similarityBoost]} min={0} max={1} step={0.01} onValueChange={([v]) => setSimilarityBoost(v)} />
                <p className="text-xs text-muted-foreground">High values make the voice closer to the original but may introduce artifacts.</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-sm">Style Exaggeration</Label>
                  <span className="text-xs font-mono text-muted-foreground">{style.toFixed(2)}</span>
                </div>
                <Slider value={[style]} min={0} max={1} step={0.01} onValueChange={([v]) => setStyle(v)} />
                <p className="text-xs text-muted-foreground">Higher values amplify the voice's style but can cause instability.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Speaker Boost</Label>
                  <p className="text-xs text-muted-foreground">Boost similarity at the cost of latency</p>
                </div>
                <Switch checked={useSpeakerBoost} onCheckedChange={setUseSpeakerBoost} />
              </div>

            </CollapsibleContent>
          </Collapsible>

          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-medium" 
            onClick={handleGenerate}
            disabled={generateSpeech.isPending || !text.trim() || !voiceId || isOverLimit}
          >
            {generateSpeech.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="h-5 w-5 fill-current" />
                Generate Audio
              </span>
            )}
          </Button>

          {generateSpeech.data && !generateSpeech.isPending && (
            <div className="pt-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <Label className="text-sm font-medium uppercase tracking-wider text-muted-foreground block mb-3">Result</Label>
              <AudioPlayer 
                base64Audio={generateSpeech.data.audio_base64} 
                contentType={generateSpeech.data.content_type || "audio/mpeg"} 
                autoPlay 
              />
            </div>
          )}
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-5 flex flex-col h-full space-y-6">
          <div className="flex items-end justify-between pb-2 border-b border-border">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Recent Takes
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-thin">
            <HistoryList items={history} isLoading={isLoadingHistory} />
          </div>
        </div>

      </div>
    </div>
  );
}
