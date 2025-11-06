import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface TagManagerProps {
  noteId: string;
  selectedTags: Tag[];
  onTagsChange: () => void;
}

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", 
  "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"
];

const TagManager = ({ noteId, selectedTags, onTagsChange }: TagManagerProps) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (!error && data) {
      setAllTags(data);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tags')
        .insert({ name: newTagName.trim(), color: selectedColor, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await addTagToNote(data.id);
        setAllTags([...allTags, data]);
        setNewTagName("");
        toast.success("Tag created");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create tag");
    } finally {
      setLoading(false);
    }
  };

  const addTagToNote = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('note_tags')
        .insert({ note_id: noteId, tag_id: tagId });

      if (error) throw error;
      onTagsChange();
      toast.success("Tag added");
    } catch (error: any) {
      if (!error.message.includes('duplicate')) {
        toast.error(error.message || "Failed to add tag");
      }
    }
  };

  const removeTagFromNote = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', noteId)
        .eq('tag_id', tagId);

      if (error) throw error;
      onTagsChange();
      toast.success("Tag removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove tag");
    }
  };

  const isTagSelected = (tagId: string) => {
    return selectedTags.some(t => t.id === tagId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Manage Tags</h4>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  style={{ backgroundColor: tag.color || undefined }}
                  className="gap-1"
                >
                  {tag.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTagFromNote(tag.id)}
                  />
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Add existing tag:</p>
            <div className="flex flex-wrap gap-2">
              {allTags
                .filter(tag => !isTagSelected(tag.id))
                .map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color || undefined }}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => addTagToNote(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Create new tag:</p>
            <div className="space-y-2">
              <Input
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTag()}
              />
              <div className="flex gap-1 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: selectedColor === color ? "#000" : "transparent",
                    }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
              <Button
                size="sm"
                onClick={createTag}
                disabled={!newTagName.trim() || loading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TagManager;
