import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, sharedNoteId } = await req.json();

    if (!noteId || !sharedNoteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the shared note is valid and active
    const { data: sharedNote, error: sharedError } = await supabase
      .from('shared_notes')
      .select('*')
      .eq('id', sharedNoteId)
      .eq('note_id', noteId)
      .eq('is_active', true)
      .single();

    if (sharedError || !sharedNote) {
      console.log('Shared note not found or inactive:', sharedError);
      return new Response(
        JSON.stringify({ success: false, error: 'Shared note not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (sharedNote.expires_at && new Date(sharedNote.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: 'This shared link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the note content
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, content, created_at, updated_at, color')
      .eq('id', noteId)
      .is('deleted_at', null)
      .single();

    if (noteError || !note) {
      console.log('Note not found:', noteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Note not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment view count
    await supabase
      .from('shared_notes')
      .update({ view_count: sharedNote.view_count + 1 })
      .eq('id', sharedNoteId);

    console.log('Successfully fetched shared note:', note.id);

    return new Response(
      JSON.stringify({ success: true, note }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching shared note:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});