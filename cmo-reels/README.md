# cmo-reels — 이노AI CMO 릴스 반입 폴더

이노AI 관제 서버(inoplace/agents)의 CMO가 만든 영상 중 **대표가 승인한 것만** 여기로 반입된다.

- `cmo-reels/<작업번호>/request.json` — `{"job_id": ..., "base_url": "https://…/media/<임시열쇠>"}` (영상은 `<base_url>/reel.mp4`, 24시간 공개)
- `cmo-reels/<작업번호>/caption.txt` — 게시 문안
- 반입되면 `.github/workflows/cmo_reel.yml`이 기존 `publish_reel.js`와 같은 IG 비밀 설정으로 즉시 릴스를 게시하고 `published.json`(또는 실패 시 `failed.json`)을 남긴다.
- 화·금 카드 게시(posts/, publish.yml)와는 완전히 분리되어 있다.
