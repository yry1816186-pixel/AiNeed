import { Injectable } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import {
  ColorRelationDto,
  BodyTypeRecommendationDto,
  OccasionStyleDto,
  StyleCompatibilityDto,
  KnowledgeRuleDto,
} from './dto/rule-response.dto';
import { KnowledgeQueryDto } from './dto/query-rules.dto';

@Injectable()
export class KnowledgeService {
  constructor(private readonly neo4jService: Neo4jService) {}

  async findColorHarmony(color: string): Promise<ColorRelationDto[]> {
    const cypher = `
      MATCH (c1:Color)-[r:COMPLEMENTS]->(c2:Color)
      WHERE toLower(c1.name) = toLower($color)
      RETURN c1.name AS fromColor, c2.name AS toColor,
             type(r) AS relationType, r.strength AS strength, r.reason AS reason
      ORDER BY r.strength DESC
    `;
    const result = await this.neo4jService.read(cypher, { color });
    return result.records.map((record) => ({
      fromColor: record.get('fromColor'),
      toColor: record.get('toColor'),
      relationType: record.get('relationType'),
      strength: this.toNumber(record.get('strength')),
      reason: record.get('reason') ?? undefined,
    }));
  }

  async findColorConflicts(color: string): Promise<ColorRelationDto[]> {
    const cypher = `
      MATCH (c1:Color)-[r:CONFLICTS_WITH]->(c2:Color)
      WHERE toLower(c1.name) = toLower($color)
      RETURN c1.name AS fromColor, c2.name AS toColor,
             type(r) AS relationType, r.strength AS strength, r.reason AS reason
      ORDER BY r.strength DESC
    `;
    const result = await this.neo4jService.read(cypher, { color });
    return result.records.map((record) => ({
      fromColor: record.get('fromColor'),
      toColor: record.get('toColor'),
      relationType: record.get('relationType'),
      strength: this.toNumber(record.get('strength')),
      reason: record.get('reason') ?? undefined,
    }));
  }

  async findBodyTypeRules(bodyType: string): Promise<BodyTypeRecommendationDto[]> {
    const cypher = `
      MATCH (bt:BodyType)-[r]->(c:Clothing)
      WHERE toLower(bt.name) = toLower($bodyType)
        AND (type(r) = 'SUITABLE_FOR' OR type(r) = 'AVOID_FOR')
      RETURN bt.name AS bodyType, c.name AS clothingType,
             type(r) AS action, r.recommendation AS recommendation,
             r.examples AS examples, r.alternatives AS alternatives
      ORDER BY action DESC
    `;
    const result = await this.neo4jService.read(cypher, { bodyType });
    return result.records.map((record) => ({
      bodyType: record.get('bodyType'),
      clothingType: record.get('clothingType'),
      action: record.get('action'),
      recommendation: record.get('recommendation') ?? '',
      examples: this.toStringArray(record.get('examples')),
      alternatives: this.toStringArray(record.get('alternatives')),
    }));
  }

  async findOccasionRules(occasion: string): Promise<OccasionStyleDto> {
    const stylesCypher = `
      MATCH (o:Occasion)-[:REQUIRES]->(s:Style)
      WHERE toLower(o.name) = toLower($occasion)
      RETURN collect(s.name) AS requiredStyles, o.requirements AS requirements
    `;
    const stylesResult = await this.neo4jService.read(stylesCypher, { occasion });

    const forbiddenCypher = `
      MATCH (o:Occasion)-[:FORBIDS]->(c:Clothing)
      WHERE toLower(o.name) = toLower($occasion)
      RETURN collect(c.name) AS forbiddenItems
    `;
    const forbiddenResult = await this.neo4jService.read(forbiddenCypher, { occasion });

    const styleRecord = stylesResult.records[0];
    const forbiddenRecord = forbiddenResult.records[0];

    return {
      occasion,
      requiredStyles: styleRecord ? this.toStringArray(styleRecord.get('requiredStyles')) : [],
      forbiddenItems: forbiddenRecord ? this.toStringArray(forbiddenRecord.get('forbiddenItems')) : [],
      requirements: styleRecord?.get('requirements') ?? undefined,
    };
  }

  async findStyleCompatibility(styleA: string, styleB: string): Promise<StyleCompatibilityDto> {
    const cypher = `
      MATCH (s1:Style)-[r:PAIRS_WELL_WITH]->(s2:Style)
      WHERE toLower(s1.name) = toLower($styleA)
        AND toLower(s2.name) = toLower($styleB)
      RETURN r.strength AS strength
    `;
    const result = await this.neo4jService.read(cypher, { styleA, styleB });

    if (result.records.length > 0) {
      const strength = this.toNumber(result.records[0].get('strength'));
      return { styleA, styleB, strength, compatible: strength >= 0.5 };
    }

    return { styleA, styleB, strength: 0, compatible: false };
  }

  async queryKnowledge(query: KnowledgeQueryDto): Promise<KnowledgeRuleDto[]> {
    const rules: KnowledgeRuleDto[] = [];

    if (query.colors && query.colors.length > 0) {
      const colorRules = await this.queryColorRules(query.colors, query.minStrength);
      rules.push(...colorRules);
    }

    if (query.bodyType) {
      const bodyRules = await this.queryBodyTypeKnowledge(query.bodyType);
      rules.push(...bodyRules);
    }

    if (query.occasion) {
      const occasionRules = await this.queryOccasionKnowledge(query.occasion);
      rules.push(...occasionRules);
    }

    if (query.season) {
      const seasonRules = await this.querySeasonKnowledge(query.season, query.minStrength);
      rules.push(...seasonRules);
    }

    if (query.style) {
      const styleRules = await this.queryStyleKnowledge(query.style, query.minStrength);
      rules.push(...styleRules);
    }

    return rules;
  }

