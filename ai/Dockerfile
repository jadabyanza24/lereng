FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY ai ./ai
RUN useradd --create-home researcher
USER researcher
EXPOSE 8000
CMD ["uvicorn","ai.inference.app:app","--host","0.0.0.0","--port","8000"]
