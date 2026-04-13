import { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';

const categoryOptions = [
  { label: '风格', value: 'style' },
  { label: '场合', value: 'occasion' },
  { label: '体型', value: 'body_type' },
  { label: '颜色', value: 'color' },
  { label: '其他', value: 'other' },
];

interface TagFormValues {
  name: string;
  category: string;
}

interface TagFormModalProps {
  open: boolean;
  initialValues?: TagFormValues;
  onOk: (values: TagFormValues) => void;
  onCancel: () => void;
}

const TagFormModal: React.FC<TagFormModalProps> = ({ open, initialValues, onOk, onCancel }) => {
  const [form] = Form.useForm<TagFormValues>();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onOk(values);
  };

  return (
    <Modal
      title={initialValues ? '编辑标签' : '新增标签'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="标签名"
          rules={[{ required: true, message: '请输入标签名' }]}
        >
          <Input placeholder="请输入标签名" maxLength={30} />
        </Form.Item>
        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select placeholder="请选择分类" options={categoryOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TagFormModal;
