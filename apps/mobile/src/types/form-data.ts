/**
 * FormData 文件上传类型定义
 * 用于 React Native FormData 文件上传
 */

export interface FormDataFile {
  uri: string;
  name: string;
  type: string;
}

export interface FormDataValue {
  uri: string;
  name: string;
  type: string;
}
