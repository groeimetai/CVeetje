/**
 * DOCX Profile Image Replacer — Phase 6 post-processing.
 *
 * After all text has been filled by the AI phases, this module scans
 * the DOCX ZIP for embedded placeholder images and replaces the best
 * candidate with the user's actual profile photo.
 *
 * Strategy:
 * 1. Parse relationship files to find image references
 * 2. Parse document XML to find image dimensions (DrawingML + VML)
 * 3. Select best candidate (portrait/square, not too small)
 * 4. Download avatar and overwrite the media file in the ZIP
 * 5. Update content types if format changed
 */

import type JSZip from 'jszip';
import { validateAvatarURL } from '@/lib/security/url-validator';

// EMU (English Metric Units): 1 cm = 360000 EMU
const MIN_SIZE_EMU = 360000; // 1cm — filter out icons/bullets

interface ImageRelationship {
  rId: string;
  target: string; // e.g. "media/image1.png"
  sourceFile: string; // e.g. "word/document.xml" or "word/header1.xml"
  relsFile: string; // e.g. "word/_rels/document.xml.rels"
}

interface ImageCandidate {
  rel: ImageRelationship;
  cx: number; // width in EMU
  cy: number; // height in EMU
}

/**
 * Parse a .rels file and extract image relationships.
 */
function parseImageRelationships(
  relsXml: string,
  relsFilePath: string,
  sourceFile: string,
): ImageRelationship[] {
  const relationships: ImageRelationship[] = [];
  const relRegex = /<Relationship\s[^>]*>/g;
  let match;

  while ((match = relRegex.exec(relsXml)) !== null) {
    const tag = match[0];
    const typeMatch = tag.match(/Type="([^"]+)"/);
    const idMatch = tag.match(/Id="([^"]+)"/);
    const targetMatch = tag.match(/Target="([^"]+)"/);

    if (typeMatch && idMatch && targetMatch) {
      const type = typeMatch[1];
      if (type.endsWith('/image')) {
        relationships.push({
          rId: idMatch[1],
          target: targetMatch[1],
          sourceFile,
          relsFile: relsFilePath,
        });
      }
    }
  }

  return relationships;
}

/**
 * Find image dimensions from DrawingML (<w:drawing>) elements in document XML.
 * Looks for <a:blip r:embed="rIdX"/> and corresponding <wp:extent cx="" cy=""/>.
 */
function findDrawingMLImages(
  docXml: string,
  relationships: ImageRelationship[],
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const rIdSet = new Map(relationships.map(r => [r.rId, r]));

  // Match <w:drawing> blocks
  const drawingRegex = /<w:drawing>([\s\S]*?)<\/w:drawing>/g;
  let drawingMatch;

  while ((drawingMatch = drawingRegex.exec(docXml)) !== null) {
    const drawingContent = drawingMatch[1];

    // Find blip reference
    const blipMatch = drawingContent.match(/<a:blip\s[^>]*r:embed="([^"]+)"/);
    if (!blipMatch) continue;

    const rId = blipMatch[1];
    const rel = rIdSet.get(rId);
    if (!rel) continue;

    // Find extent (dimensions)
    const extentMatch = drawingContent.match(/<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"/);
    if (!extentMatch) continue;

    candidates.push({
      rel,
      cx: parseInt(extentMatch[1]),
      cy: parseInt(extentMatch[2]),
    });
  }

  return candidates;
}

/**
 * Find image dimensions from VML (<w:pict>/<v:imagedata>) elements.
 * Legacy format used in some DOCX templates.
 */
function findVMLImages(
  docXml: string,
  relationships: ImageRelationship[],
): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const rIdSet = new Map(relationships.map(r => [r.rId, r]));

  // Match <w:pict> blocks with v:imagedata
  const pictRegex = /<w:pict>([\s\S]*?)<\/w:pict>/g;
  let pictMatch;

  while ((pictMatch = pictRegex.exec(docXml)) !== null) {
    const pictContent = pictMatch[1];

    // Find imagedata reference
    const imgDataMatch = pictContent.match(/<v:imagedata\s[^>]*r:id="([^"]+)"/);
    if (!imgDataMatch) continue;

    const rId = imgDataMatch[1];
    const rel = rIdSet.get(rId);
    if (!rel) continue;

    // Try to find dimensions from style attribute on v:shape
    const shapeMatch = pictContent.match(/<v:shape\s[^>]*style="([^"]+)"/);
    let cx = 0;
    let cy = 0;

    if (shapeMatch) {
      const style = shapeMatch[1];
      const widthMatch = style.match(/width:([\d.]+)(pt|in|cm|mm)/);
      const heightMatch = style.match(/height:([\d.]+)(pt|in|cm|mm)/);

      if (widthMatch && heightMatch) {
        cx = convertToEMU(parseFloat(widthMatch[1]), widthMatch[2]);
        cy = convertToEMU(parseFloat(heightMatch[1]), heightMatch[2]);
      }
    }

    // If we couldn't get dimensions, use a reasonable default (3cm x 4cm)
    // so the image still gets considered as a candidate
    if (cx === 0 || cy === 0) {
      cx = 1080000; // ~3cm
      cy = 1440000; // ~4cm
    }

    candidates.push({ rel, cx, cy });
  }

  return candidates;
}

