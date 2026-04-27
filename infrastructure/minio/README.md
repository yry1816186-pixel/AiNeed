# MinIO 生命周期管理

## 生命周期策略

| 前缀      | 策略            | 说明               |
| --------- | --------------- | ------------------ |
| `temp/`   | 7 天后自动过期  | 临时文件，到期删除 |
| `photos/` | 90 天转低频存储 | 长期保存但减少成本 |

## 部署方式

### 方法一：手动执行脚本（推荐开发环境）

```bash
# 1. 安装 mc 客户端
brew install minio/stable/mc          # macOS
# 或从 https://min.io/download 下载

# 2. 配置别名
mc alias set xuno http://localhost:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# 3. 执行生命周期脚本
chmod +x minio-lifecycle.sh
./minio-lifecycle.sh
```

### 方法二：Docker Compose 初始化容器

在 `docker-compose.yml` 中添加初始化容器：

```yaml
minio-init:
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
    mc alias set xuno http://minio:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY;
    mc ilm rule add --expire-days 7 --prefix temp/ xuno/xuno;
    mc ilm rule add --transition-days 90 --transition-tier WARM --prefix photos/ xuno/xuno;
    echo 'MinIO lifecycle rules configured';
    exit 0;
    "
  networks:
    - ainetwork
```

## 验证

```bash
mc ilm rule list xuno/xuno
```
