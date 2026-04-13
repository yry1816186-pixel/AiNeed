import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Button,
  Space,
  Card,
  Image,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { styleQuizApi } from '@/services/styleQuiz';
import type { QuizQuestion, CreateQuestionDto, UpdateQuestionDto } from '@/services/styleQuiz';

const categoryOptions = [
  { label: '风格偏好', value: 'style' },
  { label: '色彩倾向', value: 'color' },
  { label: '场景适配', value: 'scene' },
  { label: '体型认知', value: 'body' },
  { label: '预算偏好', value: 'budget' },
];

interface QuestionFormModalProps {
  visible: boolean;
  editingQuestion: QuizQuestion | null;
  onClose: (refresh?: boolean) => void;
}

interface WeightItem {
  key: string;
  value: number;
}

interface AnswerFormValues {
  answerText: string;
  order: number;
  weights: WeightItem[];
}

interface FormValues {
  category: string;
  questionText: string;
  order: number;
  imageUrl?: string;
  answers: AnswerFormValues[];
}

const styleKeys = [
  'elegant', 'casual', 'sporty', 'romantic', 'minimalist',
  'streetwear', 'bohemian', 'classic', 'trendy', 'avant_garde',
];

export default function QuestionFormModal({ visible, editingQuestion, onClose }: QuestionFormModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const isEdit = !!editingQuestion;

  useEffect(() => {
    if (!visible) return;
    if (editingQuestion) {
      const answers: AnswerFormValues[] = editingQuestion.answers.map((a) => ({
        answerText: a.answerText,
        order: a.order,
        weights: Object.entries(a.weight).map(([key, value]) => ({ key, value })),
      }));
      form.setFieldsValue({
        category: editingQuestion.category,
        questionText: editingQuestion.questionText,
        order: editingQuestion.order,
        answers,
      });
      setImageUrl(editingQuestion.imageUrl);
      if (editingQuestion.imageUrl) {
        setFileList([{ uid: '-1', name: 'image', status: 'done', url: editingQuestion.imageUrl }]);
      }
    } else {
      form.resetFields();
      setImageUrl(null);
      setFileList([]);
    }
  }, [visible, editingQuestion, form]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await styleQuizApi.uploadImage(file);
      setImageUrl(res.url);
      setFileList([{ uid: Date.now().toString(), name: file.name, status: 'done', url: res.url }]);
      message.success('上传成功');
    } catch {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const answers = values.answers.map((a, index) => ({
        answerText: a.answerText,
        order: a.order ?? index + 1,
        weight: a.weights.reduce<Record<string, number>>((acc, w) => {
          if (w.key && w.value !== undefined) {
            acc[w.key] = w.value;
          }
          return acc;
        }, {}),
      }));

      const payload: CreateQuestionDto = {
        category: values.category,
        questionText: values.questionText,
        order: values.order,
        imageUrl: imageUrl || undefined,
        answers,
      };

      if (isEdit && editingQuestion) {
        const updatePayload: UpdateQuestionDto = {
          ...payload,
          isActive: editingQuestion.isActive,
        };
        await styleQuizApi.updateQuestion(editingQuestion.id, updatePayload);
        message.success('更新成功');
      } else {
        await styleQuizApi.createQuestion(payload);
        message.success('创建成功');
      }

      onClose(true);
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error(isEdit ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑题目' : '新增题目'}
      width={720}
      open={visible}
      onCancel={() => onClose()}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ category: 'style', order: 1, answers: [{ answerText: '', order: 1, weights: [] }] }}
      >
        <Form.Item label="分类" name="category" rules={[{ required: true, message: '请选择分类' }]}>
          <Select options={categoryOptions} />
        </Form.Item>

        <Form.Item label="题目文本" name="questionText" rules={[{ required: true, message: '请输入题目文本' }]}>
          <Input.TextArea rows={3} placeholder="请输入题目内容" />
        </Form.Item>

        <Form.Item label="题目图片">
          <Upload
            fileList={fileList}
            beforeUpload={(file) => {
              handleUpload(file);
              return false;
            }}
            onRemove={() => {
              setImageUrl(null);
              setFileList([]);
            }}
            maxCount={1}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              上传图片
            </Button>
          </Upload>
          {imageUrl && (
            <Image src={imageUrl} width={120} style={{ marginTop: 8, borderRadius: 4 }} />
          )}
        </Form.Item>

        <Form.Item label="排序号" name="order" rules={[{ required: true, message: '请输入排序号' }]}>
          <InputNumber min={1} style={{ width: 160 }} />
        </Form.Item>

        <Form.List name="answers">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ marginBottom: 12 }}
                  title={`答案 ${name + 1}`}
                  extra={
                    fields.length > 1 && (
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      >
                        删除
                      </Button>
                    )
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item
                      {...restField}
                      label="答案文本"
                      name={[name, 'answerText']}
                      rules={[{ required: true, message: '请输入答案文本' }]}
                    >
                      <Input placeholder="请输入答案文本" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      label="排序"
                      name={[name, 'order']}
                    >
                      <InputNumber min={1} style={{ width: 120 }} />
                    </Form.Item>

                    <Form.List name={[name, 'weights']}>
                      {(weightFields, { add: addWeight, remove: removeWeight }) => (
                        <div>
                          <div style={{ marginBottom: 8, fontWeight: 500 }}>权重配置</div>
                          {weightFields.map((wf) => (
                            <Space key={wf.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                              <Form.Item
                                {...wf}
                                name={[wf.name, 'key']}
                                rules={[{ required: true, message: '请选择风格' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Select
                                  style={{ width: 140 }}
                                  placeholder="风格维度"
                                  options={styleKeys.map((k) => ({ label: k, value: k }))}
                                />
                              </Form.Item>
                              <Form.Item
                                {...wf}
                                name={[wf.name, 'value']}
                                rules={[{ required: true, message: '请输入权重' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber min={0} max={10} placeholder="权重值" style={{ width: 100 }} />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => removeWeight(wf.name)} />
                            </Space>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => addWeight()}
                            icon={<PlusOutlined />}
                            size="small"
                          >
                            添加权重
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </Space>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ answerText: '', order: fields.length + 1, weights: [] })}
                icon={<PlusOutlined />}
                block
              >
                添加答案
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
