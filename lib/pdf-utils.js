// 🛠️ 13. UTILITY - PDF TEXT EXTRACTION
// File: lib/pdf-utils.js
// =================
import mammoth from 'mammoth';
import { pdf as pdfParse } from 'pdf-parse';

export async function extractTextFromPDF(buffer, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      // Extract REAL text from PDF using pdf-parse
      console.log('📄 Parsing PDF file...');
      
      try {
        const pdfResult = await pdfParse(buffer);
        const extractedText = pdfResult.text.trim();
        
        console.log(`✅ PDF parsed successfully: ${extractedText.length} characters`);
        console.log(`📊 PDF Info: ${pdfResult.total} pages`);
        
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
    return 'Error extracting text from document';
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
