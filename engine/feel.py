"""체감온도와 위험 단계. 식은 scripts/kspo_check.py cmd_heat와 같다 (docs/JSON_형식.md)."""
import math

LEVEL_ORDER = {"safe": 0, "caution": 1, "warning": 2, "danger": 3}


def season(month):
    return "summer" if 5 <= month <= 9 else "winter"


def summer_feel(ta, rh):
    """Stull 습구온도 Tw로 구한 여름 체감온도."""
    if ta is None or rh is None:
        return None
    tw = (ta * math.atan(0.151977 * math.sqrt(rh + 8.313659)) + math.atan(ta + rh) - math.atan(rh - 1.67633)
          + 0.00391838 * rh ** 1.5 * math.atan(0.023101 * rh) - 4.686035)
    return round(-0.2442 + 0.55399 * tw + 0.45535 * ta - 0.0022 * tw ** 2 + 0.00278 * tw * ta + 3.0, 1)


def winter_feel(ta, wind):
    """기온 10℃ 이하·풍속 1.3m/s 이상이면 겨울 체감온도, 그 밖은 기온 그대로."""
    if ta is None:
        return None
    if wind is None:
        return None if ta <= 10 else round(ta, 1)
    if ta <= 10 and wind >= 1.3:
        v16 = (wind * 3.6) ** 0.16
        return round(13.12 + 0.6215 * ta - 11.37 * v16 + 0.3965 * v16 * ta, 1)
    return round(ta, 1)


def feel(ta, rh, wind, season_):
    return summer_feel(ta, rh) if season_ == "summer" else winter_feel(ta, wind)


def level(feel_, season_):
    if feel_ is None:
        return None
    if season_ == "summer":
        if feel_ >= 38:
            return "danger"
        if feel_ >= 35:
            return "warning"
        if feel_ >= 33:
            return "caution"
        return "safe"
    if feel_ <= -25:
        return "warning"
    if feel_ <= -10:
        return "caution"
    return "safe"
