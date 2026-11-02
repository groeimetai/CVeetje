/**
 * Fictieve profielen voor de documentgeneratie-evaluatie. Geen echte
 * personen. Elk profiel test een ander risico (zie `risk`).
 */
import type { ParsedLinkedIn } from '../../src/types';

export interface ProfileFixture {
  id: string;
  risk: string;
  profile: ParsedLinkedIn;
}

export const PROFILES: ProfileFixture[] = [
  {
    id: 'senior-dev-nl',
    risk: 'Rijk profiel met beschrijvingen; check op verzonnen cijfers en goede bullets.',
    profile: {
      fullName: 'Sanne de Vries',
      headline: 'Senior Frontend Developer',
      location: 'Utrecht',
      about:
        'Frontend developer met acht jaar ervaring in React en TypeScript. Ik werk graag aan toegankelijke webapplicaties en begeleid junior developers.',
      email: 'sanne@example.com',
      experience: [
        {
          title: 'Senior Frontend Developer',
          company: 'Acme BV',
          location: 'Utrecht',
          startDate: '2020-01',
          endDate: null,
          isCurrentRole: true,
          description:
            'Lead developer van de klantportal (React, TypeScript, GraphQL). Migreerde de portal van class components naar hooks. Zette een design system op met Storybook. Begeleidt twee junior developers.',
        },
        {
          title: 'Frontend Developer',
          company: 'Webbureau Noord',
          location: 'Groningen',
          startDate: '2016-03',
          endDate: '2019-12',
          isCurrentRole: false,
          description: 'Bouwde websites en webshops voor MKB-klanten met React en Vue. Verantwoordelijk voor WCAG-audits.',
        },
      ],
      education: [{ school: 'Rijksuniversiteit Groningen', degree: 'MSc', fieldOfStudy: 'Informatica', startYear: '2013', endYear: '2015' }],
      skills: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'GraphQL' }, { name: 'Storybook' }, { name: 'WCAG' }, { name: 'Vue' }],
      languages: [
        { language: 'Nederlands', proficiency: 'Moedertaal' },
        { language: 'Engels', proficiency: 'Professioneel' },
      ],
      certifications: [],
      projects: [],
    },
  },
  {
    id: 'junior-zorg-sparse',
    risk: 'Dun profiel zonder beschrijvingen; grootste risico op verzonnen verantwoordelijkheden.',
    profile: {
      fullName: 'Mohammed El Amrani',
      headline: 'Verpleegkundige',
      location: 'Rotterdam',
      about: null,
      experience: [
        { title: 'Verpleegkundige', company: 'Maasstad Ziekenhuis', location: 'Rotterdam', startDate: '2022-09', endDate: null, isCurrentRole: true, description: null },
        { title: 'Stagiair verpleegkunde', company: 'Erasmus MC', location: 'Rotterdam', startDate: '2021-09', endDate: '2022-06', isCurrentRole: false, description: null },
      ],
      education: [{ school: 'Hogeschool Rotterdam', degree: 'Bachelor', fieldOfStudy: 'Verpleegkunde', startYear: '2018', endYear: '2022' }],
      skills: [{ name: 'Patiëntenzorg' }, { name: 'BIG-registratie' }],
      languages: [
        { language: 'Nederlands', proficiency: 'Moedertaal' },
        { language: 'Arabisch', proficiency: 'Vloeiend' },
      ],
      certifications: [{ name: 'BIG-registratie Verpleegkundige', issuer: 'CIBG', issueDate: '2022' }],
      projects: [],
    },
  },
  {
    id: 'career-switcher-en',
    risk: 'Carrièreswitcher (horeca → data); overdraagbare vaardigheden zonder overdrijving; Engelse output.',
    profile: {
      fullName: 'Lotte Bakker',
      headline: 'Aspiring Data Analyst | former restaurant manager',
      location: 'Amsterdam',
      about:
        'After eight years in hospitality management I retrained as a data analyst. Completed a data bootcamp and built dashboards for my previous restaurant group.',
      experience: [
        {
          title: 'Restaurant Manager',
          company: 'Groep Gastvrij',
          location: 'Amsterdam',
          startDate: '2016-05',
          endDate: '2023-08',
          isCurrentRole: false,
          description: 'Managed a team of 15 staff. Responsible for scheduling, purchasing and weekly revenue reports in Excel.',
        },
        {
          title: 'Freelance Data Analyst',
          company: 'Zelfstandig',
          location: 'Amsterdam',
          startDate: '2024-01',
          endDate: null,
          isCurrentRole: true,
          description: 'Built Power BI dashboards for two hospitality clients.',
        },
      ],
      education: [{ school: 'Le Wagon', degree: 'Bootcamp', fieldOfStudy: 'Data Analytics', startYear: '2023', endYear: '2023' }],
      skills: [{ name: 'SQL' }, { name: 'Python' }, { name: 'Power BI' }, { name: 'Excel' }],
      languages: [
        { language: 'Dutch', proficiency: 'Native' },
        { language: 'English', proficiency: 'Fluent' },
      ],
      certifications: [],
      projects: [
        { title: 'Omzetdashboard', description: 'Power BI dashboard met dagelijkse omzet per vestiging.', technologies: ['Power BI', 'SQL'], url: null, startDate: '2024-02', endDate: '2024-03', role: 'Analist' },
      ],
    },
  },
  {
    id: 'sales-gap',
    risk: 'Gat van 2 jaar in het cv; geen claims over de gap, correcte data.',
    profile: {
      fullName: 'Pieter Jansen',
      headline: 'Accountmanager B2B',
      location: 'Eindhoven',
      about: 'Accountmanager met focus op langdurige klantrelaties in de techniek.',
      experience: [
        { title: 'Accountmanager', company: 'TechParts BV', location: 'Eindhoven', startDate: '2021-04', endDate: null, isCurrentRole: true, description: 'Beheer van 40 zakelijke klanten in de maakindustrie. Haalde in 2023 de jaartarget.' },
        { title: 'Binnendienst verkoper', company: 'Grossier Zuid', location: 'Den Bosch', startDate: '2014-02', endDate: '2019-03', isCurrentRole: false, description: 'Telefonische verkoop en offertes.' },
      ],
      education: [{ school: 'Fontys Hogescholen', degree: 'Bachelor', fieldOfStudy: 'Commerciële Economie', startYear: '2010', endYear: '2014' }],
      skills: [{ name: 'Salesforce' }, { name: 'Onderhandelen' }, { name: 'Accountmanagement' }],
      languages: [
        { language: 'Nederlands', proficiency: 'Moedertaal' },
        { language: 'Duits', proficiency: 'Goed' },
      ],
      certifications: [],
      projects: [],
    },
  },
];
