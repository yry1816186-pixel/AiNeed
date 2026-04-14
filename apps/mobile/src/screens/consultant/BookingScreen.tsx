import React, { useCallback, useEffect, useState } from "react";
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
import { useRoute, useNavigation } from "@react-navigation/native";
import { useConsultantStore } from "../../stores/consultantStore";
import { CalendarGrid } from "../../components/consultant/CalendarGrid";
import { TimeSlotItem } from "../../components/consultant/TimeSlotItem";
import { ServiceTypeChip } from "../../components/consultant/ServiceTypeChip";

const SERVICE_TYPES = [
  { label: "整体形象改造", value: "styling_consultation" },
  { label: "特定场合造型", value: "special_event" },
  { label: "色彩诊断", value: "color_analysis" },
  { label: "日常搭配", value: "wardrobe_audit" },
];

export const BookingScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { availableSlots, fetchAvailableSlots, createBooking, isLoading } =
    useConsultantStore();

  const { consultantId, consultant } = route.params || {};

  const [selectedServiceType, setSelectedServiceType] = useState("styling_consultation");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
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
      fetchAvailableSlots(consultantId, selectedDate);
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
    } catch (e: any) {
      Alert.alert("预约失败", e.message || "请稍后重试");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>预约服务</Text>
        <View style={{ width: 44 }} />
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
              onPress={() => setSelectedServiceType(type.value)}
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
              <ActivityIndicator size="small" color="#C67B5C" />
            ) : availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>该日期暂无可用时段</Text>
            ) : (
              availableSlots.map((slot: any, idx: number) => (
                <TimeSlotItem
                  key={idx}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  isAvailable={slot.isAvailable}
                  isSelected={selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime}
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
          <Text style={styles.payButtonText}>
            支付定金 {depositAmount} 元
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 20, color: "#333" },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A" },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  noSlotsText: { fontSize: 14, color: "#999", paddingVertical: 12 },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  priceSummary: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FAFAF8",
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  priceLabel: { fontSize: 14, color: "#666" },
  priceValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  bottomCta: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  payButton: {
    backgroundColor: "#C67B5C",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonDisabled: { backgroundColor: "#D4B5A5" },
  payButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
});

export default BookingScreen;
