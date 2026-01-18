import type {
  ParsedLinkedIn,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInLanguage,
  LinkedInCertification,
} from '@/types';

/**
 * Parse LinkedIn profile text (copied from LinkedIn page)
 * This parser handles the typical text structure when copying from LinkedIn
 */
export function parseLinkedInProfile(rawText: string): ParsedLinkedIn {
  const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean);

  const result: ParsedLinkedIn = {
    fullName: '',
    headline: null,
    location: null,
    about: null,
    experience: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
  };

  let currentSection: string | null = null;
  let sectionContent: string[] = [];

  // Section markers in LinkedIn
  const sectionMarkers = [
    'Experience',
    'Ervaring',
    'Education',
    'Opleiding',
    'Skills',
    'Vaardigheden',
    'Languages',
    'Talen',
    'Licenses & certifications',
    'Licenties en certificaten',
    'About',
    'Info',
  ];

  // Parse header (name, headline, location)
  // Usually first few lines before any section
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (sectionMarkers.some((marker) => line.toLowerCase() === marker.toLowerCase())) {
      headerIndex = i;
      break;
    }
    headerIndex = i + 1;
  }

  const headerLines = lines.slice(0, headerIndex);
  if (headerLines.length > 0) {
    result.fullName = headerLines[0];
  }
  if (headerLines.length > 1) {
    result.headline = headerLines[1];
  }
  if (headerLines.length > 2) {
    // Location often has specific patterns
    const locationLine = headerLines.find(
      (l) =>
        l.includes(',') ||
        l.toLowerCase().includes('netherlands') ||
        l.toLowerCase().includes('nederland') ||
        l.match(/^[A-Za-z\s]+,\s*[A-Za-z\s]+$/)
    );
    if (locationLine) {
      result.location = locationLine;
    }
  }

  // Process sections
  for (let i = headerIndex; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a section header
    const isSection = sectionMarkers.some(
      (marker) => line.toLowerCase() === marker.toLowerCase()
    );

    if (isSection) {
      // Process previous section
      if (currentSection && sectionContent.length > 0) {
        processSection(result, currentSection, sectionContent);
      }
      currentSection = line;
      sectionContent = [];
    } else {
      sectionContent.push(line);
    }
  }

  // Process last section
  if (currentSection && sectionContent.length > 0) {
    processSection(result, currentSection, sectionContent);
  }

  return result;
}

function processSection(
  result: ParsedLinkedIn,
  sectionName: string,
  content: string[]
): void {
  const sectionLower = sectionName.toLowerCase();

  if (sectionLower === 'about' || sectionLower === 'info') {
    result.about = content.join(' ').trim();
  } else if (sectionLower === 'experience' || sectionLower === 'ervaring') {
    result.experience = parseExperience(content);
  } else if (sectionLower === 'education' || sectionLower === 'opleiding') {
    result.education = parseEducation(content);
  } else if (sectionLower === 'skills' || sectionLower === 'vaardigheden') {
    result.skills = parseSkills(content);
  } else if (sectionLower === 'languages' || sectionLower === 'talen') {
    result.languages = parseLanguages(content);
  } else if (
    sectionLower === 'licenses & certifications' ||
    sectionLower === 'licenties en certificaten'
  ) {
    result.certifications = parseCertifications(content);
  }
}

function parseExperience(content: string[]): LinkedInExperience[] {
  const experiences: LinkedInExperience[] = [];
  let current: Partial<LinkedInExperience> = {};
  let descriptionLines: string[] = [];

  // Date patterns
  const datePattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+\d{4}/i;
  const durationPattern = /^\d+\s*(yr|yrs|mo|mos|jaar|maand|maanden)/i;

  for (const line of content) {
    // Check for date/duration line (indicates start of description or new role)
    if (datePattern.test(line) || line.includes(' - ')) {
      // This is likely a date range line
      if (current.title) {
        current.startDate = extractStartDate(line);
        current.endDate = extractEndDate(line);
        current.isCurrentRole = line.toLowerCase().includes('present') || line.toLowerCase().includes('heden');
      }
    } else if (durationPattern.test(line)) {
      // Duration line, skip
      continue;
    } else if (line.length > 0 && !line.match(/^\d+ connections?$/i)) {
      // Could be title, company, location, or description
      if (!current.title) {
        current.title = line;
      } else if (!current.company) {
        // Company often comes with employment type
        const companyMatch = line.match(/^(.+?)\s*[·•-]\s*(Full-time|Part-time|Contract|Freelance|Zelfstandig)/i);
        if (companyMatch) {
          current.company = companyMatch[1].trim();
        } else {
          current.company = line.split('·')[0].trim();
        }
      } else if (!current.location && (line.includes(',') || line.length < 50)) {
        current.location = line;
      } else {
        // Add to description
        descriptionLines.push(line);
      }
    }

    // If we have enough info for an experience entry and encounter a clear break
    if (current.title && current.company && descriptionLines.length > 0) {
      const nextLineIndex = content.indexOf(line) + 1;
      const nextLine = content[nextLineIndex];

      // Check if next line looks like a new job title (usually shorter, capitalized)
      if (
        !nextLine ||
        (nextLine.length < 60 && !nextLine.includes('.') && nextLine === nextLine)
      ) {
        // Save current experience
        experiences.push({
          title: current.title,
          company: current.company,
          location: current.location || null,
          startDate: current.startDate || '',
          endDate: current.endDate || null,
          description: descriptionLines.join(' ').trim() || null,
          isCurrentRole: current.isCurrentRole || false,
        });
        current = {};
        descriptionLines = [];
      }
    }
  }

  // Don't forget the last experience
  if (current.title && current.company) {
    experiences.push({
      title: current.title,
      company: current.company,
      location: current.location || null,
      startDate: current.startDate || '',
      endDate: current.endDate || null,
      description: descriptionLines.join(' ').trim() || null,
      isCurrentRole: current.isCurrentRole || false,
    });
  }

  return experiences;
}

