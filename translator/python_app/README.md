# Python Novel Translator

Python 표준 라이브러리만 사용하는 로컬 웹소설 번역 MVP입니다.

## 실행

```powershell
python -m python_app.server
```

브라우저에서 `http://127.0.0.1:8000/`을 엽니다.

## 구조

```text
python_app/
  server.py
  config.py
  orchestrator/
    run_translation_job.py
    types.py
  pipeline/
    preprocess_text.py
    chunk_text.py
    verify_translation.py
    assemble_result.py
  providers/
    gemini_provider.py
  cache/
    translation_cache.py
  web/
    index.html
    app.js
    styles.css
```

프론트엔드는 API 키와 텍스트를 서버에 보내고, Python 오케스트레이터가 전처리, 분할, 번역, 검증, 조립을 수행합니다.
