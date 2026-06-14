import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = 'https://iafkyliwyqaadwavaalu.supabase.co';
const supabaseAnonKey = 'sb_publishable_FV7T0KpZp7bORF2Vd1r8_Q_L6SZn1f6';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
