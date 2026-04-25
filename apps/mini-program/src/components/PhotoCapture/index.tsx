import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

interface PhotoCaptureProps {
  onCapture: (tempFilePath: string) => void;
}

/** Camera/album photo capture button */
export default function PhotoCapture({ onCapture }: PhotoCaptureProps) {
  const handleChoose = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        if (res.tempFilePaths.length > 0) {
          onCapture(res.tempFilePaths[0]);
        }
      },
    });
  };

  return (
    <View className="photo-capture" onClick={handleChoose}>
      <View className="photo-capture__icon-wrap">
        <Text className="photo-capture__icon">{"📷"}</Text>
      </View>
      <Text className="photo-capture__label">拍一张 / 选一张</Text>
      <Text className="photo-capture__hint">拍照或从相册选取照片</Text>
    </View>
  );
}