function extractStartDate(line: string): string {
  const parts = line.split(' - ');
  if (parts.length >= 1) {
    return parts[0].trim();
  }
  return '';
}

function extractEndDate(line: string): string | null {
  const parts = line.split(' - ');
  if (parts.length >= 2) {
    const endPart = parts[1].trim().split('·')[0].trim();
    if (endPart.toLowerCase() === 'present' || endPart.toLowerCase() === 'heden') {
      return null;
    }
    return endPart;
  }
  return null;
}

function parseEducation(content: string[]): LinkedInEducation[] {
  const education: LinkedInEducation[] = [];
  let current: Partial<LinkedInEducation> = {};

  for (const line of content) {
    // Date pattern for education
    const yearPattern = /^\d{4}\s*-\s*\d{4}$/;
    const singleYearPattern = /^\d{4}$/;

    if (yearPattern.test(line)) {
      const years = line.split('-').map((y) => y.trim());
      current.startYear = years[0];
      current.endYear = years[1];
    } else if (singleYearPattern.test(line)) {
      current.endYear = line;
    } else if (!current.school) {
      current.school = line;
    } else if (!current.degree) {
      // Could be degree or field of study
      if (line.includes(',')) {
        const parts = line.split(',').map((p) => p.trim());
        current.degree = parts[0];
        current.fieldOfStudy = parts.slice(1).join(', ');
      } else {
        current.degree = line;
      }
    } else if (!current.fieldOfStudy) {
      current.fieldOfStudy = line;
    }

    // If we have a complete education entry
    if (current.school && (current.degree || current.endYear)) {
      // Check if next item looks like a new school
      const nextIndex = content.indexOf(line) + 1;
      const nextLine = content[nextIndex];

      if (!nextLine || (!yearPattern.test(nextLine) && !nextLine.includes(','))) {
        education.push({
          school: current.school,
          degree: current.degree || null,
          fieldOfStudy: current.fieldOfStudy || null,
          startYear: current.startYear || null,
          endYear: current.endYear || null,
        });
        current = {};
      }
    }
  }

  // Don't forget the last education entry
  if (current.school) {
    education.push({
      school: current.school,
      degree: current.degree || null,
      fieldOfStudy: current.fieldOfStudy || null,
      startYear: current.startYear || null,
      endYear: current.endYear || null,
    });
  }

  return education;
}

function parseSkills(content: string[]): LinkedInSkill[] {
  return content
    .filter((line) => line.length > 0 && line.length < 100)
    .filter((line) => !line.match(/^\d+\s*endorsements?$/i))
    .filter((line) => !line.match(/^Show all/i))
    .map((name) => ({ name: name.trim() }));
}

function parseLanguages(content: string[]): LinkedInLanguage[] {
  const languages: LinkedInLanguage[] = [];
  let currentLanguage: string | null = null;

  for (const line of content) {
    const proficiencyKeywords = [
      'Native',
      'Moedertaal',
      'Full professional',
      'Volledig professioneel',
      'Professional working',
      'Professioneel werkend',
      'Limited working',
      'Beperkt werkend',
      'Elementary',
      'Basis',
    ];

    const isProficiency = proficiencyKeywords.some((kw) =>
      line.toLowerCase().includes(kw.toLowerCase())
    );

    if (isProficiency && currentLanguage) {
      languages.push({
        language: currentLanguage,
        proficiency: line,
      });
      currentLanguage = null;
    } else if (line.length > 0 && line.length < 50) {
      if (currentLanguage) {
        // Previous language without proficiency
        languages.push({
          language: currentLanguage,
          proficiency: null,
        });
      }
      currentLanguage = line;
    }
  }

  // Don't forget the last language
  if (currentLanguage) {
    languages.push({
      language: currentLanguage,
      proficiency: null,
    });
  }

  return languages;
}

function parseCertifications(content: string[]): LinkedInCertification[] {
  const certifications: LinkedInCertification[] = [];
  let current: Partial<LinkedInCertification> = {};

  const datePattern = /^(Issued|Uitgegeven)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s+\d{4}/i;

  for (const line of content) {
    if (datePattern.test(line)) {
      current.issueDate = line.replace(/^(Issued|Uitgegeven)\s+/i, '');
    } else if (line.includes('Credential ID')) {
      // Skip credential IDs
      continue;
    } else if (!current.name) {
      current.name = line;
    } else if (!current.issuer) {
      current.issuer = line;
    }

    // Save certification if we have name and something else
    if (current.name && (current.issuer || current.issueDate)) {
      const nextIndex = content.indexOf(line) + 1;
      const nextLine = content[nextIndex];

      if (!nextLine || !datePattern.test(nextLine)) {
        certifications.push({
          name: current.name,
          issuer: current.issuer || null,
          issueDate: current.issueDate || null,
        });
        current = {};
      }
    }
  }

  // Don't forget the last certification
  if (current.name) {
    certifications.push({
      name: current.name,
      issuer: current.issuer || null,
      issueDate: current.issueDate || null,
    });
  }

  return certifications;
}
