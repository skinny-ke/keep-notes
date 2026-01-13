import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileJson, FileText, FileCode } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  is_pinned?: boolean;
  color?: string | null;
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

const stripHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const htmlToMarkdown = (html: string): string => {
  let md = html;
  // Convert common HTML to markdown
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_');
  md = md.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<[^>]+>/g, ''); // Strip remaining tags
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  return md.trim();
};

const ExportDialog = ({ open, onClose, notes, media }: ExportDialogProps) => {
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      notesCount: notes.length,
      notes: notes.map(note => ({
        ...note,
        media: media.filter(m => m.note_id === note.id)
      }))
    };

    downloadFile(
      JSON.stringify(exportData, null, 2),
      `notes-export-${new Date().toISOString().split('T')[0]}.json`,
      "application/json"
    );
    
    toast.success("Notes exported as JSON");
    onClose();
  };

  const exportAsText = () => {
    let text = "📝 Notes Export\n";
    text += `📅 Export Date: ${new Date().toLocaleString()}\n`;
    text += `📊 Total Notes: ${notes.length}\n\n`;
    text += "═".repeat(50) + "\n\n";

    notes.forEach((note, index) => {
      const pinned = note.is_pinned ? "📌 " : "";
      text += `${pinned}Note ${index + 1}\n`;
      text += `Title: ${note.title || "Untitled"}\n`;
      text += `Created: ${new Date(note.created_at).toLocaleString()}\n\n`;
      text += `${stripHtml(note.content || "(no content)")}\n`;
      
      const noteMedia = media.filter(m => m.note_id === note.id);
      if (noteMedia.length > 0) {
        text += `\n📎 Attachments: ${noteMedia.map(m => m.media_type).join(", ")}\n`;
      }
      
      text += "\n" + "─".repeat(50) + "\n\n";
    });

    downloadFile(
      text,
      `notes-export-${new Date().toISOString().split('T')[0]}.txt`,
      "text/plain"
    );
    
    toast.success("Notes exported as text");
    onClose();
  };

  const exportAsMarkdown = () => {
    let md = "# 📝 Notes Export\n\n";
    md += `**Export Date:** ${new Date().toLocaleString()}\n\n`;
    md += `**Total Notes:** ${notes.length}\n\n`;
    md += "---\n\n";

    notes.forEach((note, index) => {
      const pinned = note.is_pinned ? "📌 " : "";
      md += `## ${pinned}${note.title || "Untitled"}\n\n`;
      md += `*Created: ${new Date(note.created_at).toLocaleString()}*\n\n`;
      md += `${htmlToMarkdown(note.content || "_No content_")}\n\n`;
      
      const noteMedia = media.filter(m => m.note_id === note.id);
      if (noteMedia.length > 0) {
        md += `> 📎 **Attachments:** ${noteMedia.map(m => m.media_type).join(", ")}\n\n`;
      }
      
      md += "---\n\n";
    });

    downloadFile(
      md,
      `notes-export-${new Date().toISOString().split('T')[0]}.md`,
      "text/markdown"
    );
    
    toast.success("Notes exported as Markdown");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Notes</DialogTitle>
          <DialogDescription>
            Download all {notes.length} {notes.length === 1 ? 'note' : 'notes'} in your preferred format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <Button 
            onClick={exportAsJSON} 
            className="w-full justify-start gap-3 h-auto py-3"
            variant="outline"
          >
            <FileJson className="h-5 w-5 text-blue-500" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Export as JSON</span>
              <span className="text-xs text-muted-foreground">Complete data with metadata, ideal for backups</span>
            </div>
          </Button>

          <Button 
            onClick={exportAsMarkdown} 
            className="w-full justify-start gap-3 h-auto py-3"
            variant="outline"
          >
            <FileCode className="h-5 w-5 text-purple-500" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Export as Markdown</span>
              <span className="text-xs text-muted-foreground">Formatted text, great for other apps</span>
            </div>
          </Button>

          <Button 
            onClick={exportAsText} 
            className="w-full justify-start gap-3 h-auto py-3"
            variant="outline"
          >
            <FileText className="h-5 w-5 text-green-500" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Export as Plain Text</span>
              <span className="text-xs text-muted-foreground">Simple readable format, works everywhere</span>
            </div>
          </Button>

          <p className="text-xs text-muted-foreground pt-2 text-center">
            Media files are referenced but not included in exports.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;