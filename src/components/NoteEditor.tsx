import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Image as ImageIcon, Music, Video, X, Loader2, History, Pin, PinOff, Palette, Share2 } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import DrawingCanvas from "./DrawingCanvas";
import VersionHistory from "./VersionHistory";
import TagManager from "./TagManager";
import ShareNoteDialog from "./ShareNoteDialog";

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

interface NoteEditorProps {
  noteId?: string;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const NOTE_COLORS = [
  null, // Default
  "#fef3c7", "#fecaca", "#fed7aa", "#fde68a",
  "#d9f99d", "#bbf7d0", "#a5f3fc", "#bfdbfe",
  "#ddd6fe", "#f5d0fe", "#fecdd3", "#e5e7eb"
];

const NoteEditor = ({ noteId, open, onClose, onSave }: NoteEditorProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (noteId && open) {
      loadNote();
    } else if (!noteId) {
      setTitle("");
      setContent("");
      setMedia([]);
      setTags([]);
      setIsPinned(false);
      setColor(null);
    }
  }, [noteId, open]);

  // Auto-save effect
  useEffect(() => {
    if (!open || !hasUnsavedChanges) return;

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (3 seconds after last change)
    const timeout = setTimeout(() => {
      handleAutoSave();
    }, 3000);

    setAutoSaveTimeout(timeout);

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [title, content, hasUnsavedChanges]);

  // Track changes
  useEffect(() => {
    if (open && (title || content)) {
      setHasUnsavedChanges(true);
    }
  }, [title, content, open]);

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
      setIsPinned(noteData.is_pinned || false);
      setColor(noteData.color || null);
      setHasUnsavedChanges(false);

      // Load media
      const { data: mediaData, error: mediaError } = await supabase
        .from('note_media')
        .select('*')
        .eq('note_id', noteId);

      if (mediaError) throw mediaError;
      setMedia(mediaData || []);

      // Load tags
      const { data: tagData, error: tagError } = await supabase
        .from('note_tags')
        .select('tag_id, tags(id, name, color)')
        .eq('note_id', noteId);

      if (tagError) throw tagError;
      setTags(tagData?.map((t: any) => t.tags).filter(Boolean) || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load note");
    }
  };

  const handleAutoSave = async () => {
    if (!noteId || loading) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notes')
        .update({ title: title || null, content: content || null, is_pinned: isPinned, color })
        .eq('id', noteId);

      if (error) throw error;
      
      setHasUnsavedChanges(false);
      toast.success("Auto-saved", { duration: 1500 });
    } catch (error: any) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (noteId) {
        // Save current version to history before updating
        const { data: currentNote } = await supabase
          .from('notes')
          .select('title, content')
          .eq('id', noteId)
          .single();

        if (currentNote) {
          // Get the latest version number
          const { data: latestVersion } = await supabase
            .from('note_versions')
            .select('version_number')
            .eq('note_id', noteId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

          const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

          // Save the current version
          await supabase.from('note_versions').insert({
            note_id: noteId,
            title: currentNote.title,
            content: currentNote.content,
            version_number: nextVersionNumber,
          });
        }

        // Update the note
        const { error } = await supabase
          .from('notes')
          .update({ title: title || null, content: content || null, is_pinned: isPinned, color })
          .eq('id', noteId);

        if (error) throw error;
        setHasUnsavedChanges(false);
        toast.success("Note updated");
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert({ 
            title: title || null, 
            content: content || null,
            user_id: user.id,
            is_pinned: isPinned,
            color
          })
          .select()
          .single();

        if (error) throw error;
        setHasUnsavedChanges(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: color || undefined }}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle>{noteId ? "Edit Note" : "New Note"}</DialogTitle>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Pin Button */}
              <Button
                variant={isPinned ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPinned(!isPinned)}
                className="gap-1"
              >
                {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {isPinned ? "Unpin" : "Pin"}
              </Button>

              {/* Color Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Palette className="h-4 w-4" />
                    Color
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <div className="grid grid-cols-4 gap-2">
                    {NOTE_COLORS.map((c, i) => (
                      <button
                        key={i}
                        className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c || 'transparent',
                          borderColor: color === c ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                        }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tags (only for existing notes) */}
              {noteId && (
                <TagManager
                  noteId={noteId}
                  selectedTags={tags}
                  onTagsChange={loadNote}
                />
              )}

              {/* Share Button (only for existing notes) */}
              {noteId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  className="gap-1"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}

              {/* History Button */}
              {noteId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVersionHistoryOpen(true)}
                  className="gap-1"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              )}
            </div>
          </div>
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

          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Rich Text Editor</TabsTrigger>
              <TabsTrigger value="drawing">Drawing</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor content={content} onChange={setContent} />
            </TabsContent>
            <TabsContent value="drawing" className="space-y-2">
              <Label>Drawing</Label>
              <DrawingCanvas
                onSave={async (dataUrl) => {
                  if (!noteId) {
                    toast.error("Please save the note first");
                    return;
                  }
                  
                  // Convert data URL to blob
                  const response = await fetch(dataUrl);
                  const blob = await response.blob();
                  const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
                  
                  // Upload as image
                  setUploading(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Not authenticated");

                    const filePath = `${user.id}/${Date.now()}_drawing.png`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('note-images')
                      .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { error: dbError } = await supabase
                      .from('note_media')
                      .insert({
                        note_id: noteId,
                        media_type: 'image',
                        storage_path: filePath,
                      });

                    if (dbError) throw dbError;

                    toast.success("Drawing saved!");
                    loadNote();
                  } catch (error: any) {
                    toast.error(error.message || "Failed to save drawing");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </TabsContent>
          </Tabs>

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
      
      {noteId && (
        <VersionHistory
          noteId={noteId}
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
          onRestore={(version) => {
            setTitle(version.title || "");
            setContent(version.content || "");
            toast.success("Version restored");
          }}
        />
      )}

      {noteId && (
        <ShareNoteDialog
          noteId={noteId}
          noteTitle={title}
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </Dialog>
  );
};

export default NoteEditor;