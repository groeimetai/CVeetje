'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  User,
  Mail,
  Briefcase,
  GraduationCap,
  Award,
  Languages as LanguagesIcon,
  FolderKanban,
  Wrench,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import type {
  ParsedLinkedIn,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInLanguage,
  LinkedInCertification,
  LinkedInProject,
} from '@/types';

interface ProfileEditFormProps {
  value: ParsedLinkedIn;
  onChange: (next: ParsedLinkedIn) => void;
}

// Factories for new empty entries.
function emptyExperience(): LinkedInExperience {
  return {
    title: '',
    company: '',
    location: null,
    startDate: '',
    endDate: null,
    description: null,
    isCurrentRole: false,
  };
}

function emptyEducation(): LinkedInEducation {
  return {
    school: '',
    degree: null,
    fieldOfStudy: null,
    startYear: null,
    endYear: null,
  };
}

function emptySkill(): LinkedInSkill {
  return { name: '' };
}

function emptyLanguage(): LinkedInLanguage {
  return { language: '', proficiency: null };
}

function emptyCertification(): LinkedInCertification {
  return { name: '', issuer: null, issueDate: null };
}

function emptyProject(): LinkedInProject {
  return {
    title: '',
    description: null,
    technologies: [],
    url: null,
    startDate: null,
    endDate: null,
    role: null,
  };
}

// Helpers to mutate array fields immutably.
function updateAt<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function removeAt<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

// Normalize empty string → null for nullable text fields.
function toNullable(value: string): string | null {
  return value.trim() === '' ? null : value;
}

