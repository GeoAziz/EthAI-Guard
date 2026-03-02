/**
 * Jobs data and constants for careers page
 */

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  shortDescription: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  manager?: string;
  team?: string;
  interviewProcess: string[];
  featured?: boolean;
}

export const JOBS: Job[] = [
  {
    id: 'senior-ml-engineer-fairness',
    title: 'Senior ML Engineer - Fairness',
    department: 'Engineering',
    location: 'Remote / San Francisco',
    type: 'Full-time',
    salaryMin: 180000,
    salaryMax: 280000,
    shortDescription: 'Build and optimize fairness-aware ML pipelines for financial AI systems.',
    description:
      'We\'re seeking an experienced ML engineer passionate about fairness in AI. You\'ll lead the development of our fairness detection engine, optimize algorithms for bias mitigation, and work with teams across the company to ensure our platform meets the highest ethical standards.',
    responsibilities: [
      'Design and implement fairness-aware machine learning pipelines',
      'Develop novel algorithms for bias detection and mitigation',
      'Optimize performance of fairness metrics at scale',
      'Mentor junior engineers on best practices',
      'Collaborate with research team on novel techniques',
      'Contribute to open-source fairness libraries',
    ],
    requirements: [
      '5+ years of ML engineering experience',
      'Deep knowledge of fairness metrics and bias detection',
      'Proficiency in Python, PyTorch/TensorFlow',
      'Experience with production ML systems',
      'Strong problem-solving and communication skills',
    ],
    niceToHave: [
      'PhD in CS, Statistics, or related field',
      'Published research on algorithmic fairness',
      'Experience with financial services domain',
      'Contributions to open-source ML projects',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (4%)',
      'Unlimited PTO',
      '$5,000 learning budget',
      'Home office setup stipend',
    ],
    manager: 'Alex Chen',
    team: 'ML Engineering Team (8 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Technical phone interview (60 min)',
      'Take-home ML challenge (2-4 hours)',
      'Technical on-site (4 hours with 3 engineers)',
      'Final round with VP Engineering (30 min)',
    ],
    featured: true,
  },
  {
    id: 'applied-ai-researcher',
    title: 'Applied AI Researcher',
    department: 'Research',
    location: 'Remote / New York',
    type: 'Full-time',
    salaryMin: 160000,
    salaryMax: 260000,
    shortDescription: 'Conduct research on novel fairness metrics and explainability techniques.',
    description:
      'Join our research team to develop cutting-edge techniques for AI fairness and explainability. You\'ll publish papers, collaborate with academics, and directly influence product development at EthixAI.',
    responsibilities: [
      'Conduct research on fairness metrics and explainability',
      'Publish findings in top-tier venues',
      'Prototype novel algorithms',
      'Collaborate with product and engineering teams',
      'Present research at conferences',
      'Mentor interns and junior researchers',
    ],
    requirements: [
      'PhD in CS, Statistics, Mathematics, or related field',
      'Strong publication record in ML/AI',
      'Deep understanding of fairness and bias in ML',
      'Experience with PyTorch/TensorFlow',
      'Strong mathematical background',
    ],
    niceToHave: [
      'Experience with financial services',
      'Knowledge of SHAP or similar techniques',
      'Prior startup experience',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (5%)',
      'Unlimited PTO',
      '$10,000 annual conference budget',
      'Academic collaboration support',
    ],
    manager: 'Dr. Sarah Chen',
    team: 'Research Team (5 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Research discussion with lead researcher (60 min)',
      'Present your research (45 min)',
      'Technical interview with team (90 min)',
      'Final round with VP Research (30 min)',
    ],
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    department: 'Product',
    location: 'Remote',
    type: 'Full-time',
    salaryMin: 130000,
    salaryMax: 210000,
    shortDescription: 'Design intuitive interfaces for complex AI explainability visualizations.',
    description:
      'Design beautiful and usable experiences for complex AI concepts. You\'ll work closely with product and engineering to create interfaces that make AI explainability accessible to non-technical users in financial institutions.',
    responsibilities: [
      'Design user interfaces for explainability tools',
      'Create design systems and components',
      'Conduct user research and usability testing',
      'Work with product and engineering on implementation',
      'Iterate on designs based on user feedback',
      'Maintain design documentation and guidelines',
    ],
    requirements: [
      '4+ years of product design experience',
      'Portfolio demonstrating strong design skills',
      'Experience with complex data visualization',
      'Proficiency with Figma or similar tools',
      'Strong communication and collaboration skills',
    ],
    niceToHave: [
      'Experience designing for financial services',
      'Knowledge of accessibility (WCAG)',
      'Interest in AI and machine learning',
      'Experience with design systems',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (4%)',
      'Unlimited PTO',
      '$5,000 learning budget',
      'Design tools and software license budget',
    ],
    manager: 'Jamie Williams',
    team: 'Product & Design Team (6 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Portfolio review with hiring manager (60 min)',
      'Design challenge (take-home, 3-4 hours)',
      'Design presentation and discussion (90 min)',
      'Final round with Director of Product (30 min)',
    ],
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Remote / London',
    type: 'Full-time',
    salaryMin: 140000,
    salaryMax: 220000,
    shortDescription: 'Scale our infrastructure to handle enterprise-level AI workloads.',
    description:
      'Build and maintain infrastructure that supports our AI platform at scale. You\'ll work on cloud architecture, CI/CD pipelines, and monitoring systems that enable our team to deploy reliably and frequently.',
    responsibilities: [
      'Design and implement cloud infrastructure (AWS/GCP)',
      'Build and optimize CI/CD pipelines',
      'Manage containerization and orchestration (Docker/Kubernetes)',
      'Implement monitoring and alerting systems',
      'Improve system reliability and performance',
      'Document infrastructure and runbooks',
    ],
    requirements: [
      '4+ years of DevOps/SRE experience',
      'Strong knowledge of cloud platforms (AWS or GCP)',
      'Experience with Docker and Kubernetes',
      'Proficiency in infrastructure-as-code (Terraform)',
      'Knowledge of CI/CD tools and practices',
    ],
    niceToHave: [
      'Experience with ML infrastructure',
      'Knowledge of security best practices',
      'Experience with monitoring tools (Prometheus, etc.)',
      'Prior startup experience',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (4%)',
      'Unlimited PTO',
      '$5,000 learning budget',
      'Home office setup stipend',
    ],
    manager: 'Marcus Lee',
    team: 'Infrastructure Team (4 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Technical phone interview (60 min)',
      'Infrastructure design challenge (take-home, 2-3 hours)',
      'Technical interview with team (120 min)',
      'Final round with VP Engineering (30 min)',
    ],
  },
  {
    id: 'compliance-specialist',
    title: 'Compliance Specialist',
    department: 'Legal',
    location: 'Hybrid / Boston',
    type: 'Full-time',
    salaryMin: 110000,
    salaryMax: 180000,
    shortDescription: 'Ensure our platform meets global regulatory requirements for AI in finance.',
    description:
      'Help us navigate the complex regulatory landscape for AI in financial services. You\'ll work with our product and engineering teams to ensure compliance with GDPR, CCPA, ECOA, and emerging AI regulations.',
    responsibilities: [
      'Monitor and interpret AI regulations globally',
      'Conduct compliance audits and assessments',
      'Work with product on compliance requirements',
      'Maintain compliance documentation',
      'Prepare regulatory submissions and reports',
      'Train team on compliance best practices',
    ],
    requirements: [
      '3+ years of compliance or legal experience',
      'Knowledge of financial services regulations',
      'Understanding of data privacy (GDPR/CCPA)',
      'Familiarity with AI regulation landscape',
      'Strong attention to detail and documentation',
    ],
    niceToHave: [
      'JD or other legal qualification',
      'Experience with fintech companies',
      'Knowledge of algorithmic fairness requirements',
      'Prior regulatory submissions',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (4%)',
      'Unlimited PTO',
      'Hybrid schedule (3 days in Boston office)',
      'Professional development budget',
    ],
    manager: 'Patricia Davis',
    team: 'Legal & Compliance Team (3 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Phone interview with hiring manager (60 min)',
      'Compliance scenario interview (90 min)',
      'Final round with Chief Compliance Officer (45 min)',
    ],
  },
  {
    id: 'customer-success-manager',
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Remote',
    type: 'Full-time',
    salaryMin: 100000,
    salaryMax: 160000,
    shortDescription: 'Help financial institutions maximize value from EthixAI platform.',
    description:
      'Be the voice of our customers. You\'ll work directly with financial institutions to ensure they\'re getting maximum value from EthixAI, identify expansion opportunities, and improve our product based on customer feedback.',
    responsibilities: [
      'Build strong relationships with key accounts',
      'Ensure customers achieve their business goals with EthixAI',
      'Identify upsell and expansion opportunities',
      'Gather and communicate customer feedback to product',
      'Conduct training and onboarding sessions',
      'Prepare quarterly business reviews',
    ],
    requirements: [
      '2+ years of customer success or account management',
      'Strong communication and relationship skills',
      'Understanding of financial services industry',
      'Experience with technical products',
      'Ability to manage multiple accounts simultaneously',
    ],
    niceToHave: [
      'Experience with SaaS products',
      'Knowledge of AI/ML concepts',
      'Sales experience',
      'CRM experience (Salesforce, etc.)',
    ],
    benefits: [
      'Competitive salary + equity',
      'Health, dental, vision coverage',
      '401(k) matching (4%)',
      'Unlimited PTO',
      '$4,000 professional development budget',
      'Annual customer visit budget',
    ],
    manager: 'Emma Thompson',
    team: 'Customer Success Team (5 people)',
    interviewProcess: [
      'Phone screen with recruiter (30 min)',
      'Phone interview with hiring manager (45 min)',
      'Role-play scenario (60 min)',
      'Final round with VP Customer Success (30 min)',
    ],
  },
];

export const ALL_DEPARTMENTS = ['All', 'Engineering', 'Research', 'Product', 'Legal', 'Customer Success'];
export const ALL_LOCATIONS = ['All', 'Remote', 'San Francisco', 'New York', 'London', 'Boston'];
export const ALL_TYPES = ['All', 'Full-time'];

export function getJobById(id: string): Job | undefined {
  return JOBS.find(job => job.id === id);
}

export function filterJobs(
  department?: string,
  location?: string,
  type?: string,
): Job[] {
  return JOBS.filter(job => {
    if (department && department !== 'All' && job.department !== department) {return false;}
    if (location && location !== 'All' && !job.location.includes(location)) {return false;}
    if (type && type !== 'All' && job.type !== type) {return false;}
    return true;
  });
}

export function getFeaturedJobs(): Job[] {
  return JOBS.filter(job => job.featured);
}

export function getRelatedJobs(department: string, excludeId: string): Job[] {
  return JOBS.filter(job => job.department === department && job.id !== excludeId);
}
