#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AiNeed ML Services Unified Launcher (统一启动脚本)

一键启动所有AI/ML微服务，包括：
- CatVTON 虚拟试衣推理服务 (端口 8001)
- 可选: RAG 检索服务
- 环境变量自动配置
- 依赖健康检查
- GPU 资源验证

Author: AiNeed ML Team
Version: 2.0.0
Date: 2026-04-04

使用方法:
    # 启动 CatVTON 服务（默认）
    python start_all_services.py

    # 仅检查环境，不启动服务
    python start_all_services.py --check-only

    # 启动所有服务（含 RAG）
    python start_all_services.py --with-rag

    # 自定义端口
    python start_all_services.py --catvton-port 8001

    # 显示详细日志
    python start_all_services.py --verbose
"""

import os
import sys
import argparse
import subprocess
import time
import signal
import platform
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import json


# ============================================================================
# 颜色输出工具
# ============================================================================

class Colors:
    """终端颜色常量"""
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


def print_success(message: str):
    """打印成功消息"""
    print(f"{Colors.GREEN}✓{Colors.END} {message}")


def print_error(message: str):
    """打印错误消息"""
    print(f"{Colors.RED}✗{Colors.END} {message}")


def print_warning(message: str):
    """打印警告消息"""
    print(f"{Colors.YELLOW}⚠{Colors.END} {message}")


def print_info(message: str):
    """打印信息消息"""
    print(f"{Colors.BLUE}ℹ{Colors.END} {message}")


def print_header(message: str):
    """打印标题"""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{message}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'=' * 60}{Colors.END}\n")


def print_section(title: str):
    """打印分节标题"""
    print(f"\n{Colors.BOLD}▸ {title}{Colors.END}")


# ============================================================================
# 配置数据结构
# ============================================================================

@dataclass
class ServiceConfig:
    """服务配置"""
    name: str
    script_path: str
    port: int
    required_env_vars: List[str]
    optional_env_vars: Dict[str, str]
    description: str


@dataclass
class CheckResult:
    """检查结果"""
    success: bool
    message: str
    details: Optional[str] = None


# ============================================================================
# 环境检查器
# ============================================================================

class EnvironmentChecker:
    """环境检查器"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: List[CheckResult] = []
        self.ml_root = Path(__file__).parent.absolute()

    def check_all(self) -> bool:
        """执行所有环境检查"""
        print_header("AiNeed ML Services Environment Check")

        checks = [
            ("Python Version", self._check_python_version),
            ("Operating System", self._check_os),
            ("GPU Availability", self._check_gpu),
            ("PyTorch Installation", self._check_pytorch),
            ("CUDA Compatibility", self._check_cuda),
            ("Required Packages", self._check_packages),
            ("Environment Variables", self._check_env_vars),
            ("CatVTON Repository", self._check_catvton_repo),
            ("Disk Space", self._check_disk_space),
            ("Memory", self._check_memory),
            ("Port Availability", self._check_ports),
        ]

        for name, check_func in checks:
            result = check_func()
            self.results.append(result)
            if result.success:
                print_success(f"{name}: {result.message}")
                if result.details and self.verbose:
                    print(f"  {result.details}")
            else:
                print_error(f"{name}: {result.message}")
                if result.details:
                    print(f"  {result.details}")

        # 输出摘要
        failed = [r for r in self.results if not r.success]
        passed = len(self.results) - len(failed)

        print_section("Check Summary")
        print(f"  Total Checks: {len(self.results)}")
        print_success(f"  Passed: {passed}")
        if failed:
            print_error(f"  Failed: {len(failed)}")

        return len(failed) == 0

    def _check_python_version(self) -> CheckResult:
        """检查Python版本"""
        version = sys.version_info
        if version.major == 3 and version.minor >= 8:
            return CheckResult(
                success=True,
                message=f"Python {version.major}.{version.minor}.{version.micro}",
                details=f"Full version: {sys.version}"
            )
        else:
            return CheckResult(
                success=False,
                message=f"Python {version.major}.{version.minor} (requires >= 3.8)",
                details="Please upgrade Python to 3.8 or later"
            )

    def _check_os(self) -> CheckResult:
        """检查操作系统"""
        system = platform.system()
        release = platform.release()
        return CheckResult(
            success=True,
            message=f"{system} {release}",
            details=platform.platform()
        )

    def _check_gpu(self) -> CheckResult:
        """检查GPU可用性"""
        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
                return CheckResult(
                    success=True,
                    message=f"GPU available: {gpu_name}",
                    details=f"VRAM: {vram_gb:.1f} GB"
                )
            else:
                return CheckResult(
                    success=False,
                    message="No CUDA-capable GPU detected",
                    details="CatVTON can run on CPU but will be very slow"
                )
        except ImportError:
            return CheckResult(
                success=False,
                message="PyTorch not installed",
                details="Run: pip install torch"
            )

    def _check_pytorch(self) -> CheckResult:
        """检查PyTorch安装"""
        try:
            import torch
            version = torch.__version__
            cuda_available = torch.cuda.is_available()
            return CheckResult(
                success=True,
                message=f"PyTorch {version}",
                details=f"CUDA support: {'Yes' if cuda_available else 'No'}"
            )
        except ImportError:
            return CheckResult(
                success=False,
                message="PyTorch not installed",
                details="Run: pip install torch torchvision"
            )

    def _check_cuda(self) -> CheckResult:
        """检查CUDA兼容性"""
        try:
            import torch
            if torch.cuda.is_available():
                cuda_version = torch.version.cuda
                return CheckResult(
                    success=True,
                    message=f"CUDA {cuda_version}",
                    details="CUDA toolkit properly configured"
                )
            else:
                return CheckResult(
                    success=False,
                    message="CUDA not available",
                    details="Install CUDA toolkit from NVIDIA website"
                )
        except Exception as e:
            return CheckResult(
                success=False,
                message="CUDA check failed",
                details=str(e)
            )

    def _check_packages(self) -> CheckResult:
        """检查必需的Python包"""
        required_packages = {
            'torch': 'PyTorch',
            'numpy': 'NumPy',
            'Pillow': 'PIL/Pillow',
            'fastapi': 'FastAPI',
            'uvicorn': 'Uvicorn',
            'pydantic': 'Pydantic',
        }

        missing = []
        installed = []

        for package, display_name in required_packages.items():
            try:
                __import__(package)
                installed.append(display_name)
            except ImportError:
                missing.append(package)

        if not missing:
            return CheckResult(
                success=True,
                message=f"All {len(required_packages)} packages installed",
                details=", ".join(installed)
            )
        else:
            return CheckResult(
                success=False,
                message=f"Missing {len(missing)} packages",
                details="Missing: " + ", ".join(missing)
            )

    def _check_env_vars(self) -> CheckResult:
        """检查环境变量"""
        important_vars = [
            'CATVTON_REPO_PATH',
            'CATVTON_RESUME_PATH',
            'HF_ENDPOINT',  # HuggingFace镜像
        ]

        set_vars = []
        unset_vars = []

        for var in important_vars:
            value = os.environ.get(var)
            if value:
                set_vars.append(var)
                if self.verbose:
                    print(f"    {var}={value[:50]}...")
            else:
                unset_vars.append(var)

        if not unset_vars:
            return CheckResult(
                success=True,
                message=f"All key env vars set ({len(set_vars)})",
                details=None
            )
        else:
            return CheckResult(
                success=True,  # 不算失败，因为可以使用默认值
                message=f"{len(set_vars)} set, {len(unset_vars)} using defaults",
                details=f"Not set: {', '.join(unset_vars)}"
            )

    def _check_catvton_repo(self) -> CheckResult:
        """检查CatVTON代码仓库"""
        repo_path = os.environ.get(
            'CATVTON_REPO_PATH',
            self.ml_root.parent / 'models' / 'CatVTON'
        )

        if os.path.isdir(repo_path):
            # 检查关键文件
            required_files = [
                'model/pipeline.py',
                'model/cloth_masker.py',
                'utils.py',
            ]

            missing = [
                f for f in required_files
                if not os.path.exists(os.path.join(repo_path, f))
            ]

            if not missing:
                return CheckResult(
                    success=True,
                    message="CatVTON repository found",
                    details=str(repo_path)
                )
            else:
                return CheckResult(
                    success=False,
                    message="CatVTON repository incomplete",
                    details=f"Missing files: {', '.join(missing)}"
                )
        else:
            return CheckResult(
                success=False,
                message="CatVTON repository not found",
                details=f"Expected at: {repo_path}\nSet CATVTON_REPO_PATH environment variable"
            )

    def _check_disk_space(self) -> CheckResult:
        """检查磁盘空间"""
        try:
            import shutil
            total, used, free = shutil.disk_usage(self.ml_root)

            free_gb = free / (1024**3)
            total_gb = total / (1024**3)

            if free_gb > 10:  # 至少10GB空闲空间
                return CheckResult(
                    success=True,
                    message=f"Disk space OK: {free_gb:.1f} GB free",
                    details=f"Total: {total_gb:.1f} GB, Used: {used/(1024**3):.1f} GB"
                )
            else:
                return CheckResult(
                    success=False,
                    message=f"Low disk space: {free_gb:.1f} GB free",
                    details="Recommend at least 10 GB free for models and cache"
                )
        except Exception as e:
            return CheckResult(
                success=True,  # 不阻塞
                message="Could not check disk space",
                details=str(e)
            )

    def _check_memory(self) -> CheckResult:
        """检查系统内存"""
        try:
            import psutil
            mem = psutil.virtual_memory()
            total_gb = mem.total / (1024**3)
            available_gb = mem.available / (1024**3)

            if total_gb >= 16:  # 推荐至少16GB
                return CheckResult(
                    success=True,
                    message=f"RAM: {total_gb:.1f} GB total, {available_gb:.1f} GB available",
                    details="Sufficient memory for ML workloads"
                )
            elif total_gb >= 8:
                return CheckResult(
                    success=True,
                    message=f"RAM: {total_gb:.1f} GB (minimum recommended)",
                    details="May experience performance issues with large models"
                )
            else:
                return CheckResult(
                    success=False,
                    message=f"Insufficient RAM: {total_gb:.1f} GB",
                    details="Recommend at least 8 GB, preferably 16+ GB"
                )
        except ImportError:
            return CheckResult(
                success=True,
                message="Could not check memory (psutil not installed)",
                details="Optional: pip install psutil"
            )

    def _check_ports(self) -> CheckResult:
        """检查端口可用性"""
        import socket

        ports_to_check = [
            ('CatVTON', 8001),
        ]

        available = []
        in_use = []

        for service_name, port in ports_to_check:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                result = s.connect_ex(('127.0.0.1', port))
                if result != 0:
                    available.append(service_name)
                else:
                    in_use.append((service_name, port))

        if not in_use:
            return CheckResult(
                success=True,
                message=f"All ports available",
                details=", ".join([f"{name}:{port}" for name, port in ports_to_check])
            )
        else:
            return CheckResult(
                success=False,
                message=f"Some ports already in use",
                details=", ".join([f"{name}:{port}" for name, port in in_use])
            )


