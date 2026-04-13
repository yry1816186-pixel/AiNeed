const fs = require('fs');
const path = require('path');

const orderPath = path.join(__dirname, 'src/modules/order/order.service.ts');
let orderContent = fs.readFileSync(orderPath, 'utf8');

const oldOrderBlock = `    await this.prisma.$transaction(async (tx) => {
      // \u6062\u590D\u5E93\u5B58
      for (const item of orderWithItems?.items || []) {
        await tx.clothingItem.update({
          where: { id: item.itemId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // \u66F4\u65B0\u8BA2\u5355\u72B6\u6001
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled },
      });
    });`;

const newOrderBlock = `    await this.prisma.$transaction(async (tx) => {
      // \u6279\u91CF\u6062\u590D\u5E93\u5B58 - \u5C06 N \u6B21\u66F4\u65B0\u5408\u5E76\u4E3A\u6309\u5546\u54C1 ID \u5206\u7EC4\u7684\u6279\u91CF\u66F4\u65B0
      const itemQuantityMap = new Map<string, number>();
      for (const item of orderWithItems?.items || []) {
        const current = itemQuantityMap.get(item.itemId) || 0;
        itemQuantityMap.set(item.itemId, current + item.quantity);
      }

      // \u5E76\u884C\u6267\u884C\u6240\u6709\u5E93\u5B58\u6062\u590D
      await Promise.all(
        Array.from(itemQuantityMap.entries()).map(([itemId, quantity]) =>
          tx.clothingItem.update({
            where: { id: itemId },
            data: { stock: { increment: quantity } },
          }),
        ),
      );

      // \u66F4\u65B0\u8BA2\u5355\u72B6\u6001
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled },
      });
    });`;

if (orderContent.includes(oldOrderBlock)) {
  orderContent = orderContent.replace(oldOrderBlock, newOrderBlock);
  fs.writeFileSync(orderPath, orderContent);
  console.log('order.service.ts: Fixed N+1 in cancel order stock restore');
} else {
  console.log('order.service.ts: Block not found or already fixed');
}

const oldCartDelete = `      for (const item of dto.items) {
        await tx.cartItem.deleteMany({
          where: {
            userId,
            itemId: item.itemId,
            color: item.color,
            size: item.size,
          },
        });
      }`;

const newCartDelete = `      // \u6279\u91CF\u5220\u9664\u8D2D\u7269\u8F66\u5546\u54C1 - \u4F7F\u7528 Promise.all \u5E76\u884C\u66FF\u4EE3\u4E32\u884C\u5FAA\u73AF
      await Promise.all(
        dto.items.map((item) =>
          tx.cartItem.deleteMany({
            where: {
              userId,
              itemId: item.itemId,
              color: item.color,
              size: item.size,
            },
          }),
        ),
      );`;

if (orderContent.includes(oldCartDelete)) {
  orderContent = orderContent.replace(oldCartDelete, newCartDelete);
  fs.writeFileSync(orderPath, orderContent);
  console.log('order.service.ts: Fixed N+1 in cart item deletion');
} else {
  console.log('order.service.ts: Cart delete block not found or already fixed');
}

const btPath = path.join(__dirname, 'src/modules/recommendations/services/behavior-tracking.service.ts');
let btContent = fs.readFileSync(btPath, 'utf8');

const oldTrackBatch = `  async trackBatch(inputs: TrackBehaviorInput[]): Promise<void> {
    for (const input of inputs) {
      await this.track(input);
    }
  }`;

const newTrackBatch = `  async trackBatch(inputs: TrackBehaviorInput[]): Promise<void> {
    // \u6279\u91CF\u5E76\u884C\u8FFD\u8E2A\u884C\u4E3A\uFF0C\u907F\u514D\u4E32\u884C N+1
    await Promise.all(inputs.map((input) => this.track(input)));
  }`;

if (btContent.includes(oldTrackBatch)) {
  btContent = btContent.replace(oldTrackBatch, newTrackBatch);
  fs.writeFileSync(btPath, btContent);
  console.log('behavior-tracking.service.ts: Fixed N+1 in trackBatch');
} else {
  console.log('behavior-tracking.service.ts: Block not found or already fixed');
}

console.log('Done with N+1 fixes!');
