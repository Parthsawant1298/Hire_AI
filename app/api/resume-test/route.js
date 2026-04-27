// app/api/resume-test/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    console.log('📄 Resume test API called');

    const formData = await req.formData();
    const file = formData.get('resume');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No resume file provided' }, { status: 400 });
    }

    console.log('📎 File received:', file.name, file.type, file.size);

    // Convert File to Buffer (exact same as apply route)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary (exact same as apply route with dynamic import)
    console.log('☁️ Uploading to Cloudinary...');
    const { uploadToCloudinary } = await import('@/lib/cloudinary');
    const uploadResult = await uploadToCloudinary(buffer, file.name, 'resumes');
    console.log('✅ Resume uploaded:', uploadResult.secure_url);

    // Extract text from resume (EXACT SAME AS APPLY ROUTE)
    console.log('📄 Extracting text from resume...');
    const { extractTextFromPDF, extractHyperlinksFromPDF } = await import('@/lib/pdf-utils');
    
    let resumeText;
    let embeddedLinks = [];

    try {
      resumeText = await extractTextFromPDF(buffer, file.type);
      console.log(`📝 Extracted ${resumeText.length} characters from resume`);

      // Extract embedded hyperlinks if PDF
      if (file.type === 'application/pdf') {
        embeddedLinks = await extractHyperlinksFromPDF(buffer);
        console.log(`🔗 Found ${embeddedLinks.length} embedded hyperlinks in PDF`);
      }
    } catch (extractionError) {
      console.error('❌ Text extraction failed:', extractionError.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to extract text from resume. Please ensure it\'s a valid PDF.' 
      }, { status: 400 });
    }

    // Extract structured data (EXACT SAME AS APPLY ROUTE)
    console.log('🔍 Extracting structured data from resume...');
    const { extractResumeData } = await import('@/lib/resume-extraction');
    const extractedData = await extractResumeData(resumeText, uploadResult.secure_url, embeddedLinks);
    console.log('✅ Resume data extraction completed');
    console.log(`📋 Extracted: ${extractedData.personalInfo?.fullName}, ${extractedData.personalInfo?.email}, ${extractedData.skills?.technical?.length || 0} skill categories`);

    // Run verification (EXACT SAME AS APPLY ROUTE)
    console.log('🔍 Running verification checks...');
    const { verifyResume } = await import('@/lib/verification');
    const verificationResult = await verifyResume(extractedData, 'General');
    console.log('✅ Verification completed');

    // Return complete result
    return NextResponse.json({
      success: true,
      result: {
        extractedData: {
          personalInfo: extractedData.personalInfo,
          totalExperienceYears: extractedData.totalExperienceYears,
          skills: extractedData.skills,
          education: extractedData.education,
          certifications: extractedData.certifications,
          achievements: extractedData.achievements,
          experience: extractedData.experience
        },
        verificationResult: {
          candidateName: extractedData.personalInfo?.fullName || 'Unknown',
          overallScore: verificationResult.overallScore,
          verdict: verificationResult.verdict,
          scoreBreakdown: verificationResult.scoreBreakdown,
          verifications: verificationResult.verifications,
          detailedAnalysis: {
            executiveSummary: verificationResult.summary,
            roleSuitability: {
              bestMatch: {
                role: verificationResult.role_suitability?.best_suited_role,
                reason: verificationResult.role_suitability?.best_role_reason
              },
              alternatives: verificationResult.role_suitability?.alternative_roles?.map(role => ({
                title: typeof role === 'string' ? role : role.title || role.role,
                reason: typeof role === 'string' ? '' : role.reason || ''
              })) || []
            },
            strengths: verificationResult.strengths || [],
            concerns: verificationResult.concerns || [],
            interviewFocusAreas: verificationResult.interview_focus_areas || [],
            finalRecommendation: verificationResult.final_recommendation
          }
        },
        resumeUrl: uploadResult.secure_url
      }
    });

  } catch (error) {
    console.error('❌ Resume test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to analyze resume' 
    }, { status: 500 });
  }
}
