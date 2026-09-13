export type ClawdGuideRecord = {
  id: string;
  name: string;
  description: string;
  path: string;
};

/** Public reference material bundled at build time, never read from disk at runtime. */
export type ClawdReferenceData = {
  feeTiersMarkdown: string;
  registry: {
    schema_version: string;
    name: string;
    description: string;
    skills: ClawdGuideRecord[];
  };
  guides: Record<string, string>;
};
