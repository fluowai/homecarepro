import fs from 'fs';

async function download() {
  const url = "https://1drv.ms/x/c/3968c55550e909d6/IQCw2Ck1DmM9QbopT3fsY3WVAbW4z_stxE4Ntx9k7iKmooU?download=1";
  console.log('Fetching URL:', url);
  try {
    const response = await fetch(url, { redirect: 'follow' });
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      fs.writeFileSync('planilha.xlsx', Buffer.from(buffer));
      console.log('Saved to planilha.xlsx (' + buffer.byteLength + ' bytes)');
      
      // Let's read the first few bytes to check if it's really a zip/xlsx file or HTML
      const preview = Buffer.from(buffer).slice(0, 50).toString('utf8');
      console.log('Preview:', preview.replace(/\n/g, ' '));
    } else {
      console.error('Failed to download');
    }
  } catch (e) {
    console.error(e);
  }
}

download();
