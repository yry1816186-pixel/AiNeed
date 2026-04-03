# ML Service Quick Start Guide

## Quick Commands

### Start Service
```bash
cd C:\AiNeed\ml
start_service.bat
```

### Verify Installation
```bash
cd C:\AiNeed\ml
venv\Scripts\activate
python test_dependencies.py
```

### Check Service Health
```bash
curl http://localhost:8001/health
```

### View API Documentation
```
http://localhost:8001/docs
```

---

## What's Installed

### Core ML Stack
- PyTorch 2.11.0 (CPU)
- Transformers 5.3.0
- OpenCV 4.13.0
- MediaPipe 0.10.33

### Web Framework
- FastAPI 0.135.2
- Uvicorn 0.42.0

### RAG System
- Qdrant Client
- Sentence-Transformers
- Jieba (Chinese NLP)

### Performance
- ONNX Runtime
- Redis (task queue)
- Prometheus (monitoring)

---

## Known Limitations

1. **CPU-only**: PyTorch CPU version installed (faster GPU version available)
2. **FlagEmbedding**: Use Sentence-Transformers instead
3. **XFormers**: CUDA extensions not available (CPU-only mode)

These limitations are acceptable for development and testing.

---

## Environment Variables

Already configured in `.env`:
- `HF_HOME=C:/AiNeed/ml/models/cache`
- `TRANSFORMERS_CACHE=C:/AiNeed/ml/models/cache`
- `TORCH_HOME=C:/AiNeed/ml/models/torch`

---

## First Run Notes

- Models will download automatically on first use (~2-5 GB)
- Initial startup may take 1-2 minutes
- Service will run on http://localhost:8001
- API documentation available at http://localhost:8001/docs

---

## Troubleshooting

### Service won't start?
```bash
# Check dependencies
cd C:\AiNeed\ml
venv\Scripts\activate
python test_dependencies.py
```

### Import errors?
```bash
# Reinstall dependencies
cd C:\AiNeed\ml
venv\Scripts\activate
pip install -r requirements.txt
```

### Port already in use?
```bash
# Find what's using port 8001
netstat -ano | findstr :8001

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

---

## Files Reference

- `start_service.bat` - Startup script
- `test_dependencies.py` - Dependency verification
- `INSTALLATION_REPORT.md` - Full installation report
- `installation_summary.md` - Package details
- `.env` - Environment configuration

---

## Success Status

✅ All critical dependencies installed
✅ Service modules import correctly
✅ Environment configured
✅ Ready to start and test

**Service Status**: READY TO USE
