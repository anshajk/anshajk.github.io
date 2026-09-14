export const site = {
  name: 'Anshaj Khare',
  shortName: 'Anshaj',
  role: 'Machine Learning Engineer II',
  company: 'Microsoft',
  companyUrl: 'https://www.microsoft.com/',
  url: 'https://anshaj.dev',
  email: 'contact@anshaj.dev',
  tagline:
    'I build agentic AI systems and the large-scale data platforms they run on.',
  description:
    'Machine Learning Engineer II at Microsoft building production AI agents, retrieval systems, and cloud data platforms. Writing and teaching practical AI engineering.',
  intro: [
    'I am a machine learning engineer working in Microsoft Cloud Supply Chain, where I design and ship agentic AI systems and the data platforms underneath them. My work spans MCP tool integration, retrieval, multi-agent orchestration, evaluations, and safety guardrails, alongside the backend and data engineering needed for reliable deployment.',
    'Over the last few years that has meant replacing a 16-hour batch pipeline with a streaming platform that answers in under an hour, building an orchestration framework that removes hundreds of hours of pipeline plumbing per engineer per year, and putting real agentic systems in front of both internal services and end users.',
    'Outside of work I write The Compute Blog, build side projects to scratch my own itches, and teach — around four thousand engineers and leaders so far, on agentic AI, generative AI, and machine learning.',
  ],
} as const;

export const socials = [
  { label: 'Email', href: 'mailto:contact@anshaj.dev' },
  { label: 'GitHub', href: 'https://github.com/anshajk' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/anshaj-khare/' },
  { label: 'The Compute Blog', href: 'https://compute.anshaj.dev' },
  { label: 'Book a call', href: 'https://topmate.io/anshaj' },
] as const;

export const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Awards', href: '/#recognition' },
  { label: 'Writing', href: '/writing/' },
  { label: 'Teaching', href: '/#teaching' },
  { label: 'Certifications', href: '/certifications/' },
] as const;
