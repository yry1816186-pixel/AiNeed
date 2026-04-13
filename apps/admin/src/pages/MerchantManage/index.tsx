import React from 'react';
import { Tabs } from 'antd';
import MerchantList from './MerchantList';
import ProductList from './ProductList';

const MerchantManage: React.FC = () => {
  return (
    <Tabs
      defaultActiveKey="merchants"
      items={[
        {
          key: 'merchants',
          label: '商家管理',
          children: <MerchantList />,
        },
        {
          key: 'products',
          label: '商品管理',
          children: <ProductList />,
        },
      ]}
    />
  );
};

export default MerchantManage;
