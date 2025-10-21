import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image as ImageIcon, Music, Video, Upload, X, Loader2 } from "lucide-react";

interface MediaItem {
  id: string;
  media_type: string;
  storage_path: string;
}

interface NoteEditorProps {
  noteId?: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const NoteEditor = ({ noteId, open, onClose, onSave }: NoteEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (noteId && open) {
      loadNote();
    } else if (!noteId) {
      setTitle("");
      setContent("");
      setMedia([]);
    }
  }, [noteId, open]);

  const loadNote = async () => {
    if (!noteId) return;

    try {
      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError) throw noteError;

      setTitle(noteData.title || "");
      setContent(noteData.content || "");

      const { data: mediaData, error: mediaError } = await supabase
        .from('note_media')
        .select('*')
        .eq('note_id', noteId);

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load note");
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (noteId) {
        const { error } = await supabase
          .from('notes')
          .update({ title: title || null, content: content || null })
          .eq('id', noteId);

        if (error) throw error;
        toast.success("Note updated");
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert({ 
            title: title || null, 
            content: content || null,
            user_id: user.id 
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Note created");
      }

      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !noteId) {
      if (!noteId) {
        toast.error("Please save the note first before adding media");
      }
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const bucket = type === 'image' ? 'note-images' : type === 'audio' ? 'note-audio' : 'note-videos';
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('note_media')
        .insert({
          note_id: noteId,
          media_type: type,
          storage_path: filePath,
        });

      if (dbError) throw dbError;

      toast.success(`${type} uploaded`);
      loadNote();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = async (mediaId: string, storagePath: string, mediaType: string) => {
    try {
      const bucket = mediaType === 'image' ? 'note-images' 
        : mediaType === 'audio' ? 'note-audio' 
        : 'note-videos';

      await supabase.storage.from(bucket).remove([storagePath]);

      const { error } = await supabase
        .from('note_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setMedia(media.filter(m => m.id !== mediaId));
      toast.success("Media removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove media");
    }
  };

  const getPublicUrl = (mediaType: string, path: string) => {
    const bucket = mediaType === 'image' ? 'note-images' 
      : mediaType === 'audio' ? 'note-audio' 
      : 'note-videos';
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{noteId ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
            />
          </div>

          {noteId && (
            <div className="space-y-3">
              <Label>Media</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'image')}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('audio-upload')?.click()}
                >
                  <Music className="h-4 w-4 mr-2" />
                  Audio
                </Button>
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'audio')}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('video-upload')?.click()}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'video')}
                />

                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              {media.length > 0 && (
                <div className="space-y-2 pt-2">
                  {media.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{item.media_type}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMedia(item.id, item.storage_path, item.media_type)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {item.media_type === 'image' && (
                        <img
                          src={getPublicUrl(item.media_type, item.storage_path)}
                          alt="Note media"
                          className="w-full rounded-md"
                        />
                      )}
                      {item.media_type === 'audio' && (
                        <audio controls className="w-full">
                          <source src={getPublicUrl(item.media_type, item.storage_path)} />
                        </audio>
                      )}
                      {item.media_type === 'video' && (
                        <video controls className="w-full rounded-md">
                          <source src={getPublicUrl(item.media_type, item.storage_path)} />
                        </video>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoteEditor;