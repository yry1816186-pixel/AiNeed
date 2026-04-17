import { ProductTemplateType } from "../../../../../types/prisma-enums";

export interface TemplateSeedData {
  type: ProductTemplateType;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  printableArea: PrintableAreaBounds;
  sortOrder: number;
}

export interface PrintableAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
}

const TEMPLATES: TemplateSeedData[] = [
  {
    type: ProductTemplateType.tshirt,
    name: "T恤",
    description: "经典圆领T恤，100%纯棉面料，舒适透气",
    imageUrl: "/templates/tshirt.png",
    basePrice: 99,
    printableArea: {
      x: 25,
      y: 20,
      width: 50,
      height: 40,
      maxWidth: 800,
      maxHeight: 600,
    },
    sortOrder: 1,
  },
  {
    type: ProductTemplateType.hat,
    name: "棒球帽",
    description: "可调节棒球帽，透气网眼设计",
    imageUrl: "/templates/hat.png",
    basePrice: 69,
    printableArea: {
      x: 20,
      y: 10,
      width: 60,
      height: 30,
      maxWidth: 500,
      maxHeight: 250,
    },
    sortOrder: 2,
  },
  {
    type: ProductTemplateType.shoes,
    name: "帆布鞋",
    description: "经典帆布鞋，橡胶底防滑耐磨",
    imageUrl: "/templates/shoes.png",
    basePrice: 199,
    printableArea: {
      x: 15,
      y: 30,
      width: 70,
      height: 35,
      maxWidth: 700,
      maxHeight: 350,
    },
    sortOrder: 3,
  },
  {
    type: ProductTemplateType.bag,
    name: "帆布包",
    description: "大容量帆布托特包，结实耐用",
    imageUrl: "/templates/bag.png",
    basePrice: 129,
    printableArea: {
      x: 20,
      y: 15,
      width: 60,
      height: 50,
      maxWidth: 600,
      maxHeight: 500,
    },
    sortOrder: 4,
  },
  {
    type: ProductTemplateType.phone_case,
    name: "手机壳",
    description: "适配主流机型，TPU材质防摔保护",
    imageUrl: "/templates/phone_case.png",
    basePrice: 59,
    printableArea: {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      maxWidth: 400,
      maxHeight: 800,
    },
    sortOrder: 5,
  },
  {
    type: ProductTemplateType.mug,
    name: "马克杯",
    description: "陶瓷马克杯，热转印工艺，色彩持久",
    imageUrl: "/templates/mug.png",
    basePrice: 49,
    printableArea: {
      x: 15,
      y: 20,
      width: 70,
      height: 45,
      maxWidth: 500,
      maxHeight: 300,
    },
    sortOrder: 6,
  },
];

export function getTemplateSeedData(): TemplateSeedData[] {
  return [...TEMPLATES];
}

export function getTemplatesByType(
  type: ProductTemplateType,
): TemplateSeedData[] {
  return TEMPLATES.filter((t) => t.type === type);
}

export function getTemplateByType(
  type: ProductTemplateType,
): TemplateSeedData | undefined {
  return TEMPLATES.find((t) => t.type === type);
}

export function getBasePrice(type: ProductTemplateType): number {
  const template = TEMPLATES.find((t) => t.type === type);
  return template?.basePrice ?? 99;
}
