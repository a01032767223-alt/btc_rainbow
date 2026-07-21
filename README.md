# Bitcoin Rainbow Cycle

실시간 BTC/USD 가격과 장기 로그 회귀 레인보우 밴드를 한 화면에 표시하는 정적 웹 대시보드입니다.

## 주요 기능
- 2010년대 초반부터 현재까지 일별 BTC/USD 가격선
- 로그 가격축과 9개 레인보우 밴드
- 현재가 30초 자동 갱신 및 현재 밴드 판정
- 전체·10년·5년·2년 구간 전환
- 반응형 모바일 UI
- GitHub Actions 기반 일별 과거 데이터 갱신
- GitHub Pages 자동 배포

## 배포
1. 이 폴더를 GitHub의 새 공개 저장소에 업로드합니다.
2. 저장소 `Settings → Pages → Source`를 **GitHub Actions**로 설정합니다.
3. `Actions → Update Bitcoin data → Run workflow`를 최초 1회 실행합니다.
4. `Deploy GitHub Pages`가 완료되면 Pages 주소에서 확인합니다.

과거 데이터는 기본적으로 Yahoo Finance 공개 차트 API를 사용합니다. 실패 시 저장소 Secret `COINGECKO_API_KEY`가 있으면 CoinGecko로 재시도합니다.

## 로컬 실행
정적 파일 fetch 제약 때문에 파일을 직접 열지 말고 간단한 서버를 사용하세요.

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다.

## 모델
기준선:

```text
10^(3.109106 × ln(weeks since 2009-01-09) − 8.164198)
```

밴드는 기준선에 로그 간격의 고정 배수를 적용합니다. 모든 상수는 `assets/app.js` 상단에서 확인하고 수정할 수 있습니다.

> 이 프로젝트는 교육·정보 제공용이며 투자 조언이 아닙니다.

## 실행 시 주의

`index.html`을 더블클릭해 `file://` 주소로 열면 일부 브라우저가 로컬 JSON 또는 외부 API 요청을 차단할 수 있습니다. 아래처럼 로컬 서버로 실행하거나 GitHub Pages에서 확인하세요.

```bash
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다. 수정 버전은 저장 데이터, CoinGecko, CryptoCompare, 내장 기준점 순서로 과거 데이터를 복구하며 현재가는 Coinbase, Kraken, Binance, CoinGecko 순서로 조회합니다.
