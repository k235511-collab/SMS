const { createClient } = require('@supabase/supabase-js');

async function checkStorage() {
  const supabaseUrl = 'https://nynmcyespckvsicusmxf.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bm1jeWVzcGNrdnNpY3VzbXhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU4MjkxNiwiZXhwIjoyMDg3MTU4OTE2fQ.p-SJURi0CH9lOlsLzfVmMD4K6MuYfKHD9piITQvqaL4';
  const bucket = 'SMS SAAS';

  console.log(`Checking bucket: ${bucket}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // List root
  const { data: rootFiles, error: rootError } = await supabase.storage.from(bucket).list();
  if (rootError) {
    console.error('Error listing root:', rootError);
    return;
  }
  console.log('Root files/folders:', rootFiles.map(f => f.name));

  // List avatars folder
  const { data: avatarFiles, error: avatarError } = await supabase.storage.from(bucket).list('avatars');
  if (avatarError) {
    console.error('Error listing avatars:', avatarError);
  } else {
    console.log('Files in "avatars" folder:', avatarFiles.map(f => ({ name: f.name, id: f.id, metadata: f.metadata })));
    
    // Check if there's a nested avatars folder
    const nestedAvatarsFolder = avatarFiles.find(f => f.name === 'avatars');
    if (nestedAvatarsFolder) {
        console.log('Found nested "avatars" folder!');
        const { data: nestedFiles, error: nestedError } = await supabase.storage.from(bucket).list('avatars/avatars');
        if (nestedError) {
            console.error('Error listing nested avatars:', nestedError);
        } else {
            console.log('Files in "avatars/avatars" folder:', nestedFiles.map(f => f.name));
        }
    } else {
        console.log('No nested "avatars" folder found.');
    }
  }
}

checkStorage();
