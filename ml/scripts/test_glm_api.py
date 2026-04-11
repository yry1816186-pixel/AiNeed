"""
GLM API Connection Test Script
测试智谱清言 GLM API 连接是否正常
"""

import os
import sys
import asyncio
import json
from typing import Optional
from pathlib import Path

# Load .env file
def load_env():
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = value
        print(f"✅ Loaded .env from: {env_path}")
    else:
        print(f"⚠️ .env file not found at: {env_path}")

load_env()

def test_glm_api():
    """测试 GLM API 连接"""
    
    print("=" * 60)
    print("GLM API Connection Test")
    print("=" * 60)
    
    api_key = os.environ.get("GLM_API_KEY")
    api_endpoint = os.environ.get("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
    model = os.environ.get("GLM_MODEL", "glm-5")
    
    if not api_key:
        print("❌ GLM_API_KEY not found in environment variables")
        print("\nPlease set the environment variable:")
        print("  Windows: set GLM_API_KEY=your-api-key")
        print("  Linux/Mac: export GLM_API_KEY=your-api-key")
        print("\nOr create a .env file with:")
        print("  GLM_API_KEY=your-api-key")
        return False
    
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print(f"Endpoint: {api_endpoint}")
    print(f"Model: {model}")
    print()
    
    try:
        import httpx
    except ImportError:
        print("Installing httpx...")
        os.system(f"{sys.executable} -m pip install httpx -q")
        import httpx
    
    test_url = f"{api_endpoint}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是一位专业的时尚造型师助手。"
            },
            {
                "role": "user",
                "content": "你好，请用一句话介绍你自己。"
            }
        ],
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    print("Sending test request to GLM API...")
    print()
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                test_url,
                headers=headers,
                json=payload
            )
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    print()
                    print("✅ GLM API Connection Successful!")
                    print()
                    print("Response:")
                    print(f"  {content}")
                    print()
                    
                    if "usage" in result:
                        print("Token Usage:")
                        print(f"  Prompt: {result['usage'].get('prompt_tokens', 'N/A')}")
                        print(f"  Completion: {result['usage'].get('completion_tokens', 'N/A')}")
                        print(f"  Total: {result['usage'].get('total_tokens', 'N/A')}")
                    
                    return True
                else:
                    print("❌ Unexpected response format")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    return False
                    
            elif response.status_code == 401:
                print("❌ Authentication failed - Invalid API Key")
                return False
            elif response.status_code == 429:
                print("❌ Rate limit exceeded - Please try again later")
                return False
            else:
                print(f"❌ Request failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
    except httpx.TimeoutException:
        print("❌ Request timed out")
        return False
    except httpx.ConnectError:
        print("❌ Connection failed - Check your network")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_backend_glm_config():
    """测试后端 GLM 配置"""
    print()
    print("=" * 60)
    print("Backend GLM Configuration Check")
    print("=" * 60)
    
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "apps", "backend", ".env")
    
    if os.path.exists(env_path):
        print(f"Found backend .env file: {env_path}")
        
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        has_glm_key = "GLM_API_KEY" in content and "your-glm-api-key" not in content.lower()
        has_glm_endpoint = "GLM_API_ENDPOINT" in content
        
        print(f"  GLM_API_KEY configured: {'✅' if has_glm_key else '❌'}")
        print(f"  GLM_API_ENDPOINT set: {'✅' if has_glm_endpoint else '⚠️ (using default)'}")
        
        return has_glm_key
    else:
        print(f"Backend .env file not found at: {env_path}")
        print("Please create the file and add GLM configuration")
        return False


def main():
    print()
    
    api_ok = test_glm_api()
    backend_ok = test_backend_glm_config()
    
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  GLM API Connection: {'✅ OK' if api_ok else '❌ Failed'}")
    print(f"  Backend Config: {'✅ OK' if backend_ok else '❌ Not configured'}")
    print("=" * 60)
    
    if api_ok and backend_ok:
        print()
        print("🎉 All checks passed! Your GLM API is ready to use.")
    else:
        print()
        print("⚠️ Some checks failed. Please fix the issues above.")
    
    return api_ok and backend_ok


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
