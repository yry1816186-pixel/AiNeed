import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, type ImagePickerResponse } from 'react-native-image-picker';
import { theme } from '../../theme';
import apiClient from '../../services/api/client';

interface TryOnResult {
  id: string;
  personImage: string;
  clothingImage: string;
  resultImage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export const TryOnScreen: React.FC = () => {
  const navigation = useNavigation();
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const pickPersonImage = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('错误', response.errorMessage || '选择图片失败');
          return;
        }
        if (response.assets && response.assets[0]) {
          setPersonImage(response.assets[0].uri || null);
        }
      }
    );
  }, []);

  const pickClothingImage = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('错误', response.errorMessage || '选择图片失败');
          return;
        }
        if (response.assets && response.assets[0]) {
          setClothingImage(response.assets[0].uri || null);
        }
      }
    );
  }, []);

  const handleTryOn = useCallback(async () => {
    if (!personImage || !clothingImage) {
      Alert.alert('提示', '请先选择人物照片和服装图片');
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('personImage', {
        uri: personImage,
        type: 'image/jpeg',
        name: 'person.jpg',
      });
      formData.append('clothingImage', {
        uri: clothingImage,
        type: 'image/jpeg',
        name: 'clothing.jpg',
      });

      const response = await apiClient.upload<TryOnResult>('/try-on', formData);

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        Alert.alert('错误', response.error?.message || '虚拟试衣失败');
      }
    } catch (error) {
      Alert.alert('错误', '网络请求失败，请检查后端服务是否运行');
    } finally {
      setIsProcessing(false);
    }
  }, [personImage, clothingImage]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>虚拟试衣</Text>
      <Text style={styles.subtitle}>上传您的照片和服装图片，体验AI虚拟试衣</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. 选择人物照片</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickPersonImage}>
          {personImage ? (
            <Image source={{ uri: personImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>点击选择人物照片</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. 选择服装图片</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickClothingImage}>
          {clothingImage ? (
            <Image source={{ uri: clothingImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>点击选择服装图片</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, (!personImage || !clothingImage || isProcessing) && styles.buttonDisabled]}
        onPress={handleTryOn}
        disabled={!personImage || !clothingImage || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>开始试衣</Text>
        )}
      </TouchableOpacity>

      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>试衣结果</Text>
          {result.resultImage ? (
            <Image source={{ uri: result.resultImage }} style={styles.resultImage} />
          ) : (
            <View style={styles.processingPlaceholder}>
              <Text style={styles.placeholderText}>处理中...</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  imagePicker: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    height: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    marginTop: 16,
  },
  resultImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  processingPlaceholder: {
    height: 300,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TryOnScreen;
