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
    promotion: z.object({
      from: z.string(),
      to: z.string(),
      period: z.string(),
    }).optional(),
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

const awards = defineCollection({
  loader: file('src/data/awards.yml'),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      name: z.string(),
      track: z.string().optional(),
      issuer: z.string(),
      period: z.string(),
      citation: z.string(),
      detail: z.string().optional(),
      image: image(),
      imageAlt: z.string(),
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

const writing = defineCollection({
  loader: file('src/data/writing.yml'),
  schema: z.object({
    order: z.number().int().positive(),
    title: z.string().min(1),
    href: z.url(),
    topic: z.string().min(1),
    summary: z.string().min(1),
  }),
});

export const collections = {
  experience,
  projects,
  awards,
  certifications,
  skills,
  teaching,
  highlights,
  writing,
};
