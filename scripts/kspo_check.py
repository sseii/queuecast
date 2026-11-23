"""
올팍 시트뷰 — 공공데이터 내려받기·확인 스크립트

[준비]
  pip install requests pandas
  같은 폴더에 keys.json 을 만들고 API 키를 넣는다 (GitHub에 올리지 말 것):
    {"입출차": "키", "연계": "키", "공연": "키", "유실물": "키"}
  아래 CONFIG 의 url 칸에 각 데이터 상세 페이지의 '요청주소'를 붙여 넣는다.

[사용법]
  python kspo_check.py test 공연              응답 구조와 컬럼 이름 확인 (1페이지만)
  python kspo_check.py fetch 입출차           전체 내려받기 (끊겨도 다시 실행하면 이어받기)
  python kspo_check.py merge 입출차           받은 페이지를 data/입출차.csv 하나로 합치기
  python kspo_check.py cols 입출차            합친 CSV의 컬럼 이름과 앞부분 보기

  python kspo_check.py check4 --date 날짜컬럼 --venue 공연장컬럼
  python kspo_check.py check5 --in 입차컬럼 --out 출차컬럼 --zone 주차구역컬럼
  python kspo_check.py check6 --date 날짜컬럼 --hour 시간컬럼 --count 차량대수컬럼 --in 입차컬럼 --out 출차컬럼
  (컬럼 이름은 cols 명령으로 확인한 실제 이름을 넣는다)
"""
import sys, os, json, time, glob, argparse
import xml.etree.ElementTree as ET
import requests
import pandas as pd

