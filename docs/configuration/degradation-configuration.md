# AI Service Degradation Configuration

## Overview

The xuno application implements a service degradation strategy to maintain availability when external AI services are slow or unavailable. This document describes the configuration options and how to tune degradation behavior.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NestJS Backend                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     AiStylistService                              │   │
│   │                                                                   │   │
│   │   ┌─────────────────┐     ┌─────────────────────────────────┐   │   │
│   │   │  Circuit Breaker │────►│  OpenAI/LLM API                 │   │   │
│   │   │  (Opossum)       │     │  (Primary Service)              │   │   │
│   │   └────────┬────────┘     └─────────────────────────────────┘   │   │
│   │            │                                                      │   │
│   │            │ (open/fallback)                                      │   │
│   │            ▼                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────┐    │   │
│   │   │              Template Fallback                           │    │   │
│   │   │  - Pre-defined response templates                        │    │   │
│   │   │  - Local recommendation cache                            │    │   │
│   │   │  - Graceful user experience degradation                  │    │   │
│   │   └─────────────────────────────────────────────────────────┘    │   │
│   │                                                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          Python ML Services                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                  DegradationManager                               │   │
│   │                                                                   │   │
│   │   ┌────────────────┐    ┌────────────────┐    ┌────────────────┐│   │
│   │   │ Circuit Breaker│    │ Network Monitor│    │Fallback Handler││   │
│   │   │ (per service)  │    │ (latency/err)  │    │ (local cache)  ││   │
│   │   └────────────────┘    └────────────────┘    └────────────────┘│   │
│   │                                                                   │   │
│   │   Service Levels:                                                 │   │
│   │   - FULL:      All services available                            │   │
│   │   - DEGRADED:  Reduced precision, cached responses               │   │
│   │   - MINIMAL:   Basic functionality only                          │   │
│   │   - OFFLINE:   Local-only operation                              │   │
│   │                                                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Environment Variables

### NestJS Backend (Circuit Breaker)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5` | Number of consecutive failures before opening the circuit |
| `AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | `3` | Number of consecutive successes needed to close the circuit |
| `AI_CIRCUIT_BREAKER_TIMEOUT` | `30000` | Time in ms before timing out a request |
| `AI_CIRCUIT_BREAKER_VOLUME_THRESHOLD` | `10` | Minimum number of requests before calculating error percentage |
| `AI_CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENTAGE` | `50` | Error percentage threshold to open the circuit |
| `AI_CIRCUIT_BREAKER_RESET_TIMEOUT` | `30000` | Time in ms before attempting to close an open circuit |

### AI Service Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_STYLIST_API_KEY` | - | Primary API key for AI stylist LLM |
| `AI_STYLIST_API_ENDPOINT` | - | LLM API endpoint URL |
| `AI_STYLIST_MODEL` | `glm-5` | Model name to use |
| `GLM_API_KEY` | - | Fallback: GLM API key |
| `GLM_API_ENDPOINT` | - | Fallback: GLM API endpoint |
| `GLM_MODEL` | - | Fallback: GLM model name |
| `OPENAI_API_KEY` | - | Fallback: OpenAI API key |
| `OPENAI_API_ENDPOINT` | `https://open.bigmodel.cn/api/paas/v4` | Fallback: OpenAI-compatible endpoint |
| `OPENAI_MODEL` | - | Fallback: OpenAI model name |

### Python ML Services

| Variable | Default | Description |
|----------|---------|-------------|
| `DEGRADATION_LATENCY_THRESHOLD_MS` | `3000` | Latency threshold in ms to trigger degraded mode |
| `DEGRADATION_ERROR_RATE_THRESHOLD` | `0.2` | Error rate (0.0-1.0) to trigger degraded mode |
| `DEGRADATION_RECOVERY_SECONDS` | `60` | Seconds to wait before attempting recovery |
| `DEGRADATION_FALLBACK_CACHE_TTL` | `1800` | Seconds to cache fallback responses (30 min) |

## Service Levels

### FULL (Normal Operation)

All AI services are available and responsive:
- Real-time style analysis
- Full precision recommendations
- Virtual try-on processing
- Advanced trend predictions

### DEGRADED

Triggered when latency exceeds threshold or intermittent errors occur:
- **Enabled**: Style analysis (cached models), basic recommendations
- **Disabled**: High precision segmentation, advanced trend prediction, detailed aesthetic scoring

### MINIMAL

Triggered when multiple services are failing:
- **Enabled**: Basic recommendations from cache, rule-based suggestions
- **Disabled**: Collaborative filtering, knowledge graph, advanced features

### OFFLINE

