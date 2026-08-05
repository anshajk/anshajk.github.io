export const site = {
  name: 'Anshaj Khare',
  shortName: 'Anshaj',
  role: 'Machine Learning Engineer II',
  company: 'Microsoft',
  companyUrl: 'https://www.microsoft.com/',
  url: 'https://anshaj.dev',
  tagline:
    'I build agentic AI systems and the large-scale data platforms they run on.',
  description:
    'Machine Learning Engineer II at Microsoft building agentic AI systems and large-scale data platforms. Writing at The Compute Blog, teaching engineers, and shipping side projects.',
  intro: [
    'I am a machine learning engineer working in Microsoft Cloud Supply Chain, where I design and ship agentic AI systems and the data platforms underneath them. Most of my work sits at the seam between research and production: taking something that works in a notebook and turning it into a service that runs reliably at enterprise scale.',
    'Over the last few years that has meant replacing a 16-hour batch pipeline with a streaming platform that answers in under an hour, building an orchestration framework that removes hundreds of hours of pipeline plumbing per engineer per year, and putting real agentic systems in front of both internal services and end users.',
    'Outside of work I write The Compute Blog, build side projects to scratch my own itches, and teach — around four thousand engineers and leaders so far, on agentic AI, generative AI, and machine learning.',
  ],
} as const;

export const socials = [
  { label: 'GitHub', href: 'https://github.com/anshajk' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/anshaj-khare/' },
  { label: 'The Compute Blog', href: 'https://compute.anshaj.dev' },
  { label: 'Book a call', href: 'https://topmate.io/anshaj' },
] as const;

export const nav = [
  { label: 'Work', href: '/#work' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Teaching', href: '/#teaching' },
  { label: 'Toolbox', href: '/#toolbox' },
  { label: 'Certifications', href: '/certifications/' },
] as const;
