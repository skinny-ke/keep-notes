import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Link, Trash2, Eye, Calendar, Lock, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface SharedLink {
  id: string;
  share_token: string;
  password_hash: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  view_count: number;
}

interface ShareNoteDialogProps {
  noteId: string;
  noteTitle: string;
  open: boolean;
  onClose: () => void;
}

const ShareNoteDialog = ({ noteId, noteTitle, open, onClose }: ShareNoteDialogProps) => {
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);

  useEffect(() => {
    if (open && noteId) {
      loadSharedLinks();
    }
  }, [open, noteId]);

  const loadSharedLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSharedLinks(data || []);
    } catch (error: any) {
      toast.error("Failed to load shared links");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const hashPassword = async (pwd: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createShareLink = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const token = generateToken();
      const passwordHash = usePassword && password ? await hashPassword(password) : null;
      const expiresAt = useExpiration 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('shared_notes')
        .insert({
          note_id: noteId,
          share_token: token,
          password_hash: passwordHash,
          expires_at: expiresAt,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Share link created!");
      setPassword("");
      setUsePassword(false);
      setUseExpiration(false);
      loadSharedLinks();
    } catch (error: any) {
      toast.error(error.message || "Failed to create share link");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('shared_notes')
        .update({ is_active: !isActive })
        .eq('id', linkId);

      if (error) throw error;
      
      toast.success(isActive ? "Link deactivated" : "Link activated");
      loadSharedLinks();
    } catch (error: any) {
      toast.error("Failed to update link");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('shared_notes')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      
      toast.success("Share link deleted");
      loadSharedLinks();
    } catch (error: any) {
      toast.error("Failed to delete link");
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared/${token}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            Create shareable links for "{noteTitle || "Untitled"}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Link Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium">Create New Share Link</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="use-password">Password Protection</Label>
              </div>
              <Switch
                id="use-password"
                checked={usePassword}
                onCheckedChange={setUsePassword}
              />
            </div>
            
            {usePassword && (
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="use-expiration">Set Expiration</Label>
              </div>
              <Switch
                id="use-expiration"
                checked={useExpiration}
                onCheckedChange={setUseExpiration}
              />
            </div>
            
            {useExpiration && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 7)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}

            <Button 
              onClick={createShareLink} 
              disabled={creating || (usePassword && !password)}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          </div>

          {/* Existing Links Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Active Share Links</h4>
              <Button variant="ghost" size="sm" onClick={loadSharedLinks} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sharedLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No share links yet. Create one above!
              </p>
            ) : (
              <div className="space-y-2">
                {sharedLinks.map((link) => (
                  <div 
                    key={link.id} 
                    className={`p-3 border rounded-lg space-y-2 ${
                      !link.is_active || isExpired(link.expires_at) 
                        ? 'bg-muted/50 opacity-60' 
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                          {getShareUrl(link.share_token)}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0"
                          onClick={() => copyLink(link.share_token)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleLinkStatus(link.id, link.is_active)}
                        >
                          <Eye className={`h-4 w-4 ${link.is_active ? '' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.view_count} views
                      </span>
                      {link.password_hash && (
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Password protected
                        </span>
                      )}
                      {link.expires_at && (
                        <span className={`flex items-center gap-1 ${isExpired(link.expires_at) ? 'text-destructive' : ''}`}>
                          <Calendar className="h-3 w-3" />
                          {isExpired(link.expires_at) 
                            ? 'Expired' 
                            : `Expires ${format(new Date(link.expires_at), 'MMM d, yyyy')}`
                          }
                        </span>
                      )}
                      {!link.is_active && (
                        <span className="text-destructive">Deactivated</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareNoteDialog;
