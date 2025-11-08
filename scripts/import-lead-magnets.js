/**
 * Import lead magnet library from CSV
 * This script reads the CSV file and imports all 108 lead magnets into Supabase
 *
 * Usage: node scripts/import-lead-magnets.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Auto-categorize based on keywords in title/description
function categorizeLeadMagnet(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  const categories = {
    'LinkedIn & Growth': ['linkedin', 'viral', 'engagement', 'post', 'connection', 'profile'],
    'AI & Automation': ['ai', 'chatgpt', 'gpt', 'automation', 'prompt', 'agent'],
    'Sales & Outreach': ['sales', 'outreach', 'cold email', 'dm', 'pitch', 'close', 'discovery'],
    'Content Creation': ['content', 'copywriting', 'writing', 'transcript', 'carousel', 'swipe'],
    'Email & Nurturing': ['email', 'nurture', 'sequence', 'follow-up', 'encharge', 'evergreen'],
    'Offer & Positioning': ['offer', 'positioning', 'price', 'value proposition', 'upgrade'],
    'B2B Strategy': ['b2b', 'gtm', 'strategy', 'funnel', 'pipeline', 'protocol', 'flywheel'],
    'Tools & Systems': ['tool', 'n8n', 'automation', 'api', 'integration', 'workflow'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

async function importLeadMagnets() {
  try {
    console.log('📚 Starting lead magnet library import...');

    // Read the CSV file
    const csvPath = path.join(process.env.HOME || '/Users/rodericandrews', 'Downloads', 'revos-Viral Lead Magnet Library - Sheet1.csv');

    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      console.log('   Please ensure the CSV is downloaded to the Downloads folder');
      process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    const magnets = [];

    // Parse CSV - handles both quoted and unquoted titles
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        // Extract ID
        const idMatch = line.match(/^(\d+),/);
        if (!idMatch) continue;

        const libraryId = parseInt(idMatch[1]);
        const afterId = line.substring(idMatch[0].length);

        // Check if title is quoted or unquoted
        let title = '';
        let remainingAfterTitle = '';

        if (afterId.startsWith('"')) {
          // Quoted title: "Title",
          let titleEnd = -1;
          for (let j = 1; j < afterId.length; j++) {
            if (afterId[j] === '"' && afterId[j + 1] === ',') {
              titleEnd = j;
              break;
            }
          }
          if (titleEnd === -1) continue;
          title = afterId.substring(1, titleEnd).trim();
          remainingAfterTitle = afterId.substring(titleEnd + 2);
        } else {
          // Unquoted title: Title,
          const commaIndex = afterId.indexOf(',');
          if (commaIndex === -1) continue;
          title = afterId.substring(0, commaIndex).trim();
          remainingAfterTitle = afterId.substring(commaIndex + 1);
        }

        if (!title) continue;

        // Find description between triple quotes
        const descStart = remainingAfterTitle.indexOf('"""');
        if (descStart === -1) continue;

        const descEnd = remainingAfterTitle.indexOf('"""', descStart + 3);
        if (descEnd === -1) continue;

        const description = remainingAfterTitle.substring(descStart + 3, descEnd).trim();

        // Find URL after description
        const afterDesc = remainingAfterTitle.substring(descEnd + 3);
        const urlMatch = afterDesc.match(/https?:\/\/[^\s,]*/);
        const url = urlMatch ? urlMatch[0].trim() : '';

        if (!url) continue;

        const category = categorizeLeadMagnet(title, description);

        magnets.push({
          title,
          description,
          url,
          category,
          is_active: true,
          client_id: null, // Global library
        });
      } catch (e) {
        // Skip lines that can't be parsed
        continue;
      }
    }

    console.log(`📖 Parsed ${magnets.length} lead magnets from CSV`);

    // Insert magnets in batches
    const batchSize = 50;
    for (let i = 0; i < magnets.length; i += batchSize) {
      const batch = magnets.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('lead_magnet_library')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error);
        process.exit(1);
      }

      console.log(`✅ Imported ${Math.min(i + batchSize, magnets.length)}/${magnets.length} magnets`);
    }

    // Count by category
    const categoryCounts = {};
    magnets.forEach(m => {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    });

    console.log('\n📊 Library breakdown by category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    console.log('\n✨ Lead magnet library import complete!');
    console.log(`   Total magnets: ${magnets.length}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importLeadMagnets();
