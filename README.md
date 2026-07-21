# Bitcoin Rainbow Overlay

레인보우 밴드와 BTC 가격선을 동일한 로그 좌표계에 겹쳐 표시하는 단일 파일 웹앱입니다.

## GitHub Pages
1. 저장소 최상위에 `index.html`을 업로드합니다.
2. Settings → Pages → Deploy from a branch 또는 GitHub Actions를 선택합니다.
3. `main` 브랜치의 `/root`를 지정합니다.

별도 빌드 과정이 없습니다. 실시간 가격은 Coinbase → Kraken → CoinGecko 순으로 시도하며, 실패하면 내장 기준가격을 표시합니다.


## 추가 기능
- 기간 선택: 전체, 10년, 5년, 2년, 1년
- 표시 방식: 가격선, 월봉
- 월봉은 내장 역사 기준점과 실시간 현재가 사이를 로그 보간한 월말 값입니다. 정확한 거래소 OHLC 캔들이 아니라 장기 사이클 시각화를 위한 월말 추정선입니다.
