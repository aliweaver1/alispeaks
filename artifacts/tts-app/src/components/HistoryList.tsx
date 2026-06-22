import { format } from "date-fns";
import { HistoryItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { AudioPlayer } from "./AudioPlayer";

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
}

export function HistoryList({ items, isLoading }: HistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border border-dashed">
        <p>No generation history found.</p>
        <p className="text-sm mt-1">Generations will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.id} className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-4 border-b border-border/50 flex justify-between items-start gap-4">
            <div>
              <h4 className="font-medium text-sm text-foreground">{item.voice_name}</h4>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {format(new Date(item.created_at), "MMM d, yyyy • HH:mm:ss")}
              </p>
            </div>
            <div className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
              {item.character_count} chars
            </div>
          </div>
          
          <div className="p-4 bg-muted/10 text-sm text-foreground/80 leading-relaxed max-h-32 overflow-y-auto">
            {item.text}
          </div>

          {item.audio_base64 && (
            <div className="p-4 border-t border-border/50">
              <AudioPlayer 
                base64Audio={item.audio_base64} 
                contentType="audio/mpeg" 
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
