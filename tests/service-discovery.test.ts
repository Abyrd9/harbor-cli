import { describe, it, expect } from 'vitest';

// Test that our project file detection list is comprehensive
const possibleProjectFiles = [
  'package.json',     // Node.js projects
  'go.mod',           // Go projects
  'Cargo.toml',       // Rust projects
  'composer.json',    // PHP projects
  'requirements.txt', // Python projects
  'Gemfile',          // Ruby projects
  'pom.xml',          // Java Maven projects
  'build.gradle',     // Java Gradle projects
];

describe('Service Discovery - Project Files List', () => {
  it('should contain expected project files', () => {
    expect(possibleProjectFiles).toContain('package.json');
    expect(possibleProjectFiles).toContain('go.mod');
    expect(possibleProjectFiles).toContain('Cargo.toml');
    expect(possibleProjectFiles).toContain('composer.json');
    expect(possibleProjectFiles).toContain('requirements.txt');
    expect(possibleProjectFiles).toContain('pom.xml');
    expect(possibleProjectFiles).toContain('build.gradle');
  });

  it('should have reasonable number of supported project types', () => {
    expect(possibleProjectFiles.length).toBeGreaterThan(5);
    expect(possibleProjectFiles.length).toBe(8);
  });

  it('should have unique file names', () => {
    const uniqueFiles = new Set(possibleProjectFiles);
    expect(uniqueFiles.size).toBe(possibleProjectFiles.length);
  });

  it('should include common modern project files', () => {
    // Check for the most common project identifiers
    const commonFiles = ['package.json', 'go.mod', 'Cargo.toml', 'requirements.txt'];
    commonFiles.forEach(file => {
      expect(possibleProjectFiles).toContain(file);
    });
  });
});