"""
API для хранения звуков в облаке (S3 + PostgreSQL).
GET  /        — список всех звуков
POST /upload  — загрузить звук (base64 в теле)
DELETE /      — удалить звук по key
"""
import json
import os
import base64
import boto3
import psycopg2
from urllib.parse import urlparse


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

SCHEMA = os.environ["MAIN_DB_SCHEMA"]


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(s3_path: str) -> str:
    key_id = os.environ["AWS_ACCESS_KEY_ID"]
    return f"https://cdn.poehali.dev/projects/{key_id}/bucket/{s3_path}"


def handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # GET / — список звуков
    if method == "GET":
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT key, name, url FROM {SCHEMA}.sounds ORDER BY key")
        rows = cur.fetchall()
        conn.close()
        sounds = [{"key": r[0], "name": r[1], "url": r[2]} for r in rows]
        return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"sounds": sounds})}

    # POST /upload — загрузить звук
    if method == "POST" and "upload" in path:
        body = json.loads(event.get("body") or "{}")
        sound_key = body["key"]       # e.g. "cell_1" or "goods"
        file_name = body["name"]      # оригинальное имя файла
        data_url = body["data"]       # data:audio/...;base64,...

        # Декодируем base64
        header, b64 = data_url.split(",", 1)
        content_type = header.split(";")[0].replace("data:", "")
        audio_bytes = base64.b64decode(b64)

        # Определяем расширение
        ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "mp3"
        s3_path = f"sounds/{sound_key}.{ext}"

        # Загружаем в S3
        s3 = get_s3()
        s3.put_object(Bucket="files", Key=s3_path, Body=audio_bytes,
                      ContentType=content_type, ACL="public-read")

        url = cdn_url(s3_path)

        # Сохраняем в БД (upsert)
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.sounds (key, name, s3_path, url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, s3_path=EXCLUDED.s3_path, url=EXCLUDED.url, created_at=NOW()""",
            (sound_key, file_name, s3_path, url)
        )
        conn.commit()
        conn.close()

        return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"key": sound_key, "url": url, "name": file_name})}

    # DELETE / — удалить звук
    if method == "DELETE":
        body = json.loads(event.get("body") or "{}")
        sound_key = body["key"]

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT s3_path FROM {SCHEMA}.sounds WHERE key=%s", (sound_key,))
        row = cur.fetchone()
        if row:
            s3_path = row[0]
            try:
                s3 = get_s3()
                s3.delete_object(Bucket="files", Key=s3_path)
            except Exception:
                pass
            cur.execute(f"DELETE FROM {SCHEMA}.sounds WHERE key=%s", (sound_key,))
            conn.commit()
        conn.close()

        return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"},
                "body": json.dumps({"ok": True})}

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
