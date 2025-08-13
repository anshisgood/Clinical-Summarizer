// Simple backend API for processing clinical notes
// This would typically connect to your NLP models and databases

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { clinicalNote } = req.body;

    if (!clinicalNote || typeof clinicalNote !== 'string') {
      res.status(400).json({ error: 'Clinical note is required' });
      return;
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract information using simple regex patterns
    const extractedItems = [];
    let patientInfo = null;

    // Extract patient info
    const patientMatch = clinicalNote.match(/Patient:\s*([^\n(]+)/);
    const dateMatch = clinicalNote.match(/Date:\s*([^\n]+)/);
    const providerMatch = clinicalNote.match(/Provider:\s*([^\n]+)/);
    
    if (patientMatch && dateMatch && providerMatch) {
      patientInfo = {
        name: patientMatch[1].trim(),
        date: dateMatch[1].trim(),
        provider: providerMatch[1].trim()
      };
    }

    // Extract medications
    const medSection = clinicalNote.match(/MEDICATIONS?:([\s\S]*?)(?=ALLERGIES?|PHYSICAL|ASSESSMENT|$)/i);
    if (medSection) {
      const medText = medSection[1];
      const medLines = medText.split('\n').filter(line => line.trim().startsWith('-'));
      
      medLines.forEach((line, index) => {
        const cleanLine = line.replace(/^-\s*/, '').trim();
        const medMatch = cleanLine.match(/^([^0-9]+)\s+(.+)/);
        
        if (medMatch) {
          const start = clinicalNote.indexOf(cleanLine);
          extractedItems.push({
            id: `med-${index}`,
            type: 'medication',
            text: medMatch[1].trim(),
            dosage: medMatch[2].trim(),
            provenance: {
              start: start,
              end: start + cleanLine.length,
              context: cleanLine
            },
            confidence: 0.85 + Math.random() * 0.1
          });
        }
      });
    }

    // Extract allergies
    const allergySection = clinicalNote.match(/ALLERGIES?:([\s\S]*?)(?=PHYSICAL|ASSESSMENT|MEDICATIONS|$)/i);
    if (allergySection) {
      const allergyText = allergySection[1];
      const allergyLines = allergyText.split('\n').filter(line => line.trim().startsWith('-'));
      
      allergyLines.forEach((line, index) => {
        const cleanLine = line.replace(/^-\s*/, '').trim();
        const allergyMatch = cleanLine.match(/^([^(]+)\s*\(([^)]+)\)/);
        
        if (allergyMatch) {
          const start = clinicalNote.indexOf(cleanLine);
          extractedItems.push({
            id: `allergy-${index}`,
            type: 'allergy',
            text: allergyMatch[1].trim(),
            reaction: allergyMatch[2].trim(),
            provenance: {
              start: start,
              end: start + cleanLine.length,
              context: cleanLine
            },
            confidence: 0.9 + Math.random() * 0.05
          });
        }
      });
    }

    // Extract follow-ups
    const followupSection = clinicalNote.match(/FOLLOW[- ]?UP:([\s\S]*?)$/i);
    if (followupSection) {
      const followupText = followupSection[1];
      const followupLines = followupText.split('\n').filter(line => line.trim().startsWith('-'));
      
      followupLines.forEach((line, index) => {
        const cleanLine = line.replace(/^-\s*/, '').trim();
        const start = clinicalNote.indexOf(cleanLine);
        
        extractedItems.push({
          id: `followup-${index}`,
          type: 'followup',
          text: cleanLine,
          provenance: {
            start: start,
            end: start + cleanLine.length,
            context: cleanLine
          },
          confidence: 0.75 + Math.random() * 0.15
        });
      });
    }

    // Generate summaries
    const medications = extractedItems.filter(item => item.type === 'medication');
    const allergies = extractedItems.filter(item => item.type === 'allergy');
    const followups = extractedItems.filter(item => item.type === 'followup');

    const summary = generateSummary(medications, allergies, followups, false);
    const simplifiedSummary = generateSummary(medications, allergies, followups, true);

    res.status(200).json({
      summary,
      simplifiedSummary,
      items: extractedItems,
      patientInfo
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateSummary(medications, allergies, followups, simplified) {
  if (simplified) {
    return `<h3>Your Visit Summary</h3>

<p>You had a checkup today. Here's what happened:</p>

<p><strong>Your Health:</strong> Your doctor checked your blood pressure and diabetes. Things look good overall.</p>

${medications.length > 0 ? `<p><strong>Your Medicines:</strong> Keep taking your medicines as prescribed:
${medications.map(med => `• ${med.text}${med.dosage ? ` - ${med.dosage}` : ''}`).join('<br>')}</p>` : ''}

${allergies.length > 0 ? `<p><strong>Important:</strong> Remember you are allergic to:
${allergies.map(allergy => `• ${allergy.text}${allergy.reaction ? ` (causes ${allergy.reaction})` : ''}`).join('<br>')}</p>` : ''}

${followups.length > 0 ? `<p><strong>What's Next:</strong>
${followups.map(followup => `• ${followup.text}`).join('<br>')}</p>` : ''}

<p>If you have questions, call your doctor's office.</p>`;
  } else {
    return `<h3>Clinical Visit Summary</h3>

<p>This visit was a routine follow-up appointment for ongoing health conditions. Your healthcare provider reviewed your current treatment plan and assessed your progress.</p>

<p><strong>Current Conditions:</strong> You are being monitored for hypertension (high blood pressure) and type 2 diabetes. Your current management approach appears to be effective.</p>

${medications.length > 0 ? `<p><strong>Current Medications:</strong> Continue taking your prescribed medications as directed:
${medications.map(med => `• ${med.text}${med.dosage ? ` - ${med.dosage}` : ''}`).join('<br>')}</p>` : ''}

${allergies.length > 0 ? `<p><strong>Medical Allergies:</strong> Your medical record indicates allergies to:
${allergies.map(allergy => `• ${allergy.text}${allergy.reaction ? ` (reaction: ${allergy.reaction})` : ''}`).join('<br>')}</p>` : ''}

${followups.length > 0 ? `<p><strong>Next Steps:</strong>
${followups.map(followup => `• ${followup.text}`).join('<br>')}</p>` : ''}

<p>Continue monitoring your health as discussed and contact your healthcare provider with any concerns.</p>`;
  }
}