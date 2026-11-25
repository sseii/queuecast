"""엔진 공통: 한국시간, 인증키 읽기, 키가 새지 않는 GET 호출."""
import json
import os
import pathlib
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote

import requests

KST = timezone(timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}


class ApiError(Exception):
    """API 호출 실패. 메시지에 인증키·요청 URL을 넣지 않는다."""


def now_kst():
    return datetime.now(KST)


def get_key(name):
    """환경변수(Actions에서는 Secrets)가 있으면 그것을, 없으면 engine/keys.json을 읽는다."""
    if os.environ.get(name):
        return os.environ[name]
    p = pathlib.Path(__file__).parent / "keys.json"
    with open(p, encoding="utf-8") as f:
        return json.load(f)[name]


def env_key(name):
    """get_key로 읽고, 없으면 키 값 없이 안내만 하고 멈춘다."""
    try:
        v = get_key(name).strip()
    except (OSError, ValueError, KeyError):
        v = ""
    if not v:
        raise ApiError(f"{name} 키가 없습니다. 환경변수 또는 engine/keys.json에 넣어 주세요.")
    # 공공데이터포털 '인코딩 키'를 넣어도 requests가 다시 인코딩하지 않도록 디코딩 키로 맞춘다.
    return unquote(v) if "%" in v else v


def get(url, params, label, timeout=30):
    """GET 호출. 실패해도 예외 메시지에 URL(키 포함)이 나오지 않게 감싼다."""
    try:
        r = requests.get(url, params=params, headers=UA, timeout=timeout)
    except requests.exceptions.RequestException as e:
        raise ApiError(f"{label} 연결 실패 ({type(e).__name__})") from None
    if r.status_code != 200:
        raise ApiError(f"{label} HTTP {r.status_code}")
    r.encoding = "utf-8"
    return r.text
