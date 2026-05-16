import type { RolePage } from '../types';

export const slug = 'data-scientist';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'data scientist';
export const title = 'CV example for data scientist — modelling, business impact, productionised work';
export const description =
  'A data science CV that shows real-world impact, not just notebook experiments. Models in production, stakeholders served, business outcomes.';
export const keywords = ['data scientist CV', 'data science resume', 'ML engineer CV', 'machine learning CV'];
export const hero =
  'A data scientist who only lists Kaggle competitions and notebook experiments looks like a hobbyist. A data scientist who shows models in production with measurable business impact looks like a hire. The distinction matters more in 2026 than it did three years ago.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Top: domain, production experience, stakeholders',
    body: 'Two-sentence profile summary positioning your domain (fintech, healthcare, marketing, retail), whether you have models in production, and your stakeholder mix (business teams, product, leadership).',
  },
  {
    heading: 'Experience with deployed work',
    body: 'Per role: company, team type (embedded in business unit vs. central DS team), problems tackled, models built, and crucially — did they go to production. "Built churn model" is weak. "Built churn model deployed via Vertex AI, serving 12M predictions/month, drove €600k retention budget reallocation Q3 2024" is strong.',
  },
  {
    heading: 'Stack: where you are on the production spectrum',
    body: 'For research-leaning: Python, scikit-learn, statsmodels, jupyter, R. For ML-engineering-leaning: PyTorch/TensorFlow, MLflow, Kubeflow, FastAPI, Docker, Kubernetes. For productionised work: feature stores (Feast, Tecton), monitoring (Evidently, Arize). Be honest about where you live.',
  },
];
export const exampleBullets = [
  'Built churn prediction model (XGBoost + logistic baseline) deployed via Vertex AI; 12M predictions/month; €600k retention budget reallocation Q3 2024.',
  'Led recommender system rebuild for marketplace; A/B-tested two variants; winner uplifted GMV per session by 8.4%.',
  'Owned NLP-based ticket-routing classifier; reduced first-response time by 34%.',
  'Stack: Python (pandas, scikit-learn, PyTorch), GCP Vertex AI, BigQuery, Feast, MLflow, Docker.',
  'MSc Statistics (Leiden, 2019); Deeplearning.AI specialization (2022).',
];
export const pitfalls = [
  'Kaggle competitions as main proof. Useful but secondary to deployed work.',
  'Algorithm names without business outcome. "Used XGBoost" — for what, with what result?',
  'Production claims you can\'t defend. Hiring data leads will probe quickly.',
  'No deployment context. A model in a notebook is half the job.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Substance over style. A calm layout lets the work speak.',
};
export const context = 'Salary indication 2026 (NL): junior DS €45–60k, mid €60–85k, senior €85–115k, staff/principal €115k+.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes', 'ats-cv-2026'];
export const relatedPersonas = ['werkzoekenden'];
