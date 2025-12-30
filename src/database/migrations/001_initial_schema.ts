import { Migration } from '../types/migration';

/**
 * Migration 1: Initial schema (placeholder)
 * 
 * This is a no-op migration since the initial schema is created
 * by createInitialSchemaAsync() when user_version is 0.
 * This placeholder exists to maintain sequential version numbering.
 */
export const migration001: Migration = {
  version: 1,
  description: 'Initial schema (placeholder)',
  migrate: () => {
    // No-op: Initial schema is created separately
    // This migration exists for version numbering consistency
  },
};
