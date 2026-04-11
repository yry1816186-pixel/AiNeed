import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../../../common/prisma/prisma.service";

interface KnowledgeNode {
  id: string;
  type: "item" | "category" | "style" | "occasion" | "brand" | "user";
  properties: Record<string, any>;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

interface RecommendationPath {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  score: number;
}

interface ClothingKnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  edges: KnowledgeEdge[];
}

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);
  private graph: ClothingKnowledgeGraph = {
    nodes: new Map(),
    edges: [],
  };

  constructor(private prisma: PrismaService) {}

  async buildGraph(): Promise<void> {
    this.logger.log("Building clothing knowledge graph...");

    await this.buildCategoryNodes();
    await this.buildStyleNodes();
    await this.buildOccasionNodes();
    await this.buildItemNodes();
    await this.buildItemRelations();

    this.logger.log(
      `Graph built: ${this.graph.nodes.size} nodes, ${this.graph.edges.length} edges`,
    );
  }

  private async buildCategoryNodes(): Promise<void> {
    const categories = [
      "tops",
      "bottoms",
      "dresses",
      "outerwear",
      "footwear",
      "accessories",
      "activewear",
      "swimwear",
      "intimates",
      "suits",
    ];

    categories.forEach((cat) => {
      const nodeId = `category_${cat}`;
      this.graph.nodes.set(nodeId, {
        id: nodeId,
        type: "category",
        properties: { name: cat },
      });
    });
  }

  private async buildStyleNodes(): Promise<void> {
    const styles = [
      "casual",
      "formal",
      "business",
      "sporty",
      "bohemian",
      "minimalist",
      "streetwear",
      "vintage",
      "romantic",
      "edgy",
      "classic",
      "trendy",
    ];

    styles.forEach((style) => {
      const nodeId = `style_${style}`;
      this.graph.nodes.set(nodeId, {
        id: nodeId,
        type: "style",
        properties: { name: style },
      });
    });

    this.addStyleCompatibilityRules();
  }

  private addStyleCompatibilityRules(): void {
    const compatiblePairs = [
      ["casual", "sporty"],
      ["casual", "streetwear"],
      ["formal", "business"],
      ["formal", "classic"],
      ["bohemian", "vintage"],
      ["minimalist", "classic"],
      ["romantic", "vintage"],
      ["edgy", "streetwear"],
    ];

    compatiblePairs.forEach(([style1, style2]) => {
      this.graph.edges.push({
        source: `style_${style1}`,
        target: `style_${style2}`,
        relation: "compatible_with",
        weight: 0.8,
      });
    });
  }

  private async buildOccasionNodes(): Promise<void> {
    const occasions = [
      "daily",
      "work",
      "date",
      "party",
      "sport",
      "travel",
      "wedding",
      "interview",
      "beach",
      "gym",
      "dinner",
      "meeting",
    ];

    occasions.forEach((occasion) => {
      const nodeId = `occasion_${occasion}`;
      this.graph.nodes.set(nodeId, {
        id: nodeId,
        type: "occasion",
        properties: { name: occasion },
      });
    });

    this.addOccasionStyleRules();
  }

  private addOccasionStyleRules(): void {
    const occasionStyleMap: Record<string, string[]> = {
      work: ["business", "formal", "classic"],
      party: ["trendy", "edgy", "formal"],
      date: ["romantic", "casual", "trendy"],
      sport: ["sporty", "casual"],
      daily: ["casual", "minimalist", "streetwear"],
      wedding: ["formal", "classic", "romantic"],
    };

    Object.entries(occasionStyleMap).forEach(([occasion, styles]) => {
      styles.forEach((style) => {
        this.graph.edges.push({
          source: `occasion_${occasion}`,
          target: `style_${style}`,
          relation: "suitable_style",
          weight: 0.7,
        });
      });
    });
  }

  private async buildItemNodes(): Promise<void> {
    const items = await this.prisma.clothingItem.findMany({
      where: { isActive: true },
      take: 1000,
    });

    items.forEach((item) => {
      const nodeId = `item_${item.id}`;
      this.graph.nodes.set(nodeId, {
        id: nodeId,
        type: "item",
        properties: {
          name: item.name,
          category: item.category,
          brandId: item.brandId,
          attributes: item.attributes,
          price: item.price,
        },
      });

      this.graph.edges.push({
        source: nodeId,
        target: `category_${item.category}`,
        relation: "belongs_to",
        weight: 1.0,
      });

      const attrs = item.attributes as any;
      if (attrs?.style) {
        attrs.style.forEach((s: string) => {
          this.graph.edges.push({
            source: nodeId,
            target: `style_${s}`,
            relation: "has_style",
            weight: 0.8,
          });
        });
      }

      if (attrs?.occasions) {
        attrs.occasions.forEach((o: string) => {
          this.graph.edges.push({
            source: nodeId,
            target: `occasion_${o}`,
            relation: "suitable_for",
            weight: 0.7,
          });
        });
      }
    });
  }

  private async buildItemRelations(): Promise<void> {
    const cooccurrence = await this.analyzeCooccurrence();

    cooccurrence.forEach((pair) => {
      this.graph.edges.push({
        source: `item_${pair.item1}`,
        target: `item_${pair.item2}`,
        relation: "frequently_bought_together",
        weight: pair.score,
      });
    });
  }

  private async analyzeCooccurrence(): Promise<
    Array<{ item1: string; item2: string; score: number }>
  > {
    const orderItems = await this.prisma.orderItem.findMany({
      include: { order: true },
      take: 5000,
    });

    const cooccurrence: Map<string, Map<string, number>> = new Map();

    const ordersMap = new Map<string, string[]>();
    orderItems.forEach((oi) => {
      const orderId = oi.orderId;
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, []);
      }
      ordersMap.get(orderId)!.push(oi.itemId);
    });

    ordersMap.forEach((items) => {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const firstItem = items[i];
          const secondItem = items[j];
          if (!firstItem || !secondItem) {
            continue;
          }

          const key1 = firstItem < secondItem ? firstItem : secondItem;
          const key2 = firstItem < secondItem ? secondItem : firstItem;

          if (!cooccurrence.has(key1)) {
            cooccurrence.set(key1, new Map());
          }
          const currentRow = cooccurrence.get(key1);
          if (!currentRow) {
            continue;
          }

          const current = currentRow.get(key2) ?? 0;
          currentRow.set(key2, current + 1);
        }
      }
    });

    const results: Array<{ item1: string; item2: string; score: number }> = [];
    const maxCooccur = Math.max(
      ...Array.from(cooccurrence.values()).flatMap((m) =>
        Array.from(m.values()),
      ),
      1,
    );

    cooccurrence.forEach((innerMap, item1) => {
      innerMap.forEach((count, item2) => {
        if (count >= 2) {
          results.push({
            item1,
            item2,
            score: count / maxCooccur,
          });
        }
      });
    });

    return results.slice(0, 500);
  }

  findPaths(
    startId: string,
    endId: string,
    maxDepth: number = 3,
  ): RecommendationPath[] {
    const paths: RecommendationPath[] = [];
    const visited = new Set<string>();

    this.dfs(startId, endId, [], [], visited, paths, maxDepth);

    return paths.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private dfs(
    current: string,
    target: string,
    nodePath: KnowledgeNode[],
    edgePath: KnowledgeEdge[],
    visited: Set<string>,
    results: RecommendationPath[],
    maxDepth: number,
  ): void {
    if (nodePath.length > maxDepth) {return;}

    const currentNode = this.graph.nodes.get(current);
    if (!currentNode) {return;}

    visited.add(current);
    nodePath.push(currentNode);

    if (current === target) {
      const score = this.calculatePathScore(edgePath);
      results.push({
        nodes: [...nodePath],
        edges: [...edgePath],
        score,
      });
      nodePath.pop();
      visited.delete(current);
      return;
    }

    const outgoingEdges = this.graph.edges.filter((e) => e.source === current);

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        edgePath.push(edge);
        this.dfs(
          edge.target,
          target,
          nodePath,
          edgePath,
          visited,
          results,
          maxDepth,
        );
        edgePath.pop();
      }
    }

    nodePath.pop();
    visited.delete(current);
  }

  private calculatePathScore(edges: KnowledgeEdge[]): number {
    if (edges.length === 0) {return 0;}
    const avgWeight =
      edges.reduce((sum, e) => sum + e.weight, 0) / edges.length;
    const lengthPenalty = Math.pow(0.9, edges.length - 1);
    return avgWeight * lengthPenalty;
  }

  findRelatedItems(itemId: string, relationTypes?: string[]): KnowledgeNode[] {
    const related: KnowledgeNode[] = [];
    const nodePrefix = `item_${itemId}`;

    const relevantEdges = this.graph.edges.filter((e) => {
      const matches =
        (e.source === nodePrefix || e.target === nodePrefix) &&
        (!relationTypes || relationTypes.includes(e.relation));
      return matches;
    });

    relevantEdges.forEach((edge) => {
      const relatedId = edge.source === nodePrefix ? edge.target : edge.source;
      const node = this.graph.nodes.get(relatedId);
      if (node?.type === "item") {
        related.push(node);
      }
    });

    return related;
  }

  findCompatibleItemsByStyle(
    itemId: string,
  ): Array<{ item: KnowledgeNode; score: number }> {
    const nodePrefix = `item_${itemId}`;
    const itemNode = this.graph.nodes.get(nodePrefix);
    if (!itemNode) {return [];}

    const itemStyles = this.graph.edges
      .filter((e) => e.source === nodePrefix && e.relation === "has_style")
      .map((e) => e.target);

    const compatibleItems: Map<string, number> = new Map();

    itemStyles.forEach((styleId) => {
      const compatibleStyles = this.graph.edges
        .filter(
          (e) =>
            (e.source === styleId || e.target === styleId) &&
            e.relation === "compatible_with",
        )
        .map((e) => (e.source === styleId ? e.target : e.source));

      compatibleStyles.forEach((compStyle) => {
        this.graph.edges
          .filter((e) => e.target === compStyle && e.relation === "has_style")
          .forEach((e) => {
            const current = compatibleItems.get(e.source) || 0;
            compatibleItems.set(e.source, current + 0.2);
          });
      });
    });

    const results: Array<{ item: KnowledgeNode; score: number }> = [];
    compatibleItems.forEach((score, itemId) => {
      const node = this.graph.nodes.get(itemId);
      if (node && itemId !== nodePrefix) {
        results.push({ item: node, score: Math.min(score, 1) });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  getItemsForOccasion(occasion: string): KnowledgeNode[] {
    const occasionNode = `occasion_${occasion}`;
    const items: KnowledgeNode[] = [];

    this.graph.edges
      .filter((e) => e.target === occasionNode && e.relation === "suitable_for")
      .forEach((e) => {
        const node = this.graph.nodes.get(e.source);
        if (node?.type === "item") {
          items.push(node);
        }
      });

    return items;
  }

  getGraphStats(): {
    nodeCount: number;
    edgeCount: number;
    typeDistribution: Record<string, number>;
  } {
    const typeDistribution: Record<string, number> = {};

    this.graph.nodes.forEach((node) => {
      typeDistribution[node.type] = (typeDistribution[node.type] || 0) + 1;
    });

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.length,
      typeDistribution,
    };
  }
}