  private async queryColorRules(colors: string[], minStrength?: number): Promise<KnowledgeRuleDto[]> {
    const strengthFilter = minStrength ? ' AND r.strength >= $minStrength' : '';
    const cypher = `
      MATCH (c1:Color)-[r]->(c2:Color)
      WHERE toLower(c1.name) IN [${colors.map((_, i) => `$color${i}`).join(', ')}]
        AND (type(r) = 'COMPLEMENTS' OR type(r) = 'CONFLICTS_WITH')
        ${strengthFilter}
      RETURN c1.name AS fromColor, c2.name AS toColor,
             type(r) AS relationType, r.strength AS strength, r.reason AS reason
      ORDER BY r.strength DESC
    `;
    const params: Record<string, unknown> = {};
    colors.forEach((c, i) => {
      params[`color${i}`] = c;
    });
    if (minStrength) {
      params['minStrength'] = minStrength;
    }

    const result = await this.neo4jService.read(cypher, params);
    return result.records.map((record) => ({
      category: 'color',
      ruleType: record.get('relationType') === 'COMPLEMENTS' ? 'do' : 'dont',
      condition: { fromColor: record.get('fromColor'), toColor: record.get('toColor') },
      recommendation: `${record.get('fromColor')} 与 ${record.get('toColor')} ${record.get('relationType') === 'COMPLEMENTS' ? '搭配和谐' : '存在冲突'}`,
      strength: this.toNumber(record.get('strength')),
      reason: record.get('reason') ?? undefined,
    }));
  }

  private async queryBodyTypeKnowledge(bodyType: string): Promise<KnowledgeRuleDto[]> {
    const cypher = `
      MATCH (bt:BodyType)-[r]->(c:Clothing)
      WHERE toLower(bt.name) = toLower($bodyType)
        AND (type(r) = 'SUITABLE_FOR' OR type(r) = 'AVOID_FOR')
      RETURN bt.name AS bodyType, c.name AS clothingType,
             type(r) AS action, r.recommendation AS recommendation
    `;
    const result = await this.neo4jService.read(cypher, { bodyType });
    return result.records.map((record) => ({
      category: 'body_type',
      ruleType: record.get('action') === 'SUITABLE_FOR' ? 'do' : 'dont',
      condition: { bodyType: record.get('bodyType'), clothingType: record.get('clothingType') },
      recommendation: record.get('recommendation') ?? '',
    }));
  }

  private async queryOccasionKnowledge(occasion: string): Promise<KnowledgeRuleDto[]> {
    const cypher = `
      MATCH (o:Occasion)-[r]->(target)
      WHERE toLower(o.name) = toLower($occasion)
      RETURN labels(target)[0] AS targetType, target.name AS targetName,
             type(r) AS relationType, o.requirements AS requirements
    `;
    const result = await this.neo4jService.read(cypher, { occasion });
    return result.records.map((record) => ({
      category: 'occasion',
      ruleType: record.get('relationType') === 'REQUIRES' ? 'do' : 'dont',
      condition: { occasion, targetType: record.get('targetType'), targetName: record.get('targetName') },
      recommendation: `${occasion}场合${record.get('relationType') === 'REQUIRES' ? '需要' : '禁忌'}${record.get('targetName')}`,
      reason: record.get('requirements') ?? undefined,
    }));
  }

  private async querySeasonKnowledge(season: string, minStrength?: number): Promise<KnowledgeRuleDto[]> {
    const strengthFilter = minStrength ? ' AND r.strength >= $minStrength' : '';
    const cypher = `
      MATCH (s:Season)-[r]->(target)
      WHERE toLower(s.name) = toLower($season)
        ${strengthFilter}
      RETURN labels(target)[0] AS targetType, target.name AS targetName,
             type(r) AS relationType
    `;
    const params: Record<string, unknown> = { season };
    if (minStrength) {
      params['minStrength'] = minStrength;
    }

    const result = await this.neo4jService.read(cypher, params);
    return result.records.map((record) => ({
      category: 'season',
      ruleType: 'do',
      condition: { season, targetType: record.get('targetType'), targetName: record.get('targetName') },
      recommendation: `${season}推荐${record.get('targetName')}`,
    }));
  }

  private async queryStyleKnowledge(style: string, minStrength?: number): Promise<KnowledgeRuleDto[]> {
    const strengthFilter = minStrength ? ' AND r.strength >= $minStrength' : '';
    const cypher = `
      MATCH (s1:Style)-[r:PAIRS_WELL_WITH]->(s2:Style)
      WHERE toLower(s1.name) = toLower($style)
        ${strengthFilter}
      RETURN s1.name AS styleA, s2.name AS styleB, r.strength AS strength
      ORDER BY r.strength DESC
    `;
    const params: Record<string, unknown> = { style };
    if (minStrength) {
      params['minStrength'] = minStrength;
    }

    const result = await this.neo4jService.read(cypher, params);
    return result.records.map((record) => ({
      category: 'style',
      ruleType: 'do',
      condition: { styleA: record.get('styleA'), styleB: record.get('styleB') },
      recommendation: `${record.get('styleA')} 与 ${record.get('styleB')} 风格搭配良好`,
      strength: this.toNumber(record.get('strength')),
    }));
  }

  private toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  }

  private toStringArray(value: unknown): string[] {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.map(String);
    return [];
  }
}
