import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, NavigationProp } from "@react-navigation/native";
import { useConsultantStore } from '../../../stores/consultantStore';
import { CalendarGrid } from '../../../components/consultant/CalendarGrid';
import { TimeSlotItem } from '../../../components/consultant/TimeSlotItem';
import { ServiceTypeChip } from '../../../components/consultant/ServiceTypeChip';
import type { ServiceType } from '../../../types/consultant';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


type TimeSlot = { startTime: string; endTime: string };

const SERVICE_TYPES = [
  { label: "整体形象改造", value: "styling_consultation" },
  { label: "特定场合造型", value: "special_event" },
  { label: "色彩诊断", value: "color_analysis" },
  { label: "日常搭配", value: "wardrobe_audit" },
];

export const BookingScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<Record<string, unknown>>>();
  const { availableSlots, fetchAvailableSlots, createBooking, isLoading } = useConsultantStore();

  const { consultantId, consultant } = route.params || {};

  const [selectedServiceType, setSelectedServiceType] =
    useState<ServiceType>("styling_consultation");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [notes, setNotes] = useState("");

  const price = consultant?.basePrice || 299;
  const depositAmount = Math.round(price * 0.3 * 100) / 100;
  const finalPaymentAmount = Math.round(price * 0.7 * 100) / 100;

  // Generate next 14 available dates
  const availableDates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    availableDates.push(`${d.getFullYear()}-${month}-${day}`);
  }

  useEffect(() => {
    if (consultantId && selectedDate) {
      void fetchAvailableSlots(consultantId, selectedDate);
    }
  }, [consultantId, selectedDate, fetchAvailableSlots]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert("提示", "请选择日期和时段");
      return;
    }

    try {
      const scheduledAt = `${selectedDate}T${selectedSlot.startTime}:00`;
      await createBooking({
        consultantId,
        serviceType: selectedServiceType,
        scheduledAt,
        durationMinutes: 60,
        notes,
        price,
      });
      Alert.alert("预约成功", "请支付定金以确认预约", [
        { text: "确定", onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      Alert.alert("预约失败", e.message || "请稍后重试");
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>预约服务</Text>
        <View style={{ width: DesignTokens.spacing[11] }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Service Type Selector */}
        <Text style={styles.sectionLabel}>选择服务类型</Text>
        <View style={styles.chipRow}>
          {SERVICE_TYPES.map((type) => (
            <ServiceTypeChip
              key={type.value}
              label={type.label}
              selected={selectedServiceType === type.value}
              onPress={() => setSelectedServiceType(type.value as ServiceType)}
            />
          ))}
        </View>

        {/* Calendar */}
        <Text style={styles.sectionLabel}>选择日期</Text>
        <CalendarGrid
          selectedDate={selectedDate}
          availableDates={availableDates}
          onDateSelect={setSelectedDate}
        />

        {/* Time Slots */}
        {selectedDate && (
          <>
            <Text style={styles.sectionLabel}>选择时段</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>该日期暂无可用时段</Text>
            ) : (
              availableSlots.map((slot: TimeSlot, _idx: number) => (
                <TimeSlotItem
                  key={`${slot.startTime}-${slot.endTime}`}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  isAvailable={slot.isAvailable}
                  isSelected={
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.endTime === slot.endTime
                  }
                  onSelect={() => setSelectedSlot(slot)}
                />
              ))
            )}
          </>
        )}

        {/* Notes */}
        <Text style={styles.sectionLabel}>备注（可选）</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="对顾问有什么特殊要求..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* Price Summary */}
        <View style={styles.priceSummary}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>服务费</Text>
            <Text style={styles.priceValue}>{price} 元</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>定金 (30%)</Text>
            <Text style={styles.priceValue}>{depositAmount} 元</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>尾款 (70%)</Text>
            <Text style={styles.priceValue}>{finalPaymentAmount} 元</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={styles.bottomCta}>
        <TouchableOpacity
          style={[styles.payButton, (!selectedDate || !selectedSlot) && styles.payButtonDisabled]}
          onPress={handleBooking}
          disabled={!selectedDate || !selectedSlot}
        >
          <Text style={styles.payButtonText}>支付定金 {depositAmount} 元</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.sm},
  backBtnText: { fontSize: DesignTokens.typography.sizes.xl, color: colors.textPrimary },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.textPrimary },
  content: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  sectionLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: DesignTokens.spacing[5],
    marginBottom: DesignTokens.spacing['2.5'],
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  noSlotsText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, paddingVertical: DesignTokens.spacing[3]},
  notesInput: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
    fontSize: DesignTokens.typography.sizes.base,
    minHeight: 60,
    textAlignVertical: "top",
  },
  priceSummary: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: DesignTokens.spacing['1.5'],
  },
  priceLabel: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  priceValue: { fontSize: DesignTokens.typography.sizes.base, color: colors.textPrimary, fontWeight: "500" },
  bottomCta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[100],
    backgroundColor: colors.surface,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonDisabled: { backgroundColor: colors.primaryLight },
  payButtonText: { color: colors.textInverse, fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600" },
}))

export default BookingScreen;
