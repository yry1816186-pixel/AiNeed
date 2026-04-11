#!/usr/bin/env python
"""
Test script to verify all ML dependencies are installed correctly.
"""
import sys
import traceback

def test_import(module_name, package_name=None):
    """Test if a module can be imported."""
    package_name = package_name or module_name
    try:
        __import__(module_name)
        version = getattr(sys.modules[module_name], '__version__', 'N/A')
        print(f"  OK: {package_name} {version}")
        return True
    except ImportError as e:
        print(f"  FAIL: {package_name} - {e}")
        return False

def main():
    print("=" * 60)
    print("Testing ML Service Dependencies")
    print("=" * 60)

    results = []

    # Core ML libraries
    print("\nCore ML Libraries:")
    results.append(test_import('torch', 'PyTorch'))
    results.append(test_import('torchvision', 'Torchvision'))
    results.append(test_import('numpy', 'NumPy'))

    # ML Models
    print("\nML Models:")
    results.append(test_import('transformers', 'Transformers'))
    results.append(test_import('ultralytics', 'Ultralytics'))
    results.append(test_import('mediapipe', 'MediaPipe'))

    # Diffusion Models
    print("\nDiffusion Models:")
    results.append(test_import('diffusers', 'Diffusers'))
    results.append(test_import('accelerate', 'Accelerate'))
    results.append(test_import('xformers', 'XFormers'))
    results.append(test_import('safetensors', 'Safetensors'))

    # Computer Vision
    print("\nComputer Vision:")
    results.append(test_import('cv2', 'OpenCV'))
    results.append(test_import('PIL', 'Pillow'))

    # Clustering
    print("\nClustering & ML:")
    results.append(test_import('sklearn', 'Scikit-learn'))

    # Web Framework
    print("\nWeb Framework:")
    results.append(test_import('fastapi', 'FastAPI'))
    results.append(test_import('uvicorn', 'Uvicorn'))
    results.append(test_import('pydantic', 'Pydantic'))
    results.append(test_import('pydantic_settings', 'Pydantic Settings'))

    # Utilities
    print("\nUtilities:")
    results.append(test_import('aiofiles', 'Aiofiles'))
    results.append(test_import('dotenv', 'Python-dotenv'))
    results.append(test_import('huggingface_hub', 'HuggingFace Hub'))

    # Performance
    print("\nPerformance:")
    results.append(test_import('onnxruntime', 'ONNX Runtime'))
    results.append(test_import('prometheus_client', 'Prometheus'))

    # RAG System
    print("\nRAG System:")
    results.append(test_import('qdrant_client', 'Qdrant Client'))
    results.append(test_import('jieba', 'Jieba'))
    results.append(test_import('sentence_transformers', 'Sentence-Transformers'))
    results.append(test_import('FlagEmbedding', 'FlagEmbedding'))

    # Task Queue
    print("\nTask Queue & Async:")
    results.append(test_import('redis', 'Redis'))
    results.append(test_import('httpx', 'HTTPX'))
    results.append(test_import('aiohttp', 'AIOHTTP'))

    # Monitoring
    print("\nMonitoring:")
    results.append(test_import('psutil', 'Psutil'))

    # Summary
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Summary: {passed}/{total} packages installed successfully")
    print("=" * 60)

    if passed == total:
        print("\nAll dependencies installed successfully!")
        return 0
    else:
        print(f"\n{total - passed} package(s) failed to install.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