# ============================================================================
# 服务管理器
# ============================================================================

class ServiceManager:
    """服务管理器"""

    def __init__(
        self,
        catvton_port: int = 8001,
        with_rag: bool = False,
        verbose: bool = False
    ):
        self.catvton_port = catvton_port
        self.with_rag = with_rag
        self.verbose = verbose
        self.processes: Dict[str, subprocess.Popen] = {}
        self.ml_root = Path(__file__).parent.absolute()

    def start_catvton(self) -> bool:
        """启动CatVTON服务"""
        print_section("Starting CatVTON Virtual Try-On Service")

        script_path = self.ml_root / 'inference' / 'catvton_server.py'

        if not script_path.exists():
            print_error(f"Script not found: {script_path}")
            return False

        # 设置环境变量
        env = os.environ.copy()
        env['CATVTON_PORT'] = str(self.catvton_port)
        env.setdefault('CATVTON_REPO_PATH', str(self.ml_root.parent / 'models' / 'CatVTON'))
        env.setdefault('CATVTON_GPU_MEMORY_FRACTION', '0.8')
        env.setdefault('CATVTON_INFERENCE_TIMEOUT', '180')
        env.setdefault('HF_ENDPOINT', 'https://hf-mirror.com')  # 中国镜像

        print_info(f"Script: {script_path}")
        print_info(f"Port: {self.catvton_port}")

        try:
            print_info("Launching CatVTON server...")
            process = subprocess.Popen(
                [sys.executable, str(script_path)],
                env=env,
                cwd=self.ml_root,
                stdout=subprocess.PIPE if not self.verbose else None,
                stderr=subprocess.PIPE if not self.verbose else None,
            )

            self.processes['catvton'] = process
            print_success("CatVTON process started")

            # 等待服务就绪
            print_info("Waiting for service to initialize (this may take 30-60 seconds)...")
            self._wait_for_service('localhost', self.catvton_port, timeout=90)

            return True

        except Exception as e:
            print_error(f"Failed to start CatVTON: {e}")
            return False

    def start_rag_service(self) -> bool:
        """启动RAG服务（可选）"""
        print_section("Starting RAG Retrieval Service")

        # TODO: 实现RAG服务启动逻辑
        print_warning("RAG service startup not yet implemented")
        return True

    def _wait_for_service(self, host: str, port: int, timeout: int = 60):
        """等待服务就绪"""
        import socket

        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.settimeout(5)
                    result = s.connect_ex((host, port))
                    if result == 0:
                        elapsed = time.time() - start_time
                        print_success(f"Service is ready! (took {elapsed:.1f}s)")
                        return True
            except:
                pass

            time.sleep(2)
            sys.stdout.write(".")
            sys.stdout.flush()

        print_warning(f"Service did not respond within {timeout}s (may still be starting)")
        return False

    def stop_all(self):
        """停止所有服务"""
        print_section("Stopping All Services")

        for name, process in self.processes.items():
            if process.poll() is None:  # 进程还在运行
                print_info(f"Stopping {name}...")
                process.terminate()
                try:
                    process.wait(timeout=10)
                    print_success(f"{name} stopped")
                except subprocess.TimeoutExpired:
                    process.kill()
                    print_warning(f"{name} killed (forcefully)")

        self.processes.clear()


