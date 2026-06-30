const crypto = require("crypto");
const sharp = require("sharp");
const ImageCache = require("../models/ImageCache");

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPollinationsImage(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&width=800&height=600`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations AI returned status ${response.status}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateAndCacheImage(imageMeta, onProgress) {
  // imageMeta should contain: class, subject, chapter, diagramType, prompt, cbseLevel
  const hashString = `${imageMeta.class}_${imageMeta.subject}_${imageMeta.chapter}_${imageMeta.diagramType}_${imageMeta.prompt}`;
  const imageHash = crypto.createHash('sha256').update(hashString).digest('hex');
  
  try {
    let cached = await ImageCache.findOne({ imageHash });
    if (cached) {
      if (onProgress) onProgress("progress", { step: `Reusing Cached Diagram: ${imageMeta.prompt}`, status: "done" });
      console.log(`[IMAGE CACHE HIT] Subject: ${imageMeta.subject}, Chapter: ${imageMeta.chapter}, Hash: ${imageHash}`);
      cached.usageCount = (cached.usageCount || 0) + 1;
      cached.lastUsed = new Date();
      await cached.save();
      return imageHash;
    }

    console.log(`[IMAGE CACHE MISS] Subject: ${imageMeta.subject}, Chapter: ${imageMeta.chapter}`);
    if (onProgress) onProgress("progress", { step: `Generating New Diagram: ${imageMeta.prompt}`, status: "processing" });
    
    const detailedPrompt = `Black and white educational diagram. Subject: ${imageMeta.subject}. Class: ${imageMeta.class}. Diagram: ${imageMeta.prompt}. Requirements: textbook style, line drawing, white background, print friendly, labelled, no decorative background, high contrast, no watermark.`;
    
    let imageBuffer = null;
    const maxRetries = 3;
    
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[IMAGE GENERATING] Attempt ${attempt} for: ${imageMeta.prompt}`);
        imageBuffer = await fetchPollinationsImage(detailedPrompt);
        break; // Success
      } catch (error) {
        console.error(`[IMAGE FETCH ERROR] Attempt ${attempt} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await delay(2000); // 2 second delay before retry
        } else {
          console.error(`[IMAGE GENERATION FAILED] All ${maxRetries} attempts failed for: ${imageMeta.prompt}`);
          return null; // Do not crash, continue normally
        }
      }
    }

    if (!imageBuffer) return null;
    
    const generationTime = Date.now() - startTime;
    console.log(`[IMAGE GENERATED] Time: ${generationTime}ms`);

    // Compress and resize using Sharp to Grayscale WebP
    const compressedBuffer = await sharp(imageBuffer)
      .grayscale()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
      
    console.log(`[IMAGE COMPRESSED] Original Size: ${imageBuffer.length} bytes, Compressed Size: ${compressedBuffer.length} bytes`);

    const newCache = new ImageCache({
      imageHash,
      class: imageMeta.class,
      subject: imageMeta.subject,
      chapter: imageMeta.chapter,
      diagramType: imageMeta.diagramType,
      prompt: imageMeta.prompt,
      cbseLevel: imageMeta.cbseLevel || 'Standard',
      imageData: compressedBuffer,
      mimeType: 'image/webp',
      imageWidth: 800,
      compressionFormat: 'webp',
      quality: 80,
      version: 1,
      usageCount: 1,
      createdAt: new Date(),
      lastUsed: new Date()
    });
    
    await newCache.save();
    console.log(`[IMAGE SAVED TO MONGO] Hash: ${imageHash}`);
    return imageHash;
    
  } catch (err) {
    console.error(`[IMAGE SERVICE ERROR] Error processing diagram for ${imageMeta.prompt}: ${err.message}`);
    return null;
  }
}

module.exports = { generateAndCacheImage };
