"""
Xuno AI 一键初始化脚本
python ml/scripts/setup.py --all
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()
ML_ROOT = PROJECT_ROOT / "ml"
MODELS_ROOT = ML_ROOT / "models"
DATA_ROOT = ML_ROOT / "data"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"


def ok(msg):
    print(f"{GREEN}[OK]{RESET} {msg}")


def warn(msg):
    print(f"{YELLOW}[WARN]{RESET} {msg}")


def fail(msg):
    print(f"{RED}[FAIL]{RESET} {msg}")


def info(msg):
    print(f"{CYAN}[INFO]{RESET} {msg}")


def step(title):
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  {title}{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")


def check_environment():
    step("1/7 检查运行环境")
    py_ver = sys.version_info
    info(f"Python {py_ver.major}.{py_ver.minor}.{py_ver.micro}")

    try:
        import torch
        cuda_ok = torch.cuda.is_available()
        if cuda_ok:
            gpu = torch.cuda.get_device_properties(0)
            ok(f"CUDA 可用: {gpu.name} ({gpu.total_memory/1024**3:.1f}GB)")
        else:
            warn("CUDA 不可用，将使用 CPU 模式（推理会较慢）")
    except ImportError:
        fail("PyTorch 未安装")
        return False

    try:
        import transformers
        ok(f"Transformers {transformers.__version__}")
    except ImportError:
        fail("Transformers 未安装")
        return False

    try:
        result = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            ok("Docker 正在运行")
        else:
            warn("Docker 未运行 — 将跳过需要 Docker 的步骤（Qdrant/Redis）")
    except Exception:
        warn("Docker 未安装或未运行")

    try:
        import mediapipe as mp
        if hasattr(mp, 'solutions'):
            mp.solutions.pose.Pose(static_image_mode=True)
            ok("MediaPipe Pose 可用")
        else:
            warn("MediaPipe 无 solutions API，请安装 mediapipe==0.10.14")
    except Exception as e:
        warn(f"MediaPipe 不可用: {e}")

    return True


def verify_models():
    step("2/7 验证模型权重")
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

    clip_path = MODELS_ROOT / "chinese-fashion-clip" / "best_model"
    if clip_path.exists() and (clip_path / "model.safetensors").exists():
        ok(f"ChineseFashionCLIP: {clip_path}")
    else:
        warn("ChineseFashionCLIP 权重不存在，需要先运行微调")

    fashionsiglip = clip_path / ".." / "fashionsiglip_finetuned"
    if fashionsiglip.exists():
        ok(f"FashionSigLIP (LoRA): {fashionsiglip}")
    else:
        info("FashionSigLIP LoRA 模型不存在（可选，不影响推理）")

    try:
        from sentence_transformers import CrossEncoder
        m = CrossEncoder("BAAI/bge-reranker-base")
        ok("BGE Reranker 已下载")
    except Exception as e:
        warn(f"BGE Reranker 下载失败: {e}")

    return True


def generate_data():
    step("3/7 生成数据文件")
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

    rules_dir = DATA_ROOT / "fashion_rules"
    rules_exist = rules_dir.exists() and len(list(rules_dir.glob("*.json"))) >= 5
    if rules_exist:
        ok(f"时尚规则已存在 ({len(list(rules_dir.glob('*.json')))} 个文件)")
    else:
        info("生成时尚规则...")
        try:
            subprocess.run(
                [sys.executable, str(ML_ROOT / "scripts" / "generate_fashion_rules.py")],
                check=True, cwd=str(PROJECT_ROOT)
            )
            ok("时尚规则生成完成")
        except Exception as e:
            warn(f"生成失败: {e}")

    coord_dir = DATA_ROOT / "coordination_training"
    coord_exist = coord_dir.exists() and (coord_dir / "train.json").exists()
    if coord_exist:
        ok("搭配训练数据已存在")
    else:
        info("生成搭配训练数据...")
        try:
            subprocess.run(
                [sys.executable, str(ML_ROOT / "scripts" / "generate_coordination_training_data.py")],
                check=True, cwd=str(PROJECT_ROOT)
            )
            ok("搭配训练数据生成完成")
        except Exception as e:
            warn(f"生成失败: {e}")

    finetune_dir = DATA_ROOT / "chinese_fashion"
    annotations_exist = finetune_dir.exists() and (finetune_dir / "annotations.json").exists()
    if annotations_exist:
        ok(f"微调数据已存在")
    else:
        info("生成微调数据 (mock 模式，5000 条)...")
        try:
            subprocess.run(
                [sys.executable, str(ML_ROOT / "scripts" / "prepare_finetune_data.py"),
                 "--mode", "mock", "--num-samples", "5000"],
                check=True, cwd=str(PROJECT_ROOT)
            )
            ok("微调数据生成完成")
        except Exception as e:
            warn(f"生成失败: {e}")

    return True


def verify_embedding():
    step("4/7 验证嵌入模型加载（GPU）")
    sys.path.insert(0, str(PROJECT_ROOT))
    try:
        from ml.services.rag.embeddings import EmbeddingService
        svc = EmbeddingService()
        dim = svc.dimension
        device = svc.config.device
        r = svc.encode_query("面试穿什么")
        ok(f"嵌入模型加载成功: dim={dim}, device={device}")
        ok(f"测试查询 '面试穿什么' 生成 {len(r)} 维向量")
    except Exception as e:
        fail(f"嵌入模型加载失败: {e}")
        return False
    return True


def check_docker_services():
    step("5/7 检查 Docker 基础设施")
    try:
        result = subprocess.run(["docker", "ps", "--format", "{{.Names}}"],
                                capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            warn("Docker 不可用，跳过")
            return False

        names = result.stdout.strip().split("\n")
        has_qdrant = any("qdrant" in n for n in names)
        has_redis = any("redis" in n for n in names)

        if has_qdrant:
            ok("Qdrant 正在运行")
        else:
            warn("Qdrant 未运行，运行: docker compose -f docker-compose.dev.yml up -d qdrant redis")

        if has_redis:
            ok("Redis 正在运行")
        else:
            warn("Redis 未运行")
        return has_qdrant and has_redis
    except Exception as e:
        warn(f"Docker 检查失败: {e}")
        return False


def seed_qdrant():
    step("6/7 灌入 Qdrant 种子数据")
    try:
        from qdrant_client import QdrantClient
        client = QdrantClient(host="localhost", port=6333)
        collections = client.get_collections().collections
        info(f"Qdrant 现有 collections: {[c.name for c in collections]}")

        subprocess.run(
            [sys.executable, str(ML_ROOT / "scripts" / "seed_qdrant.py")],
            check=True, cwd=str(PROJECT_ROOT)
        )
        ok("Qdrant 种子数据灌入完成")
        return True
    except Exception as e:
        warn(f"灌入失败（可能 Qdrant 未运行）: {e}")
        return False


def verify_e2e():
    step("7/7 端到端验证")
    sys.path.insert(0, str(PROJECT_ROOT))

    results = {}

    try:
        from ml.services.rag.embeddings import EmbeddingService
        from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig
        import numpy as np

        svc = EmbeddingService()
        dim = svc.dimension
        config = QdrantConfig(embedding_dim=dim)
        store = QdrantVectorStore(config=config)

        query_vec = svc.encode_query("面试正装推荐")
        hits = store.search(query_vec, top_k=3)
        if hits:
            ok(f"向量检索: 查询 '面试正装推荐' 返回 {len(hits)} 条结果")
            for h in hits:
                print(f"    {h['metadata'].get('name', 'N/A')} (score={h['score']:.4f})")
            results["vector_search"] = True
        else:
            warn("向量检索无结果（可能 Qdrant 未灌数据）")
            results["vector_search"] = False
    except Exception as e:
        warn(f"向量检索验证跳过: {e}")
        results["vector_search"] = False

    results["embedding_model"] = True
    results["embedding_dim"] = dim
    results["embedding_device"] = svc.config.device

    try:
        from ml.config.paths import check_model_availability, check_dataset_availability
        models_ok = check_model_availability()
        datasets_ok = check_dataset_availability()
        results["models"] = models_ok
        results["datasets"] = datasets_ok
    except Exception:
        pass

    print(f"\n{BOLD}===== 验证摘要 ====={RESET}")
    for k, v in results.items():
        if isinstance(v, bool):
            status = f"{GREEN}✓{RESET}" if v else f"{RED}✗{RESET}"
            print(f"  {status} {k}")
        elif isinstance(v, dict):
            print(f"  {CYAN}→{RESET} {k}: {json.dumps(v, indent=4, ensure_ascii=False)}")
        else:
            print(f"  {CYAN}→{RESET} {k}: {v}")

    return all(v for v in results.values() if isinstance(v, bool))


def main():
    parser = argparse.ArgumentParser(description="Xuno AI 环境初始化")
    parser.add_argument("--all", action="store_true", default=True, help="执行全部步骤")
    parser.add_argument("--skip-docker", action="store_true", help="跳过 Docker 相关步骤")
    parser.add_argument("--skip-data", action="store_true", help="跳过数据生成")
    parser.add_argument("--skip-models", action="store_true", help="跳过模型下载")
    args = parser.parse_args()

    print(f"{BOLD}{CYAN}")
    print("  ╔══════════════════════════════════════╗")
    print("  ║   寻裳 Xuno AI 环境初始化           ║")
    print("  ╚══════════════════════════════════════╝")
    print(f"{RESET}")

    success = True

    if not check_environment():
        fail("环境检查失败，请修复后重试")
        sys.exit(1)

    if not args.skip_models:
        verify_models()

    if not args.skip_data:
        generate_data()

    verify_embedding()

    if not args.skip_docker:
        docker_ok = check_docker_services()
        if docker_ok:
            seed_qdrant()

    if not args.skip_docker:
        verify_e2e()
    else:
        info("跳过 E2E 验证（Docker 相关）")

    print(f"\n{BOLD}{GREEN}初始化完成！{RESET}")
    print(f"运行 AI 服务: cd {PROJECT_ROOT} && uvicorn ml.api.main:app --host 0.0.0.0 --port 8002")


if __name__ == "__main__":
    main()
