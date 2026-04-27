// 🛠️ 13. UTILITY - PDF TEXT EXTRACTION
// File: lib/pdf-utils.js
// =================
import mammoth from 'mammoth';
import pdf from 'pdf-parse-fork';
import { PDFDocument, PDFName } from 'pdf-lib';

export async function extractHyperlinksFromPDF(buffer) {
  try {
    console.log('🔗 Starting PDF hyperlink extraction...');
    // Suppress console warnings from pdf-lib if any
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const links = [];

    console.log(`PO: Loaded PDF with ${pages.length} pages`);

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Access annotations safely
      const annotsRef = page.node.Annots();

      if (!annotsRef) {
        continue;
      }

      const annotations = await page.doc.context.lookup(annotsRef);
      // console.log(`PO: Annotations found on page ${i + 1}, type: ${annotations?.constructor?.name}`);

      if (annotations) {
        // Handle PDFArray (pdf-lib specific)
        if (annotations.constructor.name === 'PDFArray') {
          for (let j = 0; j < annotations.size(); j++) {
            try {
              const annot = annotations.lookup(j);
              // Check Subtype
              let subtype = annot.get(PDFName.of('Subtype'));
              if (!subtype) {
                continue;
              }

              if (subtype.toString() === '/Link') {
                const action = annot.get(PDFName.of('A'));
                if (action) {
                  const actionObj = page.doc.context.lookup(action);
                  const uri = actionObj.get(PDFName.of('URI'));
                  if (uri) {
                    const url = uri.decodeText ? uri.decodeText() : (uri.literal || uri.value);
                    console.log(`PO: Found embedded link: ${url}`);
                    links.push(url);
                  }
                }
              }
            } catch (err) {
              console.warn(`PO: Error processing annotation ${j}:`, err.message);
            }
          }
        }
      }
    }

    // De-duplicate links
    const uniqueLinks = [...new Set(links)];
    console.log(`🔗 Extraction complete. Found ${uniqueLinks.length} unique links.`);
    return uniqueLinks;
  } catch (error) {
    console.error('Hyperlink extraction failed:', error);
    // Return empty array instead of failing, so text extraction can continue
    return [];
  }
}

export async function extractTextFromPDF(buffer, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      // Extract REAL text from PDF using pdf-parse
      console.log('📄 Parsing PDF file...');

      try {
        const pdfResult = await pdf(buffer);
        const extractedText = pdfResult.text.trim();
        const pageCount = pdfResult.numpages || pdfResult.numPages || 1;

        console.log(`✅ PDF parsed successfully: ${extractedText.length} characters`);
        console.log(`📊 PDF Info: ${pageCount} page(s)`);

        // Validate that we extracted meaningful content
        if (!extractedText || extractedText.length < 100) {
          console.warn('⚠️ PDF text extraction returned insufficient content');
          throw new Error('PDF_EMPTY: PDF appears to be empty or contains only images/scanned content');
        }

        return extractedText;

      } catch (pdfError) {
        console.error('❌ PDF parsing failed:', pdfError.message);

        // If it's an image-based/scanned PDF
        if (pdfError.message.includes('PDF_EMPTY')) {
          throw pdfError; // Re-throw to be handled by caller
        }

        throw new Error('PDF_PARSE_ERROR: Unable to extract text from PDF. The file may be corrupted, password-protected, or image-based. Please upload a text-based PDF or Word document.');
      }
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
      // Extract text from Word documents
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // Fallback for other formats
    return buffer.toString('utf-8');

  } catch (error) {
    console.error('Text extraction error:', error);
    // Don't swallow the error here, throw it so the caller knows something went wrong
    throw error;
  }
}

export async function extractMetadataFromResume(text) {
  // Basic text analysis to extract key information
  const metadata = {
    hasEmail: /\S+@\S+\.\S+/.test(text),
    hasPhone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text),
    wordCount: text.split(/\s+/).length,
    hasEducation: /education|degree|university|college|school/i.test(text),
    hasExperience: /experience|work|job|position|role/i.test(text),
    hasSkills: /skills|proficient|expert|knowledge/i.test(text)
  };

  return metadata;
}
