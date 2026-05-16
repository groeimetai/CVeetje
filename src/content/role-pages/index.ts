import type { RolePage } from './types';
import type { Locale } from '../types';

// NL — Beroep-voorbeelden
import * as softwareontwikkelaar from './nl/voorbeeld-softwareontwikkelaar';
import * as verpleegkundige from './nl/voorbeeld-verpleegkundige';
import * as docent from './nl/voorbeeld-docent';
import * as accountmanager from './nl/voorbeeld-accountmanager';
import * as projectmanager from './nl/voorbeeld-projectmanager';
import * as dataAnalist from './nl/voorbeeld-data-analist';
import * as financieelAdviseur from './nl/voorbeeld-financieel-adviseur';
import * as recruiterNl from './nl/voorbeeld-recruiter';
import * as consultantNl from './nl/voorbeeld-consultant';
import * as marketingManager from './nl/voorbeeld-marketing-manager';
import * as productOwner from './nl/voorbeeld-product-owner';
import * as uxDesigner from './nl/voorbeeld-ux-designer';
import * as grafischOntwerper from './nl/voorbeeld-grafisch-ontwerper';
import * as logistiekMedewerker from './nl/voorbeeld-logistiek-medewerker';
import * as boekhouder from './nl/voorbeeld-boekhouder';
import * as hrManager from './nl/voorbeeld-hr-manager';
import * as ictBeheerder from './nl/voorbeeld-ict-beheerder';
import * as salesManager from './nl/voorbeeld-sales-manager';
import * as fysiotherapeut from './nl/voorbeeld-fysiotherapeut';
import * as juridischMedewerker from './nl/voorbeeld-juridisch-medewerker';
import * as businessAnalyst from './nl/voorbeeld-business-analyst';
import * as scrumMaster from './nl/voorbeeld-scrum-master';
import * as devopsEngineer from './nl/voorbeeld-devops-engineer';
import * as customerSuccess from './nl/voorbeeld-customer-success-manager';
import * as zorgmanager from './nl/voorbeeld-zorgmanager';

// NL — Situatie-templates
import * as zonderErvaring from './nl/template-zonder-werkervaring';
import * as studentTpl from './nl/template-student';
import * as carriereSwitcher from './nl/template-carriere-switcher';
import * as vijfentachtigplus from './nl/template-55-plus';
import * as herintrederTpl from './nl/template-herintreder';
import * as freelancerTpl from './nl/template-freelancer';
import * as expatTpl from './nl/template-expat';
import * as partTimeTpl from './nl/template-part-time';
import * as remoteTpl from './nl/template-remote';
import * as seniorTpl from './nl/template-senior';
import * as stageTpl from './nl/template-stage';
import * as naOntslagTpl from './nl/template-na-ontslag';

// EN — top 10
import * as softwareEngineerEn from './en/voorbeeld-software-engineer';
import * as productManagerEn from './en/voorbeeld-product-manager';
import * as dataScientistEn from './en/voorbeeld-data-scientist';
import * as nurseEn from './en/voorbeeld-nurse';
import * as teacherEn from './en/voorbeeld-teacher';
import * as marketingManagerEn from './en/voorbeeld-marketing-manager';
import * as uxDesignerEn from './en/voorbeeld-ux-designer';
import * as projectManagerEn from './en/voorbeeld-project-manager';

// EN — situation templates
import * as careerChangerEn from './en/template-career-changer';
import * as noExperienceEn from './en/template-no-experience';
import * as expatEnNL from './en/template-expat-in-netherlands';
import * as freelancerEn from './en/template-freelancer';

const NL_ROLES: RolePage[] = [
  softwareontwikkelaar,
  verpleegkundige,
  docent,
  accountmanager,
  projectmanager,
  dataAnalist,
  financieelAdviseur,
  recruiterNl,
  consultantNl,
  marketingManager,
  productOwner,
  uxDesigner,
  grafischOntwerper,
  logistiekMedewerker,
  boekhouder,
  hrManager,
  ictBeheerder,
  salesManager,
  fysiotherapeut,
  juridischMedewerker,
  businessAnalyst,
  scrumMaster,
  devopsEngineer,
  customerSuccess,
  zorgmanager,
  zonderErvaring,
  studentTpl,
  carriereSwitcher,
  vijfentachtigplus,
  herintrederTpl,
  freelancerTpl,
  expatTpl,
  partTimeTpl,
  remoteTpl,
  seniorTpl,
  stageTpl,
  naOntslagTpl,
] as unknown as RolePage[];

const EN_ROLES: RolePage[] = [
  softwareEngineerEn,
  productManagerEn,
  dataScientistEn,
  nurseEn,
  teacherEn,
  marketingManagerEn,
  uxDesignerEn,
  projectManagerEn,
  careerChangerEn,
  noExperienceEn,
  expatEnNL,
  freelancerEn,
] as unknown as RolePage[];

export function listRolePages(locale: Locale, kind?: 'voorbeeld' | 'template'): RolePage[] {
  const list = locale === 'nl' ? NL_ROLES : EN_ROLES;
  return kind ? list.filter((r) => r.kind === kind) : list;
}

export function getRolePage(locale: Locale, kind: 'voorbeeld' | 'template', slug: string): RolePage | null {
  return listRolePages(locale, kind).find((r) => r.slug === slug) ?? null;
}

export function allRolePageSlugs(): { locale: Locale; kind: 'voorbeeld' | 'template'; slug: string }[] {
  const out: { locale: Locale; kind: 'voorbeeld' | 'template'; slug: string }[] = [];
  for (const r of NL_ROLES) out.push({ locale: 'nl', kind: r.kind, slug: r.slug });
  for (const r of EN_ROLES) out.push({ locale: 'en', kind: r.kind, slug: r.slug });
  return out;
}
