import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = "https://onedrive.live.com/:x:/g/personal/3968c55550e909d6/IQCw2Ck1DmM9QbopT3fsY3WVAbW4z_stxE4Ntx9k7iKmooU?rtime=XZd1cy_93kg&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8zOTY4YzU1NTUwZTkwOWQ2L0lRQ3cyQ2sxRG1NOVFib3BUM2ZzWTNXVkFiVzR6X3N0eEU0TnR4OWs3aUttb29VP2U9NDppaFJjMzQmc2hhcmluZ3YyPXRydWUmZnJvbVNoYXJlPXRydWUmYXQ9OQ";
  
  console.log('Navigating to OneDrive...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait a few seconds for the grid to render
  console.log('Waiting for grid...');
  await page.waitForTimeout(10000); // 10 seconds just to be sure
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'onedrive_screenshot.png' });
  
  // Attempt to extract the text from the page
  console.log('Extracting text...');
  const text = await page.evaluate(() => {
    // If it's in an iframe:
    let out = document.body.innerText;
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
        try {
            out += "\n--- IFRAME ---\n" + iframes[i].contentWindow.document.body.innerText;
        } catch(e) {}
    }
    return out;
  });
  
  fs.writeFileSync('onedrive.txt', text);
  console.log('Saved onedrive.txt');
  
  await browser.close();
})();
