import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  media: MediaItem[];
}

const ExportDialog = ({ open, onClose, notes, media }: ExportDialogProps) => {
  const exportAsJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      notesCount: notes.length,
      notes: notes.map(note => ({
        ...note,
        media: media.filter(m => m.note_id === note.id)
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notesapp-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Notes exported as JSON");
    onClose();
  };

  const exportAsText = () => {
    let text = "NotesApp Export\n";
    text += `Export Date: ${new Date().toLocaleString()}\n`;
    text += `Total Notes: ${notes.length}\n\n`;
    text += "=".repeat(50) + "\n\n";

    notes.forEach((note, index) => {
      text += `Note ${index + 1}\n`;
      text += `Title: ${note.title || "Untitled"}\n`;
      text += `Created: ${new Date(note.created_at).toLocaleString()}\n`;
      text += `Content:\n${note.content || "(no content)"}\n`;
      
      const noteMedia = media.filter(m => m.note_id === note.id);
      if (noteMedia.length > 0) {
        text += `Media: ${noteMedia.map(m => m.media_type).join(", ")}\n`;
      }
      
      text += "\n" + "-".repeat(50) + "\n\n";
    });

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notesapp-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Notes exported as text");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Notes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Download all your notes ({notes.length} {notes.length === 1 ? 'note' : 'notes'}) in your preferred format.
          </p>

          <div className="space-y-2">
            <Button 
              onClick={exportAsJSON} 
              className="w-full justify-start gap-3"
              variant="outline"
            >
              <FileJson className="h-5 w-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Export as JSON</span>
                <span className="text-xs text-muted-foreground">Complete data with metadata</span>
              </div>
            </Button>

            <Button 
              onClick={exportAsText} 
              className="w-full justify-start gap-3"
              variant="outline"
            >
              <FileText className="h-5 w-5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Export as Text</span>
                <span className="text-xs text-muted-foreground">Human-readable format</span>
              </div>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Note: Media files are not included in exports. Only references to media are saved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;