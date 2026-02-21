const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// Create a simple icon with the Blitz CRM colors
function createIcon(size) {
  const png = new PNG({ width: size, height: size });
  
  const bgColor = { r: 14, g: 165, b: 233 }; // #0EA5E9
  const lineColor = { r: 56, g: 189, b: 248 }; // #38BDF8
  const checkColor = { r: 16, g: 185, b: 129 }; // #10B981
  
  const padding = Math.floor(size * 0.1);
  const lineHeight = Math.floor(size * 0.08);
  const lineSpacing = Math.floor(size * 0.18);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      
      // Background with rounded corners
      const cornerRadius = Math.floor(size * 0.17);
      const inCorner = (
        (x < cornerRadius && y < cornerRadius && Math.pow(x - cornerRadius, 2) + Math.pow(y - cornerRadius, 2) > Math.pow(cornerRadius, 2)) ||
        (x > size - cornerRadius && y < cornerRadius && Math.pow(x - (size - cornerRadius), 2) + Math.pow(y - cornerRadius, 2) > Math.pow(cornerRadius, 2)) ||
        (x < cornerRadius && y > size - cornerRadius && Math.pow(x - cornerRadius, 2) + Math.pow(y - (size - cornerRadius), 2) > Math.pow(cornerRadius, 2)) ||
        (x > size - cornerRadius && y > size - cornerRadius && Math.pow(x - (size - cornerRadius), 2) + Math.pow(y - (size - cornerRadius), 2) > Math.pow(cornerRadius, 2))
      );
      
      if (inCorner) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }
      
      // Draw background
      png.data[idx] = bgColor.r;
      png.data[idx + 1] = bgColor.g;
      png.data[idx + 2] = bgColor.b;
      png.data[idx + 3] = 255;
      
      // Draw lines (menu bars)
      const startX = padding;
      const lineWidth = size - padding * 2;
      
      // Line 1
      if (y >= padding && y < padding + lineHeight && x >= startX && x < startX + lineWidth * 0.8) {
        png.data[idx] = lineColor.r;
        png.data[idx + 1] = lineColor.g;
        png.data[idx + 2] = lineColor.b;
      }
      
      // Line 2
      if (y >= padding + lineSpacing && y < padding + lineSpacing + lineHeight && x >= startX && x < startX + lineWidth * 0.5) {
        png.data[idx] = lineColor.r;
        png.data[idx + 1] = lineColor.g;
        png.data[idx + 2] = lineColor.b;
      }
      
      // Line 3
      if (y >= padding + lineSpacing * 2 && y < padding + lineSpacing * 2 + lineHeight && x >= startX && x < startX + lineWidth * 0.65) {
        png.data[idx] = lineColor.r;
        png.data[idx + 1] = lineColor.g;
        png.data[idx + 2] = lineColor.b;
      }
      
      // Draw checkmark circle at bottom right
      const circleX = size - padding - Math.floor(size * 0.15);
      const circleY = size - padding - Math.floor(size * 0.15);
      const circleRadius = Math.floor(size * 0.12);
      const dist = Math.sqrt(Math.pow(x - circleX, 2) + Math.pow(y - circleY, 2));
      
      if (dist <= circleRadius) {
        png.data[idx] = checkColor.r;
        png.data[idx + 1] = checkColor.g;
        png.data[idx + 2] = checkColor.b;
      }
      
      // Draw checkmark
      if (y > circleY - Math.floor(size * 0.06) && y < circleY + Math.floor(size * 0.02)) {
        const checkStartX = circleX - Math.floor(size * 0.05);
        const checkMidX = circleX - Math.floor(size * 0.01);
        const checkEndX = circleX + Math.floor(size * 0.05);
        
        // First part of check
        if (x >= checkStartX && x < checkMidX) {
          const expectedY = circleY + Math.floor((x - checkStartX) * 0.4);
          if (Math.abs(y - expectedY) < Math.floor(size * 0.025)) {
            png.data[idx] = 255;
            png.data[idx + 1] = 255;
            png.data[idx + 2] = 255;
          }
        }
        // Second part of check
        if (x >= checkMidX && x < checkEndX) {
          const expectedY = circleY - Math.floor((x - checkMidX) * 1.2);
          if (Math.abs(y - expectedY) < Math.floor(size * 0.025)) {
            png.data[idx] = 255;
            png.data[idx + 1] = 255;
            png.data[idx + 2] = 255;
          }
        }
      }
    }
  }
  
  return png;
}

// Create icons
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Create 192x192 icon
const icon192 = createIcon(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), PNG.sync.write(icon192));
console.log('Created icon-192.png');

// Create 512x512 icon
const icon512 = createIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), PNG.sync.write(icon512));
console.log('Created icon-512.png');

console.log('Icons created successfully!');

