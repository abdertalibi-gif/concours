import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { error } = await supabase.from('agent_sources').insert([
        { name: "ENSA Kénitra", url: "https://ensa.uit.ac.ma/", type: "SCHOOL", organizationName: "ENSA Kénitra" },
        { name: "ENSA Oujda", url: "https://ensa.ump.ma/", type: "SCHOOL", organizationName: "ENSA Oujda" },
        { name: "ENSIAS Rabat", url: "http://ensias.um5.ac.ma/", type: "SCHOOL", organizationName: "ENSIAS Rabat" },
        { name: "EMI Rabat", url: "http://www.emi.ac.ma/", type: "SCHOOL", organizationName: "EMI" },
        { name: "INPT Rabat", url: "https://www.inpt.ac.ma/", type: "SCHOOL", organizationName: "INPT" }
    ]);
    
    if (error) console.error(error);
    else console.log("Sources de test ajoutées !");
}

main().catch(console.error);
