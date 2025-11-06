import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
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

interface Note {
  id: string;
  title: string | null;
  content: string | null;
  deleted_at: string;
}

const Trash = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    loadDeletedNotes();
  };

  const loadDeletedNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load deleted notes");
    } finally {
      setLoading(false);
    }
  };

  const restoreNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: null })
        .eq('id', noteId);

      if (error) throw error;
      toast.success("Note restored");
      loadDeletedNotes();
    } catch (error: any) {
      toast.error(error.message || "Failed to restore note");
    }
  };

  const permanentlyDelete = async (noteId: string) => {
    try {
      // Delete associated media files
      const { data: media } = await supabase
        .from('note_media')
        .select('*')
        .eq('note_id', noteId);

      if (media) {
        for (const item of media) {
          const bucket = item.media_type === 'image' ? 'note-images' :
                        item.media_type === 'audio' ? 'note-audio' : 'note-videos';
          await supabase.storage.from(bucket).remove([item.storage_path]);
        }
      }

      // Delete the note (cascade will handle media records and tags)
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      toast.success("Note permanently deleted");
      loadDeletedNotes();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  const emptyTrash = async () => {
    try {
      for (const note of notes) {
        await permanentlyDelete(note.id);
      }
      toast.success("Trash emptied");
    } catch (error: any) {
      toast.error(error.message || "Failed to empty trash");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notes
          </Button>

          {notes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {notes.length} note(s) in trash. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={emptyTrash}>Empty Trash</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-8">Trash</h1>

        {notes.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Trash2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Trash is empty</h2>
              <p className="text-muted-foreground">Deleted notes will appear here</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id} className="opacity-75">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2 line-clamp-1">
                    {note.title || "Untitled"}
                  </h3>
                  {note.content && (
                    <div 
                      className="text-sm text-muted-foreground line-clamp-3 mb-4"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground mb-4">
                    Deleted {formatDistanceToNow(new Date(note.deleted_at), { addSuffix: true })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreNote(note.id)}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this note. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => permanentlyDelete(note.id)}>
                            Delete Forever
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trash;