/**
 * Convert a CSS measurement to EMU.
 */
function convertToEMU(value: number, unit: string): number {
  switch (unit) {
    case 'pt': return Math.round(value * 12700);
    case 'in': return Math.round(value * 914400);
    case 'cm': return Math.round(value * 360000);
    case 'mm': return Math.round(value * 36000);
    default: return Math.round(value * 12700); // default to pt
  }
}

/**
 * Select the best profile image candidate from a list.
 *
 * Rules:
 * - Filter out images smaller than 1cm x 1cm (icons/bullets)
 * - If only 1 candidate → use it
 * - If multiple → prefer portrait/square aspect ratio (height >= width * 0.7)
 * - Among portrait candidates, pick the first one (document order)
 */
function selectBestCandidate(candidates: ImageCandidate[]): ImageCandidate | null {
  // Filter out tiny images (icons, bullets, decorations)
  const viable = candidates.filter(c => c.cx >= MIN_SIZE_EMU && c.cy >= MIN_SIZE_EMU);

  if (viable.length === 0) return null;
  if (viable.length === 1) return viable[0];

  // Prefer portrait/square images (typical for profile photos)
  const portraitCandidates = viable.filter(c => c.cy >= c.cx * 0.7);

  if (portraitCandidates.length > 0) {
    return portraitCandidates[0];
  }

  // Fallback to first viable image
  return viable[0];
}

/**
 * Get file extension from Content-Type header or URL.
 */
function getExtensionFromResponse(response: Response, url: string): string {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim();

  switch (contentType) {
    case 'image/jpeg': return 'jpeg';
    case 'image/png': return 'png';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    case 'image/bmp': return 'bmp';
    case 'image/tiff': return 'tiff';
  }

  // Fallback: extract from URL path
  const urlPath = new URL(url).pathname;
  const ext = urlPath.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext)) {
    return ext === 'jpg' ? 'jpeg' : ext;
  }

  return 'jpeg'; // Safe default
}

/**
 * Get the OOXML content type for an image extension.
 */
function getOOXMLContentType(ext: string): string {
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpeg':
    case 'jpg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'bmp': return 'image/bmp';
    case 'tiff':
    case 'tif': return 'image/tiff';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}

/**
 * Update the [Content_Types].xml to include the new image extension if needed.
 */
async function updateContentTypes(zip: JSZip, newExtension: string): Promise<void> {
  const ctFile = zip.file('[Content_Types].xml');
  if (!ctFile) return;

  let ctXml = await ctFile.async('string');

  // Check if this extension is already registered
  const extLower = newExtension.toLowerCase();
  const extPattern = new RegExp(`Extension="${extLower}"`, 'i');

  if (!extPattern.test(ctXml)) {
    // Add new Default entry before closing </Types>
    const contentType = getOOXMLContentType(extLower);
    const newDefault = `<Default Extension="${extLower}" ContentType="${contentType}"/>`;
    ctXml = ctXml.replace('</Types>', `${newDefault}</Types>`);
    zip.file('[Content_Types].xml', ctXml);
  }
}

/**
 * Update the relationship target if the file extension changed.
 */
async function updateRelationshipTarget(
  zip: JSZip,
  relsFile: string,
  rId: string,
  oldTarget: string,
  newTarget: string,
): Promise<void> {
  if (oldTarget === newTarget) return;

  const relsFileObj = zip.file(relsFile);
  if (!relsFileObj) return;

  let relsXml = await relsFileObj.async('string');

  // Replace the Target for this specific relationship
  const oldPattern = `Id="${rId}" Target="${oldTarget}"`;
  const newPattern = `Id="${rId}" Target="${newTarget}"`;
  relsXml = relsXml.replace(oldPattern, newPattern);

  zip.file(relsFile, relsXml);
}

/**
 * Replace the profile placeholder image in a DOCX ZIP with the user's avatar.
 *
 * This is a post-processing step (Phase 6) that runs after all text has been filled.
 * It scans the DOCX for embedded images, selects the best candidate for a profile
 * photo placeholder, downloads the avatar, and overwrites the media file.
 *
 * @param zip - The JSZip instance of the DOCX
 * @param avatarUrl - URL of the user's avatar image
 * @returns Object indicating whether replacement was performed
 */
