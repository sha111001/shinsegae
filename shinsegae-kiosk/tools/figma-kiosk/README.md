# Figma → 키오스크 화면 변환 도구

`js/pages/*.js`, `js/overlays.js`, `assets/img/*` 는 `kgen.py`가 Figma 파일에서 자동으로 만든 결과입니다.

- 화면: 2521×1776 프레임 전체(키오스크 기기 포함)를 그대로 변환, 스크롤 없음
- 드롭바(SECTION) 안 프레임 → 버튼 기준 위치에 뜨는 드롭다운(`data-act="ov"`)
- 화면 전체를 덮는 클릭 영역 → 보이는 '창 닫기' / 카드 오른쪽 위 ✕ / '이전' / '화면을 터치' 문구에만 연결, 없으면 ✕ 버튼 보완
- 색 필터가 걸린 사진 → Figma가 그 레이어만 따로 그린 2배 이미지(`filt/`) 사용

필요한 데이터(작업 폴더): `fullgeo.json`(geometry=paths), `fills.json` + `fills/`(원본 이미지), `ex/`(화면별 1배 렌더), `plan.json`, `filt.json` + `filt/`
