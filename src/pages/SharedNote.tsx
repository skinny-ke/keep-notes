import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, FileText, AlertCircle, Eye, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SharedNoteData {
  id: string;
  note_id: string;
  share_token: string;
  password_hash: string | null;
  expires_at: string | null;
  view_count: number;
}

interface NoteData {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  color: string | null;
}

const SharedNote = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedNote, setSharedNote] = useState<SharedNoteData | null>(null);
  const [note, setNote] = useState<NoteData | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (token) {
      loadSharedNote();
    }
  }, [token]);

  const loadSharedNote = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get shared note info
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('share_token', token)
        .eq('is_active', true)
        .single();

      if (sharedError || !sharedData) {
        setError("This shared link is invalid or has been deactivated.");
        setLoading(false);
        return;
      }

      // Check expiration
      if (sharedData.expires_at && new Date(sharedData.expires_at) < new Date()) {
        setError("This shared link has expired.");
        setLoading(false);
        return;
      }

      setSharedNote(sharedData);

      // Check if password protected
      if (sharedData.password_hash) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      // Load the note directly if no password
      await loadNoteContent(sharedData.note_id, sharedData.id);
    } catch (err: any) {
      setError("Failed to load shared note. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadNoteContent = async (noteId: string, sharedNoteId: string) => {
    try {
      // Use RPC or direct query - for public access we need service role
      // Since we can't use service role from client, we'll use an edge function
      const { data, error } = await supabase.functions.invoke('get-shared-note', {
        body: { noteId, sharedNoteId }
      });

      if (error || !data.success) {
        throw new Error(data?.error || "Failed to load note");
      }

      setNote(data.note);
      setRequiresPassword(false);
    } catch (err: any) {
      setError("Failed to load note content.");
    }
  };

  const hashPassword = async (pwd: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUnlock = async () => {
    if (!password || !sharedNote) return;

    setUnlocking(true);
    setPasswordError(false);

    try {
      const hashedPassword = await hashPassword(password);
      
      if (hashedPassword !== sharedNote.password_hash) {
        setPasswordError(true);
        setUnlocking(false);
        return;
      }

      await loadNoteContent(sharedNote.note_id, sharedNote.id);
    } catch (err) {
      setPasswordError(true);
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shared note...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Unable to Load Note</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>This note requires a password to view</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className={passwordError ? 'border-destructive' : ''}
              />
              {passwordError && (
                <p className="text-sm text-destructive">Incorrect password. Please try again.</p>
              )}
            </div>
            <Button 
              onClick={handleUnlock} 
              disabled={!password || unlocking}
              className="w-full"
            >
              {unlocking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                "Unlock Note"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (note) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Card 
            className="overflow-hidden"
            style={{ 
              backgroundColor: note.color || undefined,
              borderColor: note.color ? 'transparent' : undefined
            }}
          >
            <CardHeader className="border-b bg-background/50 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <CardTitle className="text-xl">
                      {note.title || "Untitled Note"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(note.updated_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {sharedNote && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {sharedNote.view_count} views
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {note.content ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              ) : (
                <p className="text-muted-foreground italic">This note has no content.</p>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Shared via <span className="font-medium">NoteDown</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SharedNote;