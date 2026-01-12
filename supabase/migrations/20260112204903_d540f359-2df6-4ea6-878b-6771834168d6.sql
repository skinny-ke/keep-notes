-- Create shared_notes table for note sharing functionality
CREATE TABLE public.shared_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for shared_notes
CREATE POLICY "Users can create shares for their own notes"
ON public.shared_notes
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.notes
  WHERE notes.id = shared_notes.note_id
  AND notes.user_id = auth.uid()
));

CREATE POLICY "Users can view their own shares"
ON public.shared_notes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.notes
  WHERE notes.id = shared_notes.note_id
  AND notes.user_id = auth.uid()
));

CREATE POLICY "Users can update their own shares"
ON public.shared_notes
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.notes
  WHERE notes.id = shared_notes.note_id
  AND notes.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own shares"
ON public.shared_notes
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.notes
  WHERE notes.id = shared_notes.note_id
  AND notes.user_id = auth.uid()
));

-- Public access policy for viewing shared notes (anyone with token can access)
CREATE POLICY "Anyone can view active shared notes by token"
ON public.shared_notes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));