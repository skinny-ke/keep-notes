import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, StickyNote } from "lucide-react";
import NoteCard from "@/components/NoteCard";
import NoteEditor from "@/components/NoteEditor";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
}

interface MediaItem {
  id: string;
  note_id: string;
  media_type: string;
  storage_path: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadNotes();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadNotes = async () => {
    try {
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      const { data: mediaData, error: mediaError } = await supabase
        .from('note_media')
        .select('*');

      if (mediaError) throw mediaError;

      setNotes(notesData || []);
      setMedia(mediaData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCreateNote = () => {
    setSelectedNoteId(undefined);
    setEditorOpen(true);
  };

  const handleEditNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setEditorOpen(true);
  };

  const getNoteMedia = (noteId: string) => {
    return media.filter(m => m.note_id === noteId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
              <StickyNote className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                My Notes
              </h1>
              <p className="text-sm text-muted-foreground">
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateNote} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Note
            </Button>
            <Button variant="outline" onClick={handleLogout} size="lg">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-2xl bg-accent/50 mb-6">
              <StickyNote className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No notes yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first note with text, images, audio, or video
            </p>
            <Button onClick={handleCreateNote} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Your First Note
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                media={getNoteMedia(note.id)}
                onDelete={loadNotes}
                onClick={() => handleEditNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NoteEditor
        noteId={selectedNoteId}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={loadNotes}
      />
    </div>
  );
};

export default Index;