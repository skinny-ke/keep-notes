import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, FileText, Image as ImageIcon, Music, Video, Calendar, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface MediaItem {
  id: string;
  media_type: string;
  storage_path: string;
}

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface NoteCardProps {
  note: {
    id: string;
    title: string | null;
    content: string | null;
    created_at: string;
    is_pinned?: boolean;
    color?: string | null;
  };
  media: MediaItem[];
  tags?: Tag[];
  onDelete: () => void;
  onClick: () => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}

const NoteCard = ({ note, media, tags = [], onDelete, onClick, selected, onSelect }: NoteCardProps) => {
  const handleDelete = async () => {
    try {
      // Soft delete - just set deleted_at
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', note.id);

      if (error) throw error;

      toast.success("Note moved to trash");
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
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] cursor-pointer border-border/50 ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
      style={{ 
        boxShadow: 'var(--shadow-card)',
        backgroundColor: note.color || undefined,
        borderLeftWidth: note.color ? '4px' : undefined,
        borderLeftColor: note.color || undefined
      }}
    >
      <div className="p-4 space-y-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(e.target.checked);
            }}
            className="absolute top-3 left-3 h-4 w-4 rounded border-gray-300"
          />
        )}
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-start gap-2">
              {note.is_pinned && (
                <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-1" fill="currentColor" />
              )}
              <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                {note.title || "Untitled Note"}
              </h3>
            </div>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color || undefined }}
                    className="text-xs"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
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
                <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can restore this note from the trash later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Move to Trash
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