export async function replaceProfileImage(
  zip: JSZip,
  avatarUrl: string,
): Promise<{ replaced: boolean; warning?: string }> {
  // Validate avatar URL
  const validation = validateAvatarURL(avatarUrl);
  if (!validation.valid || !validation.sanitizedUrl) {
    console.warn(`[image-replacer] Avatar URL validation failed: ${validation.error}`);
    return { replaced: false, warning: `Avatar URL validation failed: ${validation.error}` };
  }

  const safeUrl = validation.sanitizedUrl;

  // Collect all image relationships from document and headers
  const allRelationships: ImageRelationship[] = [];
  const xmlSources: { xmlPath: string; relsPath: string }[] = [];

  // Document
  xmlSources.push({
    xmlPath: 'word/document.xml',
    relsPath: 'word/_rels/document.xml.rels',
  });

  // Headers and footers
  const headerFooterFiles = Object.keys(zip.files).filter(
    name => /^word\/(header|footer)\d*\.xml$/.test(name),
  );
  for (const hfPath of headerFooterFiles) {
    const fileName = hfPath.split('/').pop()!;
    xmlSources.push({
      xmlPath: hfPath,
      relsPath: `word/_rels/${fileName}.rels`,
    });
  }

  // Parse relationships from all sources
  for (const source of xmlSources) {
    const relsFile = zip.file(source.relsPath);
    if (!relsFile) continue;

    const relsXml = await relsFile.async('string');
    const rels = parseImageRelationships(relsXml, source.relsPath, source.xmlPath);
    allRelationships.push(...rels);
  }

  if (allRelationships.length === 0) {
    console.log('[image-replacer] No image relationships found in DOCX');
    return { replaced: false };
  }

  // Find image candidates with dimensions from all XML sources
  const allCandidates: ImageCandidate[] = [];

  for (const source of xmlSources) {
    const xmlFile = zip.file(source.xmlPath);
    if (!xmlFile) continue;

    const xml = await xmlFile.async('string');
    const sourceRels = allRelationships.filter(r => r.sourceFile === source.xmlPath);

    const drawingCandidates = findDrawingMLImages(xml, sourceRels);
    const vmlCandidates = findVMLImages(xml, sourceRels);

    allCandidates.push(...drawingCandidates, ...vmlCandidates);
  }

  if (allCandidates.length === 0) {
    console.log('[image-replacer] No image candidates found (no drawings/VML with dimensions)');
    return { replaced: false };
  }

  console.log(`[image-replacer] Found ${allCandidates.length} image candidate(s): ${
    allCandidates.map(c => `${c.rel.target} (${Math.round(c.cx / 360000 * 10) / 10}cm x ${Math.round(c.cy / 360000 * 10) / 10}cm)`).join(', ')
  }`);

  // Select best candidate
  const best = selectBestCandidate(allCandidates);
  if (!best) {
    console.log('[image-replacer] No viable candidate (all too small)');
    return { replaced: false };
  }

  console.log(`[image-replacer] Selected: ${best.rel.target} (${Math.round(best.cx / 360000 * 10) / 10}cm x ${Math.round(best.cy / 360000 * 10) / 10}cm)`);

  // Download avatar
  let imageBuffer: ArrayBuffer;
  let avatarExtension: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(safeUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CVeetje/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[image-replacer] Failed to download avatar: HTTP ${response.status}`);
      return { replaced: false, warning: `Failed to download avatar: HTTP ${response.status}` };
    }

    imageBuffer = await response.arrayBuffer();
    avatarExtension = getExtensionFromResponse(response, safeUrl);

    // Basic sanity check — image should be at least 1KB
    if (imageBuffer.byteLength < 1024) {
      console.warn('[image-replacer] Downloaded avatar is too small (<1KB), skipping');
      return { replaced: false, warning: 'Downloaded avatar is too small' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[image-replacer] Avatar download failed: ${message}`);
    return { replaced: false, warning: `Avatar download failed: ${message}` };
  }

  // Determine the media file path in the ZIP
  const oldTarget = best.rel.target;
  const oldMediaPath = oldTarget.startsWith('word/')
    ? oldTarget
    : `word/${oldTarget}`;

  // Determine new file path if extension changed
  const oldExtension = oldTarget.split('.').pop()?.toLowerCase() || 'png';
  let newTarget = oldTarget;
  let newMediaPath = oldMediaPath;

  if (oldExtension !== avatarExtension) {
    // Replace extension
    newTarget = oldTarget.replace(/\.[^.]+$/, `.${avatarExtension}`);
    newMediaPath = oldMediaPath.replace(/\.[^.]+$/, `.${avatarExtension}`);

    // Remove old file if extension changed
    zip.remove(oldMediaPath);

    // Update relationship target
    await updateRelationshipTarget(
      zip,
      best.rel.relsFile,
      best.rel.rId,
      oldTarget,
      newTarget,
    );

    // Add content type for new extension
    await updateContentTypes(zip, avatarExtension);
  }

  // Write the new image to the ZIP
  zip.file(newMediaPath, imageBuffer);

  console.log(`[image-replacer] Replaced ${oldMediaPath} with avatar (${avatarExtension}, ${Math.round(imageBuffer.byteLength / 1024)}KB)`);

  return { replaced: true };
}
