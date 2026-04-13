import React from 'react';
import { Tabs } from 'antd';
import PostList from './PostList';
import ReportList from './ReportList';
import TagList from './TagList';

const CommunityManage: React.FC = () => {
  return (
    <Tabs
      defaultActiveKey="posts"
      items={[
        {
          key: 'posts',
          label: '帖子管理',
          children: <PostList />,
        },
        {
          key: 'reports',
          label: '举报处理',
          children: <ReportList />,
        },
        {
          key: 'tags',
          label: '标签管理',
          children: <TagList />,
        },
      ]}
    />
  );
};

export default CommunityManage;
