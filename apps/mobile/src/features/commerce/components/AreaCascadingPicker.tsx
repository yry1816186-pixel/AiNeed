import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { flatColors as colors } from '../../../design-system/theme';

const REGION_DATA: Record<string, Record<string, string[]>> = {
  "北京市": {
    "北京市": ["东城区", "西城区", "朝阳区", "海淀区", "丰台区", "石景山区"],
  },
  "上海市": {
    "上海市": ["黄浦区", "徐汇区", "长宁区", "静安区", "普陀区", "虹口区"],
  },
  "广东省": {
    "广州市": ["天河区", "越秀区", "荔湾区", "海珠区", "番禺区"],
    "深圳市": ["福田区", "罗湖区", "南山区", "宝安区", "龙岗区"],
    "东莞市": ["莞城区", "南城区", "东城区", "万江区"],
  },
  "浙江省": {
    "杭州市": ["上城区", "下城区", "江干区", "拱墅区", "西湖区"],
    "宁波市": ["海曙区", "江北区", "北仑区", "镇海区"],
    "温州市": ["鹿城区", "龙湾区", "瓯海区"],
  },
  "江苏省": {
    "南京市": ["玄武区", "秦淮区", "建邺区", "鼓楼区", "浦口区"],
    "苏州市": ["姑苏区", "虎丘区", "吴中区", "相城区"],
    "无锡市": ["锡山区", "惠山区", "滨湖区", "梁溪区"],
  },
  "四川省": {
    "成都市": ["锦江区", "青羊区", "金牛区", "武侯区", "成华区"],
    "绵阳市": ["涪城区", "游仙区", "安州区"],
  },
  "湖北省": {
    "武汉市": ["江岸区", "江汉区", "硚口区", "汉阳区", "武昌区"],
    "宜昌市": ["西陵区", "伍家岗区", "点军区"],
  },
  "湖南省": {
    "长沙市": ["芙蓉区", "天心区", "岳麓区", "开福区", "雨花区"],
    "株洲市": ["天元区", "荷塘区", "芦淞区"],
  },
};

const PROVINCES = Object.keys(REGION_DATA);

interface AreaSelection {
  province: string;
  city: string;
  district: string;
}

interface AreaCascadingPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (area: AreaSelection) => void;
  initialValue?: { province?: string; city?: string; district?: string };
}

export const AreaCascadingPicker: React.FC<AreaCascadingPickerProps> = ({
  visible,
  onClose,
  onSelect,
  initialValue,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [selectedProvince, setSelectedProvince] = useState(
    initialValue?.province ?? PROVINCES[0]
  );
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    if (visible) {
      const province = initialValue?.province ?? PROVINCES[0];
      setSelectedProvince(province);
      const cities = Object.keys(REGION_DATA[province] ?? {});
      const city = initialValue?.city && cities.includes(initialValue.city)
        ? initialValue.city
        : cities[0] ?? "";
      setSelectedCity(city);
      if (city) {
        const districts = REGION_DATA[province]?.[city] ?? [];
        const district =
          initialValue?.district && districts.includes(initialValue.district)
            ? initialValue.district
            : districts[0] ?? "";
        setSelectedDistrict(district);
      } else {
        setSelectedDistrict("");
      }
    }
  }, [visible, initialValue]);

  const cities = useMemo(
    () => Object.keys(REGION_DATA[selectedProvince] ?? {}),
    [selectedProvince]
  );

  const districts = useMemo(
    () => REGION_DATA[selectedProvince]?.[selectedCity] ?? [],
    [selectedProvince, selectedCity]
  );

  const handleProvinceChange = useCallback((province: string) => {
    setSelectedProvince(province);
    const newCities = Object.keys(REGION_DATA[province] ?? {});
    const firstCity = newCities[0] ?? "";
    setSelectedCity(firstCity);
    if (firstCity) {
      const newDistricts = REGION_DATA[province]?.[firstCity] ?? [];
      setSelectedDistrict(newDistricts[0] ?? "");
    } else {
      setSelectedDistrict("");
    }
  }, []);

  const handleCityChange = useCallback(
    (city: string) => {
      setSelectedCity(city);
      const newDistricts = REGION_DATA[selectedProvince]?.[city] ?? [];
      setSelectedDistrict(newDistricts[0] ?? "");
    },
    [selectedProvince]
  );

  const handleConfirm = useCallback(() => {
    if (selectedProvince && selectedCity && selectedDistrict) {
      onSelect({
        province: selectedProvince,
        city: selectedCity,
        district: selectedDistrict,
      });
      onClose();
    }
  }, [selectedProvince, selectedCity, selectedDistrict, onSelect, onClose]);

  const renderColumnItem = useCallback(
    (
      item: string,
      isSelected: boolean,
      onPress: () => void
    ) => (
      <TouchableOpacity
        style={[styles.columnItem, isSelected && styles.columnItemActive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.columnItemText, isSelected && styles.columnItemTextActive]}
          numberOfLines={1}
        >
          {item}
        </Text>
      </TouchableOpacity>
    ),
    []
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="关闭"
          >
            <Ionicons
              name="close"
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>选择地区</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.columnsContainer}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>省份</Text>
            <FlatList
              data={PROVINCES}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderColumnItem(item, item === selectedProvince, () =>
                  handleProvinceChange(item)
                )
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnListContent}
            />
          </View>

          <View style={styles.columnSeparator} />

          <View style={styles.column}>
            <Text style={styles.columnTitle}>城市</Text>
            <FlatList
              data={cities}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderColumnItem(item, item === selectedCity, () =>
                  handleCityChange(item)
                )
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnListContent}
              ListEmptyComponent={
                <Text style={styles.emptyHint}>请先选择省份</Text>
              }
            />
          </View>

          <View style={styles.columnSeparator} />

          <View style={styles.column}>
            <Text style={styles.columnTitle}>区县</Text>
            <FlatList
              data={districts}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderColumnItem(item, item === selectedDistrict, () =>
                  setSelectedDistrict(item)
                )
              }
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.columnListContent}
              ListEmptyComponent={
                <Text style={styles.emptyHint}>请先选择城市</Text>
              }
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={!selectedProvince || !selectedCity || !selectedDistrict}
          accessibilityLabel="确认选择"
        >
          <Text style={styles.confirmButtonText}>确认</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  modalTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: DesignTokens.spacing[10],
  },
  columnsContainer: {
    flex: 1,
    flexDirection: "row",
  },
  column: {
    flex: 1,
  },
  columnSeparator: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  columnTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: colors.textTertiary,
    textAlign: "center",
    paddingVertical: DesignTokens.spacing[2],
    backgroundColor: colors.backgroundTertiary,
  },
  columnListContent: {
    paddingVertical: DesignTokens.spacing[1],
  },
  columnItem: {
    paddingVertical: DesignTokens.spacing[3],
    paddingHorizontal: DesignTokens.spacing[3],
    backgroundColor: colors.surface,
  },
  columnItemActive: {
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  columnItemText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
  columnItemTextActive: {
    color: colors.primary,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
  },
  emptyHint: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: DesignTokens.spacing[6],
  },
  confirmButton: {
    marginHorizontal: DesignTokens.spacing[5],
    marginVertical: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[4],
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: DesignTokens.typography.fontWeights.semibold,
    color: colors.surface,
  },
}))
