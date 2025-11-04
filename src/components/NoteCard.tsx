import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, FileText, Image as ImageIcon, Music, Video, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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
  const handleDelete = async () => {
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your note
                  and all associated media files.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        {note.content && (
          <div 
            className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-ol:m-0"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
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

        <div className="flex items-center gap-1 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </Card>
  );
};

export default NoteCard;