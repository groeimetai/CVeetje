import type { RolePage } from '../types';

export const slug = 'devops-engineer';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'DevOps engineer';
export const title = 'CV-voorbeeld voor DevOps engineer — infra, CI/CD, observability';
export const description =
  'Een DevOps/SRE-CV dat platform-keuzes, automatisering en concrete reliability-cijfers toont. Cloud-providers, IaC, container-orkestratie, observability-stack.';
export const keywords = [
  'CV DevOps engineer',
  'CV SRE',
  'CV platform engineer',
  'CV cloud engineer',
  'voorbeeld CV DevOps',
  'CV Kubernetes AWS',
];
export const hero =
  'Een DevOps/SRE-CV werkt met concrete platform-namen en betrouwbaarheidsmetingen. Vage "cloud-ervaring" zegt te weinig in een vakgebied dat aan AWS/GCP/Azure-services en aan uptime-cijfers meet.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: stack en focus',
    body: 'Welke cloud-provider primair (AWS/GCP/Azure), welk type werk (platform engineering, SRE, build/release, security-DevOps), welke schaal (team-size, traffic-volume, infra-uitgaven indicatie). Twee zinnen.',
  },
  {
    heading: 'Werkervaring met reliability-cijfers',
    body: 'Per rol: production-traffic-indicatie, uptime/SLO-cijfers, MTTR-verbeteringen, deploy-frequency, lead time for changes (DORA-metrics). Concrete projecten: migraties, platform-bouw, on-call-organisaties. "Verbeterde CI/CD" is zwak; "Reduceerde lead-time-for-changes van 6 dagen naar 4 uur door migratie naar GitHub Actions + Argo CD" is sterk.',
  },
  {
    heading: 'Tooling per laag',
    body: 'IaC: Terraform, Pulumi, CloudFormation. Container: Docker, Kubernetes, EKS/GKE/AKS. CI/CD: GitHub Actions, GitLab CI, Argo CD, Jenkins. Observability: Datadog, Grafana, Prometheus, Honeycomb, OpenTelemetry. Security/secrets: Vault, AWS KMS, sealed-secrets. Scripting: Bash, Python, Go.',
  },
];
export const exampleBullets = [
  'Platform engineer voor team van 30 engineers bij scale-up; production traffic ~80M requests/dag op EKS.',
  'Reduceerde lead-time-for-changes van 6 dagen naar 4 uur door GitHub Actions + Argo CD herstructurering.',
  'Drove p99-latency op core-service van 850ms naar 220ms door caching layer + slimmere DB-queries.',
  'On-call rotation reorganisatie; MTTR van 47 minuten naar 14 minuten over 12 maanden.',
  'Tools: Terraform, Kubernetes (EKS), GitHub Actions, Argo CD, Datadog, Prometheus, Vault. Languages: Go, Python, Bash.',
  'AWS Solutions Architect Professional (2023); CKA (2022).',
];
export const pitfalls = [
  '"Cloud-ervaring" zonder provider en services. AWS-VPC-werk is anders dan Azure-AD-werk.',
  'Geen reliability-cijfers. DevOps wordt gemeten aan DORA-metrics; mist op je CV is een signaal.',
  'Tooling-lijst van twintig items zonder diepte-aanduiding.',
  'Geen on-call ervaring vermeld. Voor SRE-rollen is dat verwachte praktijk.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Tech-rollen waar substance wint van vorm. Eigentijds maar zonder design-statements.',
};
export const context = 'Salarisindicatie 2026 (NL): junior DevOps €50–65k, medior €65–85k, senior €85–115k, staff/principal €115–150k+. Scale-ups in EU vaak met equity-component.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'ats-cv-2026'];
export const relatedPersonas = ['werkzoekenden'];
