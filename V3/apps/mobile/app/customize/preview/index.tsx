import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  Alert,
  Dimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../../src/theme';
import { Text } from '../../../src/components/ui/Text';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Loading } from '../../../src/components/ui/Loading';
import { Badge } from '../../../src/components/ui/Badge';
import { ProductPreview } from '../../../src/components/customize/ProductPreview';
import { useCreateOrder } from '../../../src/hooks/useCustomOrder';
import {
  type ProductTemplate,
  type ProductColor,
  type ShippingAddress,
  type CreateOrderPayload,
  type CustomOrder,
  type ProductCategory,
  type ProductType,
  PRODUCT_PRICE_MAP,
  PRODUCT_LABEL_MAP,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  PRODUCT_TYPE_LABELS,
} from '../../../src/services/custom-order.service';

type Step = 4 | 5 | 'confirmed';

const STEPS = [
  { label: '选产品', step: 1 },
  { label: '上传图案', step: 2 },
  { label: '编辑布局', step: 3 },
  { label: '预览效果', step: 4 },
  { label: '确认下单', step: 5 },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const MOCK_TEMPLATES: ProductTemplate[] = [
  {
    id: 'tpl_tshirt',
    name: '经典T恤',
    category: 'tshirt',
    baseImage: 'https://placehold.co/400x480/f5f5f5/1a1a2e?text=T-Shirt',
    printArea: { x: 25, y: 20, width: 50, height: 40 },
    colors: [
      { name: '白色', hex: '#FFFFFF', image: 'https://placehold.co/400x480/ffffff/1a1a2e?text=T-Shirt-White' },
      { name: '黑色', hex: '#1A1A1A', image: 'https://placehold.co/400x480/1a1a1a/ffffff?text=T-Shirt-Black' },
      { name: '灰色', hex: '#808080', image: 'https://placehold.co/400x480/808080/ffffff?text=T-Shirt-Gray' },
    ],
    sizes: SIZES,
    price: 129,
    costPrice: 30,
    shippingFee: 10,
    description: '100%纯棉，舒适透气',
  },
  {
    id: 'tpl_hoodie',
    name: '连帽卫衣',
    category: 'hoodie',
    baseImage: 'https://placehold.co/400x480/f5f5f5/1a1a2e?text=Hoodie',
    printArea: { x: 25, y: 18, width: 50, height: 35 },
    colors: [
      { name: '黑色', hex: '#1A1A1A', image: 'https://placehold.co/400x480/1a1a1a/ffffff?text=Hoodie-Black' },
      { name: '灰色', hex: '#808080', image: 'https://placehold.co/400x480/808080/ffffff?text=Hoodie-Gray' },
      { name: '藏蓝', hex: '#1A1A2E', image: 'https://placehold.co/400x480/1a1a2e/ffffff?text=Hoodie-Navy' },
    ],
    sizes: SIZES,
    price: 199,
    costPrice: 60,
    shippingFee: 15,
    description: '加绒保暖，潮流百搭',
  },
  {
    id: 'tpl_hat',
    name: '棒球帽',
    category: 'hat',
    baseImage: 'https://placehold.co/400x400/f5f5f5/1a1a2e?text=Hat',
    printArea: { x: 20, y: 15, width: 60, height: 30 },
    colors: [
      { name: '黑色', hex: '#1A1A1A', image: 'https://placehold.co/400x400/1a1a1a/ffffff?text=Hat-Black' },
      { name: '白色', hex: '#FFFFFF', image: 'https://placehold.co/400x400/ffffff/1a1a2e?text=Hat-White' },
    ],
    sizes: ['均码'],
    price: 69,
    costPrice: 20,
    shippingFee: 8,
    description: '可调节帽围，刺绣工艺',
  },
  {
    id: 'tpl_bag',
    name: '帆布包',
    category: 'bag',
    baseImage: 'https://placehold.co/400x440/f5f5f5/1a1a2e?text=Bag',
    printArea: { x: 20, y: 20, width: 60, height: 45 },
    colors: [
      { name: '米白', hex: '#F5F0E8', image: 'https://placehold.co/400x440/f5f0e8/1a1a2e?text=Bag-Cream' },
      { name: '黑色', hex: '#1A1A1A', image: 'https://placehold.co/400x440/1a1a1a/ffffff?text=Bag-Black' },
    ],
    sizes: ['均码'],
    price: 129,
    costPrice: 35,
    shippingFee: 12,
    description: '加厚帆布，大容量',
  },
  {
    id: 'tpl_phone_case',
    name: '手机壳',
    category: 'phone_case',
    baseImage: 'https://placehold.co/400x720/f5f5f5/1a1a2e?text=PhoneCase',
    printArea: { x: 15, y: 20, width: 70, height: 50 },
    colors: [
      { name: '透明', hex: '#E8E8E8', image: 'https://placehold.co/400x720/e8e8e8/1a1a2e?text=PhoneCase-Clear' },
      { name: '黑色', hex: '#1A1A1A', image: 'https://placehold.co/400x720/1a1a1a/ffffff?text=PhoneCase-Black' },
    ],
    sizes: ['iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max'],
    price: 49,
    costPrice: 10,
    shippingFee: 8,
    description: '防摔TPU材质，精准开孔',
  },
];

const MOCK_ADDRESSES: ShippingAddress[] = [
  {
    id: 'addr_1',
    name: '张三',
    phone: '13800138000',
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    address: '科技园路1号大厦A座2001',
    detail: '科技园路1号大厦A座2001',
    isDefault: true,
  },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={stepStyles.container}>
      {STEPS.map((item, index) => {
        const stepNum = item.step;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <React.Fragment key={stepNum}>
            <View style={stepStyles.stepItem}>
              <View
                style={[
                  stepStyles.circle,
                  isCompleted && stepStyles.circleCompleted,
                  isActive && stepStyles.circleActive,
                ]}
              >
                {isCompleted ? (
                  <Text style={stepStyles.checkMark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      stepStyles.stepNumber,
                      isActive && stepStyles.stepNumberActive,
                    ]}
                  >
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                variant="caption"
                color={isActive ? colors.accent : isCompleted ? colors.textSecondary : colors.textTertiary}
                style={stepStyles.stepLabel}
              >
                {item.label}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  stepStyles.line,
                  isCompleted && stepStyles.lineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  stepItem: {
    alignItems: 'center',
    gap: 2,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.success,
  },
  circleActive: {
    backgroundColor: colors.accent,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textTertiary,
    lineHeight: 14,
  },
  stepNumberActive: {
    color: colors.white,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.white,
    lineHeight: 16,
  },
  stepLabel: {
    lineHeight: 14,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray200,
    marginHorizontal: spacing.xs,
    marginBottom: 16,
  },
  lineCompleted: {
    backgroundColor: colors.success,
  },
});

function ColorSelector({
  colors: productColors,
  selected,
  onSelect,
}: {
  colors: ProductColor[];
  selected: ProductColor;
  onSelect: (c: ProductColor) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="body2" weight="600" style={styles.sectionTitle}>
        颜色
      </Text>
      <View style={styles.colorRow}>
        {productColors.map((c) => {
          const isSelected = c.hex === selected.hex;
          return (
            <TouchableOpacity
              key={c.hex}
              style={[
                styles.colorDot,
                { backgroundColor: c.hex },
                isSelected && styles.colorDotSelected,
              ]}
              onPress={() => onSelect(c)}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected && <View style={styles.colorDotInner} />}
            </TouchableOpacity>
          );
        })}
        <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: spacing.sm }}>
          {selected.name}
        </Text>
      </View>
    </View>
  );
}

function SizeSelector({
  sizes,
  selected,
  onSelect,
}: {
  sizes: string[];
  selected: string;
  onSelect: (s: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="body2" weight="600" style={styles.sectionTitle}>
        尺码
      </Text>
      <View style={styles.sizeRow}>
        {sizes.map((s) => {
          const isSelected = s === selected;
          return (
            <TouchableOpacity
              key={s}
              style={[
                styles.sizeChip,
                isSelected && styles.sizeChipSelected,
              ]}
              onPress={() => onSelect(s)}
              accessibilityRole="button"
              accessibilityLabel={s}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                variant="body2"
                weight={isSelected ? '600' : '400'}
                color={isSelected ? colors.white : colors.textPrimary}
              >
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function QuantitySelector({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (q: number) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="body2" weight="600" style={styles.sectionTitle}>
        数量
      </Text>
      <View style={styles.quantityRow}>
        <TouchableOpacity
          style={styles.quantityBtn}
          onPress={() => onChange(Math.max(1, quantity - 1))}
          accessibilityRole="button"
          accessibilityLabel="减少数量"
        >
          <Text variant="h3" color={colors.textPrimary}>−</Text>
        </TouchableOpacity>
        <Text variant="h3" style={styles.quantityValue}>{quantity}</Text>
        <TouchableOpacity
          style={styles.quantityBtn}
          onPress={() => onChange(Math.min(99, quantity + 1))}
          accessibilityRole="button"
          accessibilityLabel="增加数量"
        >
          <Text variant="h3" color={colors.textPrimary}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddressSelector({
  addresses,
  selected,
  onSelect,
}: {
  addresses: ShippingAddress[];
  selected: ShippingAddress | null;
  onSelect: (a: ShippingAddress) => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="body2" weight="600" style={styles.sectionTitle}>
        收货地址
      </Text>
      {addresses.map((addr) => {
        const isSelected = selected?.id === addr.id;
        return (
          <TouchableOpacity
            key={addr.id}
            style={[styles.addressCard, isSelected && styles.addressCardSelected]}
            onPress={() => onSelect(addr)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.addressHeader}>
              <Text variant="body2" weight="600">{addr.name}</Text>
              <Text variant="body2" color={colors.textSecondary}>{addr.phone}</Text>
              {addr.isDefault && (
                <Badge label="默认" variant="accent" size="small" />
              )}
            </View>
            <Text variant="caption" color={colors.textTertiary} style={styles.addressDetail}>
              {addr.province}{addr.city}{addr.district}{addr.detail}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PriceBreakdown({
  unitPrice,
  quantity,
  shippingFee,
}: {
  unitPrice: number;
  quantity: number;
  shippingFee: number;
}) {
  const subtotal = unitPrice * quantity;
  const total = subtotal + shippingFee;

  return (
    <View style={styles.section}>
      <Text variant="body2" weight="600" style={styles.sectionTitle}>
        价格明细
      </Text>
      <View style={styles.priceRow}>
        <Text variant="body2" color={colors.textSecondary}>商品单价</Text>
        <Text variant="body2">¥{unitPrice.toFixed(2)}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text variant="body2" color={colors.textSecondary}>数量</Text>
        <Text variant="body2">×{quantity}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text variant="body2" color={colors.textSecondary}>小计</Text>
        <Text variant="body2">¥{subtotal.toFixed(2)}</Text>
      </View>
      <View style={[styles.priceRow, styles.dividerTop]}>
        <Text variant="body2" color={colors.textSecondary}>运费</Text>
        <Text variant="body2">¥{shippingFee.toFixed(2)}</Text>
      </View>
      <View style={[styles.priceRow, styles.dividerTop]}>
        <Text variant="h3" weight="700">合计</Text>
        <Text variant="h3" weight="700" color={colors.accent}>¥{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function OrderConfirmedView({
  order,
  onViewDetail,
  onContinueCustomize,
}: {
  order: CustomOrder;
  onViewDetail: () => void;
  onContinueCustomize: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const statusColor = ORDER_STATUS_COLOR[order.status] ?? colors.textSecondary;
  const statusLabel = ORDER_STATUS_LABEL[order.status] ?? order.status;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          confirmStyles.successIcon,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={confirmStyles.checkCircle}>
          <Text style={confirmStyles.checkText}>✓</Text>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim }}>
        <Text variant="h2" align="center" style={confirmStyles.title}>
          订单提交成功
        </Text>
        <Text variant="body" color={colors.textSecondary} align="center" style={confirmStyles.subtitle}>
          您的定制商品将进入生产流程
        </Text>
      </Animated.View>

      <Card style={confirmStyles.orderCard}>
        <View style={confirmStyles.orderHeader}>
          <Text variant="body2" weight="600">订单号</Text>
          <Text variant="body2" color={colors.accent}>{order.id.slice(0, 8).toUpperCase()}</Text>
        </View>

        <View style={confirmStyles.statusRow}>
          <Text variant="body2" color={colors.textSecondary}>状态</Text>
          <Badge label={statusLabel} size="small" variant={order.status === 'pending' ? 'warning' : 'info'} />
        </View>

        <View style={confirmStyles.infoRow}>
          <Text variant="body2" color={colors.textSecondary}>产品</Text>
          <Text variant="body2">{PRODUCT_TYPE_LABELS[order.productType as ProductType] ?? order.productType}</Text>
        </View>

        <View style={confirmStyles.infoRow}>
          <Text variant="body2" color={colors.textSecondary}>尺码 / 数量</Text>
          <Text variant="body2">{order.size} × {order.quantity}</Text>
        </View>

        <View style={confirmStyles.infoRow}>
          <Text variant="body2" color={colors.textSecondary}>金额</Text>
          <Text variant="body2" weight="700" color={colors.accent}>¥{(order.totalPrice / 100).toFixed(2)}</Text>
        </View>

        <View style={[confirmStyles.infoRow, confirmStyles.dividerTop]}>
          <Text variant="body2" color={colors.textSecondary}>预计送达</Text>
          <Text variant="body2">3-7个工作日</Text>
        </View>

        {order.trackingNumber && (
          <View style={confirmStyles.infoRow}>
            <Text variant="body2" color={colors.textSecondary}>物流单号</Text>
            <Text variant="body2">{order.trackingNumber}</Text>
          </View>
        )}
      </Card>

      <View style={confirmStyles.actions}>
        <Button
          variant="secondary"
          size="large"
          fullWidth
          onPress={onViewDetail}
        >
          查看订单详情
        </Button>
        <View style={{ height: spacing.md }} />
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={onContinueCustomize}
        >
          继续定制
        </Button>
      </View>
    </ScrollView>
  );
}

const confirmStyles = StyleSheet.create({
  successIcon: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: colors.white,
    lineHeight: 42,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  orderCard: {
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dividerTop: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});

export default function CustomizePreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    designId?: string;
    designImageUrl?: string;
    templateId?: string;
    designName?: string;
  }>();

  const createOrderMutation = useCreateOrder();

  const [currentStep, setCurrentStep] = useState<Step>(4);
  const [confirmedOrder, setConfirmedOrder] = useState<CustomOrder | null>(null);

  const template = MOCK_TEMPLATES.find((t) => t.id === (params.templateId ?? 'tpl_tshirt')) ?? MOCK_TEMPLATES[0];

  const [selectedColor, setSelectedColor] = useState<ProductColor>(template.colors[0]);
  const [selectedSize, setSelectedSize] = useState<string>(template.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(
    MOCK_ADDRESSES.find((a) => a.isDefault) ?? null,
  );

  const designImageUrl = params.designImageUrl ?? 'https://placehold.co/200x200/E94560/ffffff?text=Design';
  const designName = params.designName ?? '我的设计';

  const handleConfirmDesign = useCallback(() => {
    setCurrentStep(5);
  }, []);

  const handleSubmitOrder = useCallback(() => {
    if (!selectedAddress) {
      Alert.alert('提示', '请选择收货地址');
      return;
    }

    const payload: CreateOrderPayload = {
      design_id: params.designId ?? 'design_mock',
      product_type: template.category as ProductType,
      material: 'cotton',
      size: selectedSize,
      quantity,
      shipping_address: selectedAddress,
    };

    createOrderMutation.mutate(payload, {
      onSuccess: (order) => {
        setConfirmedOrder(order);
        setCurrentStep('confirmed');
      },
      onError: () => {
        const mockOrder: CustomOrder = {
          id: 'order_mock_' + Date.now(),
          userId: 'mock_user',
          designId: params.designId ?? 'design_mock',
          productType: template.category as ProductType,
          material: 'cotton',
          size: selectedSize,
          quantity,
          unitPrice: template.price * 100,
          totalPrice: (template.price * quantity + template.shippingFee) * 100,
          status: 'pending',
          shippingAddress: selectedAddress,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConfirmedOrder(mockOrder);
        setCurrentStep('confirmed');
      },
    });
  }, [selectedAddress, params.designId, template, selectedColor, selectedSize, quantity, designImageUrl, createOrderMutation]);

  const handleViewDetail = useCallback(() => {
    if (confirmedOrder) {
      router.push({
        pathname: '/clothing/[id]',
        params: { id: confirmedOrder.id },
      });
    }
  }, [confirmedOrder, router]);

  const handleContinueCustomize = useCallback(() => {
    router.back();
  }, [router]);

  if (currentStep === 'confirmed' && confirmedOrder) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <OrderConfirmedView
          order={confirmedOrder}
          onViewDetail={handleViewDetail}
          onContinueCustomize={handleContinueCustomize}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: '定制预览' }} />
      <View style={styles.container}>
        <StepIndicator currentStep={currentStep as number} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 4 && (
            <>
              <View style={styles.previewSection}>
                <ProductPreview
                  template={template}
                  selectedColor={selectedColor}
                  designImageUrl={designImageUrl}
                  designPosition={{ x: 0, y: 0 }}
                  designScale={1}
                  designRotation={0}
                />
              </View>

              <View style={styles.productInfo}>
                <Text variant="h2" style={styles.productName}>{template.name}</Text>
                <Text variant="body2" color={colors.textTertiary}>{template.description}</Text>
                <View style={styles.priceTag}>
                  <Text variant="h3" weight="700" color={colors.accent}>
                    ¥{template.price}
                  </Text>
                </View>
              </View>

              <ColorSelector
                colors={template.colors}
                selected={selectedColor}
                onSelect={setSelectedColor}
              />

              <SizeSelector
                sizes={template.sizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
              />

              <View style={styles.bottomAction}>
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onPress={handleConfirmDesign}
                >
                  确认设计
                </Button>
              </View>
            </>
          )}

          {currentStep === 5 && (
            <>
              <View style={styles.orderDesignRow}>
                <View style={styles.designThumb}>
                  <ProductPreview
                    template={template}
                    selectedColor={selectedColor}
                    designImageUrl={designImageUrl}
                    designPosition={{ x: 0, y: 0 }}
                    designScale={1}
                    designRotation={0}
                    style={styles.designThumbPreview}
                  />
                </View>
                <View style={styles.designInfo}>
                  <Text variant="h3" weight="600">{template.name}</Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {designName} · {selectedColor.name}
                  </Text>
                  <Text variant="body2" weight="700" color={colors.accent}>
                    ¥{template.price}
                  </Text>
                </View>
              </View>

              <SizeSelector
                sizes={template.sizes}
                selected={selectedSize}
                onSelect={setSelectedSize}
              />

              <QuantitySelector quantity={quantity} onChange={setQuantity} />

              <AddressSelector
                addresses={MOCK_ADDRESSES}
                selected={selectedAddress}
                onSelect={setSelectedAddress}
              />

              <PriceBreakdown
                unitPrice={template.price}
                quantity={quantity}
                shippingFee={template.shippingFee}
              />

              <View style={styles.bottomAction}>
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={createOrderMutation.isPending}
                  onPress={handleSubmitOrder}
                >
                  提交订单
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  previewSection: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.lg,
  },
  productInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  productName: {
    marginBottom: 0,
  },
  priceTag: {
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  colorDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sizeChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  sizeChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    minWidth: 40,
    textAlign: 'center',
  },
  addressCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  addressCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#FFF5F7',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addressDetail: {
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dividerTop: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  orderDesignRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  designThumb: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  designThumbPreview: {
    paddingVertical: 0,
  },
  designInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  bottomAction: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
});
