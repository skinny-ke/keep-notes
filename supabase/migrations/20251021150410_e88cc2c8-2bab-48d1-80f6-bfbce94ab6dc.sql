-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" 
ON public.notes 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
CREATE POLICY "Users can create their own notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" 
ON public.notes 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" 
ON public.notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for media
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('note-images', 'note-images', true),
  ('note-audio', 'note-audio', true),
  ('note-videos', 'note-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for note-images bucket
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
CREATE POLICY "Users can view their own images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
CREATE POLICY "Users can upload their own images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for note-audio bucket
DROP POLICY IF EXISTS "Users can view their own audio" ON storage.objects;
CREATE POLICY "Users can view their own audio" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own audio" ON storage.objects;
CREATE POLICY "Users can upload their own audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own audio" ON storage.objects;
CREATE POLICY "Users can delete their own audio" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'note-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for note-videos bucket
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
CREATE POLICY "Users can view their own videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'note-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
CREATE POLICY "Users can upload their own videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'note-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
CREATE POLICY "Users can delete their own videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'note-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create note_media table to track media files
CREATE TABLE IF NOT EXISTS public.note_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for note_media
ALTER TABLE public.note_media ENABLE ROW LEVEL SECURITY;

-- Create policies for note_media
DROP POLICY IF EXISTS "Users can view media for their own notes" ON public.note_media;
CREATE POLICY "Users can view media for their own notes" 
ON public.note_media 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = note_media.note_id 
    AND notes.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create media for their own notes" ON public.note_media;
CREATE POLICY "Users can create media for their own notes" 
ON public.note_media 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = note_media.note_id 
    AND notes.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete media for their own notes" ON public.note_media;
CREATE POLICY "Users can delete media for their own notes" 
ON public.note_media 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = note_media.note_id 
    AND notes.user_id = auth.uid()
  )
);