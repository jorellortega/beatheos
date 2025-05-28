import { supabase } from '../lib/supabaseClient'

const LICENSES = [
  { name: 'Lease', description: '', terms: '', is_exclusive: false, is_buyout: false },
  { name: 'Premium Lease', description: '', terms: '', is_exclusive: false, is_buyout: false },
  { name: 'Exclusive', description: '', terms: '', is_exclusive: true, is_buyout: false },
  { name: 'Buy Out', description: '', terms: '', is_exclusive: false, is_buyout: true },
]

async function seedLicenses() {
  for (const license of LICENSES) {
    // Check if license already exists by name
    const { data, error } = await supabase
      .from('licenses')
      .select('id')
      .eq('name', license.name)
      .maybeSingle()
    if (error) {
      console.error(`Error checking license '${license.name}':`, error)
      continue
    }
    if (!data) {
      // Insert if not found
      const { error: insertError } = await supabase
        .from('licenses')
        .insert([{ ...license, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      if (insertError) {
        console.error(`Error inserting license '${license.name}':`, insertError)
      } else {
        console.log(`Inserted license: ${license.name}`)
      }
    } else {
      console.log(`License already exists: ${license.name}`)
    }
  }
  process.exit(0)
}

seedLicenses() 