CONFIG = {
    "입출차": {"url": "https://api.kcisa.kr/openapi/API_CPM_008/request", "rows": 1000},   # 15159093
    "연계":   {"url": "https://api.kcisa.kr/openapi/API_CPM_009/request", "rows": 10000},   # 15164822
    "공연":   {"url": "https://api.kcisa.kr/openapi/service/rest/meta/KSCperf", "rows": 100},    # 3037877
    "유실물": {"url": "https://api.kcisa.kr/openapi/service/rest/meta/KSClost", "rows": 100},    # 15038496
}
EXTRA = {"keyword": ""}   # api.kcisa.kr 안내: 조회조건이 있으면 빈 값이라도 keyword= 를 붙여 호출
DAILY_LIMIT = 990          # 개발계정 일 1,000회 제한에서 여유분을 뺀 값
CONG_ZONES = ["P1A", "P1B", "P2", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11"]  # 혼잡도 데이터의 주차구역


def key(name):
    if os.environ.get(f"KEY_{name}"):
        return os.environ[f"KEY_{name}"]
    with open("keys.json", encoding="utf-8") as f:
        return json.load(f)[name]


def call(name, page):
    c = CONFIG[name]
    if not c["url"]:
        sys.exit(f"CONFIG['{name}']['url'] 에 요청주소를 넣어 주세요.")
    p = {"serviceKey": key(name), "pageNo": page, "numOfRows": c["rows"], **EXTRA, **c.get("params", {})}
    r = requests.get(c["url"], params=p, timeout=180)
    r.encoding = r.apparent_encoding
    return r


def parse(text):
    """JSON 또는 XML 응답에서 item 목록과 totalCount를 꺼낸다."""
    try:
        d = json.loads(text)
        body = d.get("response", d).get("body", d.get("response", d))
        items = body.get("items", [])
        if isinstance(items, dict):
            items = items.get("item", [])
        if isinstance(items, dict):
            items = [items]
        return items, int(body.get("totalCount", 0) or 0)
    except (ValueError, AttributeError):
        root = ET.fromstring(text)
        items = [{ch.tag: ch.text for ch in it} for it in root.iter("item")]
        tc = root.find(".//totalCount")
        return items, int(tc.text) if tc is not None and tc.text else 0


def cmd_test(name):
    r = call(name, 1)
    print("HTTP", r.status_code)
    print(r.text[:1500])
    try:
        items, total = parse(r.text)
        print(f"\n전체 {total}건, 이번 페이지 {len(items)}건")
        if items:
            print("컬럼:", list(items[0].keys()))
            if total:
                print(f"필요한 호출 수: 약 {-(-total // CONFIG[name]['rows'])}회")
    except Exception as e:
        print("\n파싱 실패 — 위 원문을 보고 EXTRA 의 type 값을 바꿔 보세요:", e)


def cmd_fetch(name):
    d = f"pages/{name}"
    os.makedirs(d, exist_ok=True)
    page = len(glob.glob(f"{d}/*.txt")) + 1
    print(f"{page}페이지부터 시작")
    calls = 0
    while calls < DAILY_LIMIT:
        try:
            r = call(name, page); calls += 1
        except requests.exceptions.RequestException as e:
            print(f"{page}페이지 연결 오류, 20초 후 재시도:", e); time.sleep(20); continue
        if r.status_code in (429, 500, 502, 503, 504):
            print(f"{page}페이지 서버 응답 {r.status_code}, 30초 기다렸다 재시도"); time.sleep(30); continue
        items, total = parse(r.text) if r.status_code == 200 else ([], 0)
        if r.status_code != 200 or not items:
            print(f"중단: {page}페이지 (HTTP {r.status_code})", r.text[:200])
            break
        with open(f"{d}/{page:05d}.txt", "w", encoding="utf-8") as f:
            f.write(r.text)
        print(f"{page}페이지 완료 / 전체 약 {-(-total // CONFIG[name]['rows'])}페이지")
        if page * CONFIG[name]["rows"] >= total > 0:
            print("전부 받았습니다."); break
        page += 1
        time.sleep(5)


def cmd_merge(name):
    rows = []
    for fp in sorted(glob.glob(f"pages/{name}/*.txt")):
        with open(fp, encoding="utf-8") as f:
            rows += parse(f.read())[0]
    os.makedirs("data", exist_ok=True)
    df = pd.DataFrame(rows)
    df.to_csv(f"data/{name}.csv", index=False, encoding="utf-8-sig")
    print(f"data/{name}.csv 저장: {len(df)}행, 컬럼 {list(df.columns)}")


def load(name):
    return pd.read_csv(f"data/{name}.csv", low_memory=False)


def cmd_cols(name):
    df = load(name)
    print(df.dtypes); print(df.head(10).to_string())


def cmd_check4(a):
    df = load("연계")
    print("[공연장 값 목록]"); print(df[a.venue].value_counts(dropna=False).to_string())
    n = df.dropna(subset=[a.venue]).groupby(a.date)[a.venue].nunique()
    print(f"\n복수 공연일(같은 날 공연장 2곳 이상): {(n > 1).sum()}일 / 공연 있는 날 {len(n)}일")


def cmd_check5(a):
    df = load("입출차")
    ins, out = pd.to_datetime(df[a.in_], errors="coerce"), pd.to_datetime(df[a.out], errors="coerce")
    print(f"출차일시 결측: {out.isna().mean()*100:.2f}%  ({out.isna().sum()}건 / {len(df)}건)")
    dur = (out - ins).dt.total_seconds() / 3600
    print(f"주차 시간(시간) 분포:\n{dur.describe().to_string()}")
    print(f"24시간 초과: {(dur > 24).mean()*100:.2f}%")
    zones = df[a.zone].astype(str).value_counts()
    print("\n[주차구역 값]"); print(zones.to_string())
    miss = [z for z in CONG_ZONES if z not in zones.index]
    print("\n혼잡도 데이터 구역명과 일치:", "모두 일치" if not miss else f"없는 구역 {miss}")


def cmd_check6(a):
    lk = load("연계")
    dt = pd.to_datetime(lk[a.date].astype(str) + " " + lk[a.hour].astype(str).str.zfill(2) + ":00", errors="coerce")
    print(f"날짜+시간 변환 실패: {dt.isna().sum()}행 (0이 아니면 --hour 형식 확인)")
    print(f"날짜+시간 중복: {dt.duplicated().sum()}개")
    full = pd.date_range("2025-01-01", "2025-12-31 23:00", freq="h")
    print(f"2025년 중 빠진 시간대: {len(full.difference(dt.dropna()))}개 / {len(full)}개")
    print("\n[컬럼별 결측 수]"); print(lk.isna().sum().to_string())
    raw = load("입출차")
    ins, out = pd.to_datetime(raw[a.in_], errors="coerce"), pd.to_datetime(raw[a.out], errors="coerce")
    print("\n[차량 대수 = 입차? 점유?] 무작위 5개 시간대 비교")
    for h in dt.dropna().sample(5, random_state=1).sort_values():
        n_in = ((ins >= h) & (ins < h + pd.Timedelta(hours=1))).sum()
        n_occ = ((ins <= h) & ((out > h) | out.isna())).sum()
        v = lk.loc[dt == h, a.count].values
        print(f"{h}  연계값 {v}  |  원천 입차 {n_in}  |  원천 점유 {n_occ}")

def cmd_perf():
    df = load("공연")
    print(f"전체 {len(df)}건")
    for c in ["extent", "temporalCoverage", "spatial"]:
        filled = df[c].notna() & (df[c].astype(str).str.strip() != "")
        print(f"{c}: 값 있음 {filled.mean()*100:.1f}%")
    print("\n[temporalCoverage 예시 15개]"); print(df["temporalCoverage"].dropna().sample(15, random_state=1).to_string())
    print("\n[extent 예시 15개]"); print(df["extent"].dropna().sample(15, random_state=1).to_string())
    print("\n[spatial 상위 20]"); print(df["spatial"].value_counts().head(20).to_string())
    y25 = df[df["temporalCoverage"].astype(str).str.contains("2025")]
    print(f"\n2025년 공연(temporalCoverage에 2025 포함): {len(y25)}건")
    print(y25[["title", "temporalCoverage", "extent", "spatial"]].head(15).to_string())

def cmd_perf2():
    df = load("공연")
    for c in ["extent", "temporalCoverage", "spatial"]:
        real = ~df[c].astype(str).str.strip().isin(["", ".", "nan"])
        print(f"{c}: 실제 값 있음 {real.mean()*100:.1f}%")
    print("\n[regDate 연도별 건수]")
    print(pd.to_datetime(df["regDate"], errors="coerce").dt.year.value_counts().sort_index().to_string())
    print("\n[최근 등록 10건]")
    print(df.sort_values("regDate", ascending=False)[["regDate", "title", "temporalCoverage", "extent", "spatial"]].head(10).to_string())

def cmd_perf3():
    df = load("공연")
    yrs = df["title"].astype(str).str.extract(r"(20\d\d)")[0].dropna().astype(int)
    print("[제목에 적힌 연도별 건수]"); print(yrs.value_counts().sort_index().to_string())

def cmd_split():
    os.makedirs("data", exist_ok=True)
    first = {"연계": True, "입출차": True}
    counts = {}
    for fp in sorted(glob.glob("pages/연계/*.txt")):
        with open(fp, encoding="utf-8") as f:
            df = pd.DataFrame(parse(f.read())[0])
        kind = df["TITLE"].astype(str).str.replace(r"^\d{8}\s*", "", regex=True)
        is_link = kind.str.contains("추가정보")
        for name, part in [("연계", df[is_link]), ("입출차", df[~is_link])]:
            if len(part):
                part.to_csv(f"data/{name}.csv", mode="w" if first[name] else "a", header=first[name],
                            index=False, encoding="utf-8-sig" if first[name] else "utf-8")
                first[name] = False
        for t, n in kind.value_counts().items():
            counts[t] = counts.get(t, 0) + n
    print("TITLE 종류별 건수:", counts)
    for name in ["연계", "입출차"]:
        if os.path.exists(f"data/{name}.csv"):
            print(f"\n[{name} 앞부분]"); print(pd.read_csv(f"data/{name}.csv", nrows=3).to_string())


def cmd_link():
    import re
    df = load("연계")
    keys = "주차대수|방문객|기온|풍향|강수량|습도|휴일|공연명|공연관람객수"
    def split(s):
        parts = re.split(rf"\s*,?\s*({keys})\s*:", str(s))
        return {parts[i]: parts[i + 1].strip().rstrip(",") for i in range(1, len(parts) - 1, 2)}
    ext = pd.DataFrame([split(s) for s in df["DESCRIPTION"]])
    out = pd.concat([df[["TITLE", "ISSUED_DATE"]], ext], axis=1)
    out.to_csv("data/연계_정리.csv", index=False, encoding="utf-8-sig")
    print(f"행 수 {len(out)}, 기간 {out['ISSUED_DATE'].min()} ~ {out['ISSUED_DATE'].max()}")
    show = out["공연명"].fillna("").str.strip() != ""
    print(f"공연명 있는 시간대: {show.sum()}개, 서로 다른 공연명: {out.loc[show, '공연명'].nunique()}개")
    print(out.loc[show, "공연명"].value_counts().head(30).to_string())
    print("\n[공연관람객수 분포 (공연 있는 시간대)]")
    print(pd.to_numeric(out.loc[show, "공연관람객수"], errors="coerce").describe().to_string())
    print("\n[결측(빈칸) 비율 %]")
    print((out.replace("", pd.NA).isna().mean() * 100).round(1).to_string())

def cmd_verify():
    raw = load("입출차")
    desc = raw["DESCRIPTION"].astype(str)
    ins = pd.to_datetime(raw["ISSUED_DATE"], errors="coerce").dt.floor("h")
    out = pd.to_datetime(desc.str.extract(r"출차시간:\s*([\d\-]+ [\d:]+)")[0], errors="coerce").dt.floor("h")
    gate = desc.str.extract(r"입구:\s*([^\s,#]+)")[0]
    print(f"원천 {len(raw)}건 / 출차시간 없음 {out.isna().mean()*100:.1f}% / 입구 종류: {gate.value_counts().to_dict()}")
    hours = pd.date_range("2025-01-01", "2025-12-31 23:00", freq="h")
    ok = out.notna() & (out >= ins)
    inflow = ins.value_counts().reindex(hours, fill_value=0)
    plus = ins[ok].value_counts().reindex(hours, fill_value=0)
    minus = (out[ok] + pd.Timedelta(hours=1)).value_counts().reindex(hours, fill_value=0)
    occ = (plus - minus).cumsum()
    lk = pd.read_csv("data/연계_정리.csv")
    lk["t"] = pd.to_datetime(lk["ISSUED_DATE"], errors="coerce")
    lk = lk.drop_duplicates("t").set_index("t")
    v = pd.to_numeric(lk["주차대수"], errors="coerce").reindex(hours)
    m = v.notna()
    print(f"\n상관계수  연계 주차대수 vs 원천 입차: {v[m].corr(inflow[m]):.3f}")
    print(f"상관계수  연계 주차대수 vs 원천 점유: {v[m].corr(occ[m]):.3f}")
    print(f"비율(원천/연계) 중앙값  입차: {(inflow[m]/v[m]).median():.3f}  점유: {(occ[m]/v[m]).median():.3f}")
    print("\n[예시 10개 시간대]")
    print(pd.DataFrame({"연계": v, "원천입차": inflow, "원천점유": occ})[m].sample(10, random_state=1).sort_index().to_string())
    g = pd.DataFrame({"t": ins[ok], "gate": gate[ok], "d": 1})
    e = pd.DataFrame({"t": out[ok] + pd.Timedelta(hours=1), "gate": gate[ok], "d": -1})
    gocc = pd.concat([g, e]).groupby(["t", "gate"])["d"].sum().unstack(fill_value=0).reindex(hours, fill_value=0).cumsum()
    gocc.to_csv("data/출입구별_점유_표본.csv", encoding="utf-8-sig")
    print("\ndata/출입구별_점유_표본.csv 저장 (출입구별 시간대 점유, 51% 표본 기준)")

def cmd_shows():
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.drop_duplicates("t")
    df = df[df["공연명"].fillna("").str.strip() != ""]
    rows = []
    for _, r in df.iterrows():
        for name in str(r["공연명"]).split(","):
            name = name.strip()
            if name:
                rows.append({"공연명": name, "날짜": r["t"].date()})
    s = pd.DataFrame(rows)
    out = s.groupby("공연명").agg(공연일수=("날짜", "nunique"), 첫날=("날짜", "min"), 마지막날=("날짜", "max")).reset_index()
    out["공연장"] = ""
    out = out.sort_values("첫날")
    out.to_csv("data/공연명_공연장_매핑.csv", index=False, encoding="utf-8-sig")
    print(f"공연명 {len(out)}개 → data/공연명_공연장_매핑.csv 저장")
    print(out.head(15).to_string())

def cmd_zonemap():
    c = pd.read_csv("data/주차장_혼잡도.csv", encoding="cp949")
    c["t"] = pd.to_datetime(c["등록일"] + " " + c["등록시간"].astype(str).str[:2] + ":00", errors="coerce")
    c = c[c["t"].dt.year == 2025]
    c["lv"] = c["혼잡도"].map({"원활": 0, "혼잡": 1, "만차": 2})
    g = pd.read_csv("data/출입구별_점유_표본.csv", index_col=0, parse_dates=True)
    g.columns = g.columns.str.replace("CMB", "입구")
    g = g.T.groupby(level=0).sum().T
    lk = pd.read_csv("data/연계_정리.csv")
    lk["t"] = pd.to_datetime(lk["ISSUED_DATE"], errors="coerce")
    tot = pd.to_numeric(lk.drop_duplicates("t").set_index("t")["주차대수"], errors="coerce")
    res = []
    for z, d in c.groupby("주차구역"):
        lv = pd.Series(d["lv"].values)
        x = g.reindex(d["t"])
        tv = pd.Series(tot.reindex(d["t"]).values)
        row = {"구역": z, "기록": len(d), "만차": int((lv == 2).sum())}
        for col in g.columns:
            row[col.replace("입구", "")] = round(pd.Series(x[col].values).corr(lv), 2)
        row["전체대수_상관"] = round(tv.corr(lv), 2)
        row["만차때_전체대수_중앙값"] = tv[lv == 2].median()
        row["혼잡때_전체대수_중앙값"] = tv[lv == 1].median()
        res.append(row)
    out = pd.DataFrame(res)
    out.to_csv("data/구역별_분석.csv", index=False, encoding="utf-8-sig")
    print(out.to_string())

def cmd_carbon():
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.dropna(subset=["t"]).drop_duplicates("t")
    df["n"] = pd.to_numeric(df["주차대수"], errors="coerce")
    df["aud"] = pd.to_numeric(df["공연관람객수"], errors="coerce").fillna(0)
    df["show"] = df["공연명"].fillna("").astype(str).str.strip()
    df["date"], df["hour"] = df["t"].dt.date, df["t"].dt.hour
    df["wk"] = (df["t"].dt.dayofweek >= 5) | (df["휴일"].fillna("").astype(str).str.strip() != "")
    showday = df.groupby("date")["show"].apply(lambda s: (s != "").any())
    df["showday"] = df["date"].map(showday)
    base = df[~df["showday"]].groupby(["wk", "hour"])["n"].median()
    df["excess"] = df["n"] - [base.get((w, h)) for w, h in zip(df["wk"], df["hour"])]
    g = df[df["showday"]].groupby("date").agg(
        공연=("show", lambda s: s[s != ""].iloc[0][:35]),
        관객=("aud", "max"), 추가차량_최대=("excess", "max"))
    g = g[g["관객"] > 0]
    g["관객100명당_추가차량"] = (g["추가차량_최대"] / g["관객"] * 100).round(1)
    g = g.sort_values("관객100명당_추가차량", ascending=False)
    g.to_csv("data/공연별_자가용추정.csv", encoding="utf-8-sig")
    print(f"공연일 {len(g)}일 / 비공연일 {(~showday).sum()}일")
    print("\n[관객 100명당 추가 차량 분포]"); print(g["관객100명당_추가차량"].describe().round(1).to_string())
    print("\n[자가용 많은 공연 TOP 10]"); print(g.head(10).to_string())
    print("\n[자가용 적은 공연 TOP 10]"); print(g.tail(10).to_string())

def cmd_carbon2():
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.dropna(subset=["t"]).drop_duplicates("t")
    df["n"] = pd.to_numeric(df["주차대수"], errors="coerce")
    df["aud"] = pd.to_numeric(df["공연관람객수"], errors="coerce").fillna(0)
    df["show"] = df["공연명"].fillna("").astype(str).str.strip()
    df["date"], df["hour"], df["month"] = df["t"].dt.date, df["t"].dt.hour, df["t"].dt.month
    df["wk"] = (df["t"].dt.dayofweek >= 5) | (df["휴일"].fillna("").astype(str).str.strip() != "")
    showday = df.groupby("date")["show"].apply(lambda s: (s != "").any())
    df["showday"] = df["date"].map(showday)
    nos = df[~df["showday"]]
    b1 = nos.groupby(["month", "wk", "hour"])["n"].median()
    b0 = nos.groupby(["wk", "hour"])["n"].median()
    df["base"] = [b1.get((m, w, h), b0.get((w, h))) for m, w, h in zip(df["month"], df["wk"], df["hour"])]
    df["excess"] = df["n"] - df["base"]
    sh = df[df["show"] != ""]
    g = sh.groupby("date").agg(
        공연=("show", lambda s: s.iloc[0][:35]),
        복수공연=("show", lambda s: "," in s.iloc[0]),
        관객=("aud", "max"), 추가차량_최대=("excess", "max"))
    g = g[g["관객"] > 0]
    g["관객100명당_추가차량"] = (g["추가차량_최대"] / g["관객"] * 100).round(1)
    g = g.sort_values("관객100명당_추가차량", ascending=False)
    g.to_csv("data/공연별_자가용추정2.csv", encoding="utf-8-sig")
    print(f"공연일 {len(g)}일 (복수 공연일 {int(g['복수공연'].sum())}일)")
    print(f"\n★ 검증: 관객 수와 추가 차량의 상관계수 = {g['관객'].corr(g['추가차량_최대']):.3f}")
    print(f"음수(평소보다 적음)인 날: {(g['추가차량_최대'] < 0).sum()}일")
    print("\n[관객 100명당 추가 차량 분포]"); print(g["관객100명당_추가차량"].describe().round(1).to_string())
    print("\n[단독 공연일만]"); print(g[~g["복수공연"]]["관객100명당_추가차량"].describe().round(1).to_string())
    print("\n[많은 순 TOP 10]"); print(g.head(10).to_string())
    print("\n[적은 순 TOP 10]"); print(g.tail(10).to_string())

def cmd_heat():
    import numpy as np
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.dropna(subset=["t"]).drop_duplicates("t")
    T = pd.to_numeric(df["기온"], errors="coerce")
    RH = pd.to_numeric(df["습도"], errors="coerce")
    W = pd.to_numeric(df["풍향"], errors="coerce")
    df["aud"] = pd.to_numeric(df["공연관람객수"], errors="coerce").fillna(0)
    df["show"] = df["공연명"].fillna("").astype(str).str.strip()
    df["date"], df["hour"], df["month"] = df["t"].dt.date, df["t"].dt.hour, df["t"].dt.month
    print(f"[풍향 칸 값 확인] 최소 {W.min()} / 최대 {W.max()} / 평균 {W.mean():.1f}")
    wind_ok = W.max() < 40
    print("→ 풍속(m/s)으로 판단해 겨울 체감온도에 사용" if wind_ok else "→ 풍향(각도)으로 판단해 겨울은 기온만 사용")
    Tw = (T * np.arctan(0.151977 * np.sqrt(RH + 8.313659)) + np.arctan(T + RH) - np.arctan(RH - 1.67633)
          + 0.00391838 * RH ** 1.5 * np.arctan(0.023101 * RH) - 4.686035)
    summer = -0.2442 + 0.55399 * Tw + 0.45535 * T - 0.0022 * Tw ** 2 + 0.00278 * Tw * T + 3.0
    if wind_ok:
        V = W * 3.6
        winter = np.where((T <= 10) & (V >= 4.8), 13.12 + 0.6215 * T - 11.37 * V ** 0.16 + 0.3965 * V ** 0.16 * T, T)
    else:
        winter = T
    df["feel"] = np.where(df["month"].between(5, 9), summer, winter)
    showday = df.groupby("date")["show"].apply(lambda s: (s != "").any())
    df["showday"] = df["date"].map(showday)
    sh = df[df["show"] != ""]
    print("\n[공연명이 기록된 시간대 분포]"); print(sh["hour"].value_counts().sort_index().to_string())

    def summarize(rows, label):
        g = rows.groupby("date").agg(공연=("show", lambda s: s[s != ""].iloc[0][:30] if (s != "").any() else ""),
                                     월=("month", "first"), 관객=("aud", "max"),
                                     최고체감=("feel", "max"), 최저체감=("feel", "min"))
        g = g[g["관객"] > 0]
        hot33, hot35 = g[g["최고체감"] >= 33], g[g["최고체감"] >= 35]
        cold0, cold10 = g[g["최저체감"] <= 0], g[g["최저체감"] <= -10]
        print(f"\n===== {label} =====")
        print(f"공연일 {len(g)}일")
        print(f"폭염: 체감 33도 이상 {len(hot33)}일 (관객 {int(hot33['관객'].sum()):,}명) / 35도 이상 {len(hot35)}일 (관객 {int(hot35['관객'].sum()):,}명)")
        print(f"한파: 체감 0도 이하 {len(cold0)}일 (관객 {int(cold0['관객'].sum()):,}명) / -10도 이하 {len(cold10)}일 (관객 {int(cold10['관객'].sum()):,}명)")
        print("\n[가장 더웠던 공연일 TOP 8]"); print(g.sort_values("최고체감", ascending=False).head(8).round(1).to_string())
        print("\n[가장 추웠던 공연일 TOP 8]"); print(g.sort_values("최저체감").head(8).round(1).to_string())
        return g

    g1 = summarize(sh, "기준 1: 공연명이 기록된 시간대")
    g2 = summarize(df[df["showday"] & df["hour"].between(12, 19)], "기준 2: 공연일 12~19시 (저녁 공연 대기 시간대 가정)")
    g1.round(1).to_csv("data/공연일_체감온도.csv", encoding="utf-8-sig")

    raw = pd.read_csv("data/입출차.csv", usecols=["ISSUED_DATE"])
    it = pd.to_datetime(raw["ISSUED_DATE"], errors="coerce").dropna()
    e = pd.DataFrame({"date": it.dt.date, "hour": it.dt.hour})
    e["showday"] = e["date"].map(showday).fillna(False)
    cnt = e.groupby(["showday", "date", "hour"]).size().reset_index(name="n")
    avg = cnt.groupby(["showday", "hour"])["n"].mean().unstack(0).fillna(0)
    avg.columns = ["평소(공연X)" if not c else "공연일" for c in avg.columns]
    avg["배율"] = (avg["공연일"] / avg["평소(공연X)"]).round(2)
    print("\n[시간대별 평균 입차 대수 (원천 표본)] 배율이 크게 오르는 시각 = 관객이 몰려오기 시작하는 때")
    print(avg.loc[8:22].round(1).to_string())
    print("\ndata/공연일_체감온도.csv 저장")

def cmd_heat2():
    import numpy as np
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.dropna(subset=["t"]).drop_duplicates("t").sort_values("t").reset_index(drop=True)
    T = pd.to_numeric(df["기온"], errors="coerce")
    RH = pd.to_numeric(df["습도"], errors="coerce")
    V = pd.to_numeric(df["풍향"], errors="coerce") * 3.6
    Tw = (T * np.arctan(0.151977 * np.sqrt(RH + 8.313659)) + np.arctan(T + RH) - np.arctan(RH - 1.67633)
          + 0.00391838 * RH ** 1.5 * np.arctan(0.023101 * RH) - 4.686035)
    summer = -0.2442 + 0.55399 * Tw + 0.45535 * T - 0.0022 * Tw ** 2 + 0.00278 * Tw * T + 3.0
    winter = np.where((T <= 10) & (V >= 4.8), 13.12 + 0.6215 * T - 11.37 * V ** 0.16 + 0.3965 * V ** 0.16 * T, T)
    df["T"], df["date"], df["hour"], df["month"] = T, df["t"].dt.date, df["t"].dt.hour, df["t"].dt.month
    df["feel"] = np.where(df["month"].between(5, 9), summer, winter)
    df["car"] = pd.to_numeric(df["주차대수"], errors="coerce")
    df["aud"] = pd.to_numeric(df["공연관람객수"], errors="coerce").fillna(0)
    df["show"] = df["공연명"].fillna("").astype(str).str.strip()
    hol = df["휴일"] if "휴일" in df.columns else pd.Series("", index=df.index)
    df["hol"] = hol.fillna("").astype(str).str.strip().ne("")
    day = df.groupby("date").agg(
        name=("show", lambda x: next((v for v in x if v), "")[:25]),
        show=("show", lambda x: bool((x != "").any())),
        hol=("hol", "any"), dow=("t", lambda x: x.iloc[0].dayofweek),
        aud=("aud", "max"), fmax=("feel", "max"), tmin=("T", "min"), month=("month", "first"))
    day["show"] = day["show"].astype(bool)
    day["off"] = (day["dow"] >= 5) | day["hol"].astype(bool)
    df["showday"] = df["date"].map(day["show"])
    df["off"] = df["date"].map(day["off"])
    ex = list(hol[df["hol"]].astype(str).unique()[:5])
    print(f"[휴일 칸 값 예시] {ex}")
    print(f"쉬는 날(주말·휴일) {int(day['off'].sum())}일 | 공연일: 쉬는 날 {int((day['off'] & day['show']).sum())}일, 평일 {int((~day['off'] & day['show']).sum())}일")

    # 1. 기상청 특보 기준 재구성
    s = day.copy()
    s.index = pd.to_datetime(s.index)
    def lasting(x):
        prev = x.shift(1, freq="D").reindex(s.index, fill_value=False)
        nxt = x.shift(-1, freq="D").reindex(s.index, fill_value=False)
        return x & (prev | nxt)
    hot = s["month"].between(5, 9)
    s["특보"] = ""
    s.loc[hot & lasting(s["fmax"] >= 33), "특보"] = "폭염주의보급"
    s.loc[hot & lasting(s["fmax"] >= 35), "특보"] = "폭염경보급"
    s.loc[hot & (s["fmax"] >= 38), "특보"] = "폭염중대경보급"
    s.loc[~hot & lasting(s["tmin"] <= -12), "특보"] = "한파주의보급"
    s.loc[~hot & lasting(s["tmin"] <= -15), "특보"] = "한파경보급"
    print("\n===== 1. 기상청 특보 기준으로 다시 본 2025년 (연계 기상값으로 재구성, 실제 발령 이력 아님) =====")
    for lv in ["폭염주의보급", "폭염경보급", "폭염중대경보급", "한파주의보급", "한파경보급"]:
        a = s[s["특보"] == lv]; b = a[a["show"]]
        print(f"{lv}: {len(a)}일 / 그중 공연일 {len(b)}일, 관객 {int(b['aud'].sum()):,}명")
    hit = s[s["show"] & (s["특보"] != "")]
    if len(hit):
        print(hit[["name", "특보", "aud", "fmax", "tmin"]].round(1).to_string())
    s.round(1).to_csv("data/일별_특보재구성.csv", encoding="utf-8-sig")

    # 2. 주차대수 곡선 (연계 2025 전체, 쉬는 날끼리·평일끼리)
    print("\n===== 2. 시간대별 평균 주차대수 (연계, 2025 전체) =====")
    occ = df.pivot_table(index="hour", columns=["off", "showday"], values="car", aggfunc="mean")
    out = pd.DataFrame(index=range(8, 24))
    for off_, nm in [(True, "쉬는날"), (False, "평일")]:
        if (off_, True) not in occ.columns or (off_, False) not in occ.columns:
            continue
        a, b = occ[(off_, True)], occ[(off_, False)]
        out[f"{nm}_공연일"] = a.round(0); out[f"{nm}_공연X"] = b.round(0); out[f"{nm}_배율"] = (a / b).round(2)
    print(out.to_string())

    # 3. 공연 몇 시간 전에 주차장이 차는가
    print("\n===== 3. 공연 몇 시간 전에 주차장이 차는가 =====")
    rows = []
    for d, g in df[(df["showday"] == True) & df["hour"].between(6, 23)].groupby("date"):
        g = g.dropna(subset=["car"]).sort_values("hour"); tg = g[g["show"] != ""]
        if g.empty or tg.empty:
            continue
        mx = g["car"].max()
        rows.append({"date": d, "공연첫기록": int(tg["hour"].iloc[0]),
                     "80%도달": int(g.loc[g["car"] >= 0.8 * mx, "hour"].iloc[0]), "최대대수": int(mx)})
    L = pd.DataFrame(rows); L["앞선시간"] = L["공연첫기록"] - L["80%도달"]
    print(f"공연일 {len(L)}일 | 공연명 첫 기록 중앙값 {L['공연첫기록'].median():.0f}시 | 주차장 80% 도달 중앙값 {L['80%도달'].median():.0f}시")
    print(f"→ 공연명이 뜨기 평균 {L['앞선시간'].mean():.1f}시간(중앙값 {L['앞선시간'].median():.0f}시간) 전에 이미 80% 찬다")
    print("[앞선 시간 분포] (음수 = 공연명이 먼저 뜬 날)"); print(L["앞선시간"].value_counts().sort_index().to_string())

    # 4. 사례일 시간표
    print("\n===== 4. 사례일 시간표 (기획서 그림·데모용) =====")
    base = df[(df["showday"] == False) & (df["off"] == True)].groupby(["month", "hour"])["car"].mean()
    win = df[(df["showday"] == True) & df["hour"].between(12, 19)].groupby("date")["feel"]
    def top(series, n, asc):
        res, seen = [], set()
        for d in series.sort_values(ascending=asc).index:
            k = day.loc[d, "name"][:8]
            if k in seen:
                continue
            seen.add(k); res.append(d)
            if len(res) == n:
                break
        return res
    for d in top(win.max(), 2, False) + top(win.min(), 1, True):
        g = df[df["date"] == d].set_index("hour").sort_index().loc[10:23]
        m = int(g["month"].iloc[0])
        bv = base.reindex(pd.MultiIndex.from_tuples([(m, h) for h in g.index])).values
        tbl = pd.DataFrame({"체감": g["feel"].round(1).values, "주차대수": g["car"].values,
                            "비공연 쉬는날 평균": np.round(bv), "공연": np.where(g["show"] != "", "●", "")}, index=g.index)
        print(f"\n[{d}({'월화수목금토일'[pd.Timestamp(d).dayofweek]}) {day.loc[d, 'name']}] 관객 {int(day.loc[d, 'aud']):,}명")
        print(tbl.to_string())
        tbl.to_csv(f"data/사례_{d}.csv", encoding="utf-8-sig")

    # 5. 원천 표본 점검 + 쉬는 날끼리 입차 비교
    print("\n===== 5. 원천 입출차 표본 점검 (1~2분 걸려요) =====")
    raw = pd.read_csv("data/입출차.csv", usecols=["ISSUED_DATE"])
    it = pd.to_datetime(raw["ISSUED_DATE"], errors="coerce").dropna()
    per = it.dt.to_period("M")
    print(pd.DataFrame({"건수": it.groupby(per).size(), "날짜수": it.dt.date.groupby(per).nunique()}).to_string())
    e = pd.crosstab(it.dt.date, it.dt.hour)
    e["off"] = e.index.map(day["off"]); e["showday"] = e.index.map(day["show"])
    e = e.dropna(subset=["off", "showday"])
    hrs = [h for h in range(8, 24) if h in e.columns]
    res = pd.DataFrame(index=hrs)
    for off_, nm in [(True, "쉬는날"), (False, "평일")]:
        a = e[(e["off"] == off_) & (e["showday"] == True)][hrs]
        b = e[(e["off"] == off_) & (e["showday"] == False)][hrs]
        if len(a) == 0 or len(b) == 0:
            continue
        res[f"{nm}_공연일({len(a)}일)"] = a.mean().round(0)
        res[f"{nm}_공연X({len(b)}일)"] = b.mean().round(0)
        res[f"{nm}_배율"] = (a.mean() / b.mean()).round(2)
    print("\n[시간대별 평균 입차 대수, 쉬는 날끼리·평일끼리 비교]"); print(res.to_string())
    print("\n저장: data/일별_특보재구성.csv, data/사례_날짜.csv")

def cmd_replay():
    import re, json, os, requests
    df = pd.read_csv("data/연계_정리.csv")
    df["t"] = pd.to_datetime(df["ISSUED_DATE"], errors="coerce")
    df = df.dropna(subset=["t"]).drop_duplicates("t").sort_values("t")
    k = json.load(open("keys.json", encoding="utf-8"))
    UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
    cases = [("2025-07-26", "BOYNEXTDOOR", "20250701", "20250731"),
             ("2025-02-07", "검정치마", "20250201", "20250228")]
    rows = []
    for d, kw, st, ed in cases:
        venue = start = guide = ""
        try:
            r = requests.get("https://www.kopis.or.kr/openApi/restful/pblprfr", headers=UA, timeout=30,
                             params={"service": k["kopis"], "stdate": st, "eddate": ed, "cpage": 1, "rows": 20, "shprfnm": kw})
            ids = re.findall(r"<mt20id>(.*?)</mt20id>", r.text)
            if ids:
                r2 = requests.get(f"https://www.kopis.or.kr/openApi/restful/pblprfr/{ids[0]}", headers=UA, timeout=30,
                                  params={"service": k["kopis"]})
                venue = (re.findall(r"<fcltynm>(.*?)</fcltynm>", r2.text) or [""])[0]
                guide = (re.findall(r"<dtguidance>(.*?)</dtguidance>", r2.text) or [""])[0]
                wd = "월화수목금토일"[pd.Timestamp(d).dayofweek]
                m = re.search(wd + r"요일[^(]*\(([^)]*)\)", guide)
                if m:
                    start = m.group(1).split(",")[0].strip()
        except Exception as e:
            print("KOPIS 조회 실패:", e)
        print(f"[{d}] {kw} | 공연장: {venue or '못 찾음'} | 공연시간 안내: {guide or '못 찾음'} | 그날 시작: {start or '못 찾음'}")
        g = df[df["t"].dt.strftime("%Y-%m-%d") == d]
        for _, x in g.iterrows():
            rows.append({"date": d, "hour": x["t"].hour, "temp": x["기온"], "humidity": x["습도"],
                         "wind": x["풍향"], "parking": x["주차대수"],
                         "show": (str(x["공연명"]) if pd.notna(x["공연명"]) else "")[:40],
                         "audience": x["공연관람객수"], "venue": venue, "start_time": start})
    out = pd.DataFrame(rows)
    os.makedirs("analysis", exist_ok=True)
    out.to_csv("analysis/replay_input.csv", index=False, encoding="utf-8-sig")
    print(f"\n{len(out)}행 저장: analysis/replay_input.csv  (wind 칸 = 원본 '풍향' 칸, 실제 값은 풍속 m/s)")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd"); ap.add_argument("name", nargs="?")
    for o in ["date", "venue", "zone", "out", "hour", "count"]:
        ap.add_argument(f"--{o}")
    ap.add_argument("--in", dest="in_")
    a = ap.parse_args()
    {"test": lambda: cmd_test(a.name), "fetch": lambda: cmd_fetch(a.name),
     "merge": lambda: cmd_merge(a.name), "cols": lambda: cmd_cols(a.name),
     "check4": lambda: cmd_check4(a), "check5": lambda: cmd_check5(a),
     "check6": lambda: cmd_check6(a), "perf": cmd_perf, "perf2": cmd_perf2, "perf3": cmd_perf3, "split": cmd_split, "link": cmd_link, "verify": cmd_verify, "shows": cmd_shows, "zonemap": cmd_zonemap, "carbon": cmd_carbon, "carbon2": cmd_carbon2, "heat": cmd_heat, "heat2": cmd_heat2, "replay": cmd_replay}[a.cmd]()