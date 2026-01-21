const fs = require('fs');
const JSZip = require('jszip');
const mammoth = require('mammoth');

// Sample profile data
const profileData = {
  fullName: 'Jan de Vries',
  email: 'jan.devries@email.nl',
  phone: '06-12345678',
  location: 'Amsterdam, Nederland',
  experience: [
    {
      company: 'Tech Solutions BV',
      title: 'Senior Developer',
      startDate: '2024',
      endDate: null,
      isCurrentRole: true,
      description: 'Ontwikkeling van web applicaties met React en Node.js.'
    },
    {
      company: 'Digital Agency XYZ',
      title: 'Full Stack Developer',
      startDate: '2023',
      endDate: '2024',
      description: 'Bouwen van e-commerce platforms.'
    },
    {
      company: 'Startup ABC',
      title: 'Junior Developer',
      startDate: '2022',
      endDate: '2023',
      description: 'Frontend development met Vue.js.'
    },
    {
      company: 'Intern Corp',
      title: 'Stagiair',
      startDate: '2021',
      endDate: '2022',
      description: 'Stage opdracht web development.'
    }
  ],
  education: [
    {
      school: 'Universiteit van Amsterdam',
      degree: 'BSc',
      fieldOfStudy: 'Informatica',
      startYear: '2016',
      endYear: '2020'
    },
    {
      school: 'ROC Amsterdam',
      degree: 'MBO',
      fieldOfStudy: 'ICT Beheer',
      startYear: '2012',
      endYear: '2015'
    }
  ],
  skills: [],
  languages: [],
  certifications: []
};

const customValues = {
  birthDate: '15-03-1998',
  nationality: 'Nederlands',
  beschikbaarheid: 'Per direct',
  vervoer: 'Eigen auto, rijbewijs B'
};

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFirstName(fullName) {
  return fullName.split(' ')[0] || '';
}

async function fillTemplate() {
  const templateBuffer = fs.readFileSync('./doc-example-template/CURRICULUM VITAE template S4Y.docx');
  const zip = await JSZip.loadAsync(templateBuffer);
  let docXml = await zip.file('word/document.xml').async('string');

  const filled = [];

  // === Personal fields: append value after 'Label: ' ===
  const personalMappings = {
    'Naam': profileData.fullName,
    'Voornaam': getFirstName(profileData.fullName),
    'Geboortedatum': customValues.birthDate,
    'Nationaliteit': customValues.nationality,
    'Woonplaats': profileData.location?.split(',')[0] || ''
  };

  for (const [label, value] of Object.entries(personalMappings)) {
    if (value) {
      // Pattern: 'Label: </w:t>' -> 'Label: VALUE</w:t>'
      const pattern = new RegExp(`(${label}:\\s*)(<\/w:t>)`, 'i');
      if (docXml.match(pattern)) {
        docXml = docXml.replace(pattern, `$1${escapeXml(value)}$2`);
        filled.push(label);
      }
    }
  }

  // === Education: 'YYYY - YYYY :' pattern ===
  // First education (2012-2015 slot)
  if (profileData.education[1]) {
    const edu = profileData.education[1];
    const eduText = [edu.degree, edu.fieldOfStudy, edu.school].filter(Boolean).join(', ');
    docXml = docXml.replace(
      /(2012\s*-\s*2015\s*:\s*)(<\/w:t>)/i,
      `$1${escapeXml(eduText)}$2`
    );
    filled.push('education_0');
  }

  // Second education (2016-2020 slot)
  if (profileData.education[0]) {
    const edu = profileData.education[0];
    const eduText = [edu.degree, edu.fieldOfStudy, edu.school].filter(Boolean).join(', ');
    docXml = docXml.replace(
      /(2016\s*-\s*2020\s*:\s*)(<\/w:t>)/i,
      `$1${escapeXml(eduText)}$2`
    );
    filled.push('education_1');
  }

  // === Experience: Replace period patterns with company ===
  const expSlots = [
    { pattern: /2024-Heden\s*:\s*/, expIndex: 0 },
    { pattern: /2023-2024\s*:\s*/, expIndex: 1 },
    { pattern: /2023-2023\s*:\s*/, expIndex: 2 },
    { pattern: /2022-2022\s*:\s*/, expIndex: 3 },
  ];

  for (const slot of expSlots) {
    const exp = profileData.experience[slot.expIndex];
    if (exp) {
      const periodPattern = new RegExp(`(${slot.pattern.source})(<\/w:t>)`, 'i');
      if (docXml.match(periodPattern)) {
        docXml = docXml.replace(periodPattern, `$1${escapeXml(exp.company || '')}$2`);
        filled.push(`exp_${slot.expIndex}_company`);
      }
    }
  }

  // Replace Functie fields (in order)
  let functieCount = 0;
  docXml = docXml.replace(/(Functie\s*:\s*)(<\/w:t>)/gi, (match, p1, p2) => {
    const exp = profileData.experience[functieCount];
    functieCount++;
    if (exp && exp.title) {
      filled.push(`exp_${functieCount-1}_title`);
      return p1 + escapeXml(exp.title) + p2;
    }
    return match;
  });

  // Replace Werkzaamheden fields (in order)
  let werkCount = 0;
  docXml = docXml.replace(/(Werkzaamheden\s*:\s*)(<\/w:t>)/gi, (match, p1, p2) => {
    const exp = profileData.experience[werkCount];
    werkCount++;
    if (exp && exp.description) {
      filled.push(`exp_${werkCount-1}_desc`);
      return p1 + escapeXml(exp.description) + p2;
    }
    return match;
  });

  // === Extra fields ===
  const extraMappings = {
    'Beschikbaarheid': customValues.beschikbaarheid,
    'Vervoer': customValues.vervoer
  };

  for (const [label, value] of Object.entries(extraMappings)) {
    if (value) {
      const pattern = new RegExp(`(${label}\\s*:\\s*)(<\/w:t>)`, 'i');
      if (docXml.match(pattern)) {
        docXml = docXml.replace(pattern, `$1${escapeXml(value)}$2`);
        filled.push(label);
      }
    }
  }

  console.log('Filled fields:', filled);
  console.log('Total:', filled.length);

  // Save the result
  zip.file('word/document.xml', docXml);
  const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('./doc-example-template/FILLED_S4Y.docx', outputBuffer);

  console.log('\nSaved to: ./doc-example-template/FILLED_S4Y.docx');

  // Verify by extracting text
  const verifyResult = await mammoth.extractRawText({ buffer: outputBuffer });
  console.log('\n=== Filled document text ===');
  console.log(verifyResult.value);
}

fillTemplate().catch(console.error);