# ============================================================================
# 主程序入口
# ============================================================================

def parse_arguments() -> argparse.Namespace:
    """解析命令行参数"""
    parser = argparse.ArgumentParser(
        description='AiNeed ML Services Launcher - 统一启动脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  %(prog)s                          # 启动 CatVTON 服务
  %(prog)s --check-only             # 仅检查环境
  %(prog)s --with-rag               # 同时启动 RAG 服务
  %(prog)s --catvton-port 8002       # 使用自定义端口
  %(prog)s --verbose                 # 显示详细日志

环境变量:
  CATVTON_REPO_PATH       CatVTON 代码仓库路径
  CATVTON_RESUME_PATH      CatVTON 模型权重路径
  HF_ENDPOINT              HuggingFace 镜像地址
  CATVTON_PORT             CatVTON 服务端口 (默认 8001)
  CATVTON_GPU_MEMORY_FRACTION  GPU 内存限制比例 (默认 0.8)
        """
    )

    parser.add_argument(
        '--check-only',
        action='store_true',
        help='仅执行环境检查，不启动服务'
    )

    parser.add_argument(
        '--with-rag',
        action='store_true',
        help='同时启动 RAG 检索服务'
    )

    parser.add_argument(
        '--catvton-port',
        type=int,
        default=8001,
        help='CatVTON 服务端口 (默认: 8001)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细输出和日志'
    )

    return parser.parse_args()


def main():
    """主函数"""
    args = parse_arguments()

    print_header("AiNeed ML Services Launcher v2.0")
    print_info(f"Working directory: {Path(__file__).parent}")
    print_info(f"Python: {sys.executable}")
    print_info(f"Platform: {platform.system()} {platform.release()}")

    # 1. 环境检查
    checker = EnvironmentChecker(verbose=args.verbose)
    all_checks_passed = checker.check_all()

    if args.check_only:
        print_section("Check Complete")
        if all_checks_passed:
            print_success("All checks passed! Ready to start services.")
        else:
            print_warning("Some checks failed. Review the issues above before starting services.")
        return 0 if all_checks_passed else 1

    if not all_checks_passed:
        print_warning("\nSome environment checks failed.")
        response = input("Do you want to continue anyway? (y/N): ")
        if response.lower() not in ['y', 'yes']:
            print_info("Aborted by user.")
            return 1

    # 2. 启动服务
    manager = ServiceManager(
        catvton_port=args.catvton_port,
        with_rag=args.with_rag,
        verbose=args.verbose
    )

    # 注册信号处理器
    def signal_handler(sig, frame):
        print("\n\nReceived interrupt signal. Shutting down gracefully...")
        manager.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # 启动 CatVTON
        catvton_ok = manager.start_catvton()

        if not catvton_ok:
            print_error("Failed to start CatVTON service")
            return 1

        # 可选：启动 RAG
        if args.with_rag:
            rag_ok = manager.start_rag_service()
            if not rag_ok:
                print_warning("RAG service failed to start, but CatVTON is running")

        # 显示服务状态
        print_section("Services Status")
        print_success("CatVTON Virtual Try-On Service")
        print(f"  URL: http://localhost:{args.catvton_port}")
        print(f"  Health: http://localhost:{args.catvton_port}/health")
        print(f"  Status: http://localhost:{args.catvton_port}/status")
        print(f"  API Docs: http://localhost:{args.catvton_port}/docs")

        if args.with_rag:
            print_success("RAG Retrieval Service (if implemented)")

        print_section("Press Ctrl+C to stop all services")

        # 保持运行
        while True:
            # 检查进程状态
            for name, process in list(manager.processes.items()):
                if process.poll() is not None:
                    print_error(f"{name} process exited unexpectedly (code: {process.returncode})")
                    del manager.processes[name]

            if not manager.processes:
                print_error("All services have stopped")
                break

            time.sleep(5)

    except KeyboardInterrupt:
        print("\n\nShutting down...")
    finally:
        manager.stop_all()

    print_success("All services stopped. Goodbye!")
    return 0


if __name__ == '__main__':
    sys.exit(main())
