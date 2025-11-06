-- Add soft delete, pinning, and color coding to notes
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for deleted notes
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON public.notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes(is_pinned);

-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Create note_tags junction table
CREATE TABLE IF NOT EXISTS public.note_tags (
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, tag_id)
);

-- Enable RLS on note_tags
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for note_tags
CREATE POLICY "Users can view tags on their own notes"
  ON public.note_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_tags.note_id 
    AND notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can add tags to their own notes"
  ON public.note_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_tags.note_id 
    AND notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove tags from their own notes"
  ON public.note_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM notes 
    WHERE notes.id = note_tags.note_id 
    AND notes.user_id = auth.uid()
  ));