Triggered when external services are completely unavailable:
- **Enabled**: Local rule-based recommendations only
- **Disabled**: All AI-powered features, virtual try-on, visual search

## Fallback Strategies

### AI Stylist Fallback

When the LLM service is unavailable:

```typescript
// Template-based fallback messages
const fallbackMessages = {
  ask_question: "What occasion are you dressing for?",
  show_preference_buttons: "What style do you prefer?",
  request_photo_upload: "Upload a photo for better recommendations, or skip.",
  generate_outfit: "I have enough info to generate your outfit.",
  show_outfit_cards: "Here are your outfit recommendations.",
};
```

### ML Service Fallbacks

```python
# Body metrics fallback
def body_metrics_fallback(data):
    return {
        "bmi": data.get("weight", 65) / ((data.get("height", 170) / 100) ** 2),
        "body_type": "rectangle",
        "confidence": 0.5,
        "fallback": True
    }

# Style recognition fallback
def style_recognition_fallback(image_data):
    return {
        "style": "casual",
        "confidence": 0.4,
        "fallback": True
    }

# Recommendation fallback
def recommendation_fallback(user_id):
    return {
        "items": [],  # Will be filled with popular items
        "reason": "Popular items",
        "fallback": True
    }
```

## Configuration Examples

### Development (.env.local)

```bash
# Circuit Breaker - Aggressive for testing
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
AI_CIRCUIT_BREAKER_TIMEOUT=10000
AI_CIRCUIT_BREAKER_RESET_TIMEOUT=15000

# Degradation - Fast triggers for testing
DEGRADATION_LATENCY_THRESHOLD_MS=2000
DEGRADATION_ERROR_RATE_THRESHOLD=0.1
```

### Production (.env.production)

```bash
# Circuit Breaker - Conservative for stability
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
AI_CIRCUIT_BREAKER_TIMEOUT=30000
AI_CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Degradation - Higher thresholds
DEGRADATION_LATENCY_THRESHOLD_MS=5000
DEGRADATION_ERROR_RATE_THRESHOLD=0.3
DEGRADATION_RECOVERY_SECONDS=120
```

### High-Traffic (.env.high-traffic)

```bash
# Circuit Breaker - Fast failure to prevent queue buildup
AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
AI_CIRCUIT_BREAKER_SUCCESS_THRESHOLD=5
AI_CIRCUIT_BREAKER_TIMEOUT=15000
AI_CIRCUIT_BREAKER_RESET_TIMEOUT=30000
AI_CIRCUIT_BREAKER_VOLUME_THRESHOLD=20

# Degradation - Aggressive to maintain throughput
DEGRADATION_LATENCY_THRESHOLD_MS=3000
DEGRADATION_ERROR_RATE_THRESHOLD=0.15
```

## Monitoring Degradation

### API Endpoints

```bash
# Get circuit breaker status
GET /api/ai-stylist/circuit-breaker/stats

# Response
{
  "name": "ai-stylist-llm",
  "state": "closed",
  "failures": 0,
  "successes": 42,
  "fallbacks": 0,
  "rejects": 0,
  "latencyMean": 245,
  "latencyPercentiles": {
    "0.5": 220,
    "0.9": 380,
    "0.95": 450,
    "0.99": 620
  }
}
```

### Python ML Services Status

```bash
# Get degradation status from Python service
GET /api/ml/degradation/status

# Response
{
  "current_level": "full",
  "active_triggers": [],
  "degraded_features": [],
  "network_stats": {
    "avg_latency_ms": 245,
    "error_rate": 0.02
  },
  "circuit_breakers": {
    "body_metrics": "closed",
    "style_recognition": "closed",
    "recommendation": "closed"
  }
}
```

## Troubleshooting

### Circuit Breaker Opens Frequently

1. Check LLM API health: `curl -I https://api.example.com/health`
2. Increase timeout: `AI_CIRCUIT_BREAKER_TIMEOUT=60000`
3. Check network latency between services
4. Review API rate limits

### Degraded Mode Not Recovering

1. Check `DEGRADATION_RECOVERY_SECONDS` setting
2. Verify network connectivity
3. Manually trigger recovery: `POST /api/ml/degradation/recover`

### High Fallback Rate

1. Review circuit breaker stats
2. Check for upstream service issues
3. Consider scaling or upgrading AI service tier

## Best Practices

1. **Monitor metrics**: Set up alerts for circuit breaker state changes
2. **Test fallbacks**: Regularly test degradation scenarios
3. **Gradual rollout**: Test new degradation settings in staging first
4. **Document thresholds**: Keep environment-specific configuration documented
5. **Capacity planning**: Ensure fallback systems can handle load during degradation
