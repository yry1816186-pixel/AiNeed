import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../shared/contexts/ThemeContext';

interface AreaValue {
  province?: string;
  city?: string;
  district?: string;
}

interface AreaCascadingPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (area: { province: string; city: string; district: string }) => void;
  initialValue?: AreaValue;
}

const PROVINCES = [
  '北京市', '上海市', '广东省', '浙江省', '江苏省',
  '四川省', '湖北省', '湖南省', '福建省', '山东省',
  '河南省', '河北省', '安徽省', '陕西省', '重庆市',
  '天津市', '辽宁省', '吉林省', '黑龙江省', '江西省',
  '山西省', '贵州省', '云南省', '甘肃省', '广西壮族自治区',
  '海南省', '内蒙古自治区', '宁夏回族自治区', '新疆维吾尔自治区', '西藏自治区',
];

const CITIES: Record<string, string[]> = {
  '北京市': ['北京市'],
  '上海市': ['上海市'],
  '广东省': ['广州市', '深圳市', '东莞市', '佛山市', '珠海市', '中山市', '惠州市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '绍兴市', '金华市'],
  '江苏省': ['南京市', '苏州市', '无锡市', '常州市', '南通市', '扬州市'],
  '四川省': ['成都市', '绵阳市', '德阳市', '宜宾市'],
  '湖北省': ['武汉市', '宜昌市', '襄阳市'],
  '湖南省': ['长沙市', '株洲市', '湘潭市'],
  '福建省': ['福州市', '厦门市', '泉州市'],
  '山东省': ['济南市', '青岛市', '烟台市', '潍坊市'],
  '河南省': ['郑州市', '洛阳市', '开封市'],
  '河北省': ['石家庄市', '保定市', '唐山市'],
  '安徽省': ['合肥市', '芜湖市', '蚌埠市'],
  '陕西省': ['西安市', '咸阳市', '宝鸡市'],
  '重庆市': ['重庆市'],
  '天津市': ['天津市'],
  '辽宁省': ['沈阳市', '大连市', '鞍山市'],
  '吉林省': ['长春市', '吉林市'],
  '黑龙江省': ['哈尔滨市', '齐齐哈尔市'],
  '江西省': ['南昌市', '九江市', '赣州市'],
  '山西省': ['太原市', '大同市'],
  '贵州省': ['贵阳市', '遵义市'],
  '云南省': ['昆明市', '大理市'],
  '甘肃省': ['兰州市'],
  '广西壮族自治区': ['南宁市', '桂林市', '柳州市'],
  '海南省': ['海口市', '三亚市'],
  '内蒙古自治区': ['呼和浩特市', '包头市'],
  '宁夏回族自治区': ['银川市'],
  '新疆维吾尔自治区': ['乌鲁木齐市'],
  '西藏自治区': ['拉萨市'],
};

const DISTRICTS: Record<string, string[]> = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '顺义区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区'],
  '广州市': ['天河区', '越秀区', '荔湾区', '海珠区', '白云区', '番禺区', '花都区'],
  '深圳市': ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '龙华区', '坪山区'],
  '杭州市': ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '余杭区'],
  '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区'],
  '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '高新区'],
  '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '洪山区'],
};

function getDistricts(city: string): string[] {
  return DISTRICTS[city] ?? ['请选择'];
}

type Step = 'province' | 'city' | 'district';

export const AreaCascadingPicker: React.FC<AreaCascadingPickerProps> = ({
  visible,
  onClose,
  onSelect,
  initialValue,
}) => {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('province');
  const [province, setProvince] = useState(initialValue?.province ?? '');
  const [city, setCity] = useState(initialValue?.city ?? '');

  const handleSelectProvince = useCallback((p: string) => {
    setProvince(p);
    setCity('');
    setStep('city');
  }, []);

  const handleSelectCity = useCallback((c: string) => {
    setCity(c);
    setStep('district');
  }, []);

  const handleSelectDistrict = useCallback((d: string) => {
    onSelect({ province, city, district: d });
    setStep('province');
    onClose();
  }, [province, city, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setStep('province');
    onClose();
  }, [onClose]);

  const currentData =
    step === 'province'
      ? PROVINCES
      : step === 'city'
        ? CITIES[province] ?? []
        : getDistricts(city);

  const title =
    step === 'province' ? '选择省份' : step === 'city' ? '选择城市' : '选择区县';

  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <TouchableOpacity
        style={styles.item}
        onPress={() => {
          if (step === 'province') handleSelectProvince(item);
          else if (step === 'city') handleSelectCity(item);
          else handleSelectDistrict(item);
        }}
      >
        <Text style={[styles.itemText, { color: colors.textPrimary }]}>{item}</Text>
      </TouchableOpacity>
    ),
    [step, colors.textPrimary, handleSelectProvince, handleSelectCity, handleSelectDistrict]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[styles.closeText, { color: colors.textTertiary }]}>关闭</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={currentData}
            keyExtractor={(item) => item}
            renderItem={renderItem}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeText: {
    fontSize: 14,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemText: {
    fontSize: 15,
  },
});
