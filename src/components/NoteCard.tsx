import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Image as ImageIcon, Music, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  media_type: string;
  storage_path: string;
}

interface NoteCardProps {
  note: {
    id: string;
    title: string | null;
    content: string | null;
    created_at: string;
  };
  media: MediaItem[];
  onDelete: () => void;
  onClick: () => void;
}

const NoteCard = ({ note, media, onDelete, onClick }: NoteCardProps) => {
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Delete media files first
      for (const item of media) {
        const bucket = item.media_type === 'image' ? 'note-images' 
          : item.media_type === 'audio' ? 'note-audio' 
          : 'note-videos';
        
        await supabase.storage.from(bucket).remove([item.storage_path]);
      }

      // Delete note (cascade will handle note_media)
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (error) throw error;

      toast.success("Note deleted");
      onDelete();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] cursor-pointer border-border/50 bg-gradient-to-br from-card to-card/80"
      onClick={onClick}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-2 flex-1">
            {note.title || "Untitled Note"}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        
        {note.content && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {note.content}
          </p>
        )}

        {media.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/50 text-accent-foreground text-xs"
              >
                {getMediaIcon(item.media_type)}
                <span className="capitalize">{item.media_type}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
          {new Date(note.created_at).toLocaleDateString()}
        </p>
      </div>
    </Card>
  );
};

export default NoteCard;