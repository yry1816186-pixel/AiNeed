import { Test } from '@nestjs/testing';
import { KnowledgeSeedService } from './knowledge.seed';
import { Neo4jService } from '../neo4j.service';

// Mock fs at the module level so spies persist across tests without redefine issues
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});

// Mock path.join to return a deterministic value
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args: string[]) => args.join('/')),
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

import * as fs from 'fs';

describe('KnowledgeSeedService', () => {
  let service: KnowledgeSeedService;
  let mockNeo4jService: { write: jest.Mock; healthCheck: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockNeo4jService = {
      write: jest.fn().mockResolvedValue({ records: [] }),
      healthCheck: jest.fn().mockResolvedValue(true),
    };

    const module = await Test.createTestingModule({
      providers: [
        KnowledgeSeedService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get(KnowledgeSeedService);
  });

  // ---------------------------------------------------------------
  // healthCheck delegates to neo4jService
  // ---------------------------------------------------------------
  it('healthCheck returns true when neo4j is healthy', async () => {
    const result = await service.healthCheck();
    expect(result).toBe(true);
    expect(mockNeo4jService.healthCheck).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Branch: seed directory does not exist -> uses built-in data
  // ---------------------------------------------------------------
  it('uses built-in seed data when directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = await service.run();

    expect(result.filesProcessed).toBe(1);
    expect(result.details).toContain('Built-in seed data imported');
    expect(result.nodesCreated).toBeGreaterThan(0);
    expect(result.relationshipsCreated).toBeGreaterThan(0);
    expect(mockNeo4jService.write).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // Branch: seed directory exists but has no JSON files -> built-in
  // ---------------------------------------------------------------
  it('uses built-in seed data when directory has no JSON files', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const result = await service.run();

    expect(result.filesProcessed).toBe(1);
    expect(result.details).toContain('Built-in seed data imported');
  });

  // ---------------------------------------------------------------
  // Branch: seed directory with valid JSON files
  // ---------------------------------------------------------------
  it('imports nodes and relationships from JSON seed files', async () => {
    const seedData = {
      nodes: [
        { label: 'Color', id: 'test_red', properties: { name: 'red', hex: '#FF0000' } },
        { label: 'Style', id: 'test_modern', properties: { name: 'modern' } },
      ],
      relationships: [
        {
          fromLabel: 'Color',
          fromId: 'test_red',
          toLabel: 'Style',
          toId: 'test_modern',
          type: 'MATCHES',
          properties: { strength: 0.8 },
        },
      ],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['test-seed.json']);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(seedData));

    const result = await service.run();

    expect(result.filesProcessed).toBe(1);
    expect(result.nodesCreated).toBe(2);
    expect(result.relationshipsCreated).toBe(1);
    expect(result.details![0]).toContain('test-seed.json');
    expect(mockNeo4jService.write).toHaveBeenCalledTimes(3);
  });

  // ---------------------------------------------------------------
  // Branch: node with empty properties (no SET clause)
  // ---------------------------------------------------------------
  it('handles nodes with empty properties', async () => {
    const seedData = {
      nodes: [{ label: 'Season', id: 'test_summer', properties: {} }],
      relationships: [],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['minimal.json']);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(seedData));

    const result = await service.run();

    expect(result.nodesCreated).toBe(1);
    expect(result.relationshipsCreated).toBe(0);

    const nodeCall = mockNeo4jService.write.mock.calls[0];
    expect(nodeCall[0]).not.toContain('SET');
  });

  // ---------------------------------------------------------------
  // Branch: relationship with empty properties (no SET clause)
  // ---------------------------------------------------------------
  it('handles relationships with empty properties', async () => {
    const seedData = {
      nodes: [
        { label: 'Color', id: 'c1', properties: { name: 'blue' } },
        { label: 'Color', id: 'c2', properties: { name: 'green' } },
      ],
      relationships: [
        {
          fromLabel: 'Color',
          fromId: 'c1',
          toLabel: 'Color',
          toId: 'c2',
          type: 'COMPLEMENTS',
          properties: {},
        },
      ],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['rel-test.json']);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(seedData));

    const result = await service.run();

    expect(result.relationshipsCreated).toBe(1);

    const relCall = mockNeo4jService.write.mock.calls[2];
    expect(relCall[0]).not.toContain('SET');
  });

  // ---------------------------------------------------------------
  // Branch: JSON parse error during file import
  // ---------------------------------------------------------------
  it('handles file import errors gracefully', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['bad.json']);
    (fs.readFileSync as jest.Mock).mockReturnValue('not valid json {');

    const result = await service.run();

    expect(result.filesProcessed).toBe(0);
    expect(result.nodesCreated).toBe(0);
    expect(result.relationshipsCreated).toBe(0);
    expect(result.details![0]).toContain('Failed to import bad.json');
  });

  // ---------------------------------------------------------------
  // Branch: multiple JSON files
  // ---------------------------------------------------------------
  it('imports multiple JSON files', async () => {
    const seed1 = {
      nodes: [{ label: 'Color', id: 'multi_red', properties: { name: 'red' } }],
      relationships: [],
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['a.json', 'b.json']);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(seed1));

    const result = await service.run();

    expect(result.filesProcessed).toBe(2);
    expect(result.nodesCreated).toBe(2);
    expect(result.details!.length).toBe(2);
  });
});