export function ProfileEditForm({ value, onChange }: ProfileEditFormProps) {
  const t = useTranslations('profiles.edit');
  const f = useTranslations('profiles.edit.fields');
  const a = useTranslations('profiles.edit.actions');

  // Generic field setter for top-level scalar fields.
  const setField = <K extends keyof ParsedLinkedIn>(key: K, fieldValue: ParsedLinkedIn[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  // Experience handlers
  const experienceList = value.experience || [];
  const addExperience = () => setField('experience', [...experienceList, emptyExperience()]);
  const updateExperience = (idx: number, patch: Partial<LinkedInExperience>) =>
    setField('experience', updateAt(experienceList, idx, patch));
  const removeExperience = (idx: number) =>
    setField('experience', removeAt(experienceList, idx));
  const moveExperience = (idx: number, dir: -1 | 1) =>
    setField('experience', moveItem(experienceList, idx, dir));

  // Education handlers
  const educationList = value.education || [];
  const addEducation = () => setField('education', [...educationList, emptyEducation()]);
  const updateEducation = (idx: number, patch: Partial<LinkedInEducation>) =>
    setField('education', updateAt(educationList, idx, patch));
  const removeEducation = (idx: number) =>
    setField('education', removeAt(educationList, idx));
  const moveEducation = (idx: number, dir: -1 | 1) =>
    setField('education', moveItem(educationList, idx, dir));

  // Skills handlers
  const skillsList = value.skills || [];
  const addSkill = () => setField('skills', [...skillsList, emptySkill()]);
  const updateSkill = (idx: number, name: string) =>
    setField('skills', updateAt(skillsList, idx, { name }));
  const removeSkill = (idx: number) =>
    setField('skills', removeAt(skillsList, idx));

  // Languages handlers
  const languagesList = value.languages || [];
  const addLanguage = () => setField('languages', [...languagesList, emptyLanguage()]);
  const updateLanguage = (idx: number, patch: Partial<LinkedInLanguage>) =>
    setField('languages', updateAt(languagesList, idx, patch));
  const removeLanguage = (idx: number) =>
    setField('languages', removeAt(languagesList, idx));

  // Certifications handlers
  const certificationsList = value.certifications || [];
  const addCertification = () => setField('certifications', [...certificationsList, emptyCertification()]);
  const updateCertification = (idx: number, patch: Partial<LinkedInCertification>) =>
    setField('certifications', updateAt(certificationsList, idx, patch));
  const removeCertification = (idx: number) =>
    setField('certifications', removeAt(certificationsList, idx));

  // Projects handlers
  const projectsList = value.projects || [];
  const setProjects = (next: LinkedInProject[]) => onChange({ ...value, projects: next });
  const addProject = () => setProjects([...projectsList, emptyProject()]);
  const updateProject = (idx: number, patch: Partial<LinkedInProject>) =>
    setProjects(updateAt(projectsList, idx, patch));
  const removeProject = (idx: number) => setProjects(removeAt(projectsList, idx));
  const moveProject = (idx: number, dir: -1 | 1) => setProjects(moveItem(projectsList, idx, dir));

  return (
    <Accordion
      type="multiple"
      defaultValue={['personal', 'contact', 'experience']}
      className="w-full"
    >
      {/* Personal */}
      <AccordionItem value="personal">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('sections.personal')}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="fullName">{f('fullName')}</Label>
              <Input
                id="fullName"
                value={value.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="headline">{f('headline')}</Label>
              <Input
                id="headline"
                value={value.headline || ''}
                onChange={(e) => setField('headline', toNullable(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="birthDate">{f('birthDate')}</Label>
              <Input
                id="birthDate"
                placeholder="DD-MM-YYYY"
                value={value.birthDate || ''}
                onChange={(e) => setField('birthDate', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="location">{f('location')}</Label>
              <Input
                id="location"
                value={value.location || ''}
                onChange={(e) => setField('location', toNullable(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="about">{f('about')}</Label>
              <Textarea
                id="about"
                rows={5}
                value={value.about || ''}
                onChange={(e) => setField('about', toNullable(e.target.value))}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Contact */}
      <AccordionItem value="contact">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {t('sections.contact')}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">{f('email')}</Label>
              <Input
                id="email"
                type="email"
                value={value.email || ''}
                onChange={(e) => setField('email', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="phone">{f('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={value.phone || ''}
                onChange={(e) => setField('phone', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="linkedinUrl">{f('linkedinUrl')}</Label>
              <Input
                id="linkedinUrl"
                value={value.linkedinUrl || ''}
                onChange={(e) => setField('linkedinUrl', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="website">{f('website')}</Label>
              <Input
                id="website"
                value={value.website || ''}
                onChange={(e) => setField('website', e.target.value || undefined)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="github">{f('github')}</Label>
              <Input
                id="github"
                value={value.github || ''}
                onChange={(e) => setField('github', e.target.value || undefined)}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Experience */}
      <AccordionItem value="experience">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {t('sections.experience')}
            {experienceList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{experienceList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {experienceList.map((exp, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    #{idx + 1}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveExperience(idx, -1)}
                      aria-label={a('moveUp')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === experienceList.length - 1}
                      onClick={() => moveExperience(idx, 1)}
                      aria-label={a('moveDown')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeExperience(idx)}
                      aria-label={a('remove')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{f('jobTitle')}</Label>
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(idx, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{f('company')}</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(idx, { company: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{f('location')}</Label>
                    <Input
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(idx, { location: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('startDate')}</Label>
                    <Input
                      value={exp.startDate}
                      onChange={(e) => updateExperience(idx, { startDate: e.target.value })}
                      placeholder="Jan 2024"
                    />
                  </div>
                  <div>
                    <Label>{f('endDate')}</Label>
                    <Input
                      value={exp.endDate || ''}
                      onChange={(e) =>
                        updateExperience(idx, {
                          endDate: toNullable(e.target.value),
                          isCurrentRole: e.target.value.trim() === '',
                        })
                      }
                      placeholder="Dec 2025"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{f('description')}</Label>
                    <Textarea
                      rows={3}
                      value={exp.description || ''}
                      onChange={(e) => updateExperience(idx, { description: toNullable(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addExperience}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addExperience')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Education */}
      <AccordionItem value="education">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('sections.education')}
            {educationList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{educationList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {educationList.map((edu, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveEducation(idx, -1)}
                      aria-label={a('moveUp')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === educationList.length - 1}
                      onClick={() => moveEducation(idx, 1)}
                      aria-label={a('moveDown')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEducation(idx)}
                      aria-label={a('remove')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>{f('school')}</Label>
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(idx, { school: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{f('degree')}</Label>
                    <Input
                      value={edu.degree || ''}
                      onChange={(e) => updateEducation(idx, { degree: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('fieldOfStudy')}</Label>
                    <Input
                      value={edu.fieldOfStudy || ''}
                      onChange={(e) => updateEducation(idx, { fieldOfStudy: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('startYear')}</Label>
                    <Input
                      value={edu.startYear || ''}
                      onChange={(e) => updateEducation(idx, { startYear: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('endYear')}</Label>
                    <Input
                      value={edu.endYear || ''}
                      onChange={(e) => updateEducation(idx, { endYear: toNullable(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEducation}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addEducation')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Skills */}
      <AccordionItem value="skills">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            {t('sections.skills')}
            {skillsList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{skillsList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {skillsList.map((skill, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 rounded-full border bg-background pl-3 pr-1 py-1"
                >
                  <Input
                    value={skill.name}
                    onChange={(e) => updateSkill(idx, e.target.value)}
                    className="h-6 w-auto border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 shadow-none"
                    style={{ minWidth: '4rem', width: `${Math.max(skill.name.length, 4)}ch` }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={() => removeSkill(idx)}
                    aria-label={a('remove')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSkill}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addSkill')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Languages */}
      <AccordionItem value="languages">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <LanguagesIcon className="h-4 w-4" />
            {t('sections.languages')}
            {languagesList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{languagesList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-2">
            {languagesList.map((lang, idx) => (
              <div key={idx} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>{f('language')}</Label>
                  <Input
                    value={lang.language}
                    onChange={(e) => updateLanguage(idx, { language: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <Label>{f('proficiency')}</Label>
                  <Input
                    value={lang.proficiency || ''}
                    onChange={(e) => updateLanguage(idx, { proficiency: toNullable(e.target.value) })}
                    placeholder="Native / Fluent / Conversational"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeLanguage(idx)}
                  aria-label={a('remove')}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addLanguage')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Certifications */}
      <AccordionItem value="certifications">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            {t('sections.certifications')}
            {certificationsList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{certificationsList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {certificationsList.map((cert, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCertification(idx)}
                    aria-label={a('remove')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>{f('certificationName')}</Label>
                    <Input
                      value={cert.name}
                      onChange={(e) => updateCertification(idx, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{f('issuer')}</Label>
                    <Input
                      value={cert.issuer || ''}
                      onChange={(e) => updateCertification(idx, { issuer: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('issueDate')}</Label>
                    <Input
                      value={cert.issueDate || ''}
                      onChange={(e) => updateCertification(idx, { issueDate: toNullable(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addCertification}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addCertification')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Projects */}
      <AccordionItem value="projects">
        <AccordionTrigger className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            {t('sections.projects')}
            {projectsList.length > 0 && (
              <Badge variant="secondary" className="ml-1">{projectsList.length}</Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-2">
            {projectsList.map((proj, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => moveProject(idx, -1)}
                      aria-label={a('moveUp')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={idx === projectsList.length - 1}
                      onClick={() => moveProject(idx, 1)}
                      aria-label={a('moveDown')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeProject(idx)}
                      aria-label={a('remove')}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>{f('projectTitle')}</Label>
                    <Input
                      value={proj.title}
                      onChange={(e) => updateProject(idx, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{f('role')}</Label>
                    <Input
                      value={proj.role || ''}
                      onChange={(e) => updateProject(idx, { role: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('url')}</Label>
                    <Input
                      value={proj.url || ''}
                      onChange={(e) => updateProject(idx, { url: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('startDate')}</Label>
                    <Input
                      value={proj.startDate || ''}
                      onChange={(e) => updateProject(idx, { startDate: toNullable(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{f('endDate')}</Label>
                    <Input
                      value={proj.endDate || ''}
                      onChange={(e) => updateProject(idx, { endDate: toNullable(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{f('projectDescription')}</Label>
                    <Textarea
                      rows={3}
                      value={proj.description || ''}
                      onChange={(e) => updateProject(idx, { description: toNullable(e.target.value) })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>{f('technologies')}</Label>
                    <Input
                      value={(proj.technologies || []).join(', ')}
                      onChange={(e) =>
                        updateProject(idx, {
                          technologies: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0),
                        })
                      }
                      placeholder="React, Node.js, PostgreSQL"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addProject}>
              <Plus className="h-4 w-4 mr-1" />
              {a('addProject')}
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
