-- Create note_versions table for version history
CREATE TABLE public.note_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for note_versions
CREATE POLICY "Users can view their own note versions"
  ON public.note_versions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create versions for their own notes"
  ON public.note_versions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM notes
    WHERE notes.id = note_versions.note_id
    AND notes.user_id = auth.uid()
  ));

-- Create index for better performance
CREATE INDEX idx_note_versions_note_id ON public.note_versions(note_id);
CREATE INDEX idx_note_versions_created_at ON public.note_versions(created_at DESC);