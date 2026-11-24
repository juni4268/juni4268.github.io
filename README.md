# juni4268.github.io

작품의 제목, 대표 이미지, 기술과 담당 역할은 `_tools/projects.json`에서 관리합니다.
작품을 추가하거나 수정한 뒤 저장소에서 `node _tools/render-projects.mjs`를 실행하면
상세 페이지의 작품 목록과 기본 상세 페이지가 갱신됩니다.
메인 하단의 작품 링크는 목록의 첫 작품 상세 페이지로 연결됩니다.

직접 작성한 상세 페이지에는 `customDetail: true`를 지정합니다.
SteamHeart와 동일하게 `portfolio-rail`과 `portfolio-navigation`의
`:start`·`:end` HTML 주석을 두면 생성기가 해당 구간을 갱신합니다.
