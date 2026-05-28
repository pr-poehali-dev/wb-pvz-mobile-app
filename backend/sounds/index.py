"""
API для хранения звуков в облаке (S3 + PostgreSQL).
GET    / — список всех звуков
POST   / — загрузить звук (body: {key, name, data: base64dataurl})
DELETE / — удалить звук по key (body: {key})
"""
import json
import os
import base64
import boto3
import psycopg2


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

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # GET — список звуков
    if method == "GET":
        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT key, name, url FROM {SCHEMA}.sounds ORDER BY key")
        rows = cur.fetchall()
        conn.close()
        sounds = [{"key": r[0], "name": r[1], "url": r[2]} for r in rows]
        return {
            "statusCode": 200,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"sounds": sounds}),
        }

    # POST — загрузить/заменить звук
    if method == "POST":
        raw_body = event.get("body") or ""
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        body = json.loads(raw_body)

        sound_key = body["key"]
        file_name = body["name"]
        data_url = body["data"]  # data:audio/...;base64,...

        header, b64 = data_url.split(",", 1)
        content_type = header.split(";")[0].replace("data:", "") or "audio/mpeg"
        audio_bytes = base64.b64decode(b64)

        ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "mp3"
        s3_path = f"sounds/{sound_key}.{ext}"

        s3 = get_s3()
        s3.put_object(
            Bucket="files",
            Key=s3_path,
            Body=audio_bytes,
            ContentType=content_type,
            ACL="public-read",
        )

        url = cdn_url(s3_path)

        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"""INSERT INTO {SCHEMA}.sounds (key, name, s3_path, url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (key) DO UPDATE
                SET name=EXCLUDED.name, s3_path=EXCLUDED.s3_path,
                    url=EXCLUDED.url, created_at=NOW()""",
            (sound_key, file_name, s3_path, url),
        )
        conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"key": sound_key, "url": url, "name": file_name}),
        }

    # DELETE — удалить звук
    if method == "DELETE":
        raw_body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        body = json.loads(raw_body)
        sound_key = body["key"]

        conn = get_db()
        cur = conn.cursor()
        cur.execute(f"SELECT s3_path FROM {SCHEMA}.sounds WHERE key=%s", (sound_key,))
        row = cur.fetchone()
        if row:
            try:
                s3 = get_s3()
                s3.delete_object(Bucket="files", Key=row[0])
            except Exception:
                pass
            cur.execute(f"DELETE FROM {SCHEMA}.sounds WHERE key=%s", (sound_key,))
            conn.commit()
        conn.close()

        return {
            "statusCode": 200,
            "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps({"ok": True}),
        }

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
