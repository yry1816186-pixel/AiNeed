import { useState, useEffect } from 'react';
import { Drawer, Descriptions, Avatar, Tag, Image, Spin, Empty, List, Divider, message } from 'antd';
import { postApi, reportApi } from '@/services/community';
import type { Post, Report } from '@/services/community';
import dayjs from 'dayjs';

const statusMap: Record<Post['status'], { color: string; label: string }> = {
  published: { color: 'green', label: '已发布' },
  hidden: { color: 'default', label: '已隐藏' },
  reported: { color: 'red', label: '被举报' },
};

interface PostDetailDrawerProps {
  open: boolean;
  postId: string | null;
  onClose: () => void;
}

const PostDetailDrawer: React.FC<PostDetailDrawerProps> = ({ open, postId, onClose }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !postId) {
      setPost(null);
      setReports([]);
      return;
    }

    setLoading(true);
    Promise.all([
      postApi.getDetail(postId),
      reportApi.getList({ page: 1, pageSize: 50, status: undefined }),
    ])
      .then(([postRes, reportRes]) => {
        setPost(postRes);
        setReports(reportRes.items.filter((r) => r.postId === postId));
      })
      .catch(() => {
        message.error('获取帖子详情失败');
        setPost(null);
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, [open, postId]);

  return (
    <Drawer title="帖子详情" open={open} onClose={onClose} width={640} destroyOnClose>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : post ? (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="作者">
              <Avatar src={post.authorAvatar} size="small" style={{ marginRight: 8 }}>
                {post.authorNickname?.[0]}
              </Avatar>
              {post.authorNickname}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[post.status].color}>{statusMap[post.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发布时间">
              {dayjs(post.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">内容</Divider>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{post.content}</p>

          {post.images?.length > 0 && (
            <>
              <Divider orientation="left">图片</Divider>
              <Image.PreviewGroup>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {post.images.map((url, idx) => (
                    <Image
                      key={idx}
                      src={url}
                      width={120}
                      height={120}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </>
          )}

          {post.tags?.length > 0 && (
            <>
              <Divider orientation="left">标签</Divider>
              <div>{post.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
            </>
          )}

          <Divider orientation="left">互动数据</Divider>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="点赞">{post.likeCount}</Descriptions.Item>
            <Descriptions.Item label="评论">{post.commentCount}</Descriptions.Item>
            <Descriptions.Item label="举报">
              <span style={{ color: post.reportCount > 0 ? '#ff4d4f' : undefined, fontWeight: post.reportCount > 0 ? 600 : undefined }}>
                {post.reportCount}
              </span>
            </Descriptions.Item>
          </Descriptions>

          {reports.length > 0 && (
            <>
              <Divider orientation="left">举报详情</Divider>
              <List
                size="small"
                dataSource={reports}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${r.reporterNickname} - ${r.reason}`}
                      description={r.description || '无详细描述'}
                    />
                    <span style={{ color: '#999', fontSize: 12 }}>
                      {dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </List.Item>
                )}
              />
            </>
          )}
        </>
      ) : (
        <Empty description="未找到帖子信息" />
      )}
    </Drawer>
  );
};

export default PostDetailDrawer;
