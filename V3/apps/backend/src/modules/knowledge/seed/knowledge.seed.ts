import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../neo4j.service';
import { SeedResultDto } from '../dto/rule-response.dto';
import * as fs from 'fs';
import * as path from 'path';

interface SeedNode {
  label: string;
  id: string;
  properties: Record<string, unknown>;
}

interface SeedRelationship {
  fromLabel: string;
  fromId: string;
  toLabel: string;
  toId: string;
  type: string;
  properties: Record<string, unknown>;
}

interface SeedData {
  nodes: SeedNode[];
  relationships: SeedRelationship[];
}

@Injectable()
export class KnowledgeSeedService {
  private readonly logger = new Logger(KnowledgeSeedService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  async run(): Promise<SeedResultDto> {
    const seedDir = this.resolveSeedDirectory();
    let nodesCreated = 0;
    let relationshipsCreated = 0;
    let filesProcessed = 0;
    const details: string[] = [];

    if (!fs.existsSync(seedDir)) {
      this.logger.warn(`Seed directory not found: ${seedDir}, using built-in seed data`);
      const builtInResult = await this.importBuiltInSeedData();
      return builtInResult;
    }

    const files = fs.readdirSync(seedDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      this.logger.warn('No JSON seed files found, using built-in seed data');
      const builtInResult = await this.importBuiltInSeedData();
      return builtInResult;
    }

    for (const file of files) {
      try {
        const filePath = path.join(seedDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data: SeedData = JSON.parse(content);

        const nodeCount = await this.importNodes(data.nodes);
        const relCount = await this.importRelationships(data.relationships);

        nodesCreated += nodeCount;
        relationshipsCreated += relCount;
        filesProcessed += 1;
        details.push(`${file}: ${nodeCount} nodes, ${relCount} relationships`);
        this.logger.log(`Imported ${file}: ${nodeCount} nodes, ${relCount} relationships`);
      } catch (error) {
        const msg = `Failed to import ${file}: ${String(error)}`;
        this.logger.error(msg);
        details.push(msg);
      }
    }

    return { nodesCreated, relationshipsCreated, filesProcessed, details };
  }

  async healthCheck(): Promise<boolean> {
    return this.neo4jService.healthCheck();
  }

  private async importNodes(nodes: SeedNode[]): Promise<number> {
    let count = 0;
    for (const node of nodes) {
      const propKeys = Object.keys(node.properties);
      const setClause = propKeys
        .map((k) => `n.${k} = $props.${k}`)
        .join(', ');
      const cypher = `
        MERGE (n:${node.label} {id: $id})
        ${propKeys.length > 0 ? `SET ${setClause}` : ''}
      `;
      await this.neo4jService.write(cypher, { id: node.id, props: node.properties });
      count += 1;
    }
    return count;
  }

  private async importRelationships(relationships: SeedRelationship[]): Promise<number> {
    let count = 0;
    for (const rel of relationships) {
      const propKeys = Object.keys(rel.properties);
      const setClause = propKeys
        .map((k) => `r.${k} = $props.${k}`)
        .join(', ');
      const cypher = `
        MATCH (from:${rel.fromLabel} {id: $fromId})
        MATCH (to:${rel.toLabel} {id: $toId})
        MERGE (from)-[r:${rel.type}]->(to)
        ${propKeys.length > 0 ? `SET ${setClause}` : ''}
      `;
      await this.neo4jService.write(cypher, {
        fromId: rel.fromId,
        toId: rel.toId,
        props: rel.properties,
      });
      count += 1;
    }
    return count;
  }

  private async importBuiltInSeedData(): Promise<SeedResultDto> {
    const data = this.getBuiltInSeedData();
    const nodeCount = await this.importNodes(data.nodes);
    const relCount = await this.importRelationships(data.relationships);

    return {
      nodesCreated: nodeCount,
      relationshipsCreated: relCount,
      filesProcessed: 1,
      details: ['Built-in seed data imported'],
    };
  }

  private resolveSeedDirectory(): string {
    const candidates = [
      path.resolve(process.cwd(), '..', '..', '..', 'data', 'knowledge-graph'),
      path.resolve(process.cwd(), 'data', 'knowledge-graph'),
      'C:\\AiNeed\\V3\\data\\knowledge-graph',
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    return candidates[0];
  }

  private getBuiltInSeedData(): SeedData {
    const nodes: SeedNode[] = [
      { label: 'Color', id: 'color_black', properties: { name: 'black', hex: '#000000', category: 'neutral' } },
      { label: 'Color', id: 'color_white', properties: { name: 'white', hex: '#FFFFFF', category: 'neutral' } },
      { label: 'Color', id: 'color_navy_blue', properties: { name: 'navy_blue', hex: '#000080', category: 'cool' } },
      { label: 'Color', id: 'color_camel', properties: { name: 'camel', hex: '#C19A6B', category: 'warm' } },
      { label: 'Color', id: 'color_gray', properties: { name: 'gray', hex: '#808080', category: 'neutral' } },
      { label: 'Color', id: 'color_beige', properties: { name: 'beige', hex: '#F5F5DC', category: 'neutral' } },
      { label: 'Color', id: 'color_bright_red', properties: { name: 'bright_red', hex: '#FF0000', category: 'warm' } },
      { label: 'Color', id: 'color_bright_green', properties: { name: 'bright_green', hex: '#00FF00', category: 'cool' } },
      { label: 'Color', id: 'color_neon_pink', properties: { name: 'neon_pink', hex: '#FF6EC7', category: 'warm' } },
      { label: 'Color', id: 'color_neon_orange', properties: { name: 'neon_orange', hex: '#FF4500', category: 'warm' } },
      { label: 'Style', id: 'style_minimalist', properties: { name: 'minimalist', description: '简约风格，注重线条和质感' } },
      { label: 'Style', id: 'style_streetwear', properties: { name: 'streetwear', description: '街头风格，大胆个性' } },
      { label: 'Style', id: 'style_business', properties: { name: 'business', description: '商务风格，正式得体' } },
      { label: 'Style', id: 'style_casual', properties: { name: 'casual', description: '休闲风格，轻松自然' } },
      { label: 'Style', id: 'style_retro', properties: { name: 'retro', description: '复古风格，经典怀旧' } },
      { label: 'Style', id: 'style_guochao', properties: { name: 'guochao', description: '国潮风格，中国元素融合' } },
      { label: 'Style', id: 'style_korean', properties: { name: 'korean', description: '韩系风格，清新温柔' } },
      { label: 'Occasion', id: 'occasion_work', properties: { name: 'work', requirements: '正式得体，专业感' } },
      { label: 'Occasion', id: 'occasion_casual', properties: { name: 'casual', requirements: '轻松舒适，个性表达' } },
      { label: 'Occasion', id: 'occasion_date', properties: { name: 'date', requirements: '精致有魅力，不过度' } },
      { label: 'Occasion', id: 'occasion_sport', properties: { name: 'sport', requirements: '运动功能性，舒适透气' } },
      { label: 'Occasion', id: 'occasion_formal', properties: { name: 'formal', requirements: '正式庄重，礼服级别' } },
      { label: 'Occasion', id: 'occasion_party', properties: { name: 'party', requirements: '时尚亮眼，展现个性' } },
      { label: 'BodyType', id: 'bodytype_hourglass', properties: { name: 'hourglass', recommendations: '展现腰线优势' } },
      { label: 'BodyType', id: 'bodytype_pear', properties: { name: 'pear', recommendations: '平衡上下身比例' } },
      { label: 'BodyType', id: 'bodytype_apple', properties: { name: 'apple', recommendations: '提升腰线，修饰腹部' } },
      { label: 'BodyType', id: 'bodytype_straight', properties: { name: 'straight', recommendations: '创造曲线感' } },
      { label: 'BodyType', id: 'bodytype_inverted_triangle', properties: { name: 'inverted_triangle', recommendations: '平衡肩臀比例' } },
      { label: 'Season', id: 'season_spring', properties: { name: 'spring' } },
      { label: 'Season', id: 'season_summer', properties: { name: 'summer' } },
      { label: 'Season', id: 'season_autumn', properties: { name: 'autumn' } },
      { label: 'Season', id: 'season_winter', properties: { name: 'winter' } },
      { label: 'Fabric', id: 'fabric_cotton', properties: { name: 'cotton', properties: '透气吸汗' } },
      { label: 'Fabric', id: 'fabric_linen', properties: { name: 'linen', properties: '凉爽透气' } },
      { label: 'Fabric', id: 'fabric_silk', properties: { name: 'silk', properties: '光滑垂坠' } },
      { label: 'Fabric', id: 'fabric_wool', properties: { name: 'wool', properties: '保暖有型' } },
      { label: 'Fabric', id: 'fabric_cashmere', properties: { name: 'cashmere', properties: '柔软保暖' } },
      { label: 'Fabric', id: 'fabric_polyester', properties: { name: 'polyester', properties: '耐磨快干' } },
      { label: 'Clothing', id: 'clothing_dress', properties: { name: 'dress', category: 'dress' } },
      { label: 'Clothing', id: 'clothing_oversized_top', properties: { name: 'oversized_top', category: 'top' } },
      { label: 'Clothing', id: 'clothing_high_waist_pants', properties: { name: 'high_waist_pants', category: 'bottom' } },
      { label: 'Clothing', id: 'clothing_suit', properties: { name: 'suit', category: 'outer' } },
      { label: 'Clothing', id: 'clothing_sneakers', properties: { name: 'sneakers', category: 'shoes' } },
      { label: 'Clothing', id: 'clothing_slim_knit', properties: { name: 'slim_knit', category: 'top' } },
      { label: 'Clothing', id: 'clothing_a_line_skirt', properties: { name: 'a_line_skirt', category: 'bottom' } },
      { label: 'Clothing', id: 'clothing_pencil_skirt', properties: { name: 'pencil_skirt', category: 'bottom' } },
      { label: 'Clothing', id: 'clothing_wrap_dress', properties: { name: 'wrap_dress', category: 'dress' } },
      { label: 'Clothing', id: 'clothing_wide_leg_pants', properties: { name: 'wide_leg_pants', category: 'bottom' } },
      { label: 'Clothing', id: 'clothing_straight_pants', properties: { name: 'straight_pants', category: 'bottom' } },
      { label: 'Clothing', id: 'clothing_slim_shirt', properties: { name: 'slim_shirt', category: 'top' } },
      { label: 'Trend', id: 'trend_guochao_2026', properties: { name: 'guochao_2026', keywords: ['国潮', '新中式', '盘扣'], ttl: 30 } },
    ];

    const relationships: SeedRelationship[] = [
      { fromLabel: 'Color', fromId: 'color_navy_blue', toLabel: 'Color', toId: 'color_camel', type: 'COMPLEMENTS', properties: { strength: 0.9, reason: '海军蓝+驼色是经典商务搭配，沉稳有品味' } },
      { fromLabel: 'Color', fromId: 'color_black', toLabel: 'Color', toId: 'color_white', type: 'COMPLEMENTS', properties: { strength: 0.95, reason: '黑白配是永恒经典，适合所有场合' } },
      { fromLabel: 'Color', fromId: 'color_black', toLabel: 'Color', toId: 'color_gray', type: 'COMPLEMENTS', properties: { strength: 0.85, reason: '黑灰搭配低调有质感' } },
      { fromLabel: 'Color', fromId: 'color_white', toLabel: 'Color', toId: 'color_beige', type: 'COMPLEMENTS', properties: { strength: 0.8, reason: '白+米色温柔干净，适合春夏' } },
      { fromLabel: 'Color', fromId: 'color_bright_red', toLabel: 'Color', toId: 'color_bright_green', type: 'CONFLICTS_WITH', properties: { strength: 0.85, reason: '大面积红绿撞色难以驾驭，建议用深色调替代' } },
      { fromLabel: 'Color', fromId: 'color_neon_pink', toLabel: 'Color', toId: 'color_neon_orange', type: 'CONFLICTS_WITH', properties: { strength: 0.7, reason: '两个荧光色过于刺眼，搭配缺乏层次' } },
      { fromLabel: 'Style', fromId: 'style_minimalist', toLabel: 'Style', toId: 'style_casual', type: 'PAIRS_WELL_WITH', properties: { strength: 0.8 } },
      { fromLabel: 'Style', fromId: 'style_minimalist', toLabel: 'Style', toId: 'style_business', type: 'PAIRS_WELL_WITH', properties: { strength: 0.7 } },
      { fromLabel: 'Style', fromId: 'style_streetwear', toLabel: 'Style', toId: 'style_guochao', type: 'PAIRS_WELL_WITH', properties: { strength: 0.75 } },
      { fromLabel: 'Style', fromId: 'style_korean', toLabel: 'Style', toId: 'style_casual', type: 'PAIRS_WELL_WITH', properties: { strength: 0.85 } },
      { fromLabel: 'Occasion', fromId: 'occasion_work', toLabel: 'Style', toId: 'style_business', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_work', toLabel: 'Style', toId: 'style_minimalist', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_casual', toLabel: 'Style', toId: 'style_casual', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_date', toLabel: 'Style', toId: 'style_korean', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_formal', toLabel: 'Style', toId: 'style_business', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_party', toLabel: 'Style', toId: 'style_streetwear', type: 'REQUIRES', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_work', toLabel: 'Clothing', toId: 'clothing_sneakers', type: 'FORBIDS', properties: {} },
      { fromLabel: 'Occasion', fromId: 'occasion_formal', toLabel: 'Clothing', toId: 'clothing_sneakers', type: 'FORBIDS', properties: {} },
      { fromLabel: 'BodyType', fromId: 'bodytype_hourglass', toLabel: 'Clothing', toId: 'clothing_dress', type: 'SUITABLE_FOR', properties: { recommendation: '收腰连衣裙完美展现沙漏身材曲线', examples: ['裹身裙', 'A字裙', '铅笔裙'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_hourglass', toLabel: 'Clothing', toId: 'clothing_wrap_dress', type: 'SUITABLE_FOR', properties: { recommendation: '裹身裙凸显腰线，展现沙漏身材', examples: ['V领裹身裙'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_hourglass', toLabel: 'Clothing', toId: 'clothing_oversized_top', type: 'AVOID_FOR', properties: { recommendation: 'oversized上装会遮盖身材优势，建议选修身款', alternatives: ['修身针织', '收腰衬衫'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_pear', toLabel: 'Clothing', toId: 'clothing_a_line_skirt', type: 'SUITABLE_FOR', properties: { recommendation: 'A字裙修饰梨形身材的臀部和大腿', examples: ['中长A字裙', '高腰A字裙'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_pear', toLabel: 'Clothing', toId: 'clothing_wide_leg_pants', type: 'SUITABLE_FOR', properties: { recommendation: '阔腿裤平衡梨形身材下半身', examples: ['高腰阔腿裤'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_apple', toLabel: 'Clothing', toId: 'clothing_high_waist_pants', type: 'SUITABLE_FOR', properties: { recommendation: '高腰裤提升腰线，优化苹果型身材比例', examples: ['高腰阔腿裤', '高腰直筒裤'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_straight', toLabel: 'Clothing', toId: 'clothing_slim_knit', type: 'SUITABLE_FOR', properties: { recommendation: '修身针织衫为直筒身材创造曲线感', examples: ['高领修身针织', '束腰款式'] } },
      { fromLabel: 'BodyType', fromId: 'bodytype_inverted_triangle', toLabel: 'Clothing', toId: 'clothing_wide_leg_pants', type: 'SUITABLE_FOR', properties: { recommendation: '阔腿裤平衡倒三角身材的宽肩', examples: ['高腰阔腿裤', '喇叭裤'] } },
      { fromLabel: 'Season', fromId: 'season_spring', toLabel: 'Color', toId: 'color_beige', type: 'RECOMMENDS_COLOR', properties: { strength: 0.8 } },
      { fromLabel: 'Season', fromId: 'season_spring', toLabel: 'Color', toId: 'color_white', type: 'RECOMMENDS_COLOR', properties: { strength: 0.75 } },
      { fromLabel: 'Season', fromId: 'season_summer', toLabel: 'Color', toId: 'color_white', type: 'RECOMMENDS_COLOR', properties: { strength: 0.9 } },
      { fromLabel: 'Season', fromId: 'season_summer', toLabel: 'Fabric', toId: 'fabric_cotton', type: 'RECOMMENDS_FABRIC', properties: { strength: 0.9 } },
      { fromLabel: 'Season', fromId: 'season_summer', toLabel: 'Fabric', toId: 'fabric_linen', type: 'RECOMMENDS_FABRIC', properties: { strength: 0.85 } },
      { fromLabel: 'Season', fromId: 'season_autumn', toLabel: 'Color', toId: 'color_camel', type: 'RECOMMENDS_COLOR', properties: { strength: 0.9 } },
      { fromLabel: 'Season', fromId: 'season_autumn', toLabel: 'Fabric', toId: 'fabric_wool', type: 'RECOMMENDS_FABRIC', properties: { strength: 0.85 } },
      { fromLabel: 'Season', fromId: 'season_winter', toLabel: 'Color', toId: 'color_navy_blue', type: 'RECOMMENDS_COLOR', properties: { strength: 0.8 } },
      { fromLabel: 'Season', fromId: 'season_winter', toLabel: 'Color', toId: 'color_black', type: 'RECOMMENDS_COLOR', properties: { strength: 0.85 } },
      { fromLabel: 'Season', fromId: 'season_winter', toLabel: 'Fabric', toId: 'fabric_wool', type: 'RECOMMENDS_FABRIC', properties: { strength: 0.95 } },
      { fromLabel: 'Season', fromId: 'season_winter', toLabel: 'Fabric', toId: 'fabric_cashmere', type: 'RECOMMENDS_FABRIC', properties: { strength: 0.9 } },
      { fromLabel: 'Trend', fromId: 'trend_guochao_2026', toLabel: 'Style', toId: 'style_guochao', type: 'FEATURES', properties: {} },
      { fromLabel: 'Clothing', fromId: 'clothing_dress', toLabel: 'Style', toId: 'style_casual', type: 'BELONGS_TO_STYLE', properties: {} },
      { fromLabel: 'Clothing', fromId: 'clothing_suit', toLabel: 'Style', toId: 'style_business', type: 'BELONGS_TO_STYLE', properties: {} },
      { fromLabel: 'Clothing', fromId: 'clothing_slim_knit', toLabel: 'Style', toId: 'style_minimalist', type: 'BELONGS_TO_STYLE', properties: {} },
    ];

    return { nodes, relationships };
  }
}
