import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'zod';

const link = z.object({
  label: z.string(),
  href: z.url(),
});

const experience = defineCollection({
  loader: file('src/data/experience.yml'),
  schema: z.object({
    order: z.number(),
    role: z.string(),
    company: z.string(),
    companyUrl: z.url().optional(),
    location: z.string(),
    period: z.string(),
    current: z.boolean().default(false),
    summary: z.string(),
    highlights: z.array(
      z.object({
        title: z.string(),
        detail: z.string(),
      })
    ),
    stack: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  loader: file('src/data/projects.yml'),
  schema: z.object({
    order: z.number(),
    featured: z.boolean().default(false),
    name: z.string(),
    kind: z.string(),
    status: z.string().optional(),
    description: z.string(),
    stack: z.array(z.string()).default([]),
    links: z.array(link).min(1),
  }),
});

const certifications = defineCollection({
  loader: file('src/data/certifications.yml'),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    issuer: z.string(),
    detail: z.string().optional(),
    href: z.url().optional(),
    courses: z.array(z.string()).default([]),
  }),
});

const skills = defineCollection({
  loader: file('src/data/skills.yml'),
  schema: z.object({
    order: z.number(),
    group: z.string(),
    items: z.array(z.string()).min(1),
  }),
});

const teaching = defineCollection({
  loader: file('src/data/teaching.yml'),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    org: z.string(),
    orgUrl: z.url().optional(),
    period: z.string().optional(),
    description: z.string(),
    topics: z.array(z.string()).default([]),
  }),
});

const highlights = defineCollection({
  loader: file('src/data/highlights.yml'),
  schema: z.object({
    order: z.number(),
    value: z.string(),
    label: z.string(),
  }),
});

export const collections = {
  experience,
  projects,
  certifications,
  skills,
  teaching,
  highlights,